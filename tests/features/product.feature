# language: id

Fitur: Submodul Product - Manajemen Informasi Produk
  Sebagai pengguna MabelHub
  Saya ingin melihat kategori produk, detail dokumen, pratinjau, unduhan, pencarian, serta pengelolaan dokumen oleh Superadmin
  Agar informasi produk terdokumentasi dengan baik

  Skenario: KF-27 - Tampilkan Halaman Product Hub
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/produk"
    Maka halaman Product Hub terbuka menampilkan daftar kategori

  Skenario: KF-28 - Lihat Detail Kategori Produk
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/produk"
    Dan pengguna mengklik tombol "Lihat semua" pada salah satu kategori produk
    Maka halaman detail kategori terbuka menampilkan daftar berkas dokumen

  Skenario: KF-29 - Preview Dokumen Produk
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengklik tombol "Preview" pada salah satu dokumen produk
    Maka sistem membuka pratinjau berkas dokumen

  Skenario: KF-30 - Unduh Dokumen Produk
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengklik tombol "Unduh" pada salah satu dokumen produk
    Maka file dokumen berhasil diunduh

  Skenario: KF-31 - Pencarian Dokumen Produk
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengetik "brochure_v1" pada kolom pencarian dokumen
    Maka sistem menyaring dokumen yang ditampilkan sesuai kata kunci

  Skenario: KF-32 - Tambah Dokumen Baru oleh Superadmin
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengunggah dokumen baru bernama "brosur_baru.pdf"
    Maka dokumen baru berhasil ditambahkan ke daftar kategori

  Skenario: KF-33 - Hapus Dokumen Produk oleh Superadmin
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengklik tombol "Hapus" pada salah satu dokumen produk
    Dan pengguna menyetujui konfirmasi hapus dokumen
    Maka dokumen terhapus dari sistem

  Skenario: KF-34 - Kunci Berkas oleh Superadmin
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengklik tombol "Kunci" pada dokumen produk yang tidak terkunci
    Maka status berkas berubah menjadi terkunci dan tombol unduh dinonaktifkan untuk Sales

  Skenario: KF-35 - Buka Kunci Berkas oleh Superadmin
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman detail kategori "/produk/brochure"
    Dan pengguna mengklik tombol "Buka" pada dokumen produk yang terkunci
    Maka status berkas kembali menjadi terbuka dan dapat diunduh
