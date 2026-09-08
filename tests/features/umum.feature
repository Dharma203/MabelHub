# language: id

Fitur: Modul Umum - Login, Logout & Hak Akses
  Sebagai pengguna MabelHub
  Saya ingin dapat mengelola sesi masuk, keluar, dan mendapatkan notifikasi serta pembatasan hak akses yang sesuai
  Agar data CRM aman dan terorganisir

  Skenario: KF-01 - Login sukses sebagai SUPERADMIN
    Dengan pengguna berada di halaman login
    Ketika pengguna mengisi username dengan "superadmin"
    Dan pengguna mengisi password dengan "superadmin"
    Dan pengguna menekan tombol LOGIN
    Maka pengguna diarahkan ke halaman "/dashboard-response"

  Skenario: KF-01 - Login sukses sebagai SALES
    Dengan pengguna berada di halaman login
    Ketika pengguna mengisi username dengan "cakiyos"
    Dan pengguna mengisi password dengan "cakiyos"
    Dan pengguna menekan tombol LOGIN
    Maka pengguna diarahkan ke halaman "/dashboard-request"

  Skenario: KF-02 - Login gagal dengan password salah
    Dengan pengguna berada di halaman login
    Ketika pengguna mengisi username dengan "superadmin"
    Dan pengguna mengisi password dengan "passwordsalah"
    Dan pengguna menekan tombol LOGIN
    Maka pesan error "Password salah" ditampilkan

  Skenario: KF-03 - Proteksi akses halaman terproteksi tanpa login
    Dengan pengguna berada di halaman login
    Ketika pengguna mengakses halaman "/dashboard-response"
    Maka pengguna diarahkan ke halaman login

  Skenario: KF-04 - Logout sesi aktif dan tidak bisa back kembali ke dashboard
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna menekan tombol logout
    Maka pengguna diarahkan ke halaman login
    Dan halaman menampilkan form login
    Ketika pengguna menekan tombol BACK di browser
    Maka pengguna tetap diarahkan ke halaman login

  Skenario: KF-05 - Session Timeout simulation
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika sesi pengguna kedaluwarsa secara programmatik
    Dan pengguna mengakses halaman "/dashboard-response"
    Maka pengguna diarahkan ke halaman login

  Skenario: KF-06 - Validasi hak akses RBAC (Sales tidak dapat melihat/mengakses menu Parameter)
    Dengan pengguna telah login sebagai "cakiyos" dengan password "cakiyos"
    Maka sidebar tidak menampilkan menu "Parameter"
    Ketika pengguna mengakses halaman "/parameters"
    Maka pengguna diarahkan ke halaman login atau dashboard

  Skenario: KF-14 - Melihat notifikasi pada header
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengklik ikon lonceng notifikasi pada header
    Dan pengguna mengklik pesan notifikasi teratas yang muncul
    Maka status notifikasi berubah menjadi sudah dibaca
