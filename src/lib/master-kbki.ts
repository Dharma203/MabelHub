// ─── Master Kamus Komoditas KBKI Resmi BPS / INAPROC ─────────────────────────
export interface MasterKbkiItem {
  code: string;
  name: string;
  category: string;
  seksi: string;
  tags: string[];
}

export const MASTER_KBKI_LIST: MasterKbkiItem[] = [
  // ─── Elektronik & Komputer ──────────────────────────────────────────────────
  {
    code: "4522000001",
    name: "Komputer Portabel (Laptop, Notebook, Netbook, Subnotebook, Tablet PC)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["laptop", "notebook", "komputer jinjing", "macbook", "ultrabook", "thinkpad", "netbook", "tablet"],
  },
  {
    code: "4523000001",
    name: "Unit Pemroses Otomatis Komputer Desktop (PC All-in-One, Mini PC, Workstation)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["pc", "desktop", "komputer meja", "all in one", "aio", "workstation", "cpu", "tower"],
  },
  {
    code: "4528100001",
    name: "Monitor Layar Tampilan Komputer (LED, LCD, OLED, Curved Monitor)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["monitor", "layar pc", "display", "led", "lcd", "screen", "oled", "fhd", "4k"],
  },
  {
    code: "4526100001",
    name: "Perangkat Input Kendali Kursor / Mouse Komputer (Kabel, Wireless, Bluetooth, Ergonomis)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["mouse", "tetikus", "mouse wireless", "mouse bluetooth", "mouse usb", "optical mouse", "dpi"],
  },
  {
    code: "4526200001",
    name: "Papan Ketik Komputer / Keyboard (Mekanikal, Membran, Wireless, Bluetooth)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["keyboard", "papan ketik", "keyboard wireless", "mechanical keyboard", "keyboard usb"],
  },
  {
    code: "4526300001",
    name: "Mesin Cetak Komputer / Printer (Inkjet, Ink Tank, Laser, All-in-One, Dot Matrix)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["printer", "mesin cetak", "ink tank", "laserjet", "all in one", "epson", "canon", "hp"],
  },
  {
    code: "4526400001",
    name: "Mesin Pemindai Dokumen Komputer / Scanner (Flatbed, Automatic Document Feeder ADF)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["scanner", "pemindai", "scan dokumen", "flatbed", "adf", "portable scanner"],
  },
  {
    code: "4527100001",
    name: "Media Penyimpanan Internal / Solid State Drive (SSD) dan Hard Disk Drive (HDD)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["ssd", "nvme", "m.2", "sata", "hdd", "harddisk", "internal drive"],
  },
  {
    code: "4527200001",
    name: "Media Penyimpanan Eksternal (USB Flash Drive, Harddisk Eksternal, Kartu Memori SD)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["flashdisk", "flash drive", "hdd eksternal", "harddisk eksternal", "microsd", "sd card"],
  },
  {
    code: "4528200001",
    name: "Proyektor Digital Presentasi / Projector (LCD, DLP, Laser Projector)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["proyektor", "projector", "infocus", "presentasi", "layar proyektor"],
  },
  {
    code: "4528400001",
    name: "Uninterruptible Power Supply (UPS) dan Stabilizer Komputer",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["ups", "stabilizer", "baterai cadangan", "stavolt", "power backup"],
  },
  {
    code: "4529000001",
    name: "Suku Cadang & Komponen Komputer (Motherboard, RAM Memory, Power Supply PSU, VGA)",
    category: "Elektronik & Komputer",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["ram", "memory", "vga", "gpu", "motherboard", "psu", "casing komputer"],
  },

  // ─── Perabot & Mebel ────────────────────────────────────────────────────────
  {
    code: "3812101001",
    name: "Mebel Kantor / Meja Kerja Pegawai dan Meja Siswa",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["meja", "meja kerja", "meja kantor", "meja siswa", "meja tulis", "desk", "meja staff"],
  },
  {
    code: "3812101002",
    name: "Kursi Kantor dengan Pengatur Ketinggian (Kursi Kerja Hidrolik, Ergonomis, Swivel)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["kursi", "kursi kerja", "kursi kantor", "kursi hidrolik", "kursi ergonomis", "chair", "kursi staff"],
  },
  {
    code: "3812101003",
    name: "Kursi Hadap / Kursi Tamu Kantor / Kursi Rapat Berjajar (Stool & Gang Chair)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["kursi tamu", "kursi rapat", "kursi hadap", "kursi tunggu", "kursi deret", "kursi kuliah"],
  },
  {
    code: "3812102001",
    name: "Sofa dan Tempat Duduk Berlapis (Sofa 1/2/3 Seater, L-Shape, Kursi Tamu Berlapis Busa)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["sofa", "sofa kantor", "sofa tamu", "sofa kulit", "couch", "kursi santai", "seater"],
  },
  {
    code: "3812103001",
    name: "Lemari Arsip Logam / Filing Cabinet (2, 3, 4 Laci dengan Kunci Sentral)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["filing cabinet", "lemari arsip", "lemari besi", "cabinet laci", "lemari dokumen"],
  },
  {
    code: "3812103002",
    name: "Lemari Pintu Geser / Lemari Pintu Kaca Penyimpan Berkas Kantor (Cupboard)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["lemari geser", "lemari kaca", "lemari buku", "lemari kantor", "cupboard"],
  },
  {
    code: "3812104001",
    name: "Meja Rapat / Meja Konferensi Kantor (Conference & Meeting Table)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["meja rapat", "meja meeting", "meja konferensi", "conference table"],
  },
  {
    code: "3812105001",
    name: "Partisi Ruangan dan Sekat Meja Kerja Kantor (Office Workstation & Screen)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["partisi", "sekat", "workstation", "partisi kantor", "cubicle"],
  },
  {
    code: "3812201001",
    name: "Mebel Sekolah / Meja dan Kursi Belajar Siswa Berangka Pipa Logam",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["meja sekolah", "kursi sekolah", "bangku siswa", "meja belajar"],
  },
  {
    code: "3812202001",
    name: "Papan Tulis Kantor dan Sekolah (Whiteboard Magnetik, Papan Pengumuman)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["whiteboard", "papan tulis", "papan magnetik", "notice board"],
  },
  {
    code: "3812301001",
    name: "Rak Penyimpanan Arsip & Rak Server Kantor (Steel Storage Rack)",
    category: "Perabot & Furnitur",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["rak arsip", "rak besi", "rak dokumen", "rack server", "rak gudang"],
  },

  // ─── Mesin & Alat Kantor / ATK ──────────────────────────────────────────────
  {
    code: "4514001001",
    name: "Mesin Fotokopi Digital Multifungsi (Monochrome & Color Copier System)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["mesin fotokopi", "fotocopy", "copier", "xerox", "mesin cetak kantor"],
  },
  {
    code: "4515001001",
    name: "Mesin Penghancur Kertas / Paper Shredder (Cross Cut & Micro Cut)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["penghancur kertas", "paper shredder", "shredder", "alat potong kertas"],
  },
  {
    code: "4516001001",
    name: "Mesin Penjilid (Binding Machine) dan Mesin Pemotong Kertas Kantor",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["mesin jilid", "binding machine", "pemotong kertas", "paper cutter"],
  },
  {
    code: "4517001001",
    name: "Mesin Laminating Dokumen Kantor (Hot & Cold Laminator)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["mesin laminating", "laminator", "laminasi"],
  },
  {
    code: "4519001001",
    name: "Mesin Absensi Pegawai Biometrik (Fingerprint, Face Recognition & RFID)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["mesin absensi", "fingerprint", "sidik jari", "face recognition", "alat absensi"],
  },
  {
    code: "3891101001",
    name: "Kertas Cetak Dokumen / Kertas HVS (A4, F4 / Folio, 70-80 GSM)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["kertas hvs", "kertas a4", "kertas f4", "kertas folio", "paper one", "sinar dunia"],
  },
  {
    code: "3891201001",
    name: "Perlengkapan Tulis Kantor (Pena, Spidol Whiteboard, Pensil, Penghapus, Penggaris)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["pulpen", "spidol", "ballpoint", "pensil", "alat tulis", "atk"],
  },
  {
    code: "3891301001",
    name: "Peralatan Arsip Dokumen (Ordner, Binder, Map Stopmap, Clear Holder)",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["ordner", "map", "binder", "stopmap", "tempat berkas", "file holder"],
  },
  {
    code: "3891401001",
    name: "Bahan Habis Pakai Mesin Cetak / Tinta Printer, Toner, dan Tabung Cartridge",
    category: "Alat Kantor & ATK",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["tinta printer", "toner", "cartridge", "tinta epson", "tinta canon", "serbuk toner"],
  },

  // ─── Telekomunikasi & Jaringan ──────────────────────────────────────────────
  {
    code: "4722100001",
    name: "Perangkat Jaringan Komputer (Router, Managed Switch, Wireless Access Point)",
    category: "Peralatan Telekomunikasi",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["router", "switch hub", "access point", "mikrotik", "cisco", "tplink", "wifi"],
  },
  {
    code: "4721100001",
    name: "Perangkat Komunikasi Suara / Pesawat Telepon Meja, IP Phone & PABX System",
    category: "Peralatan Telekomunikasi",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["telepon kantor", "ip phone", "pabx", "voip", "pesawat telepon"],
  },
  {
    code: "4721200001",
    name: "Perangkat Radio Komunikasi Dua Arah / Handy Talkie (HT) & Rig Base Station",
    category: "Peralatan Telekomunikasi",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["ht", "handy talkie", "walkie talkie", "radio vhf", "radio uhf", "motorola"],
  },
  {
    code: "4724100001",
    name: "Kamera Pemantau Keamanan / IP CCTV Camera dan Perekam Video NVR/DVR",
    category: "Peralatan Telekomunikasi",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["cctv", "ip camera", "kamera pengawas", "nvr", "dvr", "security camera"],
  },

  // ─── Alat Laboratorium & Medis ──────────────────────────────────────────────
  {
    code: "4419201004",
    name: "Kulkas Medis Khusus dan Cold Chain Penyimpan Vaksin / Darah Laboratorium",
    category: "Alat Laboratorium & Medis",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["kulkas vaksin", "cold chain", "freezer medis", "laboratorium", "penyimpan darah"],
  },
  {
    code: "4811001001",
    name: "Peralatan Diagnostik Medis Elektronik (Tensimeter Digital, Termometer, Oximeter)",
    category: "Alat Laboratorium & Medis",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["tensimeter", "oximeter", "termometer", "alat medis", "alat kesehatan"],
  },
  {
    code: "4812001001",
    name: "Mikroskop Laboratorium Biologi & Alat Analisis Spesimen Digital",
    category: "Alat Laboratorium & Medis",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["mikroskop", "microscope", "laboratorium", "uji lab", "alat biologi"],
  },
  {
    code: "3824007999",
    name: "Kapal Khusus / Speed Boat Pusling Ambulance Air Pelayanan Medis Perairan",
    category: "Alat Laboratorium & Medis",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["speed boat", "ambulance air", "kapal pusling", "kapal ambulans", "perahu medis"],
  },

  // ─── Piranti Lunak / Software ───────────────────────────────────────────────
  {
    code: "4531001001",
    name: "Piranti Lunak Sistem Operasi Komputer (Operating System License)",
    category: "Piranti Lunak & IT",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["windows", "os", "operating system", "lisensi windows", "server os"],
  },
  {
    code: "4532001001",
    name: "Piranti Lunak Aplikasi Perkantoran dan Pengolah Dokumen (Office Productivity Suite)",
    category: "Piranti Lunak & IT",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["office", "microsoft office", "office 365", "aplikasi perkantoran"],
  },
  {
    code: "4533001001",
    name: "Piranti Lunak Keamanan Siber, Proteksi Antivirus dan Firewall Korporat",
    category: "Piranti Lunak & IT",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["antivirus", "cyber security", "firewall", "kaspersky", "eset", "keamanan"],
  },

  // ─── Sarana Umum, Penerangan & Sanitasi ─────────────────────────────────────
  {
    code: "4653201001",
    name: "Lampu Penerangan Jalan Umum Tenaga Surya (PJU-TS) dan Lampu LED Hemat Energi",
    category: "Lainnya / Umum",
    seksi: "Seksi 4: Produk Logam, Mesin dan Perlengkapannya",
    tags: ["lampu pju", "pju tenaga surya", "lampu jalan", "solar cell", "lampu led"],
  },
  {
    code: "3632001002",
    name: "Pipa dan Selang dari Plastik HDPE / PVC untuk Air Minum dan Konstruksi",
    category: "Lainnya / Umum",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["pipa hdpe", "pipa pvc", "selang", "pipa air", "konstruksi"],
  },
  {
    code: "3691001001",
    name: "Tempat Sampah Pilah Gedung Kantor & Dustbin Beroda Kapasitas 120-660 Liter",
    category: "Lainnya / Umum",
    seksi: "Seksi 3: Produk Tekstil, Kulit, Mebel dan Barang Pabrikasi Lainnya",
    tags: ["tempat sampah", "tong sampah", "dustbin", "tempat sampah pilah", "sanitasi"],
  },
];

// Helper to filter/search KBKI items
export function searchKbkiItems(query: string, categoryFilter?: string): MasterKbkiItem[] {
  const cleanQ = query.toLowerCase().trim();
  return MASTER_KBKI_LIST.filter((item) => {
    if (categoryFilter && categoryFilter !== "Semua" && item.category !== categoryFilter) {
      return false;
    }
    if (!cleanQ) return true;
    return (
      item.code.includes(cleanQ) ||
      item.name.toLowerCase().includes(cleanQ) ||
      item.tags.some((t) => t.includes(cleanQ))
    );
  });
}
