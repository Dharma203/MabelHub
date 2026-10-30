import { buildDataProjectWorkbook } from "../src/lib/data-project-export";

describe("buildDataProjectWorkbook", () => {
  it("menghasilkan workbook Excel dengan sheet dan data yang sesuai", () => {
    const mockItems = [
      {
        nomorKontrak: "K-001/MBL/2026",
        marketing: "Dharma",
        bendera: "PT Mabel Maju",
        instansi: "Dinas Pendidikan",
        namaPengadaan: "Meja Sekolah",
        tanggalKontrak: "2026-01-10",
        nominalKontrak: 100000000,
        dokSales: "Disetujui",
        status: "DONE PROJECT",
        pembayaran: [
          { tanggal: "2026-01-15", jumlah: 50000000, keterangan: "DP 50%" },
          { tanggal: "2026-02-15", jumlah: 50000000, keterangan: "Pelunasan" },
        ],
      },
      {
        nomorKontrak: "K-002/MBL/2026",
        marketing: "Sari",
        bendera: "CV Maju Jaya",
        instansi: "Dinas Kesehatan",
        namaPengadaan: "Kursi Tunggu",
        tanggalKontrak: "2026-02-01",
        nominalKontrak: 50000000,
        dokSales: "Belum Upload",
        status: "PENAGIHAN",
        pembayaran: [{ tanggal: "2026-02-10", jumlah: 20000000 }],
      },
    ];

    const meta = {
      today: "30 Oktober 2026, 15:58 WIB",
      exportedBy: "Superadmin",
      exportedAt: new Date(),
      filters: [{ label: "Status Project", value: "Semua" }],
    };

    const wb = buildDataProjectWorkbook(mockItems, meta);

    expect(wb.SheetNames).toEqual(["Data Project", "Ringkasan Filter"]);
    const ws = wb.Sheets["Data Project"];
    expect(ws).toBeDefined();

    // Pastikan range !ref mencakup 1 baris header + 2 baris data (A1:T3)
    expect(ws["!ref"]).toBe("A1:T3");
  });
});

