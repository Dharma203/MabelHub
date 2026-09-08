# language: id

Fitur: Submodul Visiting - Rekapitulasi Kunjungan
  Sebagai pengguna MabelHub
  Saya ingin menyaring, melihat detail kunjungan secara inline, dan membatasi visibilitas data sesuai peran
  Agar data kunjungan terpantau dan terproteksi

  Skenario: KF-24 - Rekapitulasi Visit - Filter Data Kunjungan
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/rekapitulasi-visit"
    Dan pengguna mengubah filter Sales ke "cakiyos" atau pilihan lain
    Maka tabel rekapitulasi disaring menampilkan data yang sesuai

  Skenario: KF-25 - Rekapitulasi Visit - Detail Inline Kunjungan
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/rekapitulasi-visit"
    Dan pengguna mengklik salah satu baris data kunjungan di tabel
    Maka panel detail kunjungan muncul secara inline di bawah baris tersebut

  Skenario: KF-26 - Validasi Kontrol Visibilitas Data (Sales Person)
    Dengan pengguna telah login sebagai "cakiyos" dengan password "cakiyos"
    Ketika pengguna mengakses halaman "/rekapitulasi-visit"
    Maka sales hanya dapat melihat data kunjungan miliknya sendiri
