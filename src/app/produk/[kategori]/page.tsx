"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Search,
  Package,
  ChevronRight,
  Shield,
  Lock,
  Unlock,
  Trash2,
  Plus,
  X,
  Printer,
} from "lucide-react";

// ─── Static category meta ─────────────────────────────────────────────────────

const CATEGORY_META: Record<
  string,
  { name: string; description: string }
> = {
  brochure: {
    name: "Brochure",
    description: "Brosur produk & layanan",
  },
  catalogue: {
    name: "Catalogue",
    description: "Katalog produk lengkap",
  },
  "company-profile": {
    name: "Company Profile",
    description: "Profil perusahaan resmi",
  },
  datasheet: {
    name: "Datasheet",
    description: "Lembar data teknis produk",
  },
  "presentation-materials": {
    name: "Presentation Materials",
    description: "Materi presentasi sales",
  },
  pricelist: {
    name: "Pricelist",
    description: "Daftar harga produk & jasa",
  },
  "id-kit": {
    name: "ID KIT",
    description: "Identitas visual & kit brand",
  },
  tools: {
    name: "Tools",
    description: "Alat bantu & template kerja",
  },
  certification: {
    name: "Certification",
    description: "Sertifikat & akreditasi resmi",
  },
  legalitas: {
    name: "Legalitas",
    description: "Dokumen legal & perizinan",
  },
};

// ─── Document Type ────────────────────────────────────────────────────────────

type DocFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  updatedAt: string;
  url: string;
  isLocked?: boolean;
};

// ─── File type badge ──────────────────────────────────────────────────────────

function FileBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    PDF: "bg-red-100 text-red-700",
    PPTX: "bg-orange-100 text-orange-700",
    XLSX: "bg-green-100 text-green-700",
    DOCX: "bg-blue-100 text-blue-700",
    PNG: "bg-teal-100 text-teal-700",
    JPG: "bg-teal-100 text-teal-700",
    JPEG: "bg-teal-100 text-teal-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ring-1 ring-black/10 ${map[type] ?? "bg-gray-100 text-gray-600"}`}
    >
      {type}
    </span>
  );
}

// ─── Preview-able types ───────────────────────────────────────────────────────

const PREVIEWABLE_TYPES = ["PDF", "PNG", "JPG", "JPEG", "GIF", "SVG", "WEBP"];

function isPreviewable(doc: DocFile): boolean {
  if (!doc.url) return false;
  return PREVIEWABLE_TYPES.includes(doc.type.toUpperCase());
}

function isImageType(type: string): boolean {
  return ["PNG", "JPG", "JPEG", "GIF", "SVG", "WEBP"].includes(
    type.toUpperCase(),
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProdukDetailPage({
  params,
}: {
  params: Promise<{ kategori: string }>;
}) {
  const { kategori } = use(params);
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [meta, setMeta] = useState<
    { name: string; description: string } | undefined
  >(CATEGORY_META[kategori]);
  const [isClient, setIsClient] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Fullscreen modal state (triggered by thumbnail click)
  const [previewDoc, setPreviewDoc] = useState<DocFile | null>(null);
  // Quick preview modal state (triggered by Preview button)
  const [quickPreviewDoc, setQuickPreviewDoc] = useState<DocFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isSuperAdmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    setIsClient(true);
    fetch(`/api/produk/categories/${kategori}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Category not found");
      })
      .then((data) => setMeta(data))
      .catch((err) => console.error("Error fetching category meta:", err));
  }, [kategori]);

  // Access guard
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
  }, [sessionLoading, user, router]);

  // Load documents from MongoDB API
  const loadDocs = async () => {
    if (!kategori) return;
    try {
      setLoadingDocs(true);
      const res = await fetch(
        `/api/produk/documents?kategori=${encodeURIComponent(kategori)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDocs(data);
        }
      } else {
        console.error("Gagal memuat dokumen dari server");
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [kategori]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("categoryId", kategori);

      const res = await fetch("/api/produk/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.document) {
          setDocs((prev) => [data.document, ...prev]);
        } else {
          loadDocs();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengunggah dokumen");
      }
    } catch (error) {
      console.error("Error upload document:", error);
      alert("Terjadi kesalahan saat mengunggah dokumen");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
    try {
      const res = await fetch(`/api/produk/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menghapus dokumen");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Terjadi kesalahan saat menghapus dokumen");
    }
  };

  const handleToggleLock = async (id: string) => {
    const targetDoc = docs.find((d) => d.id === id);
    if (!targetDoc) return;
    const nextLocked = !targetDoc.isLocked;

    try {
      const res = await fetch(`/api/produk/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: nextLocked }),
      });
      if (res.ok) {
        setDocs((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isLocked: nextLocked } : d)),
        );
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengubah status kunci dokumen");
      }
    } catch (error) {
      console.error("Error updating lock status:", error);
      alert("Terjadi kesalahan saat mengubah status dokumen");
    }
  };

  const handlePreview = (doc: DocFile) => {
    if (doc.url) {
      setPreviewDoc(doc);
    } else {
      alert("Dokumen tidak memiliki URL file yang valid.");
    }
  };

  const handleQuickPreview = (doc: DocFile) => {
    if (doc.url) {
      setQuickPreviewDoc(doc);
    } else {
      alert("Dokumen tidak memiliki URL file yang valid.");
    }
  };

  const handlePrintDoc = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.print();
      } catch {
        // Fallback: open in new window and print
        const printWindow = window.open(previewDoc?.url, "_blank");
        if (printWindow) {
          printWindow.onload = () => printWindow.print();
        }
      }
    } else if (previewDoc?.url) {
      // For non-iframe content (images), open print dialog
      const printWindow = window.open(previewDoc.url, "_blank");
      if (printWindow) {
        printWindow.onload = () => printWindow.print();
      }
    }
  };

  const isSalesOrLeader = user?.role === "SALES" || user?.role === "LEADER";

  const visibleDocs = docs.filter((d) => {
    if (isSalesOrLeader && d.isLocked) return false;
    return true;
  });

  const filtered = visibleDocs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (sessionLoading || !isClient || !meta) {
    return (
      <div className="min-h-screen bg-blue-50 grid place-items-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="p-6">
        <main className="w-full max-w-none">
          {/* ── Breadcrumb ── */}
          <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500">
            <button
              onClick={() => router.push("/produk")}
              className="hover:text-blue-600 transition-colors"
            >
              Product Hub
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-extrabold text-black">{meta.name}</span>
          </nav>

          {/* ── Header ── */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/produk")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 transition"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-black uppercase tracking-wide flex items-center gap-2">
                  {meta.name}
                </h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {meta.description}
                </p>
              </div>
            </div>

            {/* Actions & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {isSuperAdmin && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors ${
                      isUploading
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Tambah Dokumen</span>
                      </>
                    )}
                  </button>
                </>
              )}
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari dokumen..."
                  className="h-11 w-full rounded-full bg-white pl-11 pr-5 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-blue-400 transition"
                />
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="mb-6 bg-white rounded-xl px-6 py-4 shadow-sm ring-1 ring-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <Package className="w-4 h-4" />
            <span>
              Menampilkan{" "}
              <span className="font-bold text-gray-900">{filtered.length}</span>{" "}
              dari{" "}
              <span className="font-bold text-gray-900">
                {visibleDocs.length}
              </span>{" "}
              dokumen
            </span>
          </div>

          {/* ── Document Grid ── */}
          {loadingDocs ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">
                Memuat dokumen...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-semibold">
                Tidak ada dokumen ditemukan.
              </p>
              {isSuperAdmin && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
                >
                  + Unggah dokumen baru
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-blue-200 transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* File preview area */}
                  <div
                    onClick={() => handlePreview(doc)}
                    className="h-28 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center cursor-pointer group/thumb relative overflow-hidden"
                    title="Klik untuk membuka dokumen"
                  >
                    <FileText className="w-12 h-12 text-blue-300 group-hover/thumb:scale-110 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-blue-600/0 group-hover/thumb:bg-blue-600/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover/thumb:opacity-100 transition-opacity text-[11px] font-bold text-blue-800 bg-white/90 px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Buka
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <FileBadge type={doc.type} />
                        {doc.isLocked && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p
                        onClick={() => handlePreview(doc)}
                        className="mt-2 text-sm font-bold text-gray-900 leading-tight line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                        title={doc.name}
                      >
                        {doc.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400">
                        <span>{doc.size}</span>
                        <span>·</span>
                        <span>Updated {doc.updatedAt}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuickPreview(doc)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors ring-1 ring-blue-200"
                          title="Preview dokumen"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <a
                          href={
                            doc.url ? `${doc.url}?download=true` : undefined
                          }
                          download={doc.name || true}
                          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-colors ring-1 ${
                            doc.isLocked || !doc.url
                              ? "bg-gray-50 text-gray-400 ring-gray-200 cursor-not-allowed pointer-events-none"
                              : "bg-green-50 text-green-700 hover:bg-green-100 ring-green-200"
                          }`}
                          title="Unduh dokumen"
                          onClick={(e) =>
                            (doc.isLocked || !doc.url) && e.preventDefault()
                          }
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </a>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleLock(doc.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-colors ring-1 ${
                              doc.isLocked
                                ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                                : "bg-gray-50 text-gray-600 ring-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {doc.isLocked ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            {doc.isLocked ? "Buka" : "Kunci"}
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors ring-1 ring-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Quick Preview Modal (centered, non-fullscreen) ── */}
          {quickPreviewDoc && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setQuickPreviewDoc(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Preview Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="font-bold text-gray-900 text-sm truncate"
                        title={quickPreviewDoc.name}
                      >
                        {quickPreviewDoc.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <FileBadge type={quickPreviewDoc.type} />
                        <span>{quickPreviewDoc.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {quickPreviewDoc.url && (
                      <a
                        href={`${quickPreviewDoc.url}?download=true`}
                        download={quickPreviewDoc.name}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors ring-1 ring-green-200"
                        title="Unduh"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </a>
                    )}
                    <button
                      onClick={() => setQuickPreviewDoc(null)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                      title="Tutup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden bg-gray-50">
                  {isImageType(quickPreviewDoc.type) ? (
                    <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={quickPreviewDoc.url}
                        alt={quickPreviewDoc.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                      />
                    </div>
                  ) : quickPreviewDoc.type.toUpperCase() === "PDF" ? (
                    <iframe
                      src={`${quickPreviewDoc.url}#toolbar=0`}
                      className="w-full h-full border-0"
                      title={`Preview ${quickPreviewDoc.name}`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-center max-w-sm">
                        <p className="text-base font-bold text-gray-800">
                          {quickPreviewDoc.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Format{" "}
                          <span className="font-bold uppercase text-gray-700">
                            {quickPreviewDoc.type}
                          </span>{" "}
                          tidak dapat di-preview.
                        </p>
                        {quickPreviewDoc.url && (
                          <a
                            href={`${quickPreviewDoc.url}?download=true`}
                            download={quickPreviewDoc.name}
                            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-md transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            Unduh Dokumen
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Document Full Screen Modal ── */}
          {previewDoc && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white w-screen h-screen overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 flex-shrink-0 bg-white shadow-sm z-10">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-extrabold text-gray-900 text-base truncate"
                      title={previewDoc.name}
                    >
                      {previewDoc.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <FileBadge type={previewDoc.type} />
                      <span>{previewDoc.size}</span>
                    </p>
                  </div>
                </div>

                {/* Modal Action Controls: Cetak, Unduh & Tutup */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Cetak Dokumen */}
                  <button
                    onClick={handlePrintDoc}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                    title="Cetak dokumen"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak</span>
                  </button>

                  {/* Unduh Langsung */}
                  {previewDoc.url && (
                    <a
                      href={`${previewDoc.url}?download=true`}
                      download={previewDoc.name}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 shadow-sm transition-all active:scale-95"
                      title="Unduh dokumen langsung"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh</span>
                    </a>
                  )}

                  {/* Tutup Modal */}
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    title="Tutup"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Direct Full View */}
              <div className="flex-1 overflow-hidden bg-gray-100 flex flex-col">
                {isImageType(previewDoc.type) ? (
                  <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : previewDoc.type.toUpperCase() === "PDF" ? (
                  <iframe
                    ref={iframeRef}
                    src={`${previewDoc.url}#toolbar=0`}
                    className="w-full h-full border-0"
                    title={`Dokumen ${previewDoc.name}`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 p-8">
                    <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-blue-500" />
                    </div>
                    <div className="text-center max-w-md">
                      <p className="text-lg font-bold text-gray-800">
                        {previewDoc.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        File format{" "}
                        <span className="font-bold uppercase text-gray-700">
                          {previewDoc.type}
                        </span>{" "}
                        dapat diunduh langsung ke komputer/perangkat Anda.
                      </p>
                      {previewDoc.url && (
                        <div className="flex items-center justify-center mt-5">
                          <a
                            href={`${previewDoc.url}?download=true`}
                            download={previewDoc.name}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-md transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            Unduh Dokumen Sekarang
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
