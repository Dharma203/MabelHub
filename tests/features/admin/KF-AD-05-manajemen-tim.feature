# language: id
Feature: KF-AD-05 Manajemen Tim
  Sebagai Superadmin
  Saya ingin bisa menambah tim baru
  Agar Sales dapat dikelola dalam struktur tim

  Background:
    Given user sudah login sebagai superadmin

  @KF-AD-05-01
  Scenario: KF-AD-05-01 Tambah Tim Baru
    # Langkah 1: Pastikan bisa melihat daftar tim
    When user mengirim GET request ke "/api/teams"
    Then response status code harus 200
    And response harus mengandung field "data"

    # Langkah 2-3: Tambah tim baru (memerlukan leaderId yang valid)
    # Note: Ganti LEADER_ID dengan ObjectId user yang role=LEADER dan belum punya team
    # When user mengirim POST request ke "/api/teams" dengan body:
    #   """
    #   {
    #     "name": "Tim Cucumber Test",
    #     "leaderId": "LEADER_ID",
    #     "memberIds": []
    #   }
    #   """
    # Then response status code harus 201
    # And response field "ok" harus bernilai boolean "true"
    # And response harus mengandung field "teamId"

  @KF-AD-05-01b
  Scenario: KF-AD-05-01b Tambah Tim tanpa nama gagal
    When user mengirim POST request ke "/api/teams" dengan body:
      """
      {
        "name": "",
        "leaderId": "000000000000000000000000"
      }
      """
    Then response status code harus 400
    And response harus mengandung pesan error

  @KF-AD-05-01c
  Scenario: KF-AD-05-01c Tambah Tim dengan leaderId tidak valid gagal
    When user mengirim POST request ke "/api/teams" dengan body:
      """
      {
        "name": "Tim Invalid Leader",
        "leaderId": "invalid-id"
      }
      """
    Then response status code harus 400
