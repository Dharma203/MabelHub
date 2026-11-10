"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import {
  BookOpen,
  ShoppingBag,
  Award,
  Briefcase,
  FileText,
  Shield,
  Monitor,
  Tag,
  Layers,
  Wrench,
  ChevronRight,
  Search,
  Package,
  Plus,
  X,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  docCount: number;
  icon?: React.ReactNode;
  iconBg: string;
  description: string;
  isLocked?: boolean;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: Category[] = [
  {
    id: "brochure",
    name: "Brochure",
    docCount: 0,
    icon: <BookOpen className="w-7 h-7" />,
    iconBg: "bg-[#1D80D9]/10 text-[#1D80D9]",
    description: "Brosur produk & layanan",
  },
  {
    id: "catalogue",
    name: "Catalogue",
    docCount: 0,
    icon: <ShoppingBag className="w-7 h-7" />,
    iconBg: "bg-purple-100 text-purple-600",
    description: "Katalog produk lengkap",
  },
  {
    id: "company-profile",
    name: "Company Profile",
    docCount: 0,
    icon: <Briefcase className="w-7 h-7" />,
    iconBg: "bg-orange-100 text-orange-600",
    description: "Profil perusahaan resmi",
  },
  {
    id: "datasheet",
    name: "Datasheet",
    docCount: 0,
    icon: <FileText className="w-7 h-7" />,
    iconBg: "bg-pink-100 text-pink-600",
    description: "Lembar data teknis produk",
  },
  {
    id: "presentation-materials",
    name: "Presentation Materials",
    docCount: 0,
    icon: <Monitor className="w-7 h-7" />,
    iconBg: "bg-violet-100 text-violet-600",
    description: "Materi presentasi sales",
  },
  {
    id: "pricelist",
    name: "Pricelist",
    docCount: 0,
    icon: <Tag className="w-7 h-7" />,
    iconBg: "bg-emerald-100 text-emerald-600",
    description: "Daftar harga produk & jasa",
  },
  {
    id: "id-kit",
    name: "ID KIT",
    docCount: 0,
    icon: <Layers className="w-7 h-7" />,
    iconBg: "bg-rose-100 text-rose-600",
    description: "Identitas visual & kit brand",
  },
  {
    id: "tools",
    name: "Tools",
    docCount: 0,
    icon: <Wrench className="w-7 h-7" />,
    iconBg: "bg-cyan-100 text-cyan-600",
    description: "Alat bantu & template kerja",
  },
  {
    id: "certification",
    name: "Certification",
    docCount: 0,
    icon: <Award className="w-7 h-7" />,
    iconBg: "bg-yellow-100 text-yellow-600",
    description: "Sertifikat & akreditasi resmi",
  },
  {
    id: "legalitas",
    name: "Legalitas",
    docCount: 0,
    icon: <Shield className="w-7 h-7" />,
    iconBg: "bg-indigo-100 text-indigo-600",
    description: "Dokumen legal & perizinan",
  },
];

// ─── Helper Icon ─────────────────────────────────────────────────────────────────
const getCategoryIcon = (id: string) => {
  const map: Record<string, React.ReactNode> = {
    brochure: <BookOpen className="w-7 h-7" />,
    catalogue: <ShoppingBag className="w-7 h-7" />,
    "company-profile": <Briefcase className="w-7 h-7" />,
    datasheet: <FileText className="w-7 h-7" />,
    "presentation-materials": <Monitor className="w-7 h-7" />,
    pricelist: <Tag className="w-7 h-7" />,
    "id-kit": <Layers className="w-7 h-7" />,
    tools: <Wrench className="w-7 h-7" />,
    certification: <Award className="w-7 h-7" />,
    legalitas: <Shield className="w-7 h-7" />,
  };
  return map[id] || <Package className="w-7 h-7" />;
};

function CategoryCard({
  cat,
  onClick,
  isSuperAdmin,
  onToggleLock,
  onDelete,
}: {
  cat: Category;
  onClick: () => void;
  isSuperAdmin: boolean;
  onToggleLock?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const isLocked = cat.isLocked || false;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-[#1D80D9]/50 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Delete X button - top right corner, SUPERADMIN only */}
      {isSuperAdmin && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(cat.id);
          }}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-all duration-200 active:scale-90"
          title="Hapus kategori"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Top gradient accent */}
      <div
        className={`h-1.5 w-full rounded-t-2xl ${
          isLocked
            ? "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400"
            : "bg-gradient-to-r from-[#1D80D9] via-[#3B9AE8] to-[#1769B5]"
        }`}
      />

      <div className="flex flex-col gap-4 p-5 sm:p-6 flex-1">
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${cat.iconBg} group-hover:scale-105 transition-transform duration-200 shadow-2xs`}
        >
          {cat.icon || getCategoryIcon(cat.id)}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-base leading-tight flex items-center gap-2 group-hover:text-[#1D80D9] transition-colors">
            {cat.name}
            {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
          <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Package className="w-3.5 h-3.5 text-[#1D80D9]" />
            <span>{cat.docCount} Dokumen</span>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {isSuperAdmin && onToggleLock ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(cat.id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition-all active:scale-95 ${
                isLocked
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
              title={isLocked ? "Klik untuk membuka kunci kategori" : "Klik untuk mengunci kategori"}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3 h-3" /> Terkunci
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" /> Terbuka
                </>
              )}
            </button>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${
                isLocked
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3 h-3" /> Terkunci
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" /> Terbuka
                </>
              )}
            </span>
          )}

          <span className="flex items-center gap-1 text-xs font-bold text-[#1D80D9] group-hover:gap-1.5 transition-all">
            Lihat semua
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProdukPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>(ALL_CATEGORIES);
  const [isClient, setIsClient] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    setIsClient(true);
    fetch("/api/produk/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCategory = {
      id,
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      iconBg: "bg-[#1D80D9]/10 text-[#1D80D9]",
    };

    try {
      const res = await fetch("/api/produk/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories((prev) => [...prev, data.category]);
        setShowAddModal(false);
        setNewCatName("");
        setNewCatDesc("");
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menambahkan kategori");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan");
    }
  };

  const handleToggleCategoryLock = async (id: string) => {
    const targetCat = categories.find((c) => c.id === id);
    if (!targetCat) return;
    const nextLocked = !targetCat.isLocked;

    try {
      const res = await fetch(`/api/produk/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: nextLocked }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isLocked: nextLocked } : c))
        );
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengubah status kunci kategori");
      }
    } catch (error) {
      console.error("Error updating category lock status:", error);
      alert("Terjadi kesalahan saat mengubah status kategori");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCatId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/produk/categories/${deletingCatId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== deletingCatId));
        setShowDeleteModal(false);
        setDeletingCatId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menghapus kategori");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Terjadi kesalahan saat menghapus kategori");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteCategory = (id: string) => {
    setDeletingCatId(id);
    setShowDeleteModal(true);
  };

  const isSalesOrLeader = user?.role === "SALES" || user?.role === "LEADER";

  // Filter categories by role, lock status & search
  const visibleCategories = categories.filter((cat) => {
    if (isSalesOrLeader && cat.isLocked) return false;
    if (search.trim()) {
      return cat.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Guard: wait for session
  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/");
  }, [sessionLoading, user, router]);

  if (sessionLoading || !isClient) {
    return (
      <div className="min-h-screen bg-blue-50 grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#1D80D9] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#1D80D9] uppercase tracking-widest animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 text-slate-800 pb-16">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1520px] mx-auto">
        <main className="w-full">
          {/* ── Header ── */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
            <div>
              <h1 className="text-3xl font-extrabold text-black drop-shadow-sm uppercase">
                PRODUCT HUB
              </h1>
              <p className="text-sm text-neutral-600 font-medium mt-1">
                Pusat Dokumen & Materi Produk MabelHub
              </p>
            </div>

            {/* Actions & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {isSuperAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#1D80D9] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#1769B5] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kategori
                </button>
              )}
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kategori dokumen..."
                  className="h-11 w-full rounded-xl bg-white pl-11 pr-5 text-sm outline-none border border-slate-200 focus:border-[#1D80D9] focus:ring-2 focus:ring-[#1D80D9]/20 transition shadow-2xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* ── Stats Bar ── */}
          <div className="mb-6 flex flex-wrap gap-3 px-1">
            <div className="bg-white rounded-xl px-5 py-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1D80D9]/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#1D80D9]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Kategori</p>
                <p className="text-lg font-extrabold text-slate-900">{visibleCategories.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl px-5 py-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Dokumen</p>
                <p className="text-lg font-extrabold text-slate-900">
                  {visibleCategories.reduce((s, c) => s + c.docCount, 0)}
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="bg-white rounded-xl px-5 py-3 border border-amber-200/80 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">SuperAdmin</p>
                  <p className="text-lg font-extrabold text-amber-700">Akses Penuh</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Section: Kategori Dokumen ── */}
          {visibleCategories.length > 0 && (
            <section className="mb-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    isSuperAdmin={isSuperAdmin}
                    onClick={() => router.push(`/produk/${cat.id}`)}
                    onToggleLock={handleToggleCategoryLock}
                    onDelete={confirmDeleteCategory}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Empty state ── */}
          {visibleCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-semibold">
                Tidak ada kategori yang sesuai dengan pencarian.
              </p>
            </div>
          )}

          {/* ── Modal Tambah Kategori ── */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-900">
                    Tambah Kategori Baru
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Nama Kategori
                    </label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Contoh: Proposal Tender"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:border-[#1D80D9] focus:ring-2 focus:ring-[#1D80D9]/20 text-sm font-medium transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Deskripsi
                    </label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Penjelasan singkat mengenai kategori ini"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none focus:border-[#1D80D9] focus:ring-2 focus:ring-[#1D80D9]/20 text-sm font-medium transition"
                    />
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCatName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-[#1D80D9] text-white text-sm font-bold shadow-sm hover:bg-[#1769B5] disabled:opacity-50 transition cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal Hapus Kategori ── */}
          {showDeleteModal && deletingCatId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Hapus Kategori
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCatId(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-700">
                    Apakah Anda yakin ingin menghapus kategori{" "}
                    <strong className="text-slate-900">
                      {categories.find((c) => c.id === deletingCatId)?.name}
                    </strong>
                    ?
                  </p>
                  <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200/60">
                    <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Semua dokumen dalam kategori ini juga akan dihapus secara permanen.
                    </p>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCatId(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition cursor-pointer"
                    disabled={isDeleting}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDeleteCategory}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Hapus Kategori
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
