# Tabel Skenario Pengujian (Tabel 3.5 – Tabel 3.7)

## Tabel 3.5 Skenario Pengujian Submodul Administrator

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan (Expected) |
|---|---|---|---|
| KF-AD-01-01 | Penerimaan Request (Valid) | 1. Login Admin, buka menu E-Procurement Response.<br>2. Pilih pesanan dengan status masuk dari Sales.<br>3. Klik "Terima" dan konfirmasi verifikasi. | Pesanan berhasil diterima, status berubah dan tercatat dalam sistem. |
| KF-AD-02-01 | Penginputan Data Kontrak (Valid) | 1. Login Admin, buka pesanan yang sudah diverifikasi.<br>2. Input nomor kontrak, tanggal kontrak, nominal kontrak, dan nama instansi.<br>3. Klik "Simpan". | Data kontrak tersimpan secara terstruktur dan dapat dilihat dalam daftar pesanan. |
| KF-AD-02-02 | Input Kontrak Terkunci (Status Belum Memenuhi) | 1. Login Superadmin.<br>2. Buka Finance untuk proyek di bawah status "RILIS KONTRAK".<br>3. Coba input data kontrak. | Kolom tanggalKontrak dan nominalKontrak terkunci dan tidak dapat diedit. |
| KF-AD-03-01 | Tambah Pengguna Baru (Valid) | 1. Login Superadmin, ke menu Add User.<br>2. Isi form Nama, Email, Role.<br>3. Simpan. | Pengguna baru tersimpan dan dapat digunakan untuk login sesuai role yang ditetapkan. |
| KF-AD-03-02 | Duplikasi Email Pengguna | 1. Input pengguna baru dengan Email yang sudah terdaftar.<br>2. Klik "Simpan". | Gagal simpan, muncul peringatan "Email sudah terdaftar". |
| KF-AD-03-03 | Edit Data & Role Pengguna | 1. Buka Add User, klik Edit pada satu pengguna.<br>2. Ubah Role (misal Sales jadi Admin).<br>3. Simpan. | Perubahan tersimpan, hak akses dan menu pengguna berubah saat ia login ulang. |
| KF-AD-03-04 | Hapus Pengguna | 1. Buka Add User.<br>2. Klik Hapus pada salah satu akun.<br>3. Konfirmasi penghapusan. | Akun terhapus dari daftar pengguna dan tidak dapat digunakan untuk login. |
| KF-AD-04-01 | Validasi Hak Akses | 1. Login menggunakan akun Sales.<br>2. Coba akses menu Add User atau Parameter via URL. | Menu tidak terlihat di Sidebar. Jika URL diketik paksa, muncul error 403 Forbidden. |
| KF-AD-05-01 | Tambah Tim Baru | 1. Login Superadmin, ke menu Teams.<br>2. Klik Tambah Tim, isi nama tim dan pilih Leader.<br>3. Klik "Simpan". | Tim baru berhasil ditambahkan dan muncul di daftar tabel Tim. |
| KF-AD-06-01 | Tambah Parameter Sistem | 1. Login Superadmin, ke menu Parameter.<br>2. Tambahkan nilai parameter baru.<br>3. Buka form yang menggunakan parameter tersebut. | Nilai parameter baru seketika muncul di dropdown form yang relevan. |
| KF-AD-06-02 | Bulk Upload Parameter via Excel | 1. Login Superadmin, ke menu Parameter.<br>2. Unduh template Excel.<br>3. Isi template dan unggah. | Data parameter berhasil diimpor secara massal dan muncul di daftar Parameter. |

## Tabel 3.6 Skenario Pengujian Submodul Finance

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan (Expected) |
|---|---|---|---|
| KF-FN-01-01 | Lihat Rekapitulasi Finance | 1. Login Superadmin, ke menu Finance.<br>2. Lihat tabel rekapitulasi. | Tabel menampilkan data ID request, pemohon, segmen, perusahaan, progres, status keuangan, dan nominal kontrak/pembayaran. |
| KF-FN-01-02 | Perbarui Status Keuangan (Valid) | 1. Login Superadmin, ke menu Finance.<br>2. Pilih proyek dengan status "TERBIT BAST".<br>3. Ubah status keuangan menjadi "Penagihan". | Status keuangan berhasil diperbarui dan tersimpan di sistem. |
| KF-FN-01-03 | Status Keuangan Terkunci (Sebelum BAST) | 1. Login Superadmin.<br>2. Buka Finance untuk proyek dengan status akhir di bawah "TERBIT BAST".<br>3. Coba perbarui status keuangan. | Kolom status keuangan terkunci (read-only) dan tidak dapat diedit. |
| KF-FN-02-01 | Input Data Pembayaran SP2D (Valid) | 1. Login Superadmin.<br>2. Buka Finance untuk proyek dengan status minimal "TERBIT BAST".<br>3. Input tanggalPembayaran dan nominalPembayaran.<br>4. Simpan. | Data pembayaran SP2D berhasil tersimpan dan tercatat pada tabel rekapitulasi. |
| KF-FN-02-02 | Input Pembayaran Terkunci (Status Belum BAST) | 1. Login Superadmin.<br>2. Buka Finance untuk proyek di bawah "TERBIT BAST".<br>3. Coba input data pembayaran. | Kolom tanggalPembayaran dan nominalPembayaran terkunci dan tidak dapat diedit. |
| KF-FN-03-01 | Ekspor Laporan Keuangan ke Excel | 1. Login Superadmin, ke menu Finance.<br>2. Klik "Ekspor Excel". | File .xlsx berhasil terunduh berisi data rekapitulasi keuangan seluruh transaksi. |

## Tabel 3.7 Tabel Skenario Pengujian Submodul Umum

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan (Expected) |
|---|---|---|---|
| KF-UM-01-01 | Login Sukses | 1. Buka halaman Login.<br>2. Isi Email & Password valid.<br>3. Klik "Masuk". | Pengguna berhasil masuk ke Dashboard sesuai hak akses perannya. |
| KF-UM-01-02 | Login Gagal (Kredensial Salah) | 1. Buka halaman Login.<br>2. Isi Email valid namun Password salah.<br>3. Klik "Masuk". | Sistem menolak akses dan menampilkan notifikasi error. |
| KF-UM-01-03 | Proteksi Akses (Bypass URL) | 1. Hapus sesi (jangan login).<br>2. Ketik URL /dashboard di browser. | Halaman tidak terbuka, pengguna otomatis diarahkan kembali ke halaman Login. |
| KF-UM-01-04 | Logout Sesi Aktif | 1. Klik menu Profil.<br>2. Klik Logout.<br>3. Tekan tombol Back di browser. | Sesi terhapus, kembali ke halaman login. Menekan Back tidak bisa masuk ke dashboard. |
| KF-UM-02-01 | Notifikasi In-App Muncul | 1. Login sebagai pengguna yang memiliki notifikasi baru.<br>2. Buka ikon notifikasi di header aplikasi. | Notifikasi relevan tampil sesuai peran dan aktivitas pengguna. |
