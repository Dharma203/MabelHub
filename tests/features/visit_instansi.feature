# language: id

Fitur: Submodul Visiting - Manajemen Instansi & Pengajuan
  Sebagai pengguna MabelHub
  Saya ingin dapat mengajukan, menyetujui, menolak, atau menambahkan instansi secara langsung
  Agar data instansi di sistem mutakhir dan tervalidasi

  Skenario: KF-19 - Register Company (Pengajuan Instansi Baru oleh Sales)
    Dengan pengguna telah login sebagai "cakiyos" dengan password "cakiyos"
    Ketika pengguna mengakses halaman "/tambah-instansi"
    Dan pengguna mengisi form register instansi dengan data valid
      | nama_institusi  | Rumah Sakit E2E  |
      | kota            | KABUPATEN BOGOR  |
      | klpd            | KEMENTERIAN      |
      | satuan_kerja    | Bagian Humas     |
      | segmen          | RING 1           |
    Dan pengguna menekan tombol "SIMPAN DATA"
    Maka pengajuan instansi terkirim

  Skenario: KF-20 - Lihat Daftar Request Instansi Pending
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/instansi"
    Dan pengguna mengklik tombol "REQUEST PENDING"
    Maka modal request instansi terbuka menampilkan daftar pengajuan

  Skenario: KF-21 - Setujui Pengajuan Instansi
    Dengan terdapat pengajuan instansi pending untuk "Instansi Penyetujuan E2E"
    Dan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/instansi"
    Dan pengguna mengklik tombol "REQUEST PENDING"
    Dan pengguna menyetujui pengajuan teratas
    Maka pengajuan instansi disetujui dan status berubah menjadi Approved

  Skenario: KF-22 - Tolak Pengajuan Instansi
    Dengan terdapat pengajuan instansi pending untuk "Instansi Penolakan E2E"
    Dan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/instansi"
    Dan pengguna mengklik tombol "REQUEST PENDING"
    Dan pengguna menolak pengajuan teratas dengan alasan "Data tidak lengkap"
    Maka pengajuan instansi ditolak

  Skenario: KF-23 - Tambah Instansi Langsung oleh Superadmin
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/tambah-instansi"
    Dan pengguna mengisi form register instansi dengan data valid
      | nama_institusi  | Instansi Direct Superadmin |
      | kota            | KABUPATEN BOGOR            |
      | klpd            | KEMENTERIAN                |
      | satuan_kerja    | Bagian Umum                |
      | segmen          | RING 1                     |
    Dan pengguna menekan tombol "SIMPAN DATA"
    Maka instansi langsung tersimpan di daftar instansi resmi
