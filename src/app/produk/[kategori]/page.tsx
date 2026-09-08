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
} from "lucide-react";

// ─── Static category meta ─────────────────────────────────────────────────────

const CATEGORY_META: Record<
  string,
  { name: string; description: string; superAdminOnly: boolean }
> = {
  brochure: { name: "Brochure", description: "Brosur produk & layanan", superAdminOnly: false },
  catalogue: { name: "Catalogue", description: "Katalog produk lengkap", superAdminOnly: false },
  "company-profile": { name: "Company Profile", description: "Profil perusahaan resmi", superAdminOnly: false },
  datasheet: { name: "Datasheet", description: "Lembar data teknis produk", superAdminOnly: false },
  "presentation-materials": { name: "Presentation Materials", description: "Materi presentasi sales", superAdminOnly: false },
  pricelist: { name: "Pricelist", description: "Daftar harga produk & jasa", superAdminOnly: false },
  "id-kit": { name: "ID KIT", description: "Identitas visual & kit brand", superAdminOnly: false },
  tools: { name: "Tools", description: "Alat bantu & template kerja", superAdminOnly: false },
  certification: { name: "Certification", description: "Sertifikat & akreditasi resmi", superAdminOnly: true },
  legalitas: { name: "Legalitas", description: "Dokumen legal & perizinan", superAdminOnly: true },
};

// ─── Mock documents (replace with API call) ───────────────────────────────────

type DocFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  updatedAt: string;
  url: string;
  file?: File;
  isLocked?: boolean;
};

function getMockDocs(categoryId: string): DocFile[] {
  const templates: DocFile[] = [
    { id: "1", name: `${categoryId}_v1.pdf`, type: "PDF", size: "2.4 MB", updatedAt: "15 Apr 2026", url: "", isLocked: false },
    { id: "2", name: `${categoryId}_presentation.pptx`, type: "PPTX", size: "8.1 MB", updatedAt: "10 Apr 2026", url: "", isLocked: true },
    { id: "3", name: `${categoryId}_datasheet.xlsx`, type: "XLSX", size: "1.2 MB", updatedAt: "3 Apr 2026", url: "", isLocked: false },
    { id: "4", name: `${categoryId}_2026.pdf`, type: "PDF", size: "5.6 MB", updatedAt: "1 Mar 2026", url: "", isLocked: false },
  ];
  return templates;
}

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
  return ["PNG", "JPG", "JPEG", "GIF", "SVG", "WEBP"].includes(type.toUpperCase());
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
  const [meta, setMeta] = useState<{ name: string, description: string, superAdminOnly: boolean } | undefined>(CATEGORY_META[kategori]);
  const [isClient, setIsClient] = useState(false);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!user) { router.replace("/"); return; }
    if (meta?.superAdminOnly && !isSuperAdmin) {
      router.replace("/produk");
    }
  }, [sessionLoading, user, meta, isSuperAdmin, router]);

  // Load mock/API docs
  useEffect(() => {
    if (!kategori) return;
    // TODO: replace with real API → GET /api/produk/:kategori
    setDocs(getMockDocs(kategori));
  }, [kategori]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Create local object URL for preview/download
    const fileUrl = URL.createObjectURL(file);

    const newDoc: DocFile = {
      id: Date.now().toString(),
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || "FILE",
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      updatedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      url: fileUrl,
      file: file,
      isLocked: false,
    };
    setDocs([newDoc, ...docs]);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
      setDocs(docs.filter(d => d.id !== id));
    }
  };

  const handleToggleLock = (id: string) => {
    setDocs(docs.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
  };

  const handlePreview = (doc: DocFile) => {
    if (isPreviewable(doc)) {
      // Has a real URL and is a previewable type → show modal
      setPreviewDoc(doc);
    } else if (doc.url) {
      // Has a URL but not previewable in browser → open in new tab
      window.open(doc.url, "_blank");
    } else {
      // No real URL (mock data) → show alert
      alert("Preview tidak tersedia untuk dokumen ini. Dokumen ini adalah data contoh dan belum memiliki file yang dapat ditampilkan.");
    }
  };

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
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
                  {meta.superAdminOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                      <Shield className="w-3 h-3" />
                      SuperAdmin
                    </span>
                  )}
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
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Dokumen
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
              <span className="font-bold text-gray-900">{docs.length}</span>{" "}
              dokumen
            </span>
          </div>

          {/* ── Document Grid ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-semibold">Tidak ada dokumen ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-blue-200 transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* File preview area */}
                  <div className="h-28 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-blue-300" />
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <FileBadge type={doc.type} />
                        {doc.isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                      </div>
                      <p
                        className="mt-2 text-sm font-bold text-gray-900 leading-tight line-clamp-2"
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
                          onClick={() => handlePreview(doc)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors ring-1 ring-blue-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        <a
                          href={doc.url || undefined}
                          download={doc.url ? true : undefined}
                          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-colors ring-1 ${doc.isLocked || !doc.url
                            ? "bg-gray-50 text-gray-400 ring-gray-200 cursor-not-allowed pointer-events-none"
                            : "bg-green-50 text-green-700 hover:bg-green-100 ring-green-200"
                            }`}
                          onClick={(e) => (doc.isLocked || !doc.url) && e.preventDefault()}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh
                        </a>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleLock(doc.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-colors ring-1 ${doc.isLocked
                              ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                              : "bg-gray-50 text-gray-600 ring-gray-200 hover:bg-gray-100"
                              }`}
                          >
                            {doc.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
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

          {/* ── Preview Modal ── */}
          {previewDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-gray-900 text-base truncate">{previewDoc.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <FileBadge type={previewDoc.type} />
                        <span>{previewDoc.size}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-hidden bg-gray-50">
                  {isImageType(previewDoc.type) ? (
                    <div className="w-full h-full flex items-center justify-center p-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewDoc.url}
                        alt={previewDoc.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : previewDoc.type.toUpperCase() === "PDF" ? (
                    <iframe
                      src={previewDoc.url}
                      className="w-full h-full border-0"
                      title={`Preview ${previewDoc.name}`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 p-8">
                      <FileText className="w-20 h-20 opacity-30" />
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-600">Preview tidak tersedia</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Format <span className="font-bold">{previewDoc.type}</span> tidak dapat ditampilkan secara langsung di browser.
                        </p>
                        {previewDoc.url && (
                          <a
                            href={previewDoc.url}
                            download
                            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Unduh untuk melihat
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
