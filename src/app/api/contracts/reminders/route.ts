import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import {
  SEGERA_BERAKHIR_HARI,
  daysUntil,
  getContractExpiryStatus,
  shiftDate,
  todayString,
} from "@/lib/contract-status";

const DB_NAME = getDbName();
const COL_NAME = "contracts";

export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Tanggal dihitung di WIB dan memakai batas yang sama dengan halaman Kontrak,
  // supaya "Segera Berakhir" di UI dan di reminder selalu sama.
  const todayStr = todayString();
  // Batas atas eksklusif ke hari berikutnya agar nilai berformat datetime pada hari terakhir ikut terhitung.
  const untilExclusive = shiftDate(todayStr, SEGERA_BERAKHIR_HARI + 1);

  const candidates = await db
    .collection(COL_NAME)
    .find(
      {
        tanggalBerakhirKontrak: {
          $gte: todayStr,
          $lt: untilExclusive,
        },
      },
      { projection: { _id: 0 } },
    )
    .sort({ tanggalBerakhirKontrak: 1 })
    .limit(100)
    .toArray();

  const data = candidates.map((c) => ({
    ...c,
    daysLeft: daysUntil(c.tanggalBerakhirKontrak, todayStr),
    expiryStatus: getContractExpiryStatus(c.tanggalBerakhirKontrak, todayStr),
  }));

  return NextResponse.json({ data, count: data.length });
}
