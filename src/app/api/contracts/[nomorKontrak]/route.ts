import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import { DOK_AKTIF_FILTER } from "@/lib/dokumentasi-arsip";

export const dynamic = "force-dynamic";

const DB_NAME = getDbName();
const COL_NAME = "contracts";

async function getParams<T>(ctx: { params: T | Promise<T> }) {
  return await Promise.resolve(ctx.params);
}

export async function GET(
  req: Request,
  { params } : { params: Promise<{ nomorKontrak : string }>}
) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { nomorKontrak } = await params
  const nk = decodeURIComponent(nomorKontrak);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const doc = await db
    .collection(COL_NAME)
    .findOne({ nomorKontrak: nk }, { projection: { _id: 0 } });

  if (!doc) {
    return NextResponse.json(
      { error: "Kontrak tidak ditemukan" },
      { status: 404 },
    );
  }

  const hasDok = await db
    .collection("dokumentasi_project")
    .findOne({ nomorKontrak: nk, ...DOK_AKTIF_FILTER });

  return NextResponse.json({
    data: {
      ...doc,
      dokSales: !hasDok
        ? "Belum Upload"
        : doc.dokSales === "Proses Verifikasi"
          ? "Proses Verifikasi"
          : "Sudah Upload",
    },
  });
}

export async function PUT(
  req: Request,
  { params } : { params: Promise<{ nomorKontrak : string }>}
) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { nomorKontrak } = await params
  const nk = decodeURIComponent(nomorKontrak);

  const body = await req.json().catch(() => ({}));

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const existing = await db.collection(COL_NAME).findOne({ nomorKontrak: nk });
  if (!existing) {
    return NextResponse.json(
      { error: "Kontrak tidak ditemukan" },
      { status: 404 },
    );
  }

  const now = new Date();

  const setPayload: any = {
    updatedAt: now,
  };

  // Update fields if provided
  const stringFields = [
    "link", "namaFolder", "instansi", "tanggalKontrak",
    "namaPengadaan", "keterangan", "marketing", "bendera",
    "tanggalPenyerahan", "catatan", "pic", "tanggalBerakhirKontrak",
    "perusahaan", "status", "dokSales",
  ];

  for (const f of stringFields) {
    if (body[f] !== undefined) {
      setPayload[f] = String(body[f] ?? "").trim();
    }
  }

  if (
    setPayload.dokSales !== undefined &&
    !["Belum Upload", "Proses Verifikasi", "Sudah Upload"].includes(setPayload.dokSales)
  ) {
    return NextResponse.json({ error: "Status dokumen tidak valid" }, { status: 400 });
  }

  if (body.nominalKontrak !== undefined) {
    const nom = Number(body.nominalKontrak) || 0;
    if (nom < 0) {
      return NextResponse.json(
        { error: "Nominal Kontrak tidak boleh bernilai negatif" },
        { status: 400 },
      );
    }
    setPayload.nominalKontrak = nom;
  }

  const tglKontrak = setPayload.tanggalKontrak !== undefined ? setPayload.tanggalKontrak : existing.tanggalKontrak;
  const tglBerakhir = setPayload.tanggalBerakhirKontrak !== undefined ? setPayload.tanggalBerakhirKontrak : existing.tanggalBerakhirKontrak;
  if (tglKontrak && tglBerakhir && tglBerakhir < tglKontrak) {
    return NextResponse.json(
      { error: "Tanggal Berakhir harus lebih besar atau sama dengan Tanggal Kontrak" },
      { status: 400 },
    );
  }

  if (body.fisik !== undefined) {
    setPayload.fisik = body.fisik === "YA" ? "YA" : "TIDAK";
  }

  if (body.scan !== undefined) {
    setPayload.scan = body.scan === "YA" ? "YA" : "TIDAK";
  }

  if (body.requestIds !== undefined && Array.isArray(body.requestIds)) {
    setPayload.requestIds = body.requestIds
      .map((id: any) => String(id).trim())
      .filter(Boolean);
  }

  // Update penagihan (embedded)
  if (body.penagihan !== undefined) {
    setPayload.penagihan = {
      tanggalMulai: String(body.penagihan?.tanggalMulai ?? "").trim(),
      tanggalBerakhir: String(body.penagihan?.tanggalBerakhir ?? "").trim(),
      nominalPenagihan: Number(body.penagihan?.nominalPenagihan) || 0,
    };
  }

  // Update pembayaran (embedded array)
  if (body.pembayaran !== undefined && Array.isArray(body.pembayaran)) {
    setPayload.pembayaran = body.pembayaran.map((p: any) => ({
      id: String(p.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      tanggal: String(p.tanggal ?? "").trim(),
      jumlah: Number(p.jumlah) || 0,
      keterangan: String(p.keterangan ?? "").trim(),
      createdAt: p.createdAt ? new Date(p.createdAt) : now,
      createdBy: String(p.createdBy || gate.session.fullName || gate.session.username || "Admin"),
    }));
  }

  const FIELD_LABELS: Record<string, string> = {
    namaPengadaan: "Nama Pengadaan",
    instansi: "Instansi",
    bendera: "Bendera",
    perusahaan: "Perusahaan",
    tanggalKontrak: "Tanggal Kontrak",
    tanggalBerakhirKontrak: "Tanggal Berakhir",
    tanggalPenyerahan: "Tanggal Penyerahan",
    link: "Link GDrive",
    namaFolder: "Nama Folder",
    keterangan: "Keterangan",
    catatan: "Catatan",
    marketing: "Marketing",
    pic: "PIC",
    status: "Status",
    dokSales: "Dokumen Sales",
  };

  const changes: {
    field: string;
    label: string;
    oldValue: string;
    newValue: string;
  }[] = [];

  for (const f of stringFields) {
    if (setPayload[f] !== undefined) {
      const oldVal = String(existing[f] ?? "").trim();
      const newVal = String(setPayload[f] ?? "").trim();
      if (oldVal !== newVal) {
        changes.push({
          field: f,
          label: FIELD_LABELS[f] || f,
          oldValue: oldVal || "-",
          newValue: newVal || "-",
        });
      }
    }
  }

  if (setPayload.nominalKontrak !== undefined) {
    const oldNom = Number(existing.nominalKontrak) || 0;
    const newNom = Number(setPayload.nominalKontrak) || 0;
    if (oldNom !== newNom) {
      changes.push({
        field: "nominalKontrak",
        label: "Nominal Kontrak",
        oldValue: `Rp ${oldNom.toLocaleString("id-ID")}`,
        newValue: `Rp ${newNom.toLocaleString("id-ID")}`,
      });
    }
  }

  if (setPayload.fisik !== undefined) {
    const oldFisik = existing.fisik || "TIDAK";
    if (oldFisik !== setPayload.fisik) {
      changes.push({
        field: "fisik",
        label: "Fisik",
        oldValue: oldFisik,
        newValue: setPayload.fisik,
      });
    }
  }

  if (setPayload.scan !== undefined) {
    const oldScan = existing.scan || "TIDAK";
    if (oldScan !== setPayload.scan) {
      changes.push({
        field: "scan",
        label: "Scan",
        oldValue: oldScan,
        newValue: setPayload.scan,
      });
    }
  }

  if (setPayload.requestIds !== undefined) {
    const oldReqs = Array.isArray(existing.requestIds)
      ? existing.requestIds.join(", ")
      : "";
    const newReqs = Array.isArray(setPayload.requestIds)
      ? setPayload.requestIds.join(", ")
      : "";
    if (oldReqs !== newReqs) {
      changes.push({
        field: "requestIds",
        label: "Request IDs Terkait",
        oldValue: oldReqs || "-",
        newValue: newReqs || "-",
      });
    }
  }

  if (setPayload.pembayaran !== undefined) {
    const oldArr: any[] = Array.isArray(existing.pembayaran) ? existing.pembayaran : [];
    const newArr: any[] = setPayload.pembayaran;
    const oldSum = oldArr.reduce((acc, p) => acc + (Number(p.jumlah) || 0), 0);
    const newSum = newArr.reduce((acc, p) => acc + (Number(p.jumlah) || 0), 0);
    if (oldSum !== newSum || oldArr.length !== newArr.length) {
      changes.push({
        field: "pembayaran",
        label: "Pencatatan Pembayaran",
        oldValue: `${oldArr.length} pembayaran (Total: Rp ${oldSum.toLocaleString("id-ID")})`,
        newValue: `${newArr.length} pembayaran (Total: Rp ${newSum.toLocaleString("id-ID")})`,
      });
    }
  }

  const updateQuery: any = {
    $set: setPayload,
  };

  if (setPayload.dokSales === "Sudah Upload") {
    updateQuery.$unset = { dokVerifikasi: "" };
  }

  if (changes.length > 0) {
    const historyEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      at: now,
      by: gate.session.fullName || gate.session.username || "Admin",
      role: gate.session.role || "ADMIN",
      action: "UPDATE",
      changes,
    };

    updateQuery.$push = {
      history: {
        $each: [historyEntry],
        $position: 0,
      },
    };
  }

  const rawResult = await db.collection(COL_NAME).findOneAndUpdate(
    { nomorKontrak: nk },
    updateQuery,
    { returnDocument: "after", projection: { _id: 0 } },
  );

  const updated = rawResult?.value ?? rawResult ?? null;

  if (!updated) {
    return NextResponse.json(
      { error: "Gagal menyimpan kontrak" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: Request,
  { params } : { params: Promise<{ nomorKontrak : string }>}
) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { nomorKontrak } = await params
  const nk = decodeURIComponent(nomorKontrak);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const result = await db.collection(COL_NAME).deleteOne({ nomorKontrak: nk });

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { error: "Kontrak tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
