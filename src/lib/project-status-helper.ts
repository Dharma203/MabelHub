export type ProjectStatus = "DONE PROJECT" | "PENAGIHAN" | "PENDING";

export type StatusSuggestion = {
  status: ProjectStatus;
  reason: string;
  isMatch: boolean;
};

/**
 * Menghitung usulan status otomatis untuk suatu project/kontrak.
 * Aturan bisnis:
 * 1. DONE PROJECT: Pembayaran telah LUNAS dan dokumentasi project sudah diupload / disetujui.
 * 2. PENDING: Dokumentasi ditolak oleh admin (menunggu revisi sales) atau ada penangguhan.
 * 3. PENAGIHAN: Belum lunas (masih ada sisa tagihan) atau menunggu proses pembayaran.
 */
export function getSuggestedProjectStatus(contract: {
  status?: string;
  nominalKontrak?: number;
  pembayaran?: Array<{ jumlah?: number }>;
  dokSales?: string;
}): StatusSuggestion {
  const currentStatus = (contract.status || "PENAGIHAN").trim().toUpperCase();
  const nominal = Number(contract.nominalKontrak) || 0;
  const totalBayar = (contract.pembayaran || []).reduce(
    (sum, p) => sum + (Number(p.jumlah) || 0),
    0
  );
  const sisa = Math.max(0, nominal - totalBayar);
  const isLunas = nominal > 0 && sisa <= 0;
  const dokSales = contract.dokSales || "Belum Upload";

  const isDokApproved = dokSales === "Disetujui" || dokSales === "Sudah Upload";
  const isDokProses = dokSales === "Proses Verifikasi";
  const isDokRejected = dokSales === "Ditolak";
  const isDokUploaded = isDokApproved || isDokProses;

  let status: ProjectStatus = "PENAGIHAN";
  let reason = "";

  // 1. DONE PROJECT: Lunas dan dokumentasi sudah diupload / disetujui
  if (isLunas && isDokUploaded) {
    status = "DONE PROJECT";
    if (isDokApproved) {
      reason = "Pembayaran telah LUNAS dan dokumentasi project sudah disetujui.";
    } else {
      reason = "Pembayaran telah LUNAS dan dokumentasi sudah diunggah (proses verifikasi).";
    }
  }
  // 2. PENDING: Jika dokumentasi ditolak oleh admin
  else if (isDokRejected) {
    status = "PENDING";
    reason = "Dokumentasi project Ditolak oleh admin dan menunggu revisi sales.";
  }
  // 3. PENAGIHAN: Jika belum lunas
  else if (!isLunas) {
    status = "PENAGIHAN";
    if (dokSales === "Belum Upload") {
      reason = `Belum lunas (sisa tagihan Rp ${sisa.toLocaleString("id-ID")}) dan dokumentasi belum diunggah.`;
    } else {
      reason = `Masih ada sisa tagihan Rp ${sisa.toLocaleString("id-ID")}.`;
    }
  }
  // 4. Lunas tapi belum upload dokumentasi
  else {
    status = "PENAGIHAN";
    reason = "Pembayaran sudah lunas tetapi dokumentasi serah terima barang belum diunggah.";
  }

  return {
    status,
    reason,
    isMatch: currentStatus === status,
  };
}

