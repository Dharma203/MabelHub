import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import {
  CONTRACT_SORT,
  MAX_EXPORT_ROWS,
  buildContractFilter,
  describeActiveFilters,
  parseContractQuery,
} from "@/lib/contract-query";
import { CONTRACT_EXPIRY_LABEL, todayString } from "@/lib/contract-status";
import {
  XLSX_CONTENT_TYPE,
  buildContractsWorkbook,
  exportFileName,
  workbookToBuffer,
} from "@/lib/contract-export";
import { CONTRACTS_COL, withDokSales } from "@/lib/contracts-data";

export const dynamic = "force-dynamic";

const DB_NAME = getDbName();

/**
 * Ekspor Excel SEMUA kontrak yang cocok dengan filter aktif (bukan hanya halaman yang tampil).
 * Memakai parser & pembangun filter yang sama dengan GET /api/contracts, jadi isi file
 * selalu sama dengan isi tabel. Parameter `page`/`pageSize` diabaikan.
 */
export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const query = parseContractQuery(searchParams);
  const today = todayString();
  const filter = buildContractFilter(query, today);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Ambil satu baris lebih banyak dari batas untuk mendeteksi kelebihan tanpa menghitung terpisah.
  const rows = await db
    .collection(CONTRACTS_COL)
    .find(filter, { projection: { _id: 0, history: 0, pembayaran: 0 } })
    .sort(CONTRACT_SORT)
    .limit(MAX_EXPORT_ROWS + 1)
    .toArray();

  if (rows.length > MAX_EXPORT_ROWS) {
    return NextResponse.json(
      {
        error: `Data terlalu banyak untuk diekspor sekaligus (lebih dari ${MAX_EXPORT_ROWS.toLocaleString("id-ID")} baris). Persempit filter lalu coba lagi.`,
      },
      { status: 413 },
    );
  }

  const data = await withDokSales(db, rows);
  const workbook = buildContractsWorkbook(data, {
    today,
    filters: describeActiveFilters(query, CONTRACT_EXPIRY_LABEL),
    exportedBy: gate.session.fullName || gate.session.username || "Admin",
    exportedAt: new Date(),
  });
  const buffer = workbookToBuffer(workbook);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${exportFileName(today)}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
      "X-Export-Rows": String(data.length),
    },
  });
}
