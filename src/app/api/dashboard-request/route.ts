import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

import { ObjectId } from "mongodb";

function flexParseDateExpr(field: string, onErrorVal: any = null) {
  const safeField = { $ifNull: [field, ""] };
  const normalizedField = {
    $let: {
      vars: { low: { $toLower: safeField } },
      in: {
        $reduce: {
          input: [
            ["des", "dec"], ["okt", "oct"], ["agu", "aug"],
            ["mei", "may"], ["nop", "nov"], ["peb", "feb"],
          ],
          initialValue: "$$low",
          in: {
            $replaceAll: {
              input: "$$value",
              find: { $arrayElemAt: ["$$this", 0] },
              replacement: { $arrayElemAt: ["$$this", 1] },
            },
          },
        },
      },
    },
  };
  return {
    $switch: {
      branches: [
        { case: { $eq: [{ $type: field }, "date"] }, then: field },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{4}-\d{2}-\d{2}/ } },
          then: {
            $dateFromString: {
              dateString: { $substrCP: [field, 0, 10] },
              format: "%Y-%m-%d",
              onError: onErrorVal,
            },
          },
        },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}-[A-Za-z]+-\d{4}$/ } },
          then: {
            $dateFromString: {
              dateString: normalizedField,
              format: "%d-%b-%Y",
              onError: onErrorVal,
            },
          },
        },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}-[A-Za-z]+-\d{2}$/ } },
          then: {
            $dateFromString: {
              dateString: {
                $let: {
                  vars: { parts: { $split: [normalizedField, "-"] } },
                  in: {
                    $concat: [
                      { $arrayElemAt: ["$$parts", 0] },
                      "-",
                      { $arrayElemAt: ["$$parts", 1] },
                      "-20",
                      { $arrayElemAt: ["$$parts", 2] }
                    ]
                  }
                }
              },
              format: "%d-%b-%Y",
              onError: onErrorVal,
            },
          },
        },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/ } },
          then: {
            $dateFromString: {
              dateString: field,
              format: "%d/%m/%Y",
              onError: onErrorVal,
            },
          },
        },
      ],
      default: onErrorVal,
    },
  };
}

type TeamDoc = {
  leaderId: string;
  memberIds: string[];
};

async function getLeaderAllowedUserIds(db: any, leaderId: string) {
  const team = (await db
    .collection("teams")
    .findOne({ leaderId })) as TeamDoc | null;

  const ids = [leaderId, ...(team?.memberIds ?? [])];
  return Array.from(new Set(ids));
}

async function getUserLiteById(db: any, userId: string) {
  if (!ObjectId.isValid(userId)) return null;
  const u = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { _id: 1, role: 1, username: 1, fullName: 1 } },
    );
  if (!u) return null;
  return {
    userId: String((u as any)._id),
    role: String((u as any).role || ""),
    username: String((u as any).username || ""),
    fullName: String((u as any).fullName || ""),
  };
}

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const session = auth.session;
  const { searchParams } = new URL(req.url);
  const ring = searchParams.get("ring");
  const statusGroup = searchParams.get("statusGroup");
  const city = searchParams.get("city");
  const satker = searchParams.get("satker");
  const sales = searchParams.get("sales");
  const klpd = searchParams.get("klpd");
  const dateStr = searchParams.get("date"); // The formatted string e.g. "01 Feb"

  const client = await clientPromise;
  const db = client.db("MabelHubStaging");

  // ✅ pastikan nama collection benar
  const col = db.collection("VisitActivity");

  // helper normalisasi status agar "Stay Office" == "STAY_OFFICE" == "stay office"
  const normalize = (s: any) =>
    (typeof s === "string" ? s : "").trim().toLowerCase().replace(/\s+/g, "_"); // spasi -> underscore

  // Build match query based on cross-filters
  const matchQuery: any = {};

  // =========================
  // ACCESS FILTER (ROLE)
  // =========================
  const NO_USER_ID = {
    $or: [{ user_id: { $exists: false } }, { user_id: null }],
  };

  function ownerFilter(userId: string, fullName: string | null) {
    const conditions: any[] = [{ user_id: userId }];
    if (fullName) {
      conditions.push({
        $and: [{ nama_sales: fullName }, NO_USER_ID],
      });
    }
    return { $or: conditions };
  }

  function multiOwnerFilter(userIds: string[], fullNames: string[]) {
    const conditions: any[] = [{ user_id: { $in: userIds } }];
    if (fullNames.length > 0) {
      conditions.push({
        $and: [{ nama_sales: { $in: fullNames } }, NO_USER_ID],
      });
    }
    return { $or: conditions };
  }

  function applyOwnerFilter(ownerCondition: any) {
    if (!matchQuery.$and) matchQuery.$and = [];
    matchQuery.$and.push(ownerCondition);
  }

  if (session.role === "SALES") {
    applyOwnerFilter(ownerFilter(session.userId, session.fullName || null));
  } else if (session.role === "LEADER") {
    const allowed = await getLeaderAllowedUserIds(db, session.userId);
    const fullNames: string[] = [];
    for (const uid of allowed) {
      const u = await getUserLiteById(db, uid);
      if (u?.fullName) fullNames.push(u.fullName);
    }
    applyOwnerFilter(multiOwnerFilter(allowed, fullNames));
  } else {
    // ADMIN/SUPERADMIN can see all - no strict user_id filter applied
  }

  if (ring) {
    matchQuery.status_ring = ring.toUpperCase(); // e.g., "RING 1"
  }

  if (statusGroup) {
    if (statusGroup === "Visits") {
      matchQuery.status_visit = { $regex: /visited|visit|sudah_visit/i };
      if (!matchQuery.$and) matchQuery.$and = [];
      matchQuery.$and.push({ status_visit: { $regex: /visit/i } });
      matchQuery.$and.push({ status_visit: { $not: /not|belum/i } });
    } else if (statusGroup === "Stay Office") {
      matchQuery.status_visit = { $regex: /stay[\s_]*office/i };
    } else if (statusGroup === "Not Visited") {
      matchQuery.status_visit = {
        $regex:
          /not[\s_]*visited|not[\s_]*visit|belum[\s_]*visit|belum[\s_]*visited/i,
      };
    }
  }

  if (city) {
    matchQuery.city = city;
  }
  if (satker) {
    matchQuery.satuan_kerja = satker;
  }
  if (sales) {
    matchQuery.nama_sales = sales;
  }
  if (klpd) {
    matchQuery.klpd = klpd;
  }

  // To support Date filtering (e.g., from Trend chart clicking: "15 Jan")
  // Since original dates are stored as e.g., "15-Jan-2026", we can use regex to match the day and month prefix
  if (dateStr) {
    // Convert "15 Jan" back to a regex that roughly matches the start or middle of the date string
    const parts = dateStr.split(" ");
    if (parts.length >= 2) {
      const regexStr = `${parts[0]}-${parts[1]}`;
      matchQuery.visit_date = { $regex: new RegExp(regexStr, "i") };
    }
  }

  // Date range filter
  const startStr = searchParams.get("startDate") || searchParams.get("start");
  const endStr = searchParams.get("endDate") || searchParams.get("end");
  if (startStr || endStr) {
    const dateConditions: any[] = [];
    if (startStr) {
      dateConditions.push({
        $gte: [
          flexParseDateExpr("$visit_date", new Date("1970-01-01")),
          new Date(startStr + "T00:00:00.000Z"),
        ],
      });
    }
    if (endStr) {
      const endDt = new Date(endStr + "T23:59:59.999Z");
      dateConditions.push({
        $lte: [
          flexParseDateExpr("$visit_date", new Date("1970-01-01")),
          endDt,
        ],
      });
    }
    if (dateConditions.length > 0) {
      matchQuery.$expr = { $and: dateConditions };
    }
  }

  // Ambil beberapa distinct dulu untuk coverage (lebih simpel & akurat)
  const [
    salesDistinct,
    satkerDistinct,
    cityDistinct,
    trendAgg,
    topSalesAgg,
    klpdAgg,
  ] = await Promise.all([
    col.distinct("nama_sales", matchQuery),
    col.distinct("satuan_kerja", matchQuery),
    // sesuaikan: kalau field city kamu namanya "city" pakai ini,
    // kalau "kota_kab" ganti jadi "kota_kab"
    col.distinct("city", matchQuery),

    // Trend Visits
    col
      .aggregate([
        { $match: matchQuery },
        {
          $addFields: {
            parsedDate: flexParseDateExpr("$visit_date", null),
          },
        },
        { $match: { parsedDate: { $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: "%d %b", date: "$parsedDate" } },
            fullDate: { $first: "$parsedDate" },
            count: { $sum: 1 },
          },
        },
        { $sort: { fullDate: -1 } },
        { $limit: 14 },
      ])
      .toArray(),

    // Top Sales
    col
      .aggregate([
        { $match: matchQuery },
        { $group: { _id: "$nama_sales", count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ""] }, count: { $gt: 0 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),

    // KLPD Distribution
    col
      .aggregate([
        { $match: matchQuery },
        { $group: { _id: "$klpd", count: { $sum: 1 } } },
        {
          $match: {
            _id: { $nin: [null, "", "-"] },
            count: { $gt: 0 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
  ]);

  // AGGREGATE utama untuk status + ring
  const agg = await col
    .aggregate([
      { $match: matchQuery },
      {
        $project: {
          status_visit: 1,
          status_ring: 1,
        },
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },

          // visited: banyak data pakai "visited" / "visit" / "sudah_visit"
          visited: {
            $sum: {
              $cond: [
                {
                  $in: [
                    {
                      $toLower: {
                        $replaceAll: {
                          input: { $trim: { input: "$status_visit" } },
                          find: " ",
                          replacement: "_",
                        },
                      },
                    },
                    ["visited", "visit", "sudah_visit"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          stayOffice: {
            $sum: {
              $cond: [
                {
                  $in: [
                    {
                      $toLower: {
                        $replaceAll: {
                          input: { $trim: { input: "$status_visit" } },
                          find: " ",
                          replacement: "_",
                        },
                      },
                    },
                    ["stay_office", "stayoffice"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          notVisited: {
            $sum: {
              $cond: [
                {
                  $in: [
                    {
                      $toLower: {
                        $replaceAll: {
                          input: { $trim: { input: "$status_visit" } },
                          find: " ",
                          replacement: "_",
                        },
                      },
                    },
                    ["not_visited", "notvisit", "belum_visit", "belum_visited"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          ring1: {
            $sum: { $cond: [{ $eq: ["$status_ring", "RING 1"] }, 1, 0] },
          },
          ring2: {
            $sum: { $cond: [{ $eq: ["$status_ring", "RING 2"] }, 1, 0] },
          },
          ring3: {
            $sum: { $cond: [{ $eq: ["$status_ring", "RING 3"] }, 1, 0] },
          },
          ring4: {
            $sum: { $cond: [{ $eq: ["$status_ring", "RING 4"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalVisits: 1,
          visited: 1,
          stayOffice: 1,
          notVisited: 1,
          ring1: 1,
          ring2: 1,
          ring3: 1,
          ring4: 1,
        },
      },
    ])
    .toArray();

  const base = agg[0] || {
    totalVisits: 0,
    visited: 0,
    stayOffice: 0,
    notVisited: 0,
    ring1: 0,
    ring2: 0,
    ring3: 0,
    ring4: 0,
  };

  // filter distinct biar ga ngitung null/"" (sering bikin angka ngaco)
  const clean = (arr: any[]) =>
    arr
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());

  const salesCount = new Set(clean(salesDistinct)).size;
  const satkerCount = new Set(clean(satkerDistinct)).size;
  const cityCount = new Set(clean(cityDistinct)).size;

  const trend = trendAgg
    .map((x) => ({ date: x._id, count: x.count }))
    .reverse();
  const topSales = topSalesAgg.map((x) => ({ name: x._id, count: x.count }));
  const klpdMapped = klpdAgg.map((x) => ({ name: x._id, count: x.count }));

  return NextResponse.json({
    totalVisits: base.totalVisits,
    visited: base.visited,
    stayOffice: base.stayOffice,
    notVisited: base.notVisited,

    salesCount,
    satkerCount,
    cityCount,

    ring: {
      ring1: base.ring1,
      ring2: base.ring2,
      ring3: base.ring3,
      ring4: base.ring4,
    },

    trend,
    topVisit: topSales,
    topSales,
    klpd: klpdMapped,
  });
}
