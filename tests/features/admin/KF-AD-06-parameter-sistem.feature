# language: id
Feature: KF-AD-06 Parameter Sistem
  Sebagai Superadmin
  Saya ingin bisa menambah dan mengelola parameter sistem
  Agar dropdown form selalu up-to-date

  Background:
    Given user sudah login sebagai superadmin

  @KF-AD-06-01
  Scenario: KF-AD-06-01 Tambah Parameter Sistem
    # Langkah 1-2: Tambah nilai parameter baru (key: segmen)
    When user mengirim POST request ke "/api/parameters" dengan body:
      """
      {
        "key": "segmen",
        "value": "CUCUMBER TEST SEGMENT"
      }
      """
    # Langkah 3: Parameter berhasil tersimpan
    Then response status code harus 200
    And response field "ok" harus bernilai boolean "true"
    And response harus mengandung field "data"

    # Verifikasi: GET parameter dan pastikan nilai baru muncul
    When user mengirim GET request ke "/api/parameters"
    Then response status code harus 200
    And response harus mengandung field "data.segmen"

  @KF-AD-06-02
  Scenario: KF-AD-06-02 Bulk Upload Parameter
    # Langkah 1-3: Upload parameter secara massal (simulasi bulk upload)
    When user mengirim POST request ke "/api/parameters" dengan body:
      """
      {
        "bulk": {
          "kota_kabupaten": ["KOTA CUCUMBER A", "KOTA CUCUMBER B"],
          "klpd": ["KLPD CUCUMBER TEST"],
          "perusahaan": ["PT CUCUMBER SATU", "PT CUCUMBER DUA"]
        }
      }
      """
    Then response status code harus 200
    And response field "ok" harus bernilai boolean "true"
    And response harus mengandung field "data"

    # Verifikasi: Data parameter yang di-bulk upload muncul di daftar
    When user mengirim GET request ke "/api/parameters"
    Then response status code harus 200
    And response harus mengandung field "data.kota_kabupaten"
    And response harus mengandung field "data.klpd"
    And response harus mengandung field "data.perusahaan"

  @KF-AD-06-cleanup
  Scenario: Cleanup parameter test data
    # Hapus parameter yang ditambahkan saat testing
    When user mengirim DELETE request ke "/api/parameters" dengan body:
      """
      {
        "key": "segmen",
        "value": "CUCUMBER TEST SEGMENT"
      }
      """
    Then response status code harus 200

    When user mengirim DELETE request ke "/api/parameters" dengan body:
      """
      {
        "key": "kota_kabupaten",
        "value": "KOTA CUCUMBER A"
      }
      """
    Then response status code harus 200

    When user mengirim DELETE request ke "/api/parameters" dengan body:
      """
      {
        "key": "kota_kabupaten",
        "value": "KOTA CUCUMBER B"
      }
      """
    Then response status code harus 200
