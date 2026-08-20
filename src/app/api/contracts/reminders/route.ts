import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";

const DB_NAME = getDbName();
const COL_NAME = "contracts";

export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Format as YYYY-MM-DD for string comparison
  const todayStr = now.toISOString().slice(0, 10);
  const futureStr = sevenDaysLater.toISOString().slice(0, 10);

  // Find contracts where tanggalBerakhirKontrak is between today and 7 days from now
  const items = await db
    .collection(COL_NAME)
    .find(
      {
        tanggalBerakhirKontrak: {
          $gte: todayStr,
          $lte: futureStr,
        },
      },
      { projection: { _id: 0 } },
    )
    .sort({ tanggalBerakhirKontrak: 1 })
    .limit(100)
    .toArray();

  return NextResponse.json({ data: items, count: items.length });
}
