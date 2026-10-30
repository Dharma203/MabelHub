// ─── 25 KBLI Toko MabelHub ───────────────────────────────────────────────────
export interface KbliItem {
  no: number;
  code: string;
  name: string;
  year: number;
}

export const KBLI_STORE_LIST: KbliItem[] = [
  { no: 1, code: "46523", name: "Perdagangan Besar Peralatan Telekomunikasi", year: 2020 },
  { no: 2, code: "46900", name: "Perdagangan Besar Berbagai Macam Barang", year: 2020 },
  { no: 3, code: "46512", name: "Perdagangan Besar Piranti Lunak", year: 2020 },
  { no: 4, code: "46591", name: "Perdagangan Besar Mesin Kantor dan Industri Pengolahan, Suku Cadang Dan Perlengkapannya", year: 2020 },
  { no: 5, code: "46430", name: "Perdagangan Besar Alat Fotografi dan Barang Optik", year: 2020 },
  { no: 6, code: "62090", name: "Aktivitas Teknologi Informasi Dan Jasa Komputer Lainnya", year: 2020 },
  { no: 7, code: "46521", name: "Perdagangan Besar Suku Cadang Elektronik", year: 2020 },
  { no: 8, code: "95120", name: "Reparasi Peralatan Komunikasi", year: 2020 },
  { no: 9, code: "62012", name: "Aktivitas Pengembangan Aplikasi Perdagangan Melalui Internet (E-Commerce)", year: 2020 },
  { no: 10, code: "62029", name: "Aktivitas Konsultasi Komputer dan Manajemen Fasilitas Komputer Lainnya", year: 2020 },
  { no: 11, code: "46421", name: "Perdagangan Besar Alat Tulis Dan Gambar", year: 2020 },
  { no: 12, code: "61999", name: "Aktivitas Telekomunikasi Lainnya YTDL", year: 2020 },
  { no: 13, code: "46491", name: "Perdagangan Besar Peralatan Dan Perlengkapan Rumah Tangga", year: 2020 },
  { no: 14, code: "46511", name: "Perdagangan Besar Komputer dan Perlengkapan Komputer", year: 2020 },
  { no: 15, code: "62019", name: "Aktivitas Pemrograman Komputer Lainnya", year: 2020 },
  { no: 16, code: "63111", name: "Aktivitas Pengolahan Data", year: 2020 },
  { no: 17, code: "63121", name: "Portal Web Dan/Atau Platform Digital Tanpa Tujuan Komersial", year: 2020 },
  { no: 18, code: "63122", name: "Portal Web Dan/Atau Platform Digital Dengan Tujuan Komersial", year: 2020 },
  { no: 19, code: "58200", name: "Penerbitan piranti lunak (Software)", year: 2020 },
  { no: 20, code: "46522", name: "Perdagangan Besar Disket, Flash Drive, Pita Audio dan Video, CD dan DVD Kosong", year: 2020 },
  { no: 21, code: "46100", name: "Perdagangan Besar Atas Dasar Balas Jasa (Fee) Atau Kontrak", year: 2020 },
  { no: 22, code: "46599", name: "Perdagangan Besar Mesin, Peralatan Dan Perlengkapan Lainnya", year: 2020 },
  { no: 23, code: "46691", name: "Perdagangan Besar Alat Laboratorium, Alat Farmasi Dan Alat Kedokteran Untuk Manusia", year: 2020 },
  { no: 24, code: "46692", name: "Perdagangan Besar Alat Laboratorium, Alat Farmasi Dan Alat Kedokteran Untuk Hewan", year: 2020 },
  { no: 25, code: "46499", name: "Perdagangan Besar Berbagai Barang dan Perlengkapan Rumah Tangga Lainnya YTDL", year: 2025 },
];

// ─── Standard Options Dropdowns ──────────────────────────────────────────────
export const OPTI_SERTIFIKAT_TELEKOMUNIKASI = [
  "Pilih Sertifikat Alat Telekomunikasi",
  "Ada (SDPPI / Postel)",
  "Tidak Ada (Tidak Memerlukan)",
  "Dalam Proses Pengajuan",
];

export const OPTI_STRUKTUR_HARGA = [
  "Pilih Struktur Harga",
  "Harga Satuan",
  "Harga Bertingkat / Volume",
  "Harga Paket Terpasang",
];

export const OPTI_RAMAH_LINGKUNGAN = [
  "Pilih Label Produk Ramah Lingkungan",
  "Ya (Memiliki Sertifikat Ekolabel)",
  "Tidak",
];

// ─── Specification Field Definition ──────────────────────────────────────────
export interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "select";
  options?: string[];
}

export interface SubCategoryConfig {
  id: string;
  name: string;
  kbkiDefault?: string;
  informasiUtama: SpecField[];
  informasiLainnya: SpecField[];
}

export interface MainCategoryConfig {
  id: string;
  name: string;
  subcategories: SubCategoryConfig[];
}

// ─── Categories & Subcategories Specification Registry ─────────────────────────
export const PRODUCT_SPEC_REGISTRY: MainCategoryConfig[] = [
  {
    id: "elektronik",
    name: "Elektronik",
    subcategories: [
      {
        id: "monitor-pc",
        name: "Monitor PC",
        kbkiDefault: "4528100001",
        informasiUtama: [
          { key: "merek", label: "Merek", placeholder: "Masukkan Merek", required: true },
          { key: "tipe", label: "Tipe", placeholder: "Masukkan Tipe", required: true },
          { key: "ukuranLayar", label: "Ukuran Layar", placeholder: "Masukkan Ukuran Layar", required: true },
          { key: "resolusiLayar", label: "Resolusi Layar", placeholder: "Masukkan Resolusi Layar", required: true },
          { key: "konektivitas", label: "Konektivitas", placeholder: "Masukkan Konektivitas", required: true },
          { key: "kompatibilitasOs", label: "Kompatibilitas Sistem Operasi", placeholder: "Masukkan Kompatibilitas Sistem Operasi", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          {
            key: "sertifikatTelekomunikasi",
            label: "Sertifikat Alat Telekomunikasi",
            type: "select",
            options: OPTI_SERTIFIKAT_TELEKOMUNIKASI,
            required: true,
          },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
      {
        id: "laptop",
        name: "Laptop",
        kbkiDefault: "4522000001",
        informasiUtama: [
          { key: "tipe", label: "Tipe", placeholder: "Masukkan Tipe", required: true },
          { key: "warnaProduk", label: "Warna Produk", placeholder: "Masukkan Warna Produk", required: true },
          { key: "processor", label: "Processor", placeholder: "Masukkan Processor", required: true },
          { key: "ram", label: "RAM", placeholder: "Masukkan RAM", required: true },
          { key: "storage", label: "Storage", placeholder: "Masukkan Storage", required: true },
          { key: "sistemOperasi", label: "Sistem Operasi", placeholder: "Masukkan Sistem Operasi", required: true },
          { key: "vga", label: "VGA", placeholder: "Masukkan VGA", required: true },
          { key: "ukuranLayar", label: "Ukuran Layar", placeholder: "Masukkan Ukuran Layar", required: true },
          { key: "resolusiLayar", label: "Resolusi Layar", placeholder: "Masukkan Resolusi Layar", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          {
            key: "sertifikatTelekomunikasi",
            label: "Sertifikat Alat Telekomunikasi",
            type: "select",
            options: OPTI_SERTIFIKAT_TELEKOMUNIKASI,
            required: true,
          },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
      {
        id: "mouse-keyboard",
        name: "Mouse & Keyboard",
        kbkiDefault: "4526100001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model", placeholder: "Masukkan Tipe", required: true },
          { key: "konektivitas", label: "Konektivitas", placeholder: "Contoh: Wireless 2.4GHz / Bluetooth / USB", required: true },
          { key: "kompatibilitasOs", label: "Kompatibilitas Sistem Operasi", placeholder: "Contoh: Windows, macOS, Linux", required: true },
          { key: "resolusiSensor", label: "Resolusi Sensor (DPI)", placeholder: "Contoh: 1000 - 4000 DPI", required: true },
          { key: "dayaBaterai", label: "Tipe Daya / Baterai", placeholder: "Contoh: Rechargeable Type-C / 1x AA", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          {
            key: "sertifikatTelekomunikasi",
            label: "Sertifikat Alat Telekomunikasi",
            type: "select",
            options: OPTI_SERTIFIKAT_TELEKOMUNIKASI,
            required: true,
          },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
      {
        id: "printer-scanner",
        name: "Printer & Scanner",
        kbkiDefault: "4526300001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model", placeholder: "Masukkan Tipe", required: true },
          { key: "fungsi", label: "Fungsi Utama", placeholder: "Contoh: Print, Scan, Copy (All-in-One)", required: true },
          { key: "kecepatanCetak", label: "Kecepatan Cetak", placeholder: "Contoh: 33 ppm hitam, 15 ppm warna", required: true },
          { key: "resolusiCetak", label: "Resolusi Cetak", placeholder: "Contoh: 5760 x 1440 dpi", required: true },
          { key: "konektivitas", label: "Konektivitas", placeholder: "Contoh: USB 2.0, Wi-Fi Direct, LAN", required: true },
          { key: "tipeTinta", label: "Tipe Tinta / Cartridge", placeholder: "Contoh: Botol Ink Tank 003 Series", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "perabot-furnitur",
    name: "Perabot & Furnitur",
    subcategories: [
      {
        id: "kursi",
        name: "Kursi (Kantor / Siswa / Ergonomis)",
        kbkiDefault: "3812101002",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model", placeholder: "Masukkan Tipe Kursi", required: true },
          { key: "materialRangka", label: "Material Rangka", placeholder: "Contoh: Pipa Besi Hollow, Baja, Kayu Solid", required: true },
          { key: "materialDudukan", label: "Material Dudukan & Sandaran", placeholder: "Contoh: Busa Fabric / Mesh / Kulit Sintetis", required: true },
          { key: "fiturErgonomis", label: "Fitur Ergonomis", placeholder: "Contoh: Hidrolik Naik-Turun, Tilting, Roda 360", required: true },
          { key: "dimensiProduk", label: "Dimensi Produk (P x L x T)", placeholder: "Contoh: 50 x 50 x 85-95 cm", required: true },
          { key: "bebanMaksimal", label: "Beban Maksimal", placeholder: "Contoh: 120 kg", required: true },
          { key: "warnaProduk", label: "Warna Produk", placeholder: "Masukkan Warna Produk", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
      {
        id: "sofa",
        name: "Sofa & Kursi Tamu",
        kbkiDefault: "3812102001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Konfigurasi", placeholder: "Contoh: 1 Seater, 2 Seater, 3-2-1 Seater, L-Shape", required: true },
          { key: "materialRangka", label: "Material Rangka", placeholder: "Contoh: Kayu Mahoni / Jati / Logam Baja", required: true },
          { key: "materialCover", label: "Material Pelapis (Cover)", placeholder: "Contoh: Kulit Sintetis Oscar / Fabric Halus", required: true },
          { key: "materialBusa", label: "Material Busa", placeholder: "Contoh: High Density Foam Rebonded", required: true },
          { key: "dimensiProduk", label: "Dimensi Produk (P x L x T)", placeholder: "Contoh: 210 x 90 x 85 cm", required: true },
          { key: "warnaProduk", label: "Warna Produk", placeholder: "Masukkan Warna Produk", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
      {
        id: "meja",
        name: "Meja (Kantor / Siswa / Rapat)",
        kbkiDefault: "3812101001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model Meja", placeholder: "Masukkan Tipe Meja", required: true },
          { key: "materialDaunMeja", label: "Material Daun Meja (Top Table)", placeholder: "Contoh: Plywood Lapis HPL / MDF Melamin", required: true },
          { key: "materialKaki", label: "Material Kaki / Rangka", placeholder: "Contoh: Pipa Besi Hollow Powder Coating", required: true },
          { key: "dimensiProduk", label: "Dimensi Produk (P x L x T)", placeholder: "Contoh: 120 x 60 x 75 cm", required: true },
          { key: "fiturTambahan", label: "Fitur Tambahan", placeholder: "Contoh: Laci Kunci, Lubang Kabel / Cable Tray", required: true },
          { key: "warnaProduk", label: "Warna Produk", placeholder: "Masukkan Warna Produk", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "alat-kantor-atk",
    name: "Alat Kantor & ATK",
    subcategories: [
      {
        id: "mesin-kantor",
        name: "Mesin Kantor (Penghancur Kertas, Laminating, dll)",
        kbkiDefault: "4515001001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model Mesin", placeholder: "Masukkan Tipe", required: true },
          { key: "kapasitas", label: "Kapasitas Operasional", placeholder: "Contoh: 10 Lembar Cross Cut / Wadah 20 Liter", required: true },
          { key: "dayaListrik", label: "Daya Listrik", placeholder: "Contoh: 180 Watt 220V", required: true },
          { key: "dimensiProduk", label: "Dimensi & Berat", placeholder: "Contoh: 35 x 26 x 50 cm, 8 kg", required: true },
          { key: "fiturKeamanan", label: "Fitur Pengaman", placeholder: "Contoh: Overheat Protection, Reverse Jam", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
      {
        id: "alat-tulis",
        name: "Alat Tulis & Gambar",
        kbkiDefault: "3891101001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model", placeholder: "Masukkan Tipe", required: true },
          { key: "material", label: "Bahan / Material", placeholder: "Masukkan Bahan", required: true },
          { key: "kemasan", label: "Satuan Kemasan", placeholder: "Contoh: Pack isi 12 pcs / Dus isi 50", required: true },
          { key: "warnaProduk", label: "Warna Produk", placeholder: "Masukkan Warna Produk", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "alat-lab-medis",
    name: "Alat Laboratorium & Medis",
    subcategories: [
      {
        id: "alat-laboratorium",
        name: "Alat Laboratorium & Medis",
        kbkiDefault: "4419201004",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model", placeholder: "Masukkan Tipe Alat", required: true },
          { key: "izinEdar", label: "Nomor Izin Edar AKL/AKD", placeholder: "Contoh: Kemenkes RI AKL 20501...", required: true },
          { key: "fungsiAplikasi", label: "Fungsi & Aplikasi", placeholder: "Contoh: Diagnostik Medis / Penyimpanan Cold Chain", required: true },
          { key: "kapasitasDaya", label: "Kapasitas & Daya Listrik", placeholder: "Contoh: 100 Liter, AC 220V 50Hz", required: true },
          { key: "sertifikasiMutu", label: "Sertifikasi Mutu / Standar", placeholder: "Contoh: WHO PQS, ISO 13485, CE Mark", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "umum-lainnya",
    name: "Lainnya / Umum",
    subcategories: [
      {
        id: "barang-umum",
        name: "Barang & Perlengkapan Umum",
        kbkiDefault: "3691001001",
        informasiUtama: [
          { key: "tipe", label: "Tipe / Model", placeholder: "Masukkan Tipe", required: true },
          { key: "material", label: "Bahan / Material", placeholder: "Masukkan Material", required: true },
          { key: "dimensiProduk", label: "Dimensi Produk", placeholder: "Masukkan Dimensi", required: true },
          { key: "warnaProduk", label: "Warna Produk", placeholder: "Masukkan Warna Produk", required: true },
          { key: "spesifikasiProduk", label: "Spesifikasi Produk", placeholder: "Masukkan Spesifikasi Produk", required: true },
          { key: "garansi", label: "Garansi", placeholder: "Masukkan Garansi", required: true },
          {
            key: "strukturHarga",
            label: "Struktur Harga",
            type: "select",
            options: OPTI_STRUKTUR_HARGA,
          },
        ],
        informasiLainnya: [
          { key: "kelengkapanProduk", label: "Kelengkapan Produk", placeholder: "Masukkan Kelengkapan Produk" },
          { key: "informasiLainnya", label: "Informasi Lainnya", placeholder: "Masukkan Informasi Lainnya" },
          {
            key: "ramahLingkungan",
            label: "Label Produk Ramah Lingkungan Hidup",
            type: "select",
            options: OPTI_RAMAH_LINGKUNGAN,
            required: true,
          },
        ],
      },
    ],
  },
];

// Helper to find subcategory by IDs
export function findSubCategoryConfig(mainCatId: string, subCatId: string): SubCategoryConfig {
  const main = PRODUCT_SPEC_REGISTRY.find((m) => m.id === mainCatId) || PRODUCT_SPEC_REGISTRY[0];
  const sub = main.subcategories.find((s) => s.id === subCatId) || main.subcategories[0];
  return sub;
}
