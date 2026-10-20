# language: id
Feature: KF-AD-03 Manajemen Pengguna (Add User)
  Sebagai Superadmin
  Saya ingin bisa menambah, mengedit, dan menghapus pengguna
  Agar manajemen akun dapat dilakukan dengan mudah

  Background:
    Given user sudah login sebagai superadmin

  @KF-AD-03-01
  Scenario: KF-AD-03-01 Tambah Pengguna Baru (Valid)
    # Langkah 1-2: Isi form Nama, Email, Role, Username, Password
    When user mengirim POST request ke "/api/users" dengan body:
      """
      {
        "fullName": "Test User Cucumber",
        "email": "testcucumber@example.com",
        "username": "testcucumber",
        "password": "TestPassword123",
        "role": "SALES"
      }
      """
    # Langkah 3: Simpan — Pengguna baru tersimpan
    Then response status code harus 201
    And response harus mengandung field "data"
    And response harus mengandung field "data._id"
    And response field "data.fullName" harus bernilai "Test User Cucumber"
    And response field "data.email" harus bernilai "testcucumber@example.com"
    And response field "data.role" harus bernilai "SALES"
    And user menyimpan "data._id" dari response sebagai "createdUserId"

  @KF-AD-03-02
  Scenario: KF-AD-03-02 Duplikasi Email Pengguna
    # Langkah 1: Input pengguna baru dengan email yang sudah terdaftar
    When user mengirim POST request ke "/api/users" dengan body:
      """
      {
        "fullName": "Duplicate User",
        "email": "testcucumber@example.com",
        "username": "duplicateuser",
        "password": "TestPassword123",
        "role": "SALES"
      }
      """
    # Langkah 2: Simpan — Gagal, muncul peringatan duplicate
    Then response status code harus 409
    And response harus mengandung pesan "Duplicate"

  @KF-AD-03-03
  Scenario: KF-AD-03-03 Edit Data & Role Pengguna
    # Langkah 1: Ambil daftar pengguna
    When user mengirim GET request ke "/api/users"
    Then response status code harus 200
    And response harus mengandung field "data"

    # Langkah 2-3: Edit role pengguna (misal: ubah SALES jadi ADMIN)
    # Note: Ganti USER_ID dengan ID pengguna yang valid
    # When user mengirim PUT request ke "/api/users/USER_ID" dengan body:
    #   """
    #   {
    #     "role": "ADMIN"
    #   }
    #   """
    # Then response status code harus 200
    # And response harus mengandung field "data"

  @KF-AD-03-04
  Scenario: KF-AD-03-04 Hapus Pengguna
    # Langkah 1-2: Buka Add User, klik Hapus pada salah satu akun
    # Note: Ganti USER_ID dengan ID pengguna yang valid
    # When user mengirim DELETE request ke "/api/users/USER_ID"
    # Langkah 3: Konfirmasi — Akun terhapus
    # Then response status code harus 200
    # And response field "ok" harus bernilai boolean "true"

    # Verifikasi: Daftar pengguna bisa diakses
    When user mengirim GET request ke "/api/users"
    Then response status code harus 200
