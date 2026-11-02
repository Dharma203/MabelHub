import { getSuggestedProjectStatus } from "../src/lib/project-status-helper";

describe("getSuggestedProjectStatus", () => {
  it("mengusulkan DONE PROJECT jika lunas dan dokumentasi sudah disetujui", () => {
    const result = getSuggestedProjectStatus({
      status: "PENAGIHAN",
      nominalKontrak: 100000000,
      pembayaran: [{ jumlah: 60000000 }, { jumlah: 40000000 }],
      dokSales: "Disetujui",
    });

    expect(result.status).toBe("DONE PROJECT");
    expect(result.isMatch).toBe(false);
    expect(result.reason).toContain("LUNAS");
  });

  it("mengusulkan DONE PROJECT jika lunas dan dokumentasi Sudah Upload / Proses Verifikasi", () => {
    const result = getSuggestedProjectStatus({
      status: "PENAGIHAN",
      nominalKontrak: 50000000,
      pembayaran: [{ jumlah: 50000000 }],
      dokSales: "Proses Verifikasi",
    });

    expect(result.status).toBe("DONE PROJECT");
  });

  it("mengusulkan PENAGIHAN jika belum lunas meskipun dokumentasi sudah disetujui", () => {
    const result = getSuggestedProjectStatus({
      status: "PENAGIHAN",
      nominalKontrak: 100000000,
      pembayaran: [{ jumlah: 50000000 }],
      dokSales: "Disetujui",
    });

    expect(result.status).toBe("PENAGIHAN");
    expect(result.isMatch).toBe(true);
    expect(result.reason).toContain("sisa tagihan");
  });

  it("mengusulkan PENDING jika dokumentasi ditolak", () => {
    const result = getSuggestedProjectStatus({
      status: "PENAGIHAN",
      nominalKontrak: 100000000,
      pembayaran: [{ jumlah: 100000000 }],
      dokSales: "Ditolak",
    });

    expect(result.status).toBe("PENDING");
    expect(result.reason).toContain("Ditolak");
  });

  it("mengusulkan PENAGIHAN jika lunas tetapi belum upload dokumentasi", () => {
    const result = getSuggestedProjectStatus({
      status: "PENAGIHAN",
      nominalKontrak: 100000000,
      pembayaran: [{ jumlah: 100000000 }],
      dokSales: "Belum Upload",
    });

    expect(result.status).toBe("PENAGIHAN");
    expect(result.reason).toContain("belum diunggah");
  });
});

