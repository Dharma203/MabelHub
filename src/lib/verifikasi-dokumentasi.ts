/**
 * Verifikasi otomatis dokumentasi project.
 * Semua aturan "benar" ada di file ini — ubah di sini jika aturan bisnis berubah.
 *
 * Hasil kosong ([]) = lolos -> status dokumen "Sudah Upload".
 * Ada isi        = perlu diperiksa admin -> status dokumen "Proses Verifikasi".
 */

export const KONDISI_BARANG_VALID = ["BARU", "ADA KENDALA"] as const;

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

type VerifyInput = {
  doc: {
    namaSales?: string;
    nomorKontrak?: string;
    bendera?: string;
    entityProject?: string;
    nilaiPengadaan?: number;
    picAdmin?: string;
    requestIdSph?: string[];
    barang?: Array<{
      unitProduk?: string;
      merekBarang?: string;
      tipeBarang?: string;
      jumlahUnit?: number;
      kondisiBarang?: string;
      kendala?: string;
      fotoSerahTerima?: string;
      fotoBarang?: string;
    }>;
  };
  contract: {
    marketing?: string;
    bendera?: string;
    namaPengadaan?: string;
    nominalKontrak?: number;
    pic?: string;
    requestIds?: string[];
  } | null;
};

export function verifyDokumentasi({ doc, contract }: VerifyInput): string[] {
  const issues: string[] = [];

  if (!contract) {
    return ["Nomor kontrak tidak ditemukan di data kontrak"];
  }

  // 1. Kecocokan dengan data kontrak
  if (norm(doc.namaSales) !== norm(contract.marketing)) {
    issues.push("Nama sales tidak sesuai dengan marketing pada kontrak");
  }
  if (norm(doc.bendera) !== norm(contract.bendera)) {
    issues.push("Bendera tidak sesuai dengan data kontrak");
  }
  if (norm(doc.entityProject) !== norm(contract.namaPengadaan)) {
    issues.push("Entity project tidak sesuai dengan nama pengadaan pada kontrak");
  }
  if (Number(doc.nilaiPengadaan) !== Number(contract.nominalKontrak ?? 0)) {
    issues.push("Nilai pengadaan tidak sesuai dengan nominal kontrak");
  }
  if (norm(doc.picAdmin) !== norm(contract.pic)) {
    issues.push("PIC admin tidak sesuai dengan data kontrak");
  }

  // 2. Request ID SPH harus bagian dari request kontrak (jika kontrak punya)
  const contractReqs = (contract.requestIds ?? []).map(norm).filter(Boolean);
  if (contractReqs.length > 0) {
    const submitted = (doc.requestIdSph ?? []).map((r) => String(r ?? "").trim()).filter(Boolean);
    if (submitted.length === 0) {
      issues.push("Request ID SPH belum diisi");
    } else {
      const unknown = submitted.filter((r) => !contractReqs.includes(norm(r)));
      if (unknown.length > 0) {
        issues.push(`Request ID SPH tidak terdaftar pada kontrak: ${unknown.join(", ")}`);
      }
    }
  }

  // 3. Daftar barang
  const barang = doc.barang ?? [];
  if (barang.length === 0) {
    issues.push("Daftar barang kosong");
  }
  barang.forEach((b, i) => {
    const n = `Barang #${i + 1}`;
    if (!b.unitProduk || !b.merekBarang || !b.tipeBarang) {
      issues.push(`${n}: unit produk, merek, dan tipe wajib lengkap`);
    }
    if (!(Number(b.jumlahUnit) > 0)) {
      issues.push(`${n}: jumlah unit harus lebih dari 0`);
    }
    if (!KONDISI_BARANG_VALID.includes(b.kondisiBarang as (typeof KONDISI_BARANG_VALID)[number])) {
      issues.push(`${n}: kondisi barang belum dipilih`);
    } else if (b.kondisiBarang === "ADA KENDALA" && !b.kendala) {
      issues.push(`${n}: keterangan kendala belum diisi`);
    }
    if (!b.fotoSerahTerima) issues.push(`${n}: foto serah terima belum diunggah`);
    if (!b.fotoBarang) issues.push(`${n}: foto barang belum diunggah`);
  });

  return issues;
}
