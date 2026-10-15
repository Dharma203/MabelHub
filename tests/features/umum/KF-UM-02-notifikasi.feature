# language: id
Feature: KF-UM-02 Notifikasi In-App
  Sebagai pengguna MabelHub
  Saya ingin bisa melihat notifikasi yang relevan
  Agar saya selalu mendapat informasi terbaru

  @KF-UM-02-01
  Scenario: KF-UM-02-01 Notifikasi In-App - Ambil Daftar Notifikasi
    # Langkah 1: Login sebagai pengguna
    Given user sudah login sebagai superadmin
    # Langkah 2: Buka ikon notifikasi (GET notifications)
    When user mengirim GET request ke "/api/notifications"
    # Notifikasi relevan tampil
    Then response status code harus 200
    And response field "ok" harus bernilai boolean "true"
    And response harus mengandung field "items"
    And response harus mengandung field "total"

  @KF-UM-02-01b
  Scenario: KF-UM-02-01b Notifikasi - Cek Jumlah Belum Dibaca
    Given user sudah login sebagai superadmin
    When user mengirim GET request ke "/api/notifications/unread-count"
    Then response status code harus 200
    And response field "ok" harus bernilai boolean "true"
    And response harus mengandung field "unreadCount"

  @KF-UM-02-01c
  Scenario: KF-UM-02-01c Notifikasi - Tanpa Login Ditolak
    Given user tidak login
    When user mengirim GET request ke "/api/notifications"
    Then response status code harus 401

  @KF-UM-02-01d
  Scenario: KF-UM-02-01d Notifikasi - Tandai Semua Dibaca
    Given user sudah login sebagai superadmin
    When user mengirim POST request ke "/api/notifications/read-all" dengan body:
      """
      {}
      """
    Then response status code harus salah satu dari "200,204"
