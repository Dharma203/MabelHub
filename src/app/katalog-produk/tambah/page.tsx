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
  Search,
} from "lucide-react";
import {
  PRODUCT_SPEC_REGISTRY,
  KBLI_STORE_LIST,
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
        <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
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
  const [jenisPenyedia, setJenisPenyedia] = useState("UMKK");
  const [lokasiPenyedia, setLokasiPenyedia] = useState("DKI Jakarta");

  const [adaSni, setAdaSni] = useState(false);
  const [nomorSni, setNomorSni] = useState("");

  const [persenPajak, setPersenPajak] = useState<number>(0);

  const [varianList, setVarianList] = useState<VariantItem[]>([]);
  const [hargaProduk, setHargaProduk] = useState<string>("");
  const [grosirList, setGrosirList] = useState<GrosirItem[]>([]);

  const [jumlahStok, setJumlahStok] = useState<string>("");
  const [satuanProduk, setSatuanProduk] = useState("");

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
          setJumlahStok(p.jumlahStok !== undefined ? String(p.jumlahStok) : "");
          setSatuanProduk(p.satuanProduk || "Unit");

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
  const hargaTayang = Math.round(hargaNumber + (hargaNumber * persenPajak) / 100);

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
        jenisPenyedia: jenisPenyedia || "UMKK",
        lokasiPenyedia: lokasiPenyedia.trim() || "DKI Jakarta",
        sertifikatSni: adaSni ? nomorSni.trim() || "Ada" : "Tidak ada",
        nomorSni: adaSni ? nomorSni.trim() : "",
        pajak: "PPN",
        persenPajak,
        hargaProduk: hargaNumber,
        hargaSetelahPajak: hargaTayang,
        minimumPembelian: 1,
        jumlahStok: parseInt(jumlahStok, 10) || 0,
        satuanProduk,
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
        setFotoSlots([null, null, null, null, null]);
        setVideoUrl("");
        setDeskripsi("");
        setKodeKbki("");
        setAdaSni(false);
        setNomorSni("");
        setHargaProduk("");
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
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
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
    <div className="min-h-screen bg-[#F6F8FA] text-slate-800 pb-28">
      {/* Top Breadcrumb & Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSafeExit("/katalog-produk/kelola")}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <button
                  type="button"
                  onClick={() => handleSafeExit("/katalog-produk")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  Katalog
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => handleSafeExit("/katalog-produk/kelola")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  Kelola
                </button>
                <span>/</span>
                <span className="text-slate-700 font-bold">
                  {isEditMode ? "Edit Produk" : "Tambah Produk"}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900">
                {isEditMode ? `Edit Produk: ${namaProduk || "Katalog"}` : "Tambah Produk Baru"}
              </h1>
            </div>
          </div>

          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Produk</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── CARD 1: Kategori & Subkategori ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Kategori & Subkategori Produk</h2>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                Wajib
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowKbliModal(true)}
              className="text-xs font-semibold text-slate-700 hover:text-red-600 px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              Lihat KBLI Toko ({KBLI_STORE_LIST.length})
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Pilih Kategori dan Subkategori untuk memuat formulir spesifikasi teknis standar LKPP / INAPROC secara otomatis.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Kategori Utama</label>
              <div className="relative">
                <select
                  value={kategoriId}
                  onChange={(e) => handleMainCatChange(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800 cursor-pointer pr-8"
                >
                  {PRODUCT_SPEC_REGISTRY.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Subkategori</label>
              <div className="relative">
                <select
                  value={subKategoriId}
                  onChange={(e) => handleSubCatChange(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800 cursor-pointer pr-8"
                >
                  {currentMainCat.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 2: Merek ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Merek</h2>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-600 select-none">
                {adaMerek ? "Ada Merek" : "Tanpa Merek"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={adaMerek}
                onClick={() => setAdaMerek(!adaMerek)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                  adaMerek ? "bg-red-600" : "bg-slate-300"
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
          <p className="text-xs text-slate-500">
            Pastikan mencantumkan informasi merek yang jelas pada produk Anda untuk membangun kepercayaan terhadap pelanggan.
          </p>

          {adaMerek && (
            <input
              type="text"
              placeholder="Masukkan nama merek produk"
              value={merek}
              onChange={(e) => setMerek(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800"
            />
          )}
        </section>

        {/* ── CARD 3: Informasi Produk ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Informasi Produk
          </h2>

          {/* Nama Produk */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-800">Nama Produk</label>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  Wajib
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{namaProduk.length}/250</span>
            </div>
            <p className="text-xs text-slate-500">
              Tulis nama produk dengan lengkap min. 5 karakter. Anda bisa mencantumkan jenis produk, merek, warna, bahan, atau tipe agar semakin menarik dan mudah ditemukan oleh pembeli
            </p>
            <input
              type="text"
              maxLength={250}
              placeholder="Contoh: Bangku Kantor"
              value={namaProduk}
              onChange={(e) => setNamaProduk(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800"
            />
          </div>

          {/* Nomor SKU */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-800">Nomor SKU (Stock Keeping Unit)</label>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  Opsional
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{sku.length}/50</span>
            </div>
            <p className="text-xs text-slate-500">
              Kode unik identifikasi produk internal Anda (contoh: SKU-MNTR-24-001). Jika dikosongkan, sistem akan membuatkan kode SKU otomatis.
            </p>
            <input
              type="text"
              maxLength={50}
              placeholder="Contoh: SKU-MNTR-24-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800"
            />
          </div>

          {/* Upload Foto Produk */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-800">Upload Foto Produk</label>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                Wajib
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan format .jpg .jpeg .png dan ukuran optimal 700 x 700 px (Min. 300 x 300 px, Max. 2048 x 2048 px). Pilih foto produk atau tarik dan letakkan hingga 5 foto sekaligus di sini. Cantumkan min. 1 foto yang menarik agar produk semakin menarik pembeli.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {fotoSlots.map((foto, idx) => (
                <div
                  key={idx}
                  className={`
                    relative aspect-square rounded-xl border-2 border-dashed 
                    ${foto ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100"} 
                    flex flex-col items-center justify-center p-2 text-center transition-all group overflow-hidden
                  `}
                >
                  {foto ? (
                    <>
                      <img
                        src={foto}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                        title="Hapus foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
                        {idx === 0 ? "Foto Utama" : `Foto ${idx + 1}`}
                      </span>
                    </>
                  ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center space-y-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(idx, e)}
                        className="hidden"
                      />
                      <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-800">
                        {idx === 0 ? "Foto Utama" : `Foto ${idx + 1}`}
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Video Produk & URL */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">Video Produk</label>
              <p className="text-xs text-slate-500">
                Format video .mp4 dan .mov. Disarankan durasi maks. 120 detik dan ukuran maks. 50MB.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">URL Video Produk</label>
              <input
                type="text"
                placeholder="Masukkan URL Video Youtube (Contoh: https://youtube.com/watch?v=...)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">Deskripsi</label>
              <span className="text-[11px] text-slate-400">{deskripsi.length}/2000</span>
            </div>
            <p className="text-xs text-slate-500">
              Tulis penjelasan yang detail terkait produk agar mudah dimengerti dan ditemukan pembeli.
            </p>
            <textarea
              rows={4}
              maxLength={2000}
              placeholder="Contoh: Kursi kantor kulit sintetis asli yang nyaman. Rangka kokoh dan ergonomis..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800 resize-y"
            />
          </div>
        </section>

        {/* ── CARD 4: Spesifikasi Produk ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Spesifikasi Produk</h2>
              <p className="text-xs text-slate-500 pt-0.5">
                Kategori: <span className="font-semibold text-slate-700">{currentMainCat.name}</span> &gt; <span className="font-semibold text-red-600">{currentSubCat.name}</span>
              </p>
            </div>
            <span className="self-start sm:self-auto text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
              Formulir Spesifikasi Standar
            </span>
          </div>

          {/* Informasi Utama */}
          <div className="flex flex-col md:flex-row items-start gap-3 md:gap-8">
            <div className="w-full md:w-44 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Informasi Utama</h3>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {currentSubCat.informasiUtama.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 truncate" title={field.label}>
                      {field.label}
                    </label>
                    {field.required && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        Wajib
                      </span>
                    )}
                  </div>
                  {field.type === "select" ? (
                    <div className="relative">
                      <select
                        value={spesifikasiValues[field.key] || ""}
                        onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg outline-none text-slate-700 cursor-pointer pr-8"
                      >
                        {field.options?.map((opt, oIdx) => (
                          <option key={opt} value={oIdx === 0 ? "" : opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder || `Masukkan ${field.label}`}
                      value={spesifikasiValues[field.key] || ""}
                      onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-red-500 rounded-lg outline-none text-slate-800 placeholder:text-slate-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Informasi Lainnya */}
          <div className="flex flex-col md:flex-row items-start gap-3 md:gap-8 pt-5 border-t border-slate-100">
            <div className="w-full md:w-44 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Informasi Lainnya</h3>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {currentSubCat.informasiLainnya.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 truncate" title={field.label}>
                      {field.label}
                    </label>
                    {field.required && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        Wajib
                      </span>
                    )}
                  </div>
                  {field.type === "select" ? (
                    <div className="relative">
                      <select
                        value={spesifikasiValues[field.key] || ""}
                        onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg outline-none text-slate-700 cursor-pointer pr-8"
                      >
                        {field.options?.map((opt, oIdx) => (
                          <option key={opt} value={oIdx === 0 ? "" : opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder || `Masukkan ${field.label}`}
                      value={spesifikasiValues[field.key] || ""}
                      onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-red-500 rounded-lg outline-none text-slate-800 placeholder:text-slate-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CARD 5: Kode KBKI ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Kode KBKI (Klasifikasi Baku Komoditas Indonesia)</h2>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                Wajib
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowKbkiModal(true)}
              className="text-xs font-semibold text-slate-700 hover:text-red-600 px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Cari di Database KBKI Resmi
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Kode 10 digit resmi BPS / INAPROC yang merepresentasikan komoditas barang ini. Otomatis terisi berdasarkan subkategori yang Anda pilih atau dapat dicari secara spesifik.
          </p>

          {/* Active Selected KBKI Banner */}
          {(() => {
            const activeKbki = MASTER_KBKI_LIST.find((k) => k.code === kodeKbki);
            return activeKbki ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      {activeKbki.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{activeKbki.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{activeKbki.seksi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKbkiModal(true)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Ganti Kode KBKI
                </button>
              </div>
            ) : null;
          })()}

          {/* Quick Select Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Pilih Cepat Kode KBKI</label>
            <div className="relative">
              <select
                value={kodeKbki}
                onChange={(e) => setKodeKbki(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-700 cursor-pointer pr-8"
              >
                <option value="">Pilih kode KBKI</option>
                {MASTER_KBKI_LIST.map((k) => (
                  <option key={k.code} value={k.code}>
                    {k.code} - {k.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* ── CARD 5: PDN (Produk Dalam Negeri) ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            PDN (Produk Dalam Negeri)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Klasifikasi Produk</label>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                  Wajib
                </span>
              </div>
              <select
                value={klasifikasiPdn}
                onChange={(e) => setKlasifikasiPdn(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="Lokal">Lokal</option>
                <option value="Impor">Impor</option>
                <option value="Dalam Negeri">Dalam Negeri</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lokasi Produksi</label>
              <select
                value={lokasiProduksi}
                onChange={(e) => setLokasiProduksi(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="Diproduksi di seluruh Indonesia">
                  Diproduksi di seluruh Indonesia
                </option>
                <option value="Pulau Jawa">Pulau Jawa</option>
                <option value="Luar Pulau Jawa">Luar Pulau Jawa</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Tenaga Kerja dalam Proses Produksi
              </label>
              <select
                value={tenagaKerja}
                onChange={(e) => setTenagaKerja(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri">
                  Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri
                </option>
                <option value="Sebagian tenaga kerja asing">Sebagian tenaga kerja asing</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Bahan Baku dalam Proses Produksi
              </label>
              <select
                value={bahanBaku}
                onChange={(e) => setBahanBaku(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="Seluruh bahan baku dalam negeri">
                  Seluruh bahan baku dalam negeri
                </option>
                <option value="Campuran dalam dan luar negeri">
                  Campuran dalam dan luar negeri
                </option>
              </select>
            </div>

            {/* Nilai TKDN & BMP */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nilai TKDN (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Contoh: 40.00 (Opsional)"
                value={nilaiTkdn}
                onChange={(e) => setNilaiTkdn(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nilai BMP (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Contoh: 5.00 (Opsional)"
                value={nilaiBmp}
                onChange={(e) => setNilaiBmp(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">Nama Pemilik Sertifikat TKDN</label>
              <input
                type="text"
                placeholder="Contoh: PT Sumber Rejeki Teknologi (Opsional)"
                value={pemilikSertifikat}
                onChange={(e) => setPemilikSertifikat(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>
          </div>
        </section>

        {/* ── CARD 6: Sertifikat SNI ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Sertifikat SNI</h2>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-600 select-none">
                {adaSni ? "Memiliki SNI" : "Tidak Ada SNI"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={adaSni}
                onClick={() => setAdaSni(!adaSni)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                  adaSni ? "bg-red-600" : "bg-slate-300"
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
          <p className="text-xs text-slate-500">
            Pastikan mencantumkan informasi Sertifikat SNI pada produk Anda untuk meyakinkan pembeli akan kualitas produk yang teruji dan patuh terhadap standar nasional.
          </p>

          {adaSni && (
            <input
              type="text"
              placeholder="Masukkan nomor sertifikat SNI (Contoh: SNI ISO 9001:2015)"
              value={nomorSni}
              onChange={(e) => setNomorSni(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800"
            />
          )}
        </section>

        {/* ── CARD BARU: Informasi Toko Penyedia & Pengiriman (Logistik) ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Informasi Toko Penyedia & Logistik</span>
            <span className="text-[10px] font-normal text-slate-400">Profil & Pengiriman</span>
          </h2>
          <p className="text-xs text-slate-500">
            Data penyedia dan rincian logistik akan ditampilkan pada rincian produk untuk transparansi informasi pengadaan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nama Toko / Penyedia</label>
              <input
                type="text"
                placeholder="Contoh: MabelHub Store"
                value={namaPenyedia}
                onChange={(e) => setNamaPenyedia(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Jenis Penyedia</label>
              <select
                value={jenisPenyedia}
                onChange={(e) => setJenisPenyedia(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="UMKK">UMKK (Usaha Mikro, Kecil, dan Koperasi)</option>
                <option value="Non-UMKK">Non-UMKK (Usaha Menengah & Besar)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lokasi Tempat Usaha</label>
              <input
                type="text"
                placeholder="Contoh: DKI Jakarta"
                value={lokasiPenyedia}
                onChange={(e) => setLokasiPenyedia(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Asal Pengiriman (Dikirim Dari)</label>
              <input
                type="text"
                placeholder="Contoh: Kota Jakarta Pusat, DKI Jakarta"
                value={dikirimDari}
                onChange={(e) => setDikirimDari(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Berat per Produk</label>
              <input
                type="text"
                placeholder="Contoh: 1.500 gr atau 2 kg"
                value={beratProduk}
                onChange={(e) => setBeratProduk(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Dimensi per Produk</label>
              <input
                type="text"
                placeholder="Contoh: P 60 cm x L 25 cm x T 45 cm"
                value={dimensiProduk}
                onChange={(e) => setDimensiProduk(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>
          </div>
        </section>

        {/* ── CARD 7: Pengaturan Pajak ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Pengaturan Pajak
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Jenis Pajak: PPN</span>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                Wajib
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Masukkan nominal pajak sesuai ketentuan dan aturan yang berlaku. PPN yang akan dibayar sejumlah DPP x 11/12 x Tarif PPN.
            </p>
            <select
              value={persenPajak}
              onChange={(e) => setPersenPajak(Number(e.target.value))}
              className="w-full sm:w-64 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium cursor-pointer"
            >
              <option value={0}>0% (Bebas / Tidak Dikenakan PPN)</option>
              <option value={11}>11% (Tarif Standar PPN)</option>
              <option value={12}>12%</option>
            </select>
          </div>
        </section>

        {/* ── CARD 8: Varian ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Varian</h2>
              <p className="text-xs text-slate-500 pt-0.5">
                Tambah varian untuk produk dengan berbagai jenis (contoh: Ukuran, Warna, Kapasitas)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVarian}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Varian
            </button>
          </div>

          {varianList.length > 0 && (
            <div className="space-y-3 pt-2">
              {varianList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <input
                    type="text"
                    placeholder="Nama Varian (misal: Ukuran)"
                    value={item.nama}
                    onChange={(e) => updateVarian(item.id, "nama", e.target.value)}
                    className="w-full sm:w-44 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Pilihan (pisahkan koma: 6, 7, 8, 9, 10)"
                    value={item.pilihan}
                    onChange={(e) => updateVarian(item.id, "pilihan", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeVarian(item.id)}
                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── CARD 9: Harga ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Harga</h2>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Harga Produk</label>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                Wajib
              </span>
            </div>
            <p className="text-xs text-slate-500">Harga ini diluar pajak dan ongkos kirim.</p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center w-full sm:w-64 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:border-red-500">
                <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-200">
                  Rp
                </span>
                <input
                  type="number"
                  placeholder="Masukkan harga"
                  value={hargaProduk}
                  onChange={(e) => setHargaProduk(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-transparent outline-none font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Harga tayang termasuk pajak:</span>
                <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-800">
                  Rp {hargaTayang.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Harga Grosir */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Harga Grosir</span>
              <button
                type="button"
                onClick={handleAddGrosir}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Harga Grosir
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Tambah harga grosir untuk pembelian jumlah tertentu.
            </p>

            {grosirList.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <span className="text-xs text-slate-600 font-medium">Min Qty:</span>
                <input
                  type="number"
                  min={1}
                  value={g.minQty}
                  onChange={(e) => updateGrosir(g.id, "minQty", parseInt(e.target.value, 10) || 1)}
                  className="w-24 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                />
                <span className="text-xs text-slate-600 font-medium">Harga Grosir: Rp</span>
                <input
                  type="number"
                  value={g.harga}
                  onChange={(e) => updateGrosir(g.id, "harga", parseFloat(e.target.value) || 0)}
                  className="w-36 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                />
                <button
                  type="button"
                  onClick={() => removeGrosir(g.id)}
                  className="text-red-500 hover:text-red-700 ml-auto p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── CARD 10: Informasi Stok ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Informasi Stok
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Jumlah Stok</label>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                  Wajib
                </span>
              </div>
              <input
                type="number"
                placeholder="Masukkan jumlah stok"
                value={jumlahStok}
                onChange={(e) => setJumlahStok(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Satuan Produk</label>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                  Wajib
                </span>
              </div>
              <select
                value={satuanProduk}
                onChange={(e) => setSatuanProduk(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium cursor-pointer"
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
            </div>
          </div>
        </section>

        {/* ── CARD 11: Pre Order ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Pre Order</h2>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-600 select-none">
                {preOrderAktif ? "Aktif" : "Tidak Aktif"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preOrderAktif}
                onClick={() => setPreOrderAktif(!preOrderAktif)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                  preOrderAktif ? "bg-red-600" : "bg-slate-300"
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
          <p className="text-xs text-slate-500">
            Aktifkan Pre Order jika produk memakan proses waktu pembuatan atau pengiriman khusus.
          </p>

          {preOrderAktif && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-medium text-slate-700">Estimasi Waktu Pengerjaan:</span>
              <input
                type="number"
                min={1}
                value={durasiPreOrder}
                onChange={(e) => setDurasiPreOrder(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded"
              />
              <span className="text-xs text-slate-600">Hari</span>
            </div>
          )}
        </section>

        {/* ── CARD 12: Layanan Tambahan ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Layanan Tambahan</h2>
              <p className="text-xs text-slate-500 pt-0.5">
                Berikan layanan lebih untuk pelanggan Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Contoh: Garansi Resmi 1 Tahun, Jasa Perakitan di Tempat"
              value={layananInput}
              onChange={(e) => setLayananInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLayanan();
                }
              }}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
            <button
              type="button"
              onClick={handleAddLayanan}
              className="px-3.5 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
            >
              + Tambah Layanan
            </button>
          </div>

          {layananList.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {layananList.map((lay, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-medium border border-slate-200"
                >
                  {lay}
                  <button
                    type="button"
                    onClick={() => removeLayanan(idx)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Sticky Bottom Actions Bar ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 py-3.5 px-4 sm:px-6 z-40 shadow-lg">
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            {isEditMode && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={submitting || deleting}
                className="px-3.5 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Produk</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSafeExit()}
              disabled={submitting || deleting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false, true)}
              disabled={submitting || deleting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              {isEditMode ? "Simpan sebagai Draf" : "Simpan Draf Produk"}
            </button>

            {!isEditMode && (
              <button
                type="button"
                onClick={() => handleSubmit(true, false)}
                disabled={submitting || deleting}
                className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Simpan & Tambah Produk Lagi
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit(false, false)}
              disabled={submitting || deleting}
              className="px-6 py-2 bg-[#d32f2f] hover:bg-[#b71c1c] active:bg-[#9a1616] text-white rounded-lg text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-1.5"
            >
              {submitting
                ? "Menyimpan..."
                : isEditMode
                ? "Perbarui & Publikasikan"
                : "Simpan"}
            </button>
          </div>
        </div>
      </div>

      {/* ── KBLI Helper Modal (25 KBLI Toko) ── */}
      {showKbliModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  Daftar KBLI Toko ({KBLI_STORE_LIST.length} Bidang Usaha Terdaftar)
                </h3>
                <p className="text-xs text-slate-500 pt-0.5">
                  Klasifikasi Baku Lapangan Usaha Indonesia terdaftar untuk MabelHub
                </p>
              </div>
              <button
                onClick={() => setShowKbliModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari kode KBLI atau nama bidang usaha..."
                  value={kbliSearch}
                  onChange={(e) => setKbliSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg outline-none font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-28">Kode KBLI</th>
                    <th className="py-3 px-4">Nama KBLI</th>
                    <th className="py-3 px-4 w-20 text-center">Tahun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKbliList.length > 0 ? (
                    filteredKbliList.map((item) => (
                      <tr
                        key={item.code}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3 px-4 text-center font-medium text-slate-400">
                          {item.no}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-red-600">
                          {item.code}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">
                          {item.year}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tidak ada KBLI yang cocok dengan pencarian &quot;{kbliSearch}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {filteredKbliList.length} dari {KBLI_STORE_LIST.length} KBLI</span>
              <button
                type="button"
                onClick={() => setShowKbliModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  Database Kode KBKI Resmi BPS / INAPROC
                </h3>
                <p className="text-xs text-slate-500 pt-0.5">
                  Cari kode komoditas 10-digit resmi berdasarkan nama barang, tipe, atau kategori
                </p>
              </div>
              <button
                onClick={() => setShowKbkiModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ketik nama komoditas, jenis barang (misal: laptop, monitor, kursi, shredder, printer)..."
                  value={kbkiSearch}
                  onChange={(e) => setKbkiSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-lg outline-none font-medium text-slate-800"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      kbkiCategoryFilter === cat
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 w-32">Kode KBKI</th>
                    <th className="py-3 px-4">Nama Komoditas Resmi</th>
                    <th className="py-3 px-4 w-44">Kategori</th>
                    <th className="py-3 px-4 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKbkiList.length > 0 ? (
                    filteredKbkiList.map((item) => (
                      <tr
                        key={item.code}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          kodeKbki === item.code ? "bg-red-50/40" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-[11px] text-slate-400 pt-0.5">{item.seksi}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {item.category}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setKodeKbki(item.code);
                              setShowKbkiModal(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              kodeKbki === item.code
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            {kodeKbki === item.code ? "Terpilih" : "Gunakan"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tidak ada komoditas KBKI yang cocok dengan pencarian &quot;{kbkiSearch}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {filteredKbkiList.length} komoditas KBKI</span>
              <button
                type="button"
                onClick={() => setShowKbkiModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Perubahan Belum Disimpan</h3>
                <p className="text-xs text-slate-500">Konfirmasi meninggalkan halaman</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda memiliki data yang telah diubah namun belum disimpan. Jika Anda keluar sekarang atau memuat ulang halaman, seluruh perubahan yang belum tersimpan akan hilang.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Tinggalkan Halaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus Produk ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Konfirmasi Hapus Produk</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500">Nama Produk:</div>
              <div className="font-bold text-slate-900 line-clamp-2">{namaProduk}</div>
              {sku && (
                <div className="text-[11px] text-slate-600 font-mono pt-0.5">
                  SKU: {sku}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus produk ini dari katalog? Seluruh spesifikasi teknis, riwayat draf, varian, dan harga akan dihapus secara permanen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
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
