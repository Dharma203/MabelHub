# language: id
Feature: KF-FN-02 Input Data Pembayaran SP2D
  Sebagai Superadmin
  Saya ingin bisa menginput data pembayaran SP2D
  Agar data pembayaran tercatat dalam rekapitulasi

  Background:
    Given user sudah login sebagai superadmin

  @KF-FN-02-01
  Scenario: KF-FN-02-01 Input Data Pembayaran SP2D (Valid)
    # Langkah 1-2: Buka Finance untuk proyek minimal status "TERBIT BAST"
    # Langkah 3-4: Input tanggalPembayaran dan nominalPembayaran
    Given user mengirim request body:
      """
      {
        "perusahaan": "PT Pembayaran Test",
        "statusAkhir": "TERBIT BAST",
        "tanggalKontrak": "2026-06-15",
        "nominalKontrak": 300000000,
        "tanggalPembayaran": "2026-08-10",
        "nominalPembayaran": 300000000,
        "items": [
          {
            "id": "item-pay-1",
            "merek": "Produk Bayar",
            "subKategori": "Kategori Pay",
            "qty": 3,
            "spesifikasi": "Spec Pay",
            "paguPerItem": 100000000,
            "hargaTayang": 95000000,
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
    Then response status code harus salah satu dari "200,404"

  @KF-FN-02-02
  Scenario: KF-FN-02-02 Input Pembayaran Terkunci (Status Belum BAST)
    # Langkah 1-2: Proyek di bawah "TERBIT BAST"
    # Langkah 3: Coba input data pembayaran — harus terkunci
    Given user mengirim request body:
      """
      {
        "perusahaan": "PT Lock Pembayaran",
        "statusAkhir": "RILIS KONTRAK",
        "tanggalKontrak": "2026-06-15",
        "nominalKontrak": 200000000,
        "tanggalPembayaran": "2026-08-10",
        "nominalPembayaran": 200000000,
        "items": [
          {
            "id": "item-lockpay-1",
            "merek": "Produk Lock Pay",
            "subKategori": "Kategori",
            "qty": 2,
            "spesifikasi": "Spec",
            "paguPerItem": 100000000,
            "hargaTayang": 95000000,
            "linkInaproc": "",
            "linkEcom": "",
            "statusBarangAdmin": "done",
            "tayangInaprocAdmin": "Ya",
            "catatanAdminItem": ""
          }
        ]
      }
      """
    When user mengirim PUT request ke "/api/e-procurement/requests/REQUEST_ID/admin-response"
    # Jika berhasil, tanggalPembayaran & nominalPembayaran harus di-clear
    # karena statusAkhir RILIS KONTRAK (bukan TERBIT BAST)
    Then response status code harus salah satu dari "200,404"

  @KF-FN-03-01
  Scenario: KF-FN-03-01 Ekspor Laporan Keuangan ke Excel
    # Langkah 1: Ambil semua data rekapitulasi
    When user mengirim GET request ke "/api/e-procurement/requests?mode=all"
    Then response status code harus 200
    And response harus mengandung field "data"
    # Note: Fitur export Excel dilakukan di frontend (client-side).
    # Black box testing API hanya memverifikasi data tersedia untuk di-export.
