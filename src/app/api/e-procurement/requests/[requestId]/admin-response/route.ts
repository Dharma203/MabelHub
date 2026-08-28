import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

async function getParams<T>(ctx: { params: T | Promise<T> }) {
  return await Promise.resolve(ctx.params);
}

export async function PUT(
  req: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Hanya ADMIN dan SUPERADMIN yang boleh mengubah status response
  if (auth.session.role !== "ADMIN" && auth.session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { requestId } = await getParams(ctx);
  const rid = decodeURIComponent(requestId);

  const body = await req.json().catch(() => ({}));

  const perusahaan = String(body.perusahaan ?? "").trim();
  const statusAkhirInput = String(body.statusAkhir ?? "").trim();
  // Financial & Contract Fields
  const tanggalKontrak = String(body.tanggalKontrak ?? "").trim();
  const nominalKontrakRaw = Number(body.nominalKontrak);
  const nominalKontrak = isNaN(nominalKontrakRaw) ? 0 : nominalKontrakRaw;

  // Catatan Admin global digantikan fallback/di-ignore.
  // We keep it in DB schema as optional but stop getting it globally.
  const CATATAN_GLOBAL_OBSOLETE = "";

  const tanggalPembayaran = String(body.tanggalPembayaran ?? "").trim();
  const nominalPembayaranRaw = Number(body.nominalPembayaran);
  const nominalPembayaran = isNaN(nominalPembayaranRaw)
    ? 0
    : nominalPembayaranRaw;

  const incomingItems = Array.isArray(body.items) ? body.items : [];

  const client = await clientPromise;
  const db = client.db(getDbName());
  const col = db.collection("eproc_requests");

  const existing = await col.findOne({ requestId: rid });
  if (!existing) {
    return NextResponse.json(
      { error: "Request tidak ditemukan" },
      { status: 404 },
    );
  }

  // Jika ADMIN biasa, pastikan dia yang ambil request-nya
  if (auth.session.role === "ADMIN") {
    if (existing.takenByAdminId !== auth.session.userId) {
      return NextResponse.json(
        {
          error:
            "Hanya Admin yang mengambil request yang dapat mengubah statusnya",
        },
        { status: 403 },
      );
    }
  }

  const existingItems = existing.items || [];
  const now = new Date();

  // Merge items to manage tanggalProses and tanggalDone
  const items = incomingItems.map((inItem: any) => {
    const exItem = existingItems.find((e: any) => e.id === inItem.id) || {};
    const outItem = { ...inItem };

    // Preserve existing dates
    if (exItem.tanggalProses) outItem.tanggalProses = exItem.tanggalProses;
    if (exItem.tanggalDone) outItem.tanggalDone = exItem.tanggalDone;

    // Check if status changed
    const oldStatus = (exItem.statusBarangAdmin || "").toLowerCase();
    const newStatus = (inItem.statusBarangAdmin || "").toLowerCase();

    if (newStatus !== oldStatus) {
      if (newStatus === "progress" && !outItem.tanggalProses) {
        outItem.tanggalProses = now;
      }
      if (newStatus === "done" && !outItem.tanggalDone) {
        outItem.tanggalDone = now;
      }
    }

    // New: Per-item Catatan Admin
    if (inItem.catatanAdminItem !== undefined) {
      outItem.catatanAdminItem = String(inItem.catatanAdminItem).trim();
    }

    // New: Per-item Perusahaan Admin
    if (inItem.perusahaanAdminItem !== undefined) {
      outItem.perusahaanAdminItem = String(inItem.perusahaanAdminItem).trim();
    }

    return outItem;
  });

  // Backward compatibility: set global perusahaan to the first item's vendor if available
  const finalPerusahaan =
    items.length > 0 ? items[0].perusahaanAdminItem || perusahaan : perusahaan;

  // Auto-calculate statusAkhir
  let computedStatus = "Masuk";
  if (items && items.length > 0) {
    const total = items.length;
    let countDone = 0;
    let countProgress = 0;
    let countHold = 0;
    let countCancel = 0;

    for (const it of items) {
      const st = (it.statusBarangAdmin || "").toLowerCase();
      if (st === "done") countDone++;
      else if (st === "progress") countProgress++;
      else if (st === "hold") countHold++;
      else if (st === "cancel") countCancel++;
    }

    if (countProgress > 0) {
      computedStatus = "Proses";
    } else if (countDone === total) {
      computedStatus = "Done";
    } else if (countDone > 0 && countDone + countHold + countCancel === total) {
      // Ada yang done, sisanya cuma hold/cancel
      computedStatus = "Done";
    } else if (countCancel === total) {
      // ✅ Jika semuanya cancel
      computedStatus = "Cancel";
    } else if (countHold === total) {
      // ✅ Jika semuanya hold
      computedStatus = "Hold";
    } else if (countDone > 0 || countHold > 0 || countCancel > 0) {
      // fallback if there's a mix but no progress and not matching above
      computedStatus = "Proses";
    }
  }

  const finalStatusAkhir = computedStatus === "Done" ? statusAkhirInput : "";

  // Set the payload for MongoDB
  const setPayload: any = {
    perusahaan: finalPerusahaan,
    catatanAdmin: CATATAN_GLOBAL_OBSOLETE, // Blank out the old one
    items,
    statusUsulan: computedStatus,
    statusAkhir: finalStatusAkhir,
    updatedAt: now,
  };

  // Track timestamp when status usulan becomes resolved (Done/Cancel/Hold) for PIC avg response time
  const isResolved = computedStatus === "Done" || computedStatus === "Cancel" || computedStatus === "Hold";
  if (isResolved && !existing.statusUsulanResolvedAt) {
    setPayload.statusUsulanResolvedAt = now;
  } else if (!isResolved) {
    // Reset if status reverted to non-resolved (e.g. back to Proses)
    setPayload.statusUsulanResolvedAt = null;
  }

  const isRilisKontrak = finalStatusAkhir.toUpperCase() === "RILIS KONTRAK";
  const isTerbitBast = finalStatusAkhir.toUpperCase() === "TERBIT BAST";

  // Only bind finance fields if the status allows it
  if (isRilisKontrak || isTerbitBast) {
    setPayload.tanggalKontrak = tanggalKontrak;
    setPayload.nominalKontrak = nominalKontrak;
  } else {
    // Clear out if downgraded
    setPayload.tanggalKontrak = "";
    setPayload.nominalKontrak = 0;
  }

  if (isTerbitBast) {
    setPayload.tanggalPembayaran = tanggalPembayaran;
    setPayload.nominalPembayaran = nominalPembayaran;
  } else {
    // Clear out if downgraded
    setPayload.tanggalPembayaran = "";
    setPayload.nominalPembayaran = 0;
  }

  const rawResult = await col.findOneAndUpdate(
    { requestId: rid },
    { $set: setPayload },
    { returnDocument: "after", projection: { _id: 0 } },
  );

  const updated = rawResult?.value ?? rawResult ?? null;

  if (!updated) {
    return NextResponse.json(
      { error: "Gagal menyimpan response admin" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: updated });
}
