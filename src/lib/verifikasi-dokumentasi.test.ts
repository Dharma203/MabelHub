import { verifyDokumentasi } from "./verifikasi-dokumentasi";

const contract = {
  marketing: "Budi", bendera: "ABC", namaPengadaan: "Pengadaan Laptop",
  nominalKontrak: 1000000, pic: "Sari", requestIds: ["R1", "R2"],
};
const goodDoc = {
  namaSales: "budi", nomorKontrak: "K-1", bendera: "ABC", entityProject: "Pengadaan Laptop",
  nilaiPengadaan: 1000000, picAdmin: "Sari", requestIdSph: ["R1"],
  barang: [{
    unitProduk: "Laptop", merekBarang: "X", tipeBarang: "Y", jumlahUnit: 2,
    kondisiBarang: "BARU", kendala: "", fotoSerahTerima: "/uploads/a.jpg", fotoBarang: "/uploads/b.jpg",
  }],
};

describe("verifyDokumentasi", () => {
  it("lolos jika semua sesuai", () => {
    expect(verifyDokumentasi({ doc: goodDoc, contract })).toEqual([]);
  });
  it("kontrak tidak ditemukan", () => {
    expect(verifyDokumentasi({ doc: goodDoc, contract: null })).toHaveLength(1);
  });
  it("mendeteksi nilai dan sales yang tidak cocok", () => {
    const r = verifyDokumentasi({ doc: { ...goodDoc, nilaiPengadaan: 5, namaSales: "Andi" }, contract });
    expect(r).toHaveLength(2);
  });
  it("mendeteksi request ID asing, foto kosong, dan kendala tanpa keterangan", () => {
    const doc = {
      ...goodDoc, requestIdSph: ["R9"],
      barang: [{ ...goodDoc.barang[0], kondisiBarang: "ADA KENDALA", fotoBarang: "" }],
    };
    expect(verifyDokumentasi({ doc, contract })).toHaveLength(3);
  });
});
