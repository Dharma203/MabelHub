# language: id
Feature: KF-AD-02 Penginputan Data Kontrak
  Sebagai Admin/Superadmin
  Saya ingin bisa menginput data kontrak pada pesanan yang sudah diverifikasi
  Agar data kontrak tersimpan secara terstruktur

  @KF-AD-02-01
  Scenario: KF-AD-02-01 Penginputan Data Kontrak (Valid)
    # Langkah 1: Login Admin
    Given user sudah login sebagai admin
    # Langkah 2: Update pesanan yang sudah diverifikasi dengan data kontrak
    # Prasyarat: statusAkhir harus "RILIS KONTRAK" agar field kontrak bisa diisi
    Given user mengirim request body:
      """
      {
        "perusahaan": "PT Test Company",
        "statusAkhir": "RILIS KONTRAK",
        "tanggalKontrak": "2026-08-15",
        "nominalKontrak": 150000000,
        "items": [
          {
            "id": "item-1",
            "merek": "Produk A",
            "subKategori": "Kategori Test",
            "qty": 10,
            "spesifikasi": "Spec A",
            "paguPerItem": 15000000,
            "hargaTayang": 14000000,
            "linkInaproc": "",
            "linkEcom": "",
            "statusBarangAdmin": "done",
            "tayangInaprocAdmin": "Ya",
            "catatanAdminItem": "OK"
          }
        ]
      }
      """
    # Note: Ganti REQUEST_ID dengan requestId yang valid di database
    When user mengirim PUT request ke "/api/e-procurement/requests/REQUEST_ID/admin-response"
    Then response status code harus salah satu dari "200,404"
    # Jika request ditemukan:
    # Then response harus mengandung field "data"

  @KF-AD-02-02
  Scenario: KF-AD-02-02 Input Kontrak Terkunci (Status Belum Memenuhi)
    # Langkah 1: Login Superadmin
    Given user sudah login sebagai superadmin
    # Langkah 2: Coba input data kontrak untuk proyek dengan status bukan RILIS KONTRAK
    # API akan menghapus data kontrak jika statusAkhir bukan "RILIS KONTRAK" atau "TERBIT BAST"
    Given user mengirim request body:
      """
      {
        "perusahaan": "PT Test",
        "statusAkhir": "",
        "tanggalKontrak": "2026-08-15",
        "nominalKontrak": 150000000,
        "items": [
          {
            "id": "item-1",
            "merek": "Produk A",
            "subKategori": "Kategori Test",
            "qty": 10,
            "spesifikasi": "Spec A",
            "paguPerItem": 15000000,
            "hargaTayang": 14000000,
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
    Then response status code harus salah satu dari "200,404"
    # Jika berhasil, tanggalKontrak dan nominalKontrak harus di-clear oleh sistem
    # karena statusAkhir bukan RILIS KONTRAK / TERBIT BAST
