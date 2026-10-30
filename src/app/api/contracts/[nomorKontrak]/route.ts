import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import { DOK_AKTIF_FILTER } from "@/lib/dokumentasi-arsip";
import { getSuggestedProjectStatus } from "@/lib/project-status-helper";

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

  const currentDok = String(doc.dokSales ?? "").trim();
  const validDok = ["Proses Verifikasi", "Disetujui", "Ditolak", "Sudah Upload"];
  const dokSales = !hasDok
    ? "Belum Upload"
    : validDok.includes(currentDok)
      ? currentDok
      : "Sudah Upload";

  const contractData = {
    ...doc,
    dokSales,
  };
  const suggestedStatus = getSuggestedProjectStatus(contractData);

  return NextResponse.json({
    data: contractData,
    suggestedStatus,
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

  const VALID_DOK_STATUSES = [
    "Belum Upload",
    "Proses Verifikasi",
    "Disetujui",
    "Ditolak",
    "Sudah Upload",
  ];

  if (
    setPayload.dokSales !== undefined &&
    !VALID_DOK_STATUSES.includes(setPayload.dokSales)
  ) {
    return NextResponse.json({ error: "Status dokumen tidak valid" }, { status: 400 });
  }

  // Jika menolak dokumentasi, alasan penolakan wajib diisi
  if (setPayload.dokSales === "Ditolak") {
    const alasan = String(body.alasanPenolakan ?? "").trim();
    if (!alasan) {
      return NextResponse.json(
        { error: "Alasan penolakan wajib diisi ketika menolak dokumentasi" },
        { status: 400 },
      );
    }
    setPayload.alasanPenolakan = alasan;
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

  // Otomatisasi status project (DONE PROJECT / PENAGIHAN / PENDING)
  const effectiveNominal = setPayload.nominalKontrak !== undefined ? setPayload.nominalKontrak : existing.nominalKontrak;
  const effectivePembayaran = setPayload.pembayaran !== undefined ? setPayload.pembayaran : existing.pembayaran;
  const effectiveDokSales = setPayload.dokSales !== undefined ? setPayload.dokSales : existing.dokSales;

  if (body.autoStatus === true) {
    const suggested = getSuggestedProjectStatus({
      status: existing.status,
      nominalKontrak: effectiveNominal,
      pembayaran: effectivePembayaran,
      dokSales: effectiveDokSales,
    });
    setPayload.status = suggested.status;
  } else if (body.status === undefined && (setPayload.pembayaran !== undefined || setPayload.dokSales !== undefined)) {
    const suggested = getSuggestedProjectStatus({
      status: existing.status,
      nominalKontrak: effectiveNominal,
      pembayaran: effectivePembayaran,
      dokSales: effectiveDokSales,
    });
    if (suggested.status === "DONE PROJECT" && existing.status !== "DONE PROJECT") {
      setPayload.status = "DONE PROJECT";
    }
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

  const adminName = gate.session.fullName || gate.session.username || "Admin";

  if (setPayload.dokSales !== undefined) {
    if (setPayload.dokSales === "Disetujui" || setPayload.dokSales === "Sudah Upload") {
      setPayload.alasanPenolakan = "";
      setPayload.dokVerifikasi = {
        ...(existing.dokVerifikasi || {}),
        status: "DISETUJUI",
        verifiedBy: adminName,
        verifiedAt: now,
        alasanPenolakan: "",
      };
    } else if (setPayload.dokSales === "Ditolak") {
      const alasan = String(body.alasanPenolakan ?? "").trim();
      setPayload.alasanPenolakan = alasan;
      setPayload.dokVerifikasi = {
        ...(existing.dokVerifikasi || {}),
        status: "DITOLAK",
        alasanPenolakan: alasan,
        verifiedBy: adminName,
        verifiedAt: now,
      };
      changes.push({
        field: "alasanPenolakan",
        label: "Alasan Penolakan",
        oldValue: existing.alasanPenolakan || "-",
        newValue: alasan,
      });
    } else if (setPayload.dokSales === "Proses Verifikasi") {
      setPayload.alasanPenolakan = "";
      setPayload.dokVerifikasi = {
        ...(existing.dokVerifikasi || {}),
        status: "PERLU_DIPERIKSA",
        alasanPenolakan: "",
      };
    }
  }

  const updateQuery: any = {
    $set: setPayload,
  };

  if (changes.length > 0) {
    const historyEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      at: now,
      by: adminName,
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

  if (
    setPayload.dokSales &&
    ["Disetujui", "Sudah Upload", "Ditolak", "Proses Verifikasi"].includes(setPayload.dokSales)
  ) {
    const dokStatus =
      setPayload.dokSales === "Ditolak"
        ? "DITOLAK"
        : setPayload.dokSales === "Disetujui" || setPayload.dokSales === "Sudah Upload"
          ? "DISETUJUI"
          : "PERLU_DIPERIKSA";

    const dokUpdate: Record<string, any> = {
      "verifikasi.status": dokStatus,
      "verifikasi.verifiedBy": adminName,
      "verifikasi.verifiedAt": now,
      updatedAt: now,
    };
    if (setPayload.dokSales === "Ditolak") {
      dokUpdate["verifikasi.alasanPenolakan"] = String(body.alasanPenolakan ?? "").trim();
    } else {
      dokUpdate["verifikasi.alasanPenolakan"] = "";
    }

    await db.collection("dokumentasi_project").updateMany(
      { nomorKontrak: nk, ...DOK_AKTIF_FILTER },
      { $set: dokUpdate },
    );
  }

  const suggestedStatus = getSuggestedProjectStatus({
    ...updated,
    dokSales: setPayload.dokSales !== undefined ? setPayload.dokSales : existing.dokSales,
  });

  return NextResponse.json({ data: updated, suggestedStatus });
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
