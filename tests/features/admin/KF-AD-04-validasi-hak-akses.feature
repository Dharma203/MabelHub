# language: id
Feature: KF-AD-04 Validasi Hak Akses
  Sebagai sistem
  Saya harus memastikan setiap role hanya bisa mengakses fitur yang diizinkan
  Agar keamanan dan otorisasi terjaga

  @KF-AD-04-01
  Scenario: KF-AD-04-01 Sales tidak bisa mengakses menu Add User (API Users)
    # Langkah 1: Login menggunakan akun Sales
    Given user sudah login sebagai sales
    # Langkah 2: Coba akses menu Add User (GET /api/users) — hanya ADMIN/SUPERADMIN
    When user mengirim GET request ke "/api/users"
    # Harus mendapat error 403 Forbidden
    Then response status code harus 403
    And response harus mengandung pesan error

  @KF-AD-04-01b
  Scenario: KF-AD-04-01b Sales tidak bisa mengakses Parameter
    # Login sebagai Sales
    Given user sudah login sebagai sales
    # Coba akses POST parameter (hanya SUPERADMIN)
    When user mengirim POST request ke "/api/parameters" dengan body:
      """
      {
        "key": "segmen",
        "value": "TEST_SEGMENT"
      }
      """
    # Harus mendapat error 403 Forbidden
    Then response status code harus 403

  @KF-AD-04-01c
  Scenario: KF-AD-04-01c Sales tidak bisa membuat pengguna baru
    Given user sudah login sebagai sales
    When user mengirim POST request ke "/api/users" dengan body:
      """
      {
        "fullName": "Hacker User",
        "email": "hacker@test.com",
        "username": "hacker",
        "password": "hack123",
        "role": "SUPERADMIN"
      }
      """
    Then response status code harus 403

  @KF-AD-04-01d
  Scenario: KF-AD-04-01d Sales tidak bisa mengakses Teams
    Given user sudah login sebagai sales
    When user mengirim GET request ke "/api/teams"
    Then response status code harus 403

  @KF-AD-04-01e
  Scenario: KF-AD-04-01e Leader tidak bisa mengakses Add User
    Given user sudah login sebagai leader
    When user mengirim GET request ke "/api/users"
    Then response status code harus 403
