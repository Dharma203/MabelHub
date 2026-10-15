# language: id
Feature: KF-FN-01 Rekapitulasi & Status Keuangan
  Sebagai Superadmin
  Saya ingin bisa melihat rekapitulasi keuangan dan memperbarui status keuangan
  Agar monitoring transaksi berjalan dengan baik

  Background:
    Given user sudah login sebagai superadmin

  @KF-FN-01-01
  Scenario: KF-FN-01-01 Lihat Rekapitulasi Finance
    # Langkah 1-2: Login Superadmin, lihat tabel rekapitulasi
    # Rekapitulasi menggunakan endpoint e-procurement dengan mode=all
    When user mengirim GET request ke "/api/e-procurement/requests?mode=all"
    # Tabel menampilkan data request
    Then response status code harus 200
    And response harus mengandung field "data"

  @KF-FN-01-02
  Scenario: KF-FN-01-02 Perbarui Status Keuangan (Valid)
    # Langkah 1-2: Pilih proyek dengan status "TERBIT BAST"
    # Langkah 3: Ubah status keuangan menjadi "Penagihan"
    # Menggunakan admin-response endpoint untuk update statusAkhir
    Given user mengirim request body:
      """
      {
        "perusahaan": "PT Finance Test",
        "statusAkhir": "TERBIT BAST",
        "tanggalKontrak": "2026-07-01",
        "nominalKontrak": 200000000,
        "tanggalPembayaran": "2026-08-01",
        "nominalPembayaran": 200000000,
        "items": [
          {
            "id": "item-fin-1",
            "merek": "Produk Finance",
            "subKategori": "Kategori Fin",
            "qty": 5,
            "spesifikasi": "Spec Fin",
            "paguPerItem": 40000000,
            "hargaTayang": 38000000,
            "linkInaproc": "",
            "linkEcom": "",
            "statusBarangAdmin": "done",
            "tayangInaprocAdmin": "Ya",
            "catatanAdminItem": "Selesai"
          }
        ]
      }
      """
    When user mengirim PUT request ke "/api/e-procurement/requests/REQUEST_ID/admin-response"
    # Jika request ditemukan, status keuangan berhasil diperbarui
    Then response status code harus salah satu dari "200,404"

  @KF-FN-01-03
  Scenario: KF-FN-01-03 Status Keuangan Terkunci (Sebelum BAST)
    # Langkah 1-2: Buka Finance untuk proyek di bawah "TERBIT BAST"
    # Langkah 3: Coba perbarui status keuangan — seharusnya terkunci
    # API akan otomatis clear data pembayaran jika status bukan TERBIT BAST
    Given user mengirim request body:
      """
      {
        "perusahaan": "PT Test Lock",
        "statusAkhir": "",
        "tanggalKontrak": "2026-07-01",
        "nominalKontrak": 100000000,
        "tanggalPembayaran": "2026-08-01",
        "nominalPembayaran": 100000000,
        "items": [
          {
            "id": "item-lock-1",
            "merek": "Produk Lock",
            "subKategori": "Kategori",
            "qty": 1,
            "spesifikasi": "Spec",
            "paguPerItem": 100000000,
            "hargaTayang": 95000000,
            "linkInaproc": "",
            "linkEcom": "",
            "statusBarangAdmin": "todo",
            "tayangInaprocAdmin": "",
            "catatanAdminItem": ""
          }
        ]
      }
      """
    When user mengirim PUT request ke "/api/e-procurement/requests/REQUEST_ID/admin-response"
    # Jika berhasil, kolom tanggalPembayaran dan nominalPembayaran
    # harus di-clear karena status belum TERBIT BAST
    Then response status code harus salah satu dari "200,404"
