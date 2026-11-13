"use client";



import { useState, useEffect, useRef, Suspense, useCallback } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";

import { useSession } from "@/components/session/SessionProvider";

import {

  ArrowLeft,

  Upload,

  Plus,

  Trash2,

  Video,

  Image as ImageIcon,

  Check,

  AlertCircle,

  HelpCircle,

  Info,

  X,

  ChevronDown,

  ChevronRight,

  Search,

  Package,

  Layers,

  Store,

  Tag,

  ShieldCheck,

  SlidersHorizontal,

  Clock,

  Truck,

  Wrench,

  Percent,

  CheckCircle2,

  Award,

  FileText,

  Boxes,

  Download,

  FileSpreadsheet,

  UploadCloud,

} from "lucide-react";

import {

  downloadKatalogTemplate,

  parseKatalogExcelFile,

  ParsedProductItem,

  ParseExcelResult,

} from "@/lib/katalog-excel-helper";

import {

  PRODUCT_SPEC_REGISTRY,

  KBLI_STORE_LIST,

  StockLogItem,

  hitungUmurProduk,

  formatTanggalIndo,

} from "@/lib/katalog-specs";

import {

  MASTER_KBKI_LIST,

  MasterKbkiItem,

  searchKbkiItems,

} from "@/lib/master-kbki";



interface VariantItem {

  id: string;

  nama: string;

  pilihan: string;

}



interface GrosirItem {

  id: string;

  minQty: number;

  harga: number;

}



export default function TambahProdukPage() {

  return (

    <Suspense

      fallback={

        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">

          <div className="flex flex-col items-center gap-3">

            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />

            <p className="text-sm font-semibold text-slate-500">Memuat formulir produk...</p>

          </div>

        </div>

      }

    >

      <TambahProdukContent />

    </Suspense>

  );

}



function TambahProdukContent() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const editId = searchParams.get("id") || searchParams.get("editId");

  const isEditMode = Boolean(editId);



  const { user, loading: sessionLoading } = useSession();



  // Dirty tracking & confirmation modals

  const [isDirty, setIsDirty] = useState(false);

  const [loadingEdit, setLoadingEdit] = useState(isEditMode);

  const [showExitModal, setShowExitModal] = useState(false);

  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const hasLoadedRef = useRef(false);



  useEffect(() => {

    if (!sessionLoading) {

      if (!user || (user.role !== "SUPERADMIN" && user.role !== "ADMIN")) {

        router.replace("/katalog-produk");

      }

    }

  }, [user, sessionLoading, router]);



  // Warn user on browser refresh or close tab if form is dirty

  useEffect(() => {

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {

      if (isDirty) {

        e.preventDefault();

        e.returnValue = "";

      }

    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);

  }, [isDirty]);



  // Form State

  const [kategoriId, setKategoriId] = useState<string>("elektronik");

  const [subKategoriId, setSubKategoriId] = useState<string>("monitor-pc");

  const [kategori, setKategori] = useState<string>("Elektronik");

  const [subKategori, setSubKategori] = useState<string>("Monitor PC");

  const [spesifikasiValues, setSpesifikasiValues] = useState<Record<string, string>>({});

  const [kbliSearch, setKbliSearch] = useState<string>("");



  const [adaMerek, setAdaMerek] = useState(false);

  const [merek, setMerek] = useState("");



  const [namaProduk, setNamaProduk] = useState("");

  const [sku, setSku] = useState("");

  const [fotoSlots, setFotoSlots] = useState<(string | null)[]>([null, null, null, null, null]);

  const [videoUrl, setVideoUrl] = useState("");

  const [deskripsi, setDeskripsi] = useState("");



  const [kodeKbki, setKodeKbki] = useState("");



  const [klasifikasiPdn, setKlasifikasiPdn] = useState("Lokal");

  const [lokasiProduksi, setLokasiProduksi] = useState("Diproduksi di seluruh Indonesia");

  const [tenagaKerja, setTenagaKerja] = useState(

    "Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri"

  );

  const [bahanBaku, setBahanBaku] = useState("Seluruh bahan baku dalam negeri");

  const [nilaiTkdn, setNilaiTkdn] = useState<string>("");

  const [nilaiBmp, setNilaiBmp] = useState<string>("");

  const [pemilikSertifikat, setPemilikSertifikat] = useState("");



  const [beratProduk, setBeratProduk] = useState("");

  const [dimensiProduk, setDimensiProduk] = useState("");

  const [dikirimDari, setDikirimDari] = useState("DKI Jakarta");

  const [namaPenyedia, setNamaPenyedia] = useState("MabelHub Store");

  const [namaPic, setNamaPic] = useState("");

  const [noHpPic, setNoHpPic] = useState("");

  const [jenisPenyedia, setJenisPenyedia] = useState("UMKK");

  const [lokasiPenyedia, setLokasiPenyedia] = useState("DKI Jakarta");



  const [adaSni, setAdaSni] = useState(false);

  const [nomorSni, setNomorSni] = useState("");



  const [persenPajak, setPersenPajak] = useState<number>(0);



  const [varianList, setVarianList] = useState<VariantItem[]>([]);

  const [hargaProduk, setHargaProduk] = useState<string>("");

  const [hargaModal, setHargaModal] = useState<string>("");

  const [feeAdminPersen, setFeeAdminPersen] = useState<string>("5");

  const [grosirList, setGrosirList] = useState<GrosirItem[]>([]);



  const [jumlahStok, setJumlahStok] = useState<string>("");

  const [satuanProduk, setSatuanProduk] = useState("");

  const [tanggalMasukKatalog, setTanggalMasukKatalog] = useState<string>(

    new Date().toISOString().split("T")[0]

  );

  const [catatanPerubahanStok, setCatatanPerubahanStok] = useState<string>("");

  const [riwayatStok, setRiwayatStok] = useState<StockLogItem[]>([]);

  const initialStokRef = useRef<number | null>(null);



  const [preOrderAktif, setPreOrderAktif] = useState(false);

  const [durasiPreOrder, setDurasiPreOrder] = useState<number>(30);



  const [layananList, setLayananList] = useState<string[]>([]);

  const [layananInput, setLayananInput] = useState("");



  // Helpers / Modal states

  const [showKbliModal, setShowKbliModal] = useState(false);

  const [showKbkiModal, setShowKbkiModal] = useState(false);

  const [kbkiSearch, setKbkiSearch] = useState("");

  const [kbkiCategoryFilter, setKbkiCategoryFilter] = useState("Semua");

  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);



  // Excel Import states

  const [showExcelModal, setShowExcelModal] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [parsingExcel, setParsingExcel] = useState(false);

  const [parsedResult, setParsedResult] = useState<ParseExcelResult | null>(null);

  const [excelParseError, setExcelParseError] = useState<string | null>(null);

  const [importingBatch, setImportingBatch] = useState(false);

  const [importSuccessResult, setImportSuccessResult] = useState<{ count: number } | null>(null);

  const [showExcelErrorsDetail, setShowExcelErrorsDetail] = useState(false);

  const excelFileInputRef = useRef<HTMLInputElement>(null);



  // Active Main & Sub Category Objects

  const currentMainCat =

    PRODUCT_SPEC_REGISTRY.find((m) => m.id === kategoriId) || PRODUCT_SPEC_REGISTRY[0];

  const currentSubCat =

    currentMainCat.subcategories.find((s) => s.id === subKategoriId) ||

    currentMainCat.subcategories[0];



  // Auto-fill initial KBKI if empty

  useEffect(() => {

    if (!isEditMode && !kodeKbki && currentSubCat.kbkiDefault) {

      setKodeKbki(currentSubCat.kbkiDefault);

    }

  }, [isEditMode, currentSubCat.kbkiDefault, kodeKbki]);



  // Load existing product if in Edit Mode

  useEffect(() => {

    if (!editId) return;

    let active = true;

    const fetchProduct = async () => {

      try {

        setLoadingEdit(true);

        const res = await fetch(`/api/katalog-produk/${editId}`);

        if (!res.ok) throw new Error("Produk tidak ditemukan");

        const data = await res.json();

        const p = data.product;



        if (p && active) {

          setNamaProduk(p.namaProduk || "");

          setSku(p.sku || "");



          const matchedCat = PRODUCT_SPEC_REGISTRY.find(

            (c) => c.name.toLowerCase() === (p.kategori || "").toLowerCase()

          );

          if (matchedCat) {

            setKategoriId(matchedCat.id);

            setKategori(matchedCat.name);

            const matchedSub = matchedCat.subcategories.find(

              (s) => s.name.toLowerCase() === (p.subKategori || "").toLowerCase()

            );

            if (matchedSub) {

              setSubKategoriId(matchedSub.id);

              setSubKategori(matchedSub.name);

            }

          }



          if (p.spesifikasiDetail) {

            setSpesifikasiValues(p.spesifikasiDetail);

          }



          if (p.merek && p.merek !== "Tanpa Merek") {

            setAdaMerek(true);

            setMerek(p.merek);

          } else {

            setAdaMerek(false);

            setMerek("");

          }



          const slots: (string | null)[] = [null, null, null, null, null];

          if (p.fotoUtama) slots[0] = p.fotoUtama;

          if (Array.isArray(p.fotoLainnya)) {

            p.fotoLainnya.slice(0, 4).forEach((img: string, idx: number) => {

              slots[idx + 1] = img;

            });

          }

          setFotoSlots(slots);



          setVideoUrl(p.videoUrl || "");

          setDeskripsi(p.deskripsi || "");

          setKodeKbki(p.kodeKbki || "");



          setKlasifikasiPdn(p.klasifikasiPdn || "Lokal");

          setLokasiProduksi(p.lokasiProduksi || "Diproduksi di seluruh Indonesia");

          setTenagaKerja(

            p.tenagaKerja || "Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri"

          );

          setBahanBaku(p.bahanBaku || "Seluruh bahan baku dalam negeri");



          setNilaiTkdn(p.nilaiTkdn !== undefined && p.nilaiTkdn > 0 ? String(p.nilaiTkdn) : "");

          setNilaiBmp(p.nilaiBmp !== undefined && p.nilaiBmp > 0 ? String(p.nilaiBmp) : "");

          setPemilikSertifikat(p.pemilikSertifikat && p.pemilikSertifikat !== "-" ? p.pemilikSertifikat : "");



          setBeratProduk(p.beratProduk && p.beratProduk !== "-" ? p.beratProduk : "");

          setDimensiProduk(p.dimensiProduk && p.dimensiProduk !== "-" ? p.dimensiProduk : "");

          setDikirimDari(p.dikirimDari || "DKI Jakarta");

          setNamaPenyedia(p.namaPenyedia || "MabelHub Store");

          setNamaPic(p.namaPic && p.namaPic !== "-" ? p.namaPic : (p.namaPicPenyedia && p.namaPicPenyedia !== "-" ? p.namaPicPenyedia : ""));

          setNoHpPic(p.noHpPic && p.noHpPic !== "-" ? p.noHpPic : (p.noHpPicPenyedia && p.noHpPicPenyedia !== "-" ? p.noHpPicPenyedia : (p.teleponPic && p.teleponPic !== "-" ? p.teleponPic : "")));

          setJenisPenyedia(p.jenisPenyedia || "UMKK");

          setLokasiPenyedia(p.lokasiPenyedia || "DKI Jakarta");



          if (p.sertifikatSni && p.sertifikatSni !== "Tidak ada") {

            setAdaSni(true);

            setNomorSni(p.nomorSni || p.sertifikatSni);

          } else {

            setAdaSni(false);

            setNomorSni("");

          }



          setPersenPajak(Number(p.persenPajak) || 0);

          setHargaProduk(p.hargaProduk ? String(p.hargaProduk) : "");

          setHargaModal(p.hargaModal !== undefined ? String(p.hargaModal) : "");

          setFeeAdminPersen(p.feeAdminPersen !== undefined ? String(p.feeAdminPersen) : "5");

          setJumlahStok(p.jumlahStok !== undefined ? String(p.jumlahStok) : "");

          setSatuanProduk(p.satuanProduk || "Unit");

          if (p.tanggalMasukKatalog) {

            setTanggalMasukKatalog(p.tanggalMasukKatalog.split("T")[0]);

          } else if (p.createdAt) {

            setTanggalMasukKatalog(p.createdAt.split("T")[0]);

          }

          if (p.jumlahStok !== undefined) {

            initialStokRef.current = Number(p.jumlahStok) || 0;

          }

          if (Array.isArray(p.riwayatStok)) {

            setRiwayatStok(p.riwayatStok);

          }



          setPreOrderAktif(Boolean(p.isPreOrder));

          setDurasiPreOrder(Number(p.durasiPreOrder) || 30);



          if (Array.isArray(p.varian)) {

            setVarianList(

              p.varian.map((v: any) => ({

                id: Math.random().toString(),

                nama: v.nama,

                pilihan: Array.isArray(v.pilihan) ? v.pilihan.join(", ") : v.pilihan,

              }))

            );

          }



          if (Array.isArray(p.hargaGrosir)) {

            setGrosirList(p.hargaGrosir);

          }



          if (Array.isArray(p.layananTambahan)) {

            setLayananList(p.layananTambahan);

          }



          setIsDirty(false);

          setTimeout(() => {

            hasLoadedRef.current = true;

          }, 300);

        }

      } catch (err: any) {

        console.error(err);

        setErrorMsg("Gagal memuat produk: " + err.message);

      } finally {

        if (active) setLoadingEdit(false);

      }

    };

    fetchProduct();

    return () => {

      active = false;

    };

  }, [editId]);



  // In create mode, mark initial load complete after initial render

  useEffect(() => {

    if (!editId) {

      const t = setTimeout(() => {

        hasLoadedRef.current = true;

      }, 300);

      return () => clearTimeout(t);

    }

  }, [editId]);



  // Track any change to form inputs as dirty

  useEffect(() => {

    if (!hasLoadedRef.current) return;

    setIsDirty(true);

  }, [

    namaProduk,

    sku,

    fotoSlots,

    videoUrl,

    deskripsi,

    kodeKbki,

    spesifikasiValues,

    merek,

    adaMerek,

    klasifikasiPdn,

    lokasiProduksi,

    tenagaKerja,

    bahanBaku,

    nilaiTkdn,

    nilaiBmp,

    pemilikSertifikat,

    beratProduk,

    dimensiProduk,

    dikirimDari,

    namaPenyedia,

    namaPic,

    noHpPic,

    jenisPenyedia,

    lokasiPenyedia,

    adaSni,

    nomorSni,

    persenPajak,

    hargaProduk,

    jumlahStok,

    satuanProduk,

    preOrderAktif,

    durasiPreOrder,

    tanggalMasukKatalog,

    catatanPerubahanStok,

    varianList,

    grosirList,

    layananList,

    kategoriId,

    subKategoriId,

  ]);



  // Safe Exit Handler (Checks isDirty)

  const handleSafeExit = (targetUrl?: string) => {

    if (isDirty) {

      setPendingNavUrl(targetUrl || null);

      setShowExitModal(true);

    } else {

      if (targetUrl) {

        router.push(targetUrl);

      } else {

        router.back();

      }

    }

  };



  // Delete Product Handler

  const handleDeleteProduct = async () => {

    if (!editId) return;

    try {

      setDeleting(true);

      const res = await fetch(`/api/katalog-produk/${editId}`, {

        method: "DELETE",

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk");



      setIsDirty(false);

      setShowDeleteModal(false);

      router.push("/katalog-produk/kelola");

    } catch (err: any) {

      console.error(err);

      setErrorMsg(err.message || "Gagal menghapus produk");

      setShowDeleteModal(false);

    } finally {

      setDeleting(false);

    }

  };



  const filteredKbliList = KBLI_STORE_LIST.filter(

    (k) =>

      k.code.includes(kbliSearch.trim()) ||

      k.name.toLowerCase().includes(kbliSearch.toLowerCase().trim())

  );



  const filteredKbkiList = searchKbkiItems(kbkiSearch, kbkiCategoryFilter);



  const handleMainCatChange = (newMainId: string) => {

    setIsDirty(true);

    setKategoriId(newMainId);

    const main = PRODUCT_SPEC_REGISTRY.find((m) => m.id === newMainId);

    if (main && main.subcategories.length > 0) {

      const firstSub = main.subcategories[0];

      setSubKategoriId(firstSub.id);

      setKategori(main.name);

      setSubKategori(firstSub.name);

      if (firstSub.kbkiDefault) {

        setKodeKbki(firstSub.kbkiDefault);

      }

    }

  };



  const handleSubCatChange = (newSubId: string) => {

    setIsDirty(true);

    setSubKategoriId(newSubId);

    const sub = currentMainCat.subcategories.find((s) => s.id === newSubId);

    if (sub) {

      setSubKategori(sub.name);

      if (sub.kbkiDefault) {

        setKodeKbki(sub.kbkiDefault);

      }

    }

  };



  const handleSpecFieldChange = (key: string, value: string) => {

    setIsDirty(true);

    setSpesifikasiValues((prev) => ({ ...prev, [key]: value }));

    if (key === "merek") {

      if (value.trim()) {

        setAdaMerek(true);

        setMerek(value);

      }

    }

  };



  // Auto calculate tax

  const hargaNumber = parseFloat(hargaProduk) || 0;

  const modalNumber = parseFloat(hargaModal) || 0;

  const feePersenNumber = parseFloat(feeAdminPersen) || 0;

  const hargaTayang = Math.round(hargaNumber + (hargaNumber * persenPajak) / 100);

  const feeAdminNominal = Math.round((hargaNumber * feePersenNumber) / 100);

  const labaKotor = hargaNumber - modalNumber;

  const labaBersih = labaKotor - feeAdminNominal;

  const persenMargin = hargaNumber > 0 ? Math.round((labaBersih / hargaNumber) * 1000) / 10 : 0;



  // Categories list

  const CATEGORIES = [

    "Furniture & Meubel",

    "Alat Laboratorium & Transportasi Medis",

    "Konstruksi & Perpipaan",

    "Penerangan & Kelistrikan",

    "Kebutuhan Medis & Farmasi",

    "Elektronik & Perkantoran",

    "Peralatan Kebersihan & Sanitasi",

    "Alat Tulis Kantor (ATK)",

    "Pakaian Seragam & Tekstil",

    "Kendaraan & Transportasi",

  ];



  // KBKI options

  const KBKI_OPTIONS = [

    { code: "3812101001", name: "3812101001 - Mebel Kantor / Meja & Kursi Siswa" },

    { code: "3824007999", name: "3824007999 - Kapal Khusus / Speed Boat Pusling Ambulance Air" },

    { code: "3632001002", name: "3632001002 - Pipa dan Selang dari Plastik HDPE" },

    { code: "4653201001", name: "4653201001 - Lampu Penerangan Jalan Umum Tenaga Surya" },

    { code: "4419201004", name: "4419201004 - Kulkas Medis dan Penyimpan Vaksin" },

    { code: "3639001009", name: "3639001009 - Kantong dan Kemasan Plastik Polietilena Farmasi" },

    { code: "3411002001", name: "3411002001 - Aspal dan Bitumen Emulsi Jalan Raya" },

  ];



  // Image Upload handler

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;



    if (!file.type.startsWith("image/")) {

      alert("Hanya format gambar yang diperbolehkan (.jpg, .jpeg, .png)");

      return;

    }



    const reader = new FileReader();

    reader.onload = () => {

      const result = reader.result as string;

      setFotoSlots((prev) => {

        const next = [...prev];

        next[index] = result;

        return next;

      });

    };

    reader.readAsDataURL(file);

  };



  const removePhoto = (index: number) => {

    setFotoSlots((prev) => {

      const next = [...prev];

      next[index] = null;

      return next;

    });

  };



  // Add Varian

  const handleAddVarian = () => {

    setVarianList((prev) => [

      ...prev,

      { id: Date.now().toString(), nama: "", pilihan: "" },

    ]);

  };



  const updateVarian = (id: string, field: "nama" | "pilihan", value: string) => {

    setVarianList((prev) =>

      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))

    );

  };



  const removeVarian = (id: string) => {

    setVarianList((prev) => prev.filter((v) => v.id !== id));

  };



  // Add Grosir

  const handleAddGrosir = () => {

    setGrosirList((prev) => [

      ...prev,

      { id: Date.now().toString(), minQty: 10, harga: 0 },

    ]);

  };



  const updateGrosir = (id: string, field: "minQty" | "harga", val: number) => {

    setGrosirList((prev) =>

      prev.map((g) => (g.id === id ? { ...g, [field]: val } : g))

    );

  };



  const removeGrosir = (id: string) => {

    setGrosirList((prev) => prev.filter((g) => g.id !== id));

  };



  // Add Layanan

  const handleAddLayanan = () => {

    if (!layananInput.trim()) return;

    setLayananList((prev) => [...prev, layananInput.trim()]);

    setLayananInput("");

  };



  const removeLayanan = (idx: number) => {

    setLayananList((prev) => prev.filter((_, i) => i !== idx));

  };



  // Excel Import & Autofill Handlers

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;

    setExcelFile(file);

    setParsingExcel(true);

    setExcelParseError(null);

    setImportSuccessResult(null);

    try {

      const result = await parseKatalogExcelFile(file);

      setParsedResult(result);

    } catch (err: any) {

      console.error("Gagal membaca Excel:", err);

      setExcelParseError(err?.message || "Gagal memproses file Excel. Pastikan format file sesuai.");

      setParsedResult(null);

    } finally {

      setParsingExcel(false);

    }

  };



  const handleApplyRowToForm = (item: ParsedProductItem) => {

    setNamaProduk(item.namaProduk);

    if (item.sku) setSku(item.sku);

    if (item.merek && item.merek !== "Tanpa Merek") {

      setAdaMerek(true);

      setMerek(item.merek);

    } else {

      setAdaMerek(false);

      setMerek("");

    }



    // Match category & subcategory

    const matchedCat = PRODUCT_SPEC_REGISTRY.find(

      (c) => c.name.toLowerCase() === item.kategori.toLowerCase() || c.id === item.kategori.toLowerCase()

    );

    if (matchedCat) {

      setKategoriId(matchedCat.id);

      setKategori(matchedCat.name);

      const matchedSub = matchedCat.subcategories.find(

        (s) => s.name.toLowerCase() === item.subKategori.toLowerCase() || s.id === item.subKategori.toLowerCase()

      );

      if (matchedSub) {

        setSubKategoriId(matchedSub.id);

        setSubKategori(matchedSub.name);

        if (matchedSub.kbkiDefault) {

          setKodeKbki(matchedSub.kbkiDefault);

        }

      }

    }



    if (item.kodeKbki && item.kodeKbki !== "-") {

      setKodeKbki(item.kodeKbki);

    }

    setHargaProduk(item.hargaProduk > 0 ? String(item.hargaProduk) : "");

    setPersenPajak(item.persenPajak || 0);

    setJumlahStok(item.jumlahStok >= 0 ? String(item.jumlahStok) : "0");

    if (item.satuanProduk) setSatuanProduk(item.satuanProduk);

    if (item.nilaiTkdn) setNilaiTkdn(String(item.nilaiTkdn));

    if (item.nilaiBmp) setNilaiBmp(String(item.nilaiBmp));

    if (item.namaPenyedia) setNamaPenyedia(item.namaPenyedia);

    if (item.namaPic && item.namaPic !== "-") setNamaPic(item.namaPic);

    if (item.noHpPic && item.noHpPic !== "-") setNoHpPic(item.noHpPic);

    if (item.jenisPenyedia) setJenisPenyedia(item.jenisPenyedia);

    if (item.lokasiPenyedia) setLokasiPenyedia(item.lokasiPenyedia);

    if (item.dikirimDari) setDikirimDari(item.dikirimDari);

    if (item.beratProduk && item.beratProduk !== "-") setBeratProduk(item.beratProduk);

    if (item.dimensiProduk && item.dimensiProduk !== "-") setDimensiProduk(item.dimensiProduk);

    setSpesifikasiValues((prev) => ({
      ...prev,
      ...(item.garansi && item.garansi !== "-" ? { garansi: item.garansi } : {}),
      ...(item.kelengkapanProduk && item.kelengkapanProduk !== "-" ? { kelengkapanProduk: item.kelengkapanProduk } : {}),
      ...(item.merek && item.merek !== "Tanpa Merek" ? { merek: item.merek } : {}),
    }));

    if (item.deskripsi) setDeskripsi(item.deskripsi);

    if (item.fotoUtama) {

      setFotoSlots([item.fotoUtama, null, null, null, null]);

    }

    if (item.sertifikatSni === "Ada") {

      setAdaSni(true);

      setNomorSni(item.nomorSni || "");

    } else {

      setAdaSni(false);

      setNomorSni("");

    }



    setIsDirty(true);

    setShowExcelModal(false);

    setSuccessMsg(`Data produk "${item.namaProduk}" berhasil diterapkan ke formulir. Silakan tinjau dan simpan.`);

    window.scrollTo({ top: 200, behavior: "smooth" });

  };



  const handleBulkImport = async () => {

    if (!parsedResult || parsedResult.validItems.length === 0) return;

    setImportingBatch(true);

    setExcelParseError(null);

    try {

      const res = await fetch("/api/katalog-produk/import", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ items: parsedResult.validItems }),

      });

      const data = await res.json();

      if (!res.ok) {

        throw new Error(data.error || "Gagal mengimpor produk.");

      }

      setImportSuccessResult({ count: data.count || parsedResult.validItems.length });

    } catch (err: any) {

      console.error("Gagal bulk import:", err);

      setExcelParseError(err?.message || "Terjadi kesalahan saat mengimpor produk.");

    } finally {

      setImportingBatch(false);

    }

  };



  // Save product

  const handleSubmit = async (keepForm = false, isDraft = false) => {

    setErrorMsg(null);

    setSuccessMsg(null);



    if (!isDraft) {

      if (!kategori) {

        setErrorMsg("Kategori produk wajib dipilih.");

        window.scrollTo({ top: 0, behavior: "smooth" });

        return;

      }

      if (!namaProduk.trim() || namaProduk.trim().length < 5) {

        setErrorMsg("Nama produk wajib diisi minimal 5 karakter.");

        window.scrollTo({ top: 150, behavior: "smooth" });

        return;

      }

      if (!fotoSlots[0]) {

        setErrorMsg("Minimal 1 Foto Utama produk wajib diupload.");

        window.scrollTo({ top: 250, behavior: "smooth" });

        return;

      }

      if (!kodeKbki) {

        setErrorMsg("Kode KBKI wajib dipilih.");

        return;

      }

      if (!hargaProduk || hargaNumber <= 0) {

        setErrorMsg("Harga produk wajib diisi dengan benar.");

        return;

      }

      if (!jumlahStok || parseInt(jumlahStok, 10) < 0) {

        setErrorMsg("Jumlah stok produk wajib diisi.");

        return;

      }

      if (!satuanProduk) {

        setErrorMsg("Satuan produk wajib dipilih.");

        return;

      }

    }



    try {

      setSubmitting(true);



      const parsedVariants = varianList

        .filter((v) => v.nama.trim())

        .map((v) => ({

          nama: v.nama.trim(),

          pilihan: v.pilihan

            .split(",")

            .map((p) => p.trim())

            .filter(Boolean),

        }));



      const payload = {

        namaProduk: namaProduk.trim(),

        sku: sku.trim() || `MBL-${Date.now().toString().slice(-6)}`,

        kategori: currentMainCat.name,

        subKategori: currentSubCat.name,

        merek: adaMerek ? merek.trim() || "Tanpa Merek" : (spesifikasiValues.merek || "Tanpa Merek"),

        jenisProduk: "Barang",

        fotoUtama: fotoSlots[0],

        fotoLainnya: fotoSlots.slice(1).filter(Boolean),

        videoUrl: videoUrl.trim(),

        deskripsi: deskripsi.trim(),

        kodeKbki: kodeKbki || currentSubCat.kbkiDefault || "-",

        klasifikasiPdn,

        lokasiProduksi,

        tenagaKerja,

        bahanBaku,

        nilaiTkdn: nilaiTkdn !== "" ? parseFloat(nilaiTkdn) : 0,

        nilaiBmp: nilaiBmp !== "" ? parseFloat(nilaiBmp) : 0,

        tkdnBmp: (parseFloat(nilaiTkdn) || 0) + (parseFloat(nilaiBmp) || 0),

        pemilikSertifikat: pemilikSertifikat.trim() || "-",

        beratProduk: beratProduk.trim() || "-",

        dimensiProduk: dimensiProduk.trim() || "-",

        dikirimDari: dikirimDari.trim() || lokasiPenyedia.trim() || "DKI Jakarta",

        namaPenyedia: namaPenyedia.trim() || "MabelHub Store",

        namaPic: namaPic.trim() || "-",

        noHpPic: noHpPic.trim() || "-",

        namaPicPenyedia: namaPic.trim() || "-",

        noHpPicPenyedia: noHpPic.trim() || "-",

        jenisPenyedia: jenisPenyedia || "UMKK",

        lokasiPenyedia: lokasiPenyedia.trim() || "DKI Jakarta",

        sertifikatSni: adaSni ? nomorSni.trim() || "Ada" : "Tidak ada",

        nomorSni: adaSni ? nomorSni.trim() : "",

        pajak: "PPN",

        persenPajak,

        hargaProduk: hargaNumber,

        hargaModal: modalNumber,

        feeAdminPersen: feePersenNumber,

        feeAdminNominal,

        labaKotor,

        labaBersih,

        persenMargin,

        hargaSetelahPajak: hargaTayang,

        minimumPembelian: 1,

        jumlahStok: parseInt(jumlahStok, 10) || 0,

        satuanProduk,

        tanggalMasukKatalog,

        catatanPerubahanStok: catatanPerubahanStok.trim() || undefined,

        isPreOrder: preOrderAktif,

        durasiPreOrder: preOrderAktif ? durasiPreOrder : 0,

        varian: parsedVariants,

        hargaGrosir: grosirList,

        layananTambahan: layananList,

        spesifikasiDetail: spesifikasiValues,

        spesifikasiProduk: spesifikasiValues.spesifikasiProduk || namaProduk.trim(),

        garansi: spesifikasiValues.garansi || "-",

        kelengkapanProduk: spesifikasiValues.kelengkapanProduk || "-",

        strukturHarga: spesifikasiValues.strukturHarga || "Harga Satuan",

        sertifikatTelekomunikasi: spesifikasiValues.sertifikatTelekomunikasi || "",

        ramahLingkungan: spesifikasiValues.ramahLingkungan || "",

        statusDraf: isDraft,

      };



      const url = isEditMode ? `/api/katalog-produk/${editId}` : "/api/katalog-produk";

      const method = isEditMode ? "PUT" : "POST";



      const res = await fetch(url, {

        method,

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload),

      });



      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal menyimpan produk");



      setIsDirty(false);



      setSuccessMsg(

        isEditMode

          ? isDraft

            ? "Perubahan berhasil disimpan sebagai Draf!"

            : "Produk berhasil diperbarui dan dipublikasikan!"

          : isDraft

          ? "Draf produk berhasil disimpan!"

          : "Produk berhasil ditambahkan ke Katalog!"

      );



      if (keepForm && !isEditMode) {

        // Reset form fields

        setSpesifikasiValues({});

        setAdaMerek(false);

        setMerek("");

        setNamaProduk("");

        setSku("");

        setNilaiTkdn("");

        setNilaiBmp("");

        setPemilikSertifikat("");

        setBeratProduk("");

        setDimensiProduk("");

        setNamaPic("");

        setNoHpPic("");

        setFotoSlots([null, null, null, null, null]);

        setVideoUrl("");

        setDeskripsi("");

        setKodeKbki("");

        setAdaSni(false);

        setNomorSni("");

        setHargaProduk("");

        setHargaModal("");

        setFeeAdminPersen("5");

        setJumlahStok("");

        setSatuanProduk("");

        setPreOrderAktif(false);

        setDurasiPreOrder(30);

        setVarianList([]);

        setGrosirList([]);

        setLayananList([]);

        setIsDirty(false);

        window.scrollTo({ top: 0, behavior: "smooth" });

      } else {

        setTimeout(() => {

          const destId = isEditMode ? editId : data.id;

          router.push(`/katalog-produk/${destId || ""}`);

        }, 800);

      }

    } catch (err: any) {

      console.error(err);

      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan produk");

    } finally {

      setSubmitting(false);

    }

  };



  if (sessionLoading || loadingEdit) {

    return (

      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">

        <div className="flex flex-col items-center gap-3">

          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />

          <p className="text-sm font-semibold text-slate-500">

            {isEditMode ? "Memuat data produk untuk diedit..." : "Memeriksa otentikasi..."}

          </p>

        </div>

      </div>

    );

  }



  if (!user || (user.role !== "SUPERADMIN" && user.role !== "ADMIN")) {

    return null;

  }



  return (

    <div className="min-h-screen bg-blue-50 text-slate-800 pb-20">

      <div className="flex">

        <div className="flex-1 min-w-0 p-4 sm:p-6">

          <div className="max-w-[1520px] mx-auto space-y-6">

            {/* ── Breadcrumb ── */}

            <nav className="flex" aria-label="Breadcrumb">

              <ol className="flex items-center space-x-2 text-sm font-medium text-gray-500">

                <li>

                  <button

                    type="button"

                    onClick={() => handleSafeExit("/katalog-produk")}

                    className="hover:text-blue-600 transition-colors cursor-pointer"

                  >

                    Katalog Produk

                  </button>

                </li>

                <li>

                  <ChevronRight className="w-4 h-4 text-gray-400" />

                </li>

                <li>

                  <button

                    type="button"

                    onClick={() => handleSafeExit("/katalog-produk/kelola")}

                    className="hover:text-blue-600 transition-colors cursor-pointer"

                  >

                    Kelola Produk

                  </button>

                </li>

                <li>

                  <ChevronRight className="w-4 h-4 text-gray-400" />

                </li>

                <li aria-current="page">

                  <span className="text-black font-extrabold">

                    {isEditMode ? "Edit Produk" : "Tambah Produk"}

                  </span>

                </li>

              </ol>

            </nav>



            {/* ── Header ── */}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-4">

                <div className="space-y-1">

                  <div className="flex items-center gap-2.5">

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-black drop-shadow-sm uppercase">

                      {isEditMode ? "EDIT PRODUK" : "TAMBAH PRODUK BARU"}

                    </h1>

                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">

                      Katalog Admin

                    </span>

                  </div>

                  <p className="text-sm text-neutral-600">

                    {isEditMode

                      ? `Perbarui informasi, spesifikasi teknis, harga, dan varian untuk "${namaProduk || "Produk"}"`

                      : "Formulir pendaftaran item produk baru lengkap dengan spesifikasi teknis standar"}

                  </p>

                </div>

              </div>



              <div className="flex flex-wrap items-center gap-2.5">

                <button

                  type="button"

                  onClick={() => setShowKbliModal(true)}

                  className="inline-flex items-center gap-2 h-11 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"

                >

                  <span>KBLI Toko ({KBLI_STORE_LIST.length})</span>

                </button>



                <button

                  type="button"

                  onClick={() => setShowKbkiModal(true)}

                  className="inline-flex items-center gap-2 h-11 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"

                >

                  <Search className="w-4 h-4 text-slate-500" />

                  <span>Cari KBKI</span>

                </button>



                {isEditMode && (

                  <button

                    type="button"

                    onClick={() => setShowDeleteModal(true)}

                    className="inline-flex items-center gap-2 h-11 px-4 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"

                  >

                    <Trash2 className="w-4 h-4" />

                    <span>Hapus</span>

                  </button>

                )}

              </div>

            </div>



            {/* ── Alerts ── */}

            {errorMsg && (

              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-xs">

                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />

                <span>{errorMsg}</span>

              </div>

            )}

            {successMsg && (

              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-xs">

                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />

                <span>{successMsg}</span>

              </div>

            )}



            {/* ── Banner Impor Excel ── */}

            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-800">

              <div className="flex items-start sm:items-center gap-3.5">

                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">

                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />

                </div>

                <div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <h2 className="text-base font-bold text-white">Tambah Produk Cepat via Excel</h2>

                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">

                      Bulk Import / Auto-Fill

                    </span>

                  </div>

                  <p className="text-xs text-blue-100/90 pt-0.5 max-w-2xl">

                    Punya data produk di spreadsheet? Unduh template resmi Excel MabelHub, isi data barang Anda, lalu unggah file untuk langsung diisikan ke formulir ini atau diimpor massal ke katalog.

                  </p>

                </div>

              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">

                <button

                  type="button"

                  onClick={() => downloadKatalogTemplate()}

                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-colors cursor-pointer"

                >

                  <Download className="w-4 h-4 text-emerald-300" />

                  <span>Unduh Template (.XLSX)</span>

                </button>

                <button

                  type="button"

                  onClick={() => {

                    setExcelFile(null);

                    setParsedResult(null);

                    setExcelParseError(null);

                    setImportSuccessResult(null);

                    setShowExcelModal(true);

                  }}

                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition-colors cursor-pointer"

                >

                  <UploadCloud className="w-4 h-4 text-slate-950" />

                  <span>Unggah File Excel</span>

                </button>

              </div>

            </div>



            {/* ── CARD 1: Kategori & Subkategori ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <Layers className="w-5 h-5" />

                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="text-base font-bold text-gray-900">Kategori & Subkategori Produk</h2>

                      <span className="text-[14px] font-bold text-rose-600">

                        *

                      </span>

                    </div>

                    <p className="text-sm text-gray-500">

                      Pilih Kategori dan Subkategori untuk memuat formulir spesifikasi teknis standar secara otomatis

                    </p>

                  </div>

                </div>



                <button

                  type="button"

                  onClick={() => setShowKbliModal(true)}

                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"

                >

                  Lihat KBLI Toko ({KBLI_STORE_LIST.length})

                </button>

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Kategori Utama</label>

                  <div className="relative">

                    <select

                      value={kategoriId}

                      onChange={(e) => handleMainCatChange(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      {PRODUCT_SPEC_REGISTRY.map((cat) => (

                        <option key={cat.id} value={cat.id}>

                          {cat.name}

                        </option>

                      ))}

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Subkategori</label>

                  <div className="relative">

                    <select

                      value={subKategoriId}

                      onChange={(e) => handleSubCatChange(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      {currentMainCat.subcategories.map((sub) => (

                        <option key={sub.id} value={sub.id}>

                          {sub.name}

                        </option>

                      ))}

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>

              </div>

            </section>



            {/* ── CARD 2: Merek ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <Tag className="w-5 h-5" />

                  </div>

                  <div>

                    <h2 className="text-base font-bold text-gray-900">Merek Produk</h2>

                    <p className="text-sm text-gray-500">

                      Cantumkan nama merek jika produk memiliki hak merek terdaftar

                    </p>

                  </div>

                </div>



                <div className="flex items-center gap-3">

                  <span className="text-sm font-bold text-gray-600 select-none">

                    {adaMerek ? "Ada Merek" : "Tanpa Merek"}

                  </span>

                  <button

                    type="button"

                    role="switch"

                    aria-checked={adaMerek}

                    onClick={() => setAdaMerek(!adaMerek)}

                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${

                      adaMerek ? "bg-blue-600" : "bg-gray-200"

                    }`}

                  >

                    <span

                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${

                        adaMerek ? "translate-x-5" : "translate-x-0"

                      }`}

                    />

                  </button>

                </div>

              </div>



              {adaMerek && (

                <div className="space-y-1.5 pt-1">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nama Merek</label>

                  <input

                    type="text"

                    placeholder="Masukkan nama merek produk (Contoh: Lenovo, Brother, Informa)"

                    value={merek}

                    onChange={(e) => setMerek(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>

              )}

            </section>



            {/* ── CARD 3: Informasi Produk ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <FileText className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">Informasi Produk</h2>

                  <p className="text-sm text-gray-500">

                    Lengkapi identitas produk, media gambar, dan deskripsi detail

                  </p>

                </div>

              </div>



              {/* Nama Produk */}

              <div className="space-y-1.5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nama Produk</label>

                    <span className="text-[14px] font-bold text-rose-600">

                    *

                    </span>

                  </div>

                  <span className="text-sm text-gray-400 font-medium">{namaProduk.length}/250</span>

                </div>

                <input

                  type="text"

                  maxLength={250}

                  placeholder="Contoh: Meja Kerja Kantor Kayu Jati Minimalis 120x60"

                  value={namaProduk}

                  onChange={(e) => setNamaProduk(e.target.value)}

                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                />

                <p className="text-sm text-gray-400">

                  Tulis nama produk dengan jelas min. 5 karakter. Cantumkan merek, tipe, atau spesifikasi ringkas.

                </p>

              </div>



              {/* SKU & Tanggal Masuk Katalog (Umur Produk) */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                        Nomor SKU (Stock Keeping Unit)

                      </label>

                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">

                        Opsional

                      </span>

                    </div>

                    <span className="text-sm text-gray-400 font-medium">{sku.length}/50</span>

                  </div>

                  <input

                    type="text"

                    maxLength={50}

                    placeholder="Contoh: SKU-MNTR-24-001 (Biarkan kosong untuk auto-generate)"

                    value={sku}

                    onChange={(e) => setSku(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                  <p className="text-[11px] text-gray-400">

                    Kode unik inventaris internal toko.

                  </p>

                </div>



                <div className="space-y-1.5">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                        Tanggal Masuk Katalog

                      </label>

                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">

                        Umur Produk

                      </span>

                    </div>

                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">

                      {hitungUmurProduk(tanggalMasukKatalog)}

                    </span>

                  </div>

                  <input

                    type="date"

                    value={tanggalMasukKatalog}

                    onChange={(e) => setTanggalMasukKatalog(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer"

                  />

                  <p className="text-[11px] text-gray-400">

                    Menghitung berapa lama produk ini telah terdaftar di katalog MabelHub.

                  </p>

                </div>

              </div>



              {/* Upload Foto Produk */}

              <div className="space-y-2 pt-1">

                <div className="flex items-center gap-2">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Upload Foto Produk

                  </label>

                  <span className="text-[14px] font-bold text-rose-600">

                    *

                  </span>

                </div>

                <p className="text-sm text-gray-500">

                  Gunakan format .jpg .jpeg .png dan ukuran optimal 700 x 700 px (Min. 300 x 300 px, Max. 2048 x 2048 px). Cantumkan min. 1 foto utama produk yang jelas.

                </p>



                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">

                  {fotoSlots.map((foto, idx) => (

                    <div

                      key={idx}

                      className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all group overflow-hidden ${

                        foto

                          ? "border-gray-300 bg-white shadow-2xs"

                          : "border-gray-200 bg-gray-50/80 hover:bg-blue-50/50 hover:border-blue-400"

                      } flex flex-col items-center justify-center p-2 text-center`}

                    >

                      {foto ? (

                        <>

                          <img

                            src={foto}

                            alt={`Foto ${idx + 1}`}

                            className="w-full h-full object-cover rounded-xl"

                          />

                          <button

                            type="button"

                            onClick={() => removePhoto(idx)}

                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors cursor-pointer"

                            title="Hapus foto"

                          >

                            <X className="w-3.5 h-3.5" />

                          </button>

                          <span className="absolute bottom-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-2xs">

                            {idx === 0 ? "Foto Utama" : `Foto ${idx + 1}`}

                          </span>

                        </>

                      ) : (

                        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center space-y-1.5 p-2">

                          <input

                            type="file"

                            accept="image/*"

                            onChange={(e) => handleImageUpload(idx, e)}

                            className="hidden"

                          />

                          <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:scale-105 transition-all">

                            <ImageIcon className="w-5 h-5" />

                          </div>

                          <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">

                            {idx === 0 ? "Foto Utama" : `Foto ${idx + 1}`}

                          </span>

                          <span className="text-[10px] text-gray-400 font-medium">Unggah Berkas</span>

                        </label>

                      )}

                    </div>

                  ))}

                </div>

              </div>



              {/* Video URL */}

              <div className="space-y-1.5 pt-1">

                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                  URL Video Produk (Youtube / Vimeo)

                </label>

                <div className="relative">

                  <input

                    type="text"

                    placeholder="Contoh: https://youtube.com/watch?v=..."

                    value={videoUrl}

                    onChange={(e) => setVideoUrl(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium pl-10"

                  />

                  <Video className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />

                </div>

              </div>



              {/* Deskripsi */}

              <div className="space-y-1.5 pt-1">

                <div className="flex items-center justify-between">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Deskripsi Lengkap Produk

                  </label>

                  <span className="text-sm text-gray-400 font-medium">{deskripsi.length}/2000</span>

                </div>

                <textarea

                  rows={4}

                  maxLength={2000}

                  placeholder="Jelaskan keunggulan produk, spesifikasi bahan, petunjuk pemakaian, dan garansi..."

                  value={deskripsi}

                  onChange={(e) => setDeskripsi(e.target.value)}

                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium resize-y"

                />

              </div>

            </section>



            {/* ── CARD 4: Spesifikasi Produk ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-6">

              <div className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <SlidersHorizontal className="w-5 h-5" />

                  </div>

                  <div>

                    <h2 className="text-base font-bold text-gray-900">Spesifikasi Teknis Produk</h2>

                    <p className="text-sm text-gray-500">

                      Format standar LKPP: <span className="font-semibold text-gray-800">{currentMainCat.name}</span> &gt; <span className="font-semibold text-blue-600">{currentSubCat.name}</span>

                    </p>

                  </div>

                </div>



                <span className="self-start sm:self-auto text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">

                  Formulir Spesifikasi Standar

                </span>

              </div>



              {/* Informasi Utama */}

              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">

                <div className="w-full md:w-48 shrink-0">

                  <h3 className="text-sm font-bold text-gray-900">Informasi Utama</h3>

                  <p className="text-sm text-gray-400 pt-0.5">Parameter teknis esensial komoditas</p>

                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">

                  {currentSubCat.informasiUtama.map((field) => (

                    <div key={field.key} className="space-y-1.5">

                      <div className="flex items-center gap-1.5">

                        <label className="text-sm font-bold text-gray-700 truncate" title={field.label}>

                          {field.label}

                        </label>

                        {field.required && (

                          <span className="text-[14px] font-bold text-rose-600">

                            *

                          </span>

                        )}

                      </div>

                      {field.type === "select" ? (

                        <div className="relative">

                          <select

                            value={spesifikasiValues[field.key] || ""}

                            onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}

                            className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-8"

                          >

                            {field.options?.map((opt, oIdx) => (

                              <option key={opt} value={oIdx === 0 ? "" : opt}>

                                {opt}

                              </option>

                            ))}

                          </select>

                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />

                        </div>

                      ) : (

                        <input

                          type="text"

                          placeholder={field.placeholder || `Masukkan ${field.label}`}

                          value={spesifikasiValues[field.key] || ""}

                          onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}

                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                        />

                      )}

                    </div>

                  ))}

                </div>

              </div>



              {/* Informasi Lainnya */}

              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8 pt-5 border-t border-gray-100">

                <div className="w-full md:w-48 shrink-0">

                  <h3 className="text-sm font-bold text-gray-900">Informasi Lainnya</h3>

                  <p className="text-sm text-gray-400 pt-0.5">Data kelengkapan dan operasional</p>

                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">

                  {currentSubCat.informasiLainnya.map((field) => (

                    <div key={field.key} className="space-y-1.5">

                      <div className="flex items-center gap-1.5">

                        <label className="text-sm font-bold text-gray-700 truncate" title={field.label}>

                          {field.label}

                        </label>

                        {field.required && (

                          <span className="text-[14px] font-bold text-rose-600">

                          *

                          </span>

                        )}

                      </div>

                      {field.type === "select" ? (

                        <div className="relative">

                          <select

                            value={spesifikasiValues[field.key] || ""}

                            onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}

                            className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-8"

                          >

                            {field.options?.map((opt, oIdx) => (

                              <option key={opt} value={oIdx === 0 ? "" : opt}>

                                {opt}

                              </option>

                            ))}

                          </select>

                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />

                        </div>

                      ) : (

                        <input

                          type="text"

                          placeholder={field.placeholder || `Masukkan ${field.label}`}

                          value={spesifikasiValues[field.key] || ""}

                          onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}

                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                        />

                      )}

                    </div>

                  ))}

                </div>

              </div>

            </section>



            {/* ── CARD 5: Kode KBKI ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <ShieldCheck className="w-5 h-5" />

                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="text-base font-bold text-gray-900">Kode KBKI (Klasifikasi Baku Komoditas)</h2>

                      <span className="text-[14px] font-bold text-rose-600">

                       *

                      </span>

                    </div>

                    <p className="text-sm text-gray-500">

                      Kode 10 digit resmi BPS / INAPROC untuk pengelompokan standar komoditas

                    </p>

                  </div>

                </div>



                <button

                  type="button"

                  onClick={() => setShowKbkiModal(true)}

                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"

                >

                  <Search className="w-3.5 h-3.5" />

                  <span>Cari Database KBKI Resmi</span>

                </button>

              </div>



              {/* Active Selected KBKI Banner */}

              {(() => {

                const activeKbki = MASTER_KBKI_LIST.find((k) => k.code === kodeKbki);

                return activeKbki ? (

                  <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                    <div className="space-y-1">

                      <div className="flex items-center gap-2">

                        <span className="font-mono font-extrabold text-sm text-blue-700 bg-white border border-blue-300 px-2.5 py-1 rounded-md shadow-2xs">

                          {activeKbki.code}

                        </span>

                        <span className="text-sm font-bold text-gray-900">{activeKbki.name}</span>

                      </div>

                      <p className="text-sm text-gray-500">{activeKbki.seksi}</p>

                    </div>

                    <button

                      type="button"

                      onClick={() => setShowKbkiModal(true)}

                      className="text-sm font-bold text-blue-700 hover:text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"

                    >

                      Ganti Kode KBKI

                    </button>

                  </div>

                ) : null;

              })()}



              {/* Quick Select Dropdown */}

              <div className="space-y-1.5">

                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                  Pilih Cepat Kode KBKI

                </label>

                <div className="relative">

                  <select

                    value={kodeKbki}

                    onChange={(e) => setKodeKbki(e.target.value)}

                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                  >

                    <option value="">Pilih kode KBKI</option>

                    {MASTER_KBKI_LIST.map((k) => (

                      <option key={k.code} value={k.code}>

                        {k.code} - {k.name}

                      </option>

                    ))}

                  </select>

                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                </div>

              </div>

            </section>



            {/* ── CARD 6: PDN (Produk Dalam Negeri) ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <Award className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">PDN (Produk Dalam Negeri) & TKDN</h2>

                  <p className="text-sm text-gray-500">

                    Informasi sertifikasi Tingkat Komponen Dalam Negeri dan preferensi pengadaan

                  </p>

                </div>

              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <div className="flex items-center gap-2">

                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                      Klasifikasi Produk

                    </label>

                    <span className="text-[14px] font-bold text-rose-600">

                    *

                    </span>

                  </div>

                  <div className="relative">

                    <select

                      value={klasifikasiPdn}

                      onChange={(e) => setKlasifikasiPdn(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      <option value="Lokal">Lokal</option>

                      <option value="Impor">Impor</option>

                      <option value="Dalam Negeri">Dalam Negeri</option>

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Lokasi Produksi

                  </label>

                  <div className="relative">

                    <select

                      value={lokasiProduksi}

                      onChange={(e) => setLokasiProduksi(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      <option value="Diproduksi di seluruh Indonesia">Diproduksi di seluruh Indonesia</option>

                      <option value="Pulau Jawa">Pulau Jawa</option>

                      <option value="Luar Pulau Jawa">Luar Pulau Jawa</option>

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Tenaga Kerja dalam Proses Produksi

                  </label>

                  <div className="relative">

                    <select

                      value={tenagaKerja}

                      onChange={(e) => setTenagaKerja(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      <option value="Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri">

                        Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri

                      </option>

                      <option value="Sebagian tenaga kerja asing">Sebagian tenaga kerja asing</option>

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Bahan Baku dalam Proses Produksi

                  </label>

                  <div className="relative">

                    <select

                      value={bahanBaku}

                      onChange={(e) => setBahanBaku(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      <option value="Seluruh bahan baku dalam negeri">Seluruh bahan baku dalam negeri</option>

                      <option value="Campuran dalam dan luar negeri">Campuran dalam dan luar negeri</option>

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>



                {/* Nilai TKDN & BMP */}

                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Nilai TKDN (%)

                  </label>

                  <input

                    type="number"

                    step="0.01"

                    min="0"

                    max="100"

                    placeholder="Contoh: 40.00 (Opsional)"

                    value={nilaiTkdn}

                    onChange={(e) => setNilaiTkdn(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Nilai BMP (%)

                  </label>

                  <input

                    type="number"

                    step="0.01"

                    min="0"

                    max="100"

                    placeholder="Contoh: 5.00 (Opsional)"

                    value={nilaiBmp}

                    onChange={(e) => setNilaiBmp(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5 md:col-span-2">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Nama Pemilik Sertifikat TKDN

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: PT Sumber Rejeki Teknologi (Opsional)"

                    value={pemilikSertifikat}

                    onChange={(e) => setPemilikSertifikat(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>

              </div>

            </section>



            {/* ── CARD 7: Sertifikat SNI ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <CheckCircle2 className="w-5 h-5" />

                  </div>

                  <div>

                    <h2 className="text-base font-bold text-gray-900">Sertifikat SNI</h2>

                    <p className="text-sm text-gray-500">

                      Standar Nasional Indonesia untuk jaminan mutu dan kepatuhan regulasi

                    </p>

                  </div>

                </div>



                <div className="flex items-center gap-3">

                  <span className="text-sm font-bold text-gray-600 select-none">

                    {adaSni ? "Memiliki SNI" : "Tidak Ada SNI"}

                  </span>

                  <button

                    type="button"

                    role="switch"

                    aria-checked={adaSni}

                    onClick={() => setAdaSni(!adaSni)}

                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${

                      adaSni ? "bg-blue-600" : "bg-gray-200"

                    }`}

                  >

                    <span

                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${

                        adaSni ? "translate-x-5" : "translate-x-0"

                      }`}

                    />

                  </button>

                </div>

              </div>



              {adaSni && (

                <div className="space-y-1.5 pt-1">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Nomor Sertifikat SNI

                  </label>

                  <input

                    type="text"

                    placeholder="Masukkan nomor sertifikat SNI (Contoh: SNI ISO 9001:2015)"

                    value={nomorSni}

                    onChange={(e) => setNomorSni(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>

              )}

            </section>



            {/* ── CARD 8: Informasi Toko Penyedia & Logistik ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <Truck className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">Informasi Toko Penyedia & Logistik</h2>

                  <p className="text-sm text-gray-500">

                    Data penyedia, kontak PIC, alamat pengiriman, dan dimensi paket untuk kalkulasi pengiriman

                  </p>

                </div>

              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Nama Toko / Penyedia

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: MabelHub Store"

                    value={namaPenyedia}

                    onChange={(e) => setNamaPenyedia(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Jenis Penyedia

                  </label>

                  <div className="relative">

                    <select

                      value={jenisPenyedia}

                      onChange={(e) => setJenisPenyedia(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      <option value="UMKK">UMKK (Usaha Mikro, Kecil, dan Koperasi)</option>

                      <option value="Non-UMKK">Non-UMKK (Usaha Menengah & Besar)</option>

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Nama PIC Penyedia

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: Budi Santoso"

                    value={namaPic}

                    onChange={(e) => setNamaPic(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    No. Handphone / WhatsApp PIC

                  </label>

                  <input

                    type="tel"

                    placeholder="Contoh: 081234567890"

                    value={noHpPic}

                    onChange={(e) => setNoHpPic(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium font-mono"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Lokasi Tempat Usaha

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: DKI Jakarta"

                    value={lokasiPenyedia}

                    onChange={(e) => setLokasiPenyedia(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Asal Pengiriman (Dikirim Dari)

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: Kota Jakarta Pusat, DKI Jakarta"

                    value={dikirimDari}

                    onChange={(e) => setDikirimDari(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Berat per Produk

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: 1.500 gr atau 2 kg"

                    value={beratProduk}

                    onChange={(e) => setBeratProduk(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                    Dimensi per Produk

                  </label>

                  <input

                    type="text"

                    placeholder="Contoh: P 60 cm x L 25 cm x T 45 cm"

                    value={dimensiProduk}

                    onChange={(e) => setDimensiProduk(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>

              </div>

            </section>



            {/* ── CARD 9: Pengaturan Pajak ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <Percent className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">Pengaturan Pajak Pertambahan Nilai (PPN)</h2>

                  <p className="text-sm text-gray-500">

                    Tarif pajak yang dikenakan pada harga tayang e-katalog

                  </p>

                </div>

              </div>



              <div className="space-y-2">

                <div className="flex items-center gap-2">

                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Tarif Pajak PPN</span>

                  <span className="text-[14px] font-bold text-rose-600">

                  *

                  </span>

                </div>

                <div className="relative w-full sm:w-80">

                  <select

                    value={persenPajak}

                    onChange={(e) => setPersenPajak(Number(e.target.value))}

                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                  >

                    <option value={0}>0% (Bebas / Tidak Dikenakan PPN)</option>

                    <option value={11}>11% (Tarif Standar PPN)</option>

                    <option value={12}>12% (Tarif PPN Khusus)</option>

                  </select>

                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                </div>

                <p className="text-sm text-gray-400">

                  PPN yang akan dibayar dihitung berdasarkan nominal DPP x Tarif PPN secara otomatis.

                </p>

              </div>

            </section>



            {/* ── CARD 10: Varian ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <Boxes className="w-5 h-5" />

                  </div>

                  <div>

                    <h2 className="text-base font-bold text-gray-900">Varian Produk</h2>

                    <p className="text-sm text-gray-500">

                      Tambahkan opsi varian seperti warna, ukuran, atau kapasitas

                    </p>

                  </div>

                </div>



                <button

                  type="button"

                  onClick={handleAddVarian}

                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"

                >

                  <Plus className="w-3.5 h-3.5" />

                  <span>Tambah Varian</span>

                </button>

              </div>



              {varianList.length > 0 ? (

                <div className="space-y-3 pt-1">

                  {varianList.map((item) => (

                    <div

                      key={item.id}

                      className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-2xs"

                    >

                      <input

                        type="text"

                        placeholder="Nama Varian (misal: Warna)"

                        value={item.nama}

                        onChange={(e) => updateVarian(item.id, "nama", e.target.value)}

                        className="w-full sm:w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-medium"

                      />

                      <input

                        type="text"

                        placeholder="Pilihan (pisahkan tanda koma: Hitam, Putih, Abu-abu)"

                        value={item.pilihan}

                        onChange={(e) => updateVarian(item.id, "pilihan", e.target.value)}

                        className="flex-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-medium"

                      />

                      <button

                        type="button"

                        onClick={() => removeVarian(item.id)}

                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer self-end sm:self-auto"

                        title="Hapus varian"

                      >

                        <Trash2 className="w-4 h-4" />

                      </button>

                    </div>

                  ))}

                </div>

              ) : (

                <p className="text-sm text-gray-400 italic">

                  Belum ada varian yang ditambahkan. Klik tombol &quot;Tambah Varian&quot; jika produk memiliki opsi pilihan.

                </p>

              )}

            </section>



            {/* ── CARD 11: Harga ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <Tag className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">Harga Satuan & Grosir</h2>

                  <p className="text-sm text-gray-500">

                    Tentukan harga dasar produk dan skema diskon bertingkat

                  </p>

                </div>

              </div>



              {/* Input Harga Modal & Harga Tayang & Fee Admin */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Harga Modal (HPP) */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                          Harga Modal (HPP)
                        </label>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                          Rahasia Admin
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-700/80">Biaya beli riil dari vendor/prinsipal.</p>
                    <div className="flex items-center w-full rounded-xl border border-amber-300 bg-white overflow-hidden shadow-2xs focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                      <span className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 border-r border-amber-200">
                        Rp
                      </span>
                      <input
                        type="number"
                        placeholder="Contoh: 15000000"
                        value={hargaModal}
                        onChange={(e) => setHargaModal(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 2. Harga Tayang (Sebelum Pajak) */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                          Harga Tayang (Sebelum Pajak)
                        </label>
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                          Katalog Resmi
                        </span>
                      </div>
                      <span className="text-[13px] font-bold text-rose-600">*</span>
                    </div>
                    <p className="text-[11px] text-blue-700/80">Harga tayang dasar sebelum dikenakan PPN.</p>
                    <div className="flex items-center w-full rounded-xl border border-blue-300 bg-white overflow-hidden shadow-2xs focus-within:border-[#1D80D9] focus-within:ring-2 focus-within:ring-[#1D80D9]/20 transition-all">
                      <span className="px-3 py-2 text-xs font-bold text-[#1D80D9] bg-blue-50 border-r border-blue-200">
                        Rp
                      </span>
                      <input
                        type="number"
                        placeholder="Contoh: 20000000"
                        value={hargaProduk}
                        onChange={(e) => setHargaProduk(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 3. Fee Admin (%) */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Fee Admin / E-Katalog (%)
                      </label>
                      <span className="text-[10px] font-extrabold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                        CRM Sinkron
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Estimasi potongan fee transaksi / katalog.</p>
                    <div className="flex items-center w-full rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs focus-within:border-slate-600 focus-within:ring-2 focus-within:ring-slate-400/20 transition-all">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="5"
                        value={feeAdminPersen}
                        onChange={(e) => setFeeAdminPersen(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-bold text-slate-900"
                      />
                      <span className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border-l border-slate-200">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── LIVE KALKULATOR PROFIT & MARGIN OTOMATIS (TERLIHAT DI CRM) ── */}
                <div className="p-4 rounded-2xl bg-[#1D80D9]/5 border border-[#1D80D9]/30 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1D80D9]/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#1D80D9] animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1D80D9]">
                        Kalkulasi Otomatis CRM & Rujukan Direct Sales
                      </span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#1D80D9]/10 text-[#1D80D9] border border-[#1D80D9]/30">
                      Sinkron Real-Time
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {/* Harga Tayang Final (Inc. PPN) */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Harga Tayang (+PPN {persenPajak}%)
                      </span>
                      <div className="text-sm sm:text-base font-black text-[#1D80D9]">
                        Rp {hargaTayang.toLocaleString("id-ID")}
                      </div>
                      <span className="text-[9px] text-slate-400 block">Dilihat sales & pembeli</span>
                    </div>

                    {/* Harga Modal (HPP) */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Harga Modal (HPP)
                      </span>
                      <div className="text-sm sm:text-base font-black text-amber-700">
                        Rp {modalNumber.toLocaleString("id-ID")}
                      </div>
                      <span className="text-[9px] text-slate-400 block">Dasar perolehan barang</span>
                    </div>

                    {/* Fee Admin / Katalog */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Fee Admin ({feePersenNumber}%)
                      </span>
                      <div className="text-sm sm:text-base font-black text-rose-600">
                        -Rp {feeAdminNominal.toLocaleString("id-ID")}
                      </div>
                      <span className="text-[9px] text-slate-400 block">Potongan operasional</span>
                    </div>

                    {/* Estimasi Laba Bersih */}
                    <div className={`p-2.5 rounded-xl border space-y-0.5 ${
                      labaBersih >= 0
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Laba Bersih Per Unit
                      </span>
                      <div className="text-sm sm:text-base font-black">
                        {labaBersih >= 0 ? `+Rp ${labaBersih.toLocaleString("id-ID")}` : `-Rp ${Math.abs(labaBersih).toLocaleString("id-ID")}`}
                      </div>
                      <span className="text-[10px] font-bold block">
                        Margin: {persenMargin >= 0 ? `+${persenMargin}%` : `${persenMargin}%`} {labaBersih >= 0 ? "(Untung)" : "(Rugi)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>



              {/* Harga Grosir */}

              <div className="pt-4 border-t border-gray-100 space-y-3">

                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Harga Grosir (Opsional)</h3>

                    <p className="text-sm text-gray-400">Harga bertingkat untuk pembelian volume tertentu</p>

                  </div>

                  <button

                    type="button"

                    onClick={handleAddGrosir}

                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 cursor-pointer"

                  >

                    <Plus className="w-3.5 h-3.5" />

                    <span>Tambah Harga Grosir</span>

                  </button>

                </div>



                {grosirList.map((g) => (

                  <div

                    key={g.id}

                    className="flex flex-wrap items-center gap-3 p-3 bg-gray-50/70 border border-gray-200 rounded-xl shadow-2xs"

                  >

                    <span className="text-sm text-gray-600 font-bold">Min Qty:</span>

                    <input

                      type="number"

                      min={1}

                      value={g.minQty}

                      onChange={(e) => updateGrosir(g.id, "minQty", parseInt(e.target.value, 10) || 1)}

                      className="w-24 px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none font-medium"

                    />

                    <span className="text-sm text-gray-600 font-bold">Harga per Unit: Rp</span>

                    <input

                      type="number"

                      value={g.harga}

                      onChange={(e) => updateGrosir(g.id, "harga", parseFloat(e.target.value) || 0)}

                      className="w-36 px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none font-bold"

                    />

                    <button

                      type="button"

                      onClick={() => removeGrosir(g.id)}

                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer ml-auto"

                      title="Hapus grosir"

                    >

                      <Trash2 className="w-4 h-4" />

                    </button>

                  </div>

                ))}

              </div>

            </section>



            {/* ── CARD 12: Informasi Stok ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <Package className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">Informasi Stok & Satuan</h2>

                  <p className="text-sm text-gray-500">

                    Jumlah ketersediaan barang dan satuan unit pemesanan

                  </p>

                </div>

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <div className="flex items-center gap-2">

                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                      Jumlah Stok

                    </label>

                    <span className="text-[14px] font-bold text-rose-600">

                    *

                    </span>

                  </div>

                  <input

                    type="number"

                    min={0}

                    placeholder="Masukkan jumlah stok barang"

                    value={jumlahStok}

                    onChange={(e) => setJumlahStok(e.target.value)}

                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                  />

                </div>



                <div className="space-y-1.5">

                  <div className="flex items-center gap-2">

                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">

                      Satuan Produk

                    </label>

                    <span className="text-[14px] font-bold text-rose-600">

                    *

                    </span>

                  </div>

                  <div className="relative">

                    <select

                      value={satuanProduk}

                      onChange={(e) => setSatuanProduk(e.target.value)}

                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium cursor-pointer pr-9"

                    >

                      <option value="">Pilih satuan produk</option>

                      {["Unit", "Buah", "Set", "Pcs", "Box", "Pack", "Lembar", "Meter", "Drum (200 L)", "Batang"].map(

                        (s) => (

                          <option key={s} value={s}>

                            {s}

                          </option>

                        )

                      )}

                    </select>

                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />

                  </div>

                </div>

              </div>



              {/* Notifikasi Log Perubahan Stok (Jika stok diubah) */}

              {isEditMode && initialStokRef.current !== null && parseInt(jumlahStok, 10) !== initialStokRef.current && (

                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">

                    <span className="text-blue-900 flex items-center gap-1.5">

                      <Clock className="w-3.5 h-3.5 text-blue-600" />

                      Perubahan Stok Terdeteksi (Log Produk):

                    </span>

                    <span

                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${

                        (parseInt(jumlahStok, 10) || 0) > initialStokRef.current

                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"

                          : "bg-amber-100 text-amber-800 border border-amber-300"

                      }`}

                    >

                      {(parseInt(jumlahStok, 10) || 0) > initialStokRef.current ? "+" : ""}

                      {(parseInt(jumlahStok, 10) || 0) - initialStokRef.current} {satuanProduk || "Unit"} (dari {initialStokRef.current} ke {parseInt(jumlahStok, 10) || 0})

                    </span>

                  </div>

                  <input

                    type="text"

                    placeholder="Catatan perubahan stok (opsional, misal: Tambah stok batch Nov atau pengurangan pesanan)"

                    value={catatanPerubahanStok}

                    onChange={(e) => setCatatanPerubahanStok(e.target.value)}

                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"

                  />

                </div>

              )}



              {/* Riwayat Perubahan Stok (Log Produk) */}

              {riwayatStok && riwayatStok.length > 0 && (

                <div className="pt-3 border-t border-gray-100 space-y-2.5">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <Boxes className="w-4 h-4 text-blue-600" />

                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">

                        Riwayat Perubahan Stok (Log Produk)

                      </h3>

                    </div>

                    <span className="text-[11px] text-gray-500 font-medium">

                      {riwayatStok.length} catatan tercatat

                    </span>

                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-slate-50/40 text-sm">

                    {riwayatStok.map((log, idx) => (

                      <div key={log.id || idx} className="p-3 flex items-start justify-between gap-3 hover:bg-white transition-colors">

                        <div className="space-y-1 min-w-0">

                          <div className="flex items-center gap-2 flex-wrap">

                            <span

                              className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] ${

                                log.tipe === "tambah" || log.jumlahPerubahan > 0

                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"

                                  : log.tipe === "kurang" || log.jumlahPerubahan < 0

                                  ? "bg-rose-100 text-rose-800 border border-rose-200"

                                  : "bg-blue-100 text-blue-800 border border-blue-200"

                              }`}

                            >

                              {log.jumlahPerubahan > 0 ? `+${log.jumlahPerubahan}` : log.jumlahPerubahan} {satuanProduk || "Unit"}

                            </span>

                            <span className="font-semibold text-gray-900 truncate">

                              {log.catatan || (log.jumlahPerubahan > 0 ? `Penambahan stok (+${log.jumlahPerubahan})` : `Pengurangan stok (${log.jumlahPerubahan})`)}

                            </span>

                          </div>

                          <div className="text-[10px] text-gray-500 flex items-center gap-2 flex-wrap">

                            <span>Oleh: <strong className="text-gray-700">{log.user || "Admin"}</strong></span>

                            <span>•</span>

                            <span>Stok: {log.stokSebelum} → <strong>{log.stokSesudah}</strong></span>

                          </div>

                        </div>

                        <span className="text-[10px] text-gray-400 shrink-0 font-mono">

                          {new Date(log.tanggal).toLocaleDateString("id-ID", {

                            day: "numeric",

                            month: "short",

                            year: "numeric",

                            hour: "2-digit",

                            minute: "2-digit"

                          })}

                        </span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </section>



            {/* ── CARD 13: Pre Order ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                    <Clock className="w-5 h-5" />

                  </div>

                  <div>

                    <h2 className="text-base font-bold text-gray-900">Pre Order</h2>

                    <p className="text-sm text-gray-500">

                      Aktifkan jika produk memerlukan proses fabrikasi atau perakitan khusus

                    </p>

                  </div>

                </div>



                <div className="flex items-center gap-3">

                  <span className="text-sm font-bold text-gray-600 select-none">

                    {preOrderAktif ? "Aktif" : "Tidak Aktif"}

                  </span>

                  <button

                    type="button"

                    role="switch"

                    aria-checked={preOrderAktif}

                    onClick={() => setPreOrderAktif(!preOrderAktif)}

                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${

                      preOrderAktif ? "bg-blue-600" : "bg-gray-200"

                    }`}

                  >

                    <span

                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${

                        preOrderAktif ? "translate-x-5" : "translate-x-0"

                      }`}

                    />

                  </button>

                </div>

              </div>



              {preOrderAktif && (

                <div className="flex items-center gap-3 pt-1">

                  <span className="text-sm font-bold text-gray-700">Estimasi Durasi Pengerjaan:</span>

                  <input

                    type="number"

                    min={1}

                    value={durasiPreOrder}

                    onChange={(e) => setDurasiPreOrder(parseInt(e.target.value, 10) || 1)}

                    className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-bold"

                  />

                  <span className="text-sm text-gray-600 font-medium">Hari Kerja</span>

                </div>

              )}

            </section>



            {/* ── CARD 14: Layanan Tambahan ── */}

            <section className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">

              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">

                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                  <Wrench className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-base font-bold text-gray-900">Layanan Tambahan</h2>

                  <p className="text-sm text-gray-500">

                    Nilai tambah layanan seperti garansi purna jual, instalasi on-site, atau pelatihan

                  </p>

                </div>

              </div>



              <div className="flex items-center gap-2 pt-1">

                <input

                  type="text"

                  placeholder="Contoh: Garansi Resmi 1 Tahun, Instalasi & Pengujian di Tempat"

                  value={layananInput}

                  onChange={(e) => setLayananInput(e.target.value)}

                  onKeyDown={(e) => {

                    if (e.key === "Enter") {

                      e.preventDefault();

                      handleAddLayanan();

                    }

                  }}

                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"

                />

                <button

                  type="button"

                  onClick={handleAddLayanan}

                  className="px-4 py-2.5 bg-blue-50 text-blue-700 font-bold text-sm sm:text-sm rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"

                >

                  + Tambah Layanan

                </button>

              </div>



              {layananList.length > 0 && (

                <div className="flex flex-wrap gap-2 pt-1">

                  {layananList.map((lay, idx) => (

                    <span

                      key={idx}

                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-800 rounded-xl text-sm font-semibold border border-gray-200 shadow-2xs"

                    >

                      <span>{lay}</span>

                      <button

                        type="button"

                        onClick={() => removeLayanan(idx)}

                        className="text-gray-400 hover:text-rose-600 cursor-pointer"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    </span>

                  ))}

                </div>

              )}

            </section>



            {/* ── Sticky Bottom Actions Bar ── */}

            <div className="sticky bottom-4 z-30 mt-8 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-xl p-4 sm:px-6">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>

                  {isEditMode ? (

                    <button

                      type="button"

                      onClick={() => setShowDeleteModal(true)}

                      disabled={submitting || deleting}

                      className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"

                    >

                      <Trash2 className="w-4 h-4" />

                      <span>Hapus Produk</span>

                    </button>

                  ) : (

                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">

                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />

                      <span>Formulir Produk Baru</span>

                    </div>

                  )}

                </div>



                <div className="flex flex-wrap items-center gap-2.5">

                  <button

                    type="button"

                    onClick={() => handleSafeExit()}

                    disabled={submitting || deleting}

                    className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors cursor-pointer"

                  >

                    Batal

                  </button>



                  <button

                    type="button"

                    onClick={() => handleSubmit(false, true)}

                    disabled={submitting || deleting}

                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"

                  >

                    {isEditMode ? "Simpan Draf" : "Simpan Draf Produk"}

                  </button>



                  {!isEditMode && (

                    <button

                      type="button"

                      onClick={() => handleSubmit(true, false)}

                      disabled={submitting || deleting}

                      className="px-4 py-2.5 bg-white hover:bg-blue-200 text-black border border-gray-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"

                    >

                      Simpan & Tambah Produk Lagi

                    </button>

                  )}



                  <button

                    type="button"

                    onClick={() => handleSubmit(false, false)}

                    disabled={submitting || deleting}

                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-2"

                  >

                    {submitting ? (

                      <>

                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                        <span>Menyimpan...</span>

                      </>

                    ) : (

                      <>

                        <Check className="w-4 h-4" />

                        <span>{isEditMode ? "Perbarui & Publikasikan" : "Simpan Produk"}</span>

                      </>

                    )}

                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>



      {/* ── KBLI Helper Modal (25 KBLI Toko) ── */}

      {showKbliModal && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">

              <div>

                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">

                  Daftar KBLI Toko ({KBLI_STORE_LIST.length} Bidang Usaha Terdaftar)

                </h3>

                <p className="text-sm text-gray-500 pt-0.5">

                  Klasifikasi Baku Lapangan Usaha Indonesia terdaftar untuk MabelHub

                </p>

              </div>

              <button

                onClick={() => setShowKbliModal(false)}

                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Search Box */}

            <div className="p-4 border-b border-gray-100 bg-white">

              <div className="relative">

                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />

                <input

                  type="text"

                  placeholder="Cari kode KBLI atau nama bidang usaha..."

                  value={kbliSearch}

                  onChange={(e) => setKbliSearch(e.target.value)}

                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none font-medium text-gray-800"

                />

              </div>

            </div>



            {/* Table Content */}

            <div className="flex-1 overflow-y-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-[#f8fafc] text-gray-700 font-bold border-b border-gray-200 sticky top-0">

                  <tr>

                    <th className="py-3 px-4 w-12 text-center">No</th>

                    <th className="py-3 px-4 w-28">Kode KBLI</th>

                    <th className="py-3 px-4">Nama KBLI</th>

                    <th className="py-3 px-4 w-20 text-center">Tahun</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredKbliList.length > 0 ? (

                    filteredKbliList.map((item) => (

                      <tr

                        key={item.code}

                        className="hover:bg-blue-50/40 transition-colors group"

                      >

                        <td className="py-3 px-4 text-center font-medium text-gray-400">

                          {item.no}

                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-blue-600">

                          {item.code}

                        </td>

                        <td className="py-3 px-4 text-gray-800 font-medium">

                          {item.name}

                        </td>

                        <td className="py-3 px-4 text-center font-medium text-gray-500">

                          {item.year}

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td colSpan={4} className="py-8 text-center text-gray-400">

                        Tidak ada KBLI yang cocok dengan pencarian &quot;{kbliSearch}&quot;

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>



            {/* Modal Footer */}

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between text-sm text-gray-500">

              <span>Menampilkan {filteredKbliList.length} dari {KBLI_STORE_LIST.length} KBLI</span>

              <button

                type="button"

                onClick={() => setShowKbliModal(false)}

                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"

              >

                Tutup

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── KBKI Helper Modal (Kamus Komoditas Resmi BPS/INAPROC) ── */}

      {showKbkiModal && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">

              <div>

                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">

                  Database Kode KBKI Resmi BPS / INAPROC

                </h3>

                <p className="text-sm text-gray-500 pt-0.5">

                  Cari kode komoditas 10-digit resmi berdasarkan nama barang, tipe, atau kategori

                </p>

              </div>

              <button

                onClick={() => setShowKbkiModal(false)}

                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Filter & Search Bar */}

            <div className="p-4 border-b border-gray-100 bg-white space-y-3">

              <div className="relative">

                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />

                <input

                  type="text"

                  placeholder="Ketik nama komoditas, jenis barang (misal: laptop, monitor, kursi, printer)..."

                  value={kbkiSearch}

                  onChange={(e) => setKbkiSearch(e.target.value)}

                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none font-medium text-gray-800"

                />

              </div>



              {/* Category Pills */}

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-sm">

                {[

                  "Semua",

                  "Elektronik & Komputer",

                  "Perabot & Furnitur",

                  "Alat Kantor & ATK",

                  "Peralatan Telekomunikasi",

                  "Alat Laboratorium & Medis",

                  "Piranti Lunak & IT",

                  "Lainnya / Umum",

                ].map((cat) => (

                  <button

                    key={cat}

                    type="button"

                    onClick={() => setKbkiCategoryFilter(cat)}

                    className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${

                      kbkiCategoryFilter === cat

                        ? "bg-blue-600 text-white"

                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"

                    }`}

                  >

                    {cat}

                  </button>

                ))}

              </div>

            </div>



            {/* Table Content */}

            <div className="flex-1 overflow-y-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-[#f8fafc] text-gray-700 font-bold border-b border-gray-200 sticky top-0">

                  <tr>

                    <th className="py-3 px-4 w-32">Kode KBKI</th>

                    <th className="py-3 px-4">Nama Komoditas Resmi</th>

                    <th className="py-3 px-4 w-44">Kategori</th>

                    <th className="py-3 px-4 w-24 text-center">Aksi</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredKbkiList.length > 0 ? (

                    filteredKbkiList.map((item) => (

                      <tr

                        key={item.code}

                        className={`hover:bg-blue-50/40 transition-colors ${

                          kodeKbki === item.code ? "bg-blue-50/70" : ""

                        }`}

                      >

                        <td className="py-3 px-4 font-mono font-bold text-gray-900">

                          {item.code}

                        </td>

                        <td className="py-3 px-4">

                          <div className="font-semibold text-gray-900">{item.name}</div>

                          <div className="text-[11px] text-gray-400 pt-0.5">{item.seksi}</div>

                        </td>

                        <td className="py-3 px-4 text-gray-600 font-medium">

                          {item.category}

                        </td>

                        <td className="py-3 px-4 text-center">

                          <button

                            type="button"

                            onClick={() => {

                              setKodeKbki(item.code);

                              setShowKbkiModal(false);

                            }}

                            className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${

                              kodeKbki === item.code

                                ? "bg-emerald-600 text-white"

                                : "bg-blue-600 hover:bg-blue-700 text-white"

                            }`}

                          >

                            {kodeKbki === item.code ? "Terpilih" : "Gunakan"}

                          </button>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td colSpan={4} className="py-8 text-center text-gray-400">

                        Tidak ada komoditas KBKI yang cocok dengan pencarian &quot;{kbkiSearch}&quot;

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>



            {/* Modal Footer */}

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between text-sm text-gray-500">

              <span>Menampilkan {filteredKbkiList.length} komoditas KBKI</span>

              <button

                type="button"

                onClick={() => setShowKbkiModal(false)}

                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"

              >

                Tutup

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── Modal Konfirmasi Keluar (Unsaved Changes) ── */}

      {showExitModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95">

            <div className="flex items-center gap-3 text-amber-600">

              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">

                <AlertCircle className="w-5 h-5 text-amber-600" />

              </div>

              <div>

                <h3 className="text-sm font-black text-gray-900">Perubahan Belum Disimpan</h3>

                <p className="text-sm text-gray-500">Konfirmasi meninggalkan halaman</p>

              </div>

            </div>



            <p className="text-sm text-gray-600 leading-relaxed">

              Anda memiliki data yang telah diubah namun belum disimpan. Jika Anda keluar sekarang atau memuat ulang halaman, seluruh perubahan yang belum tersimpan akan hilang.

            </p>



            <div className="flex items-center justify-end gap-2.5 pt-2">

              <button

                type="button"

                onClick={() => setShowExitModal(false)}

                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-sm font-bold text-gray-700 transition-colors cursor-pointer"

              >

                Lanjutkan Mengedit

              </button>

              <button

                type="button"

                onClick={() => {

                  setIsDirty(false);

                  setShowExitModal(false);

                  if (pendingNavUrl) {

                    router.push(pendingNavUrl);

                  } else {

                    router.back();

                  }

                }}

                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"

              >

                Tinggalkan Halaman

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── Modal Impor via Excel ── */}

      {showExcelModal && (

        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-100">

            {/* Modal Header */}

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">

                  <FileSpreadsheet className="w-5 h-5" />

                </div>

                <div>

                  <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">

                    Impor Produk via Excel

                  </h3>

                  <p className="text-xs text-gray-500">

                    Unggah file Excel untuk mengisi formulir ini atau menambahkan produk massal

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setShowExcelModal(false)}

                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors cursor-pointer"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Modal Body */}

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {importSuccessResult ? (

                <div className="p-8 text-center space-y-4">

                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">

                    <CheckCircle2 className="w-8 h-8" />

                  </div>

                  <div className="space-y-1">

                    <h4 className="text-xl font-black text-gray-900">Impor Produk Berhasil!</h4>

                    <p className="text-sm text-gray-600 max-w-md mx-auto">

                      Sebanyak <strong className="text-emerald-700 font-bold">{importSuccessResult.count} produk</strong> telah berhasil didaftarkan ke dalam database katalog.

                    </p>

                  </div>

                  <div className="flex items-center justify-center gap-3 pt-3">

                    <button

                      type="button"

                      onClick={() => {

                        setShowExcelModal(false);

                        router.push("/katalog-produk/kelola");

                      }}

                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"

                    >

                      Lihat di Kelola Produk

                    </button>

                    <button

                      type="button"

                      onClick={() => {

                        setParsedResult(null);

                        setExcelFile(null);

                        setImportSuccessResult(null);

                      }}

                      className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors cursor-pointer"

                    >

                      Impor File Lain

                    </button>

                  </div>

                </div>

              ) : (

                <>

                  {/* Dropzone & Template Download */}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div

                      onClick={() => excelFileInputRef.current?.click()}

                      className="md:col-span-2 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"

                    >

                      <input

                        ref={excelFileInputRef}

                        type="file"

                        accept=".xlsx, .xls"

                        onChange={handleExcelFileChange}

                        className="hidden"

                      />

                      <div className="w-12 h-12 rounded-2xl bg-white shadow-xs group-hover:scale-110 flex items-center justify-center text-blue-600 transition-transform">

                        <UploadCloud className="w-6 h-6" />

                      </div>

                      <div className="text-sm font-bold text-gray-800">

                        {excelFile ? excelFile.name : "Klik atau seret file Excel ke sini"}

                      </div>

                      <p className="text-xs text-gray-500">

                        Format yang didukung: <span className="font-semibold text-blue-700">.xlsx</span> atau <span className="font-semibold text-blue-700">.xls</span>

                      </p>

                      {excelFile && (

                        <span className="text-[11px] font-semibold text-blue-600 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 mt-1">

                          Ukuran: {(excelFile.size / 1024).toFixed(1)} KB

                        </span>

                      )}

                    </div>



                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-5 flex flex-col justify-between gap-3">

                      <div className="space-y-1.5">

                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider">

                          <Download className="w-3.5 h-3.5" />

                          Template Resmi

                        </div>

                        <p className="text-xs text-emerald-900/80 leading-relaxed">

                          Gunakan template resmi yang sudah dilengkapi contoh data, format kolom, serta daftar kategori yang valid.

                        </p>

                      </div>

                      <button

                        type="button"

                        onClick={() => downloadKatalogTemplate()}

                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"

                      >

                        <Download className="w-4 h-4" />

                        <span>Unduh Template Excel</span>

                      </button>

                    </div>

                  </div>



                  {/* Parsing State */}

                  {parsingExcel && (

                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-700 text-sm font-semibold">

                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />

                      <span>Membaca dan memvalidasi file Excel...</span>

                    </div>

                  )}



                  {/* Error Notification */}

                  {excelParseError && (

                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3">

                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />

                      <span>{excelParseError}</span>

                    </div>

                  )}



                  {/* Parsed Result Preview */}

                  {parsedResult && (

                    <div className="space-y-4 pt-2">

                      {/* Summary Cards */}

                      <div className="grid grid-cols-3 gap-3">

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">

                          <div className="text-xl font-extrabold text-slate-800">{parsedResult.totalRows}</div>

                          <div className="text-[11px] font-semibold text-slate-500">Total Baris Terbaca</div>

                        </div>

                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">

                          <div className="text-xl font-extrabold text-emerald-700">{parsedResult.validItems.length}</div>

                          <div className="text-[11px] font-semibold text-emerald-600">Siap Diimpor / Diterapkan</div>

                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">

                          <div className="text-xl font-extrabold text-amber-700">{parsedResult.invalidItems.length}</div>

                          <div className="text-[11px] font-semibold text-amber-600">Perlu Perbaikan</div>

                        </div>

                      </div>



                      {/* Invalid Items Warning if any */}

                      {parsedResult.invalidItems.length > 0 && (

                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">

                          <div className="flex items-center justify-between">

                            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">

                              <AlertCircle className="w-4 h-4 text-amber-600" />

                              <span>Terdapat {parsedResult.invalidItems.length} baris dengan data belum lengkap (dilewati):</span>

                            </div>

                            <button

                              type="button"

                              onClick={() => setShowExcelErrorsDetail(!showExcelErrorsDetail)}

                              className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"

                            >

                              {showExcelErrorsDetail ? "Sembunyikan Detail" : "Lihat Detail"}

                            </button>

                          </div>

                          {showExcelErrorsDetail && (

                            <ul className="text-xs text-amber-800 space-y-1 pl-5 list-disc pt-1 max-h-36 overflow-y-auto">

                              {parsedResult.invalidItems.map((inv, idx) => (

                                <li key={idx}>

                                  <strong>Baris {inv.rowNumber}</strong> ({inv.namaProduk || "Tanpa Nama"}): {inv.errors.join(", ")}

                                </li>

                              ))}

                            </ul>

                          )}

                        </div>

                      )}



                      {/* Table Preview */}

                      <div className="space-y-2">

                        <div className="flex items-center justify-between">

                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">

                            Pratinjau Data ({parsedResult.validItems.length} Produk Valid)

                          </h4>

                          <span className="text-[11px] text-gray-500">

                            Klik &quot;Gunakan di Form&quot; untuk mengisi form dengan baris tertentu

                          </span>

                        </div>



                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto overflow-x-auto">

                          <table className="w-full text-left text-xs">

                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold sticky top-0 z-10">

                              <tr>

                                <th className="py-2.5 px-3">No</th>

                                <th className="py-2.5 px-3 min-w-[200px]">Nama Produk</th>

                                <th className="py-2.5 px-3 min-w-[130px]">Kategori</th>

                                <th className="py-2.5 px-3 min-w-[110px]">Merek</th>

                                <th className="py-2.5 px-3 text-right min-w-[110px]">Harga (Rp)</th>

                                <th className="py-2.5 px-3 text-center">Stok</th>

                                <th className="py-2.5 px-3 min-w-[120px]">PIC & Kontak</th>

                                <th className="py-2.5 px-3 text-center min-w-[130px]">Aksi</th>

                              </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100">

                              {parsedResult.validItems.map((item, idx) => (

                                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">

                                  <td className="py-2 px-3 text-gray-500 font-medium">{idx + 1}</td>

                                  <td className="py-2 px-3 font-semibold text-gray-900">

                                    <div className="line-clamp-1">{item.namaProduk}</div>

                                    <div className="text-[10px] text-gray-500 font-mono">{item.sku}</div>

                                  </td>

                                  <td className="py-2 px-3 text-gray-700">

                                    <div>{item.kategori}</div>

                                    {item.subKategori && (

                                      <div className="text-[10px] text-gray-500">{item.subKategori}</div>

                                    )}

                                  </td>

                                  <td className="py-2 px-3 text-gray-700">{item.merek}</td>

                                  <td className="py-2 px-3 text-right font-semibold text-gray-900">

                                    Rp {item.hargaProduk.toLocaleString("id-ID")}

                                  </td>

                                  <td className="py-2 px-3 text-center font-bold text-gray-800">

                                    {item.jumlahStok} {item.satuanProduk}

                                  </td>

                                  <td className="py-2 px-3 text-gray-600 text-[11px]">

                                    <div>{item.namaPic}</div>

                                    <div className="text-gray-400">{item.noHpPic}</div>

                                  </td>

                                  <td className="py-2 px-3 text-center">

                                    <button

                                      type="button"

                                      onClick={() => handleApplyRowToForm(item)}

                                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-colors cursor-pointer"

                                    >

                                      Gunakan di Form

                                    </button>

                                  </td>

                                </tr>

                              ))}

                            </tbody>

                          </table>

                        </div>

                      </div>

                    </div>

                  )}

                </>

              )}

            </div>



            {/* Modal Footer */}

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">

              <button

                type="button"

                onClick={() => setShowExcelModal(false)}

                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-white text-xs sm:text-sm font-bold text-gray-700 transition-colors cursor-pointer"

              >

                Tutup

              </button>



              {parsedResult && parsedResult.validItems.length > 0 && !importSuccessResult && (

                <div className="flex flex-wrap items-center gap-2.5">

                  <button

                    type="button"

                    onClick={() => handleApplyRowToForm(parsedResult.validItems[0])}

                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"

                  >

                    Terapkan Baris 1 ke Form

                  </button>

                  <button

                    type="button"

                    disabled={importingBatch}

                    onClick={handleBulkImport}

                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"

                  >

                    {importingBatch ? (

                      <>

                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                        <span>Mengimpor {parsedResult.validItems.length} Produk...</span>

                      </>

                    ) : (

                      <>

                        <CheckCircle2 className="w-4 h-4" />

                        <span>Impor Semua ({parsedResult.validItems.length} Produk) ke Katalog</span>

                      </>

                    )}

                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

      )}



      {/* ── Modal Konfirmasi Hapus Produk ── */}

      {showDeleteModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95">

            <div className="flex items-center gap-3 text-rose-600">

              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">

                <Trash2 className="w-5 h-5 text-rose-600" />

              </div>

              <div>

                <h3 className="text-sm font-black text-gray-900">Konfirmasi Hapus Produk</h3>

                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>

              </div>

            </div>



            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm space-y-1">

              <div className="text-gray-500">Nama Produk:</div>

              <div className="font-bold text-gray-900 line-clamp-2">{namaProduk}</div>

              {sku && (

                <div className="text-[11px] text-gray-600 font-mono pt-0.5">

                  SKU: {sku}

                </div>

              )}

            </div>



            <p className="text-sm text-gray-600 leading-relaxed">

              Apakah Anda yakin ingin menghapus produk ini dari katalog? Seluruh spesifikasi teknis, riwayat draf, varian, dan harga akan dihapus secara permanen.

            </p>



            <div className="flex items-center justify-end gap-2.5 pt-2">

              <button

                type="button"

                onClick={() => setShowDeleteModal(false)}

                disabled={deleting}

                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-sm font-bold text-gray-700 transition-colors cursor-pointer"

              >

                Batal

              </button>

              <button

                type="button"

                onClick={handleDeleteProduct}

                disabled={deleting}

                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"

              >

                {deleting ? (

                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                ) : (

                  <Trash2 className="w-4 h-4" />

                )}

                <span>Ya, Hapus Produk</span>

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

