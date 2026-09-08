# language: id

Fitur: Submodul Visiting - Perencanaan Kunjungan
  Sebagai pengguna yang telah login
  Saya ingin dapat merencanakan kunjungan baru baik tunggal maupun jamak, serta mengedit rencana kunjungan
  Agar rencana aktivitas penjualan tercatat secara teratur

  Skenario: KF-15 - Buat Rencana Kunjungan Tunggal
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/plan-activity"
    Dan pengguna mengklik tombol "ADD PLANS" atau diarahkan ke halaman tambah rencana
    Dan pengguna mengisi tanggal rencana kunjungan
    Dan pengguna memilih Status Ring ke-1 dengan nilai "RING 1"
    Dan pengguna mengetik institusi ke-1 dengan nilai "Rencana Kunjungan Baru"
    Dan pengguna menekan tombol simpan rencana "SIMPAN DATA" atau "Submit"
    Maka rencana kunjungan tersimpan dan sistem mengarahkan ke halaman "/plan-activity"

  Skenario: KF-16 - Buat Rencana Kunjungan Jamak
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/plan-activity/add"
    Dan pengguna mengisi tanggal rencana kunjungan
    Dan pengguna memilih Status Ring ke-1 dengan nilai "RING 1"
    Dan pengguna mengetik institusi ke-1 dengan nilai "Rencana Pertama"
    Dan pengguna menekan tombol "TAMBAH FORM" atau "TAMBAH RENCANA LAIN"
    Dan pengguna memilih Status Ring ke-2 dengan nilai "RING 2"
    Dan pengguna mengetik institusi ke-2 dengan nilai "Rencana Kedua"
    Dan pengguna menekan tombol simpan rencana "SIMPAN DATA" atau "Submit"
    Maka rencana kunjungan tersimpan dan sistem mengarahkan ke halaman "/plan-activity"

  Skenario: KF-17 - Hapus Kartu Rencana Kunjungan
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/plan-activity/add"
    Dan pengguna menekan tombol "TAMBAH FORM" atau "TAMBAH RENCANA LAIN"
    Dan pengguna mengklik tombol "HAPUS" pada kartu rencana kedua
    Maka kartu rencana kedua terhapus dari form

  Skenario: KF-18 - Edit Rencana Kunjungan
    Dengan pengguna telah login sebagai "superadmin" dengan password "superadmin"
    Ketika pengguna mengakses halaman "/plan-activity"
    Dan pengguna mengklik salah satu sel tanggal di kalender
    Dan pengguna mengklik ikon edit "Pen" pada salah satu aktivitas
    Dan pengguna mengubah data PIC Nama menjadi "Budi Wahyudi" di modal edit
    Dan pengguna mengklik tombol simpan perubahan "Update"
    Maka perubahan data rencana kunjungan tersimpan
