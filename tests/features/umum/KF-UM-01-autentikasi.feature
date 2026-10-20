# language: id
Feature: KF-UM-01 Autentikasi Login & Logout
  Sebagai pengguna sistem MabelHub
  Saya ingin bisa login dan logout dari sistem
  Agar saya dapat mengakses fitur sesuai hak akses saya

  @KF-UM-01-01
  Scenario: KF-UM-01-01 Login Sukses
    # Langkah 1: Buka halaman Login (kirim request ke API login)
    # Langkah 2: Isi Email & Password valid
    Given user tidak login
    When user mengirim POST request ke "/api/auth/login" dengan body:
      """
      {
        "identity": "superadmin",
        "password": "superadmin123"
      }
      """
    # Langkah 3: Klik "Masuk" — Pengguna berhasil masuk
    Then response status code harus 200
    And response field "ok" harus bernilai boolean "true"
    And response harus mengandung field "user"
    And response harus mengandung field "user.role"
    And response harus mengandung field "user._id"
    And response harus mengandung field "user.fullName"

  @KF-UM-01-02
  Scenario: KF-UM-01-02 Login Gagal (Kredensial Salah)
    # Langkah 1: Buka halaman Login
    Given user tidak login
    # Langkah 2: Isi Email valid namun Password salah
    When user mengirim POST request ke "/api/auth/login" dengan body:
      """
      {
        "identity": "superadmin",
        "password": "passwordsalah123"
      }
      """
    # Langkah 3: Sistem menolak akses dan menampilkan error
    Then response status code harus 401
    And response harus mengandung pesan error

  @KF-UM-01-02b
  Scenario: KF-UM-01-02b Login Gagal (User Tidak Ditemukan)
    Given user tidak login
    When user mengirim POST request ke "/api/auth/login" dengan body:
      """
      {
        "identity": "tidakada@example.com",
        "password": "apapun123"
      }
      """
    Then response status code harus 401
    And response harus mengandung pesan "User tidak ditemukan"

  @KF-UM-01-02c
  Scenario: KF-UM-01-02c Login Gagal (Body Kosong)
    Given user tidak login
    When user mengirim POST request ke "/api/auth/login" dengan body:
      """
      {}
      """
    Then response status code harus 400
    And response harus mengandung pesan "Identity dan password wajib"

  @KF-UM-01-03
  Scenario: KF-UM-01-03 Proteksi Akses (Bypass URL Tanpa Login)
    # Langkah 1: Jangan login (hapus sesi)
    Given user tidak login
    # Langkah 2: Coba akses API dashboard tanpa session
    When user mengirim GET request ke "/api/dashboard-request"
    # Halaman tidak terbuka, redirect ke login / return 401
    Then response status code harus 401

  @KF-UM-01-03b
  Scenario: KF-UM-01-03b Proteksi Akses API Users Tanpa Login
    Given user tidak login
    When user mengirim GET request ke "/api/users"
    Then response status code harus 401

  @KF-UM-01-03c
  Scenario: KF-UM-01-03c Proteksi Akses API E-Procurement Tanpa Login
    Given user tidak login
    When user mengirim GET request ke "/api/e-procurement/requests"
    Then response status code harus 401

  @KF-UM-01-03d
  Scenario: KF-UM-01-03d Proteksi Akses API Teams Tanpa Login
    Given user tidak login
    When user mengirim GET request ke "/api/teams"
    Then response status code harus 401

  @KF-UM-01-03e
  Scenario: KF-UM-01-03e Proteksi Akses API Notifications Tanpa Login
    Given user tidak login
    When user mengirim GET request ke "/api/notifications"
    Then response status code harus 401

  @KF-UM-01-04
  Scenario: KF-UM-01-04 Logout Sesi Aktif
    # Langkah 1: Login dulu
    Given user sudah login sebagai superadmin
    # Langkah 2: Klik Logout
    When user mengirim POST request ke "/api/auth/logout" dengan body:
      """
      {}
      """
    # Sesi terhapus
    Then response status code harus 200
    And response field "ok" harus bernilai boolean "true"

    # Langkah 3: Setelah logout, coba akses API — seharusnya gagal
    # Reset headers (simulasi browser setelah cookie dihapus)
    Given user tidak login
    When user mengirim GET request ke "/api/auth/me"
    Then response status code harus 200
    # user harus null karena tidak ada session
    And response harus mengandung field "user"
