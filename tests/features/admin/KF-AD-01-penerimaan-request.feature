# language: id
Feature: KF-AD-01 Penerimaan Request E-Procurement
  Sebagai Admin
  Saya ingin bisa menerima request e-procurement dari Sales
  Agar pesanan dapat diproses lebih lanjut

  @KF-AD-01-01
  Scenario: KF-AD-01-01 Penerimaan Request (Valid)
    # Langkah 1: Login Admin, lalu ambil (take) pesanan dari daftar e-procurement
    Given user sudah login sebagai admin
    # Langkah 2: Ambil daftar request yang belum diambil (status masuk)
    When user mengirim GET request ke "/api/e-procurement/requests?mode=takeable"
    Then response status code harus 200
    And response harus mengandung field "data"

    # Langkah 3: Klik "Terima" — Admin mengambil request (take)
    # Note: Memerlukan requestId yang valid dari data test.
    # Gunakan environment variable TEST_REQUEST_ID atau data seed.
