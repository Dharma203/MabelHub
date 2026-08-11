'use client'

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/components/session/SessionProvider";
import { ChevronRight, ArrowLeft, Building } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmModal from "@/components/modals/ConfirmModal";

// --- Types ---

type Company = {
  _id: string;
  institusiKerja: string;
  kota: string;
  klpd: string;
  satuanKerja: string;
  ring?: string;
  pic_default?: {
    nama?: string;
    no_telp?: string;
    jabatan?: string;
    role?: string;
  };
};

type SatuanKerja = {
  _id: string
  satuanKerja: string
  kota: string
  klpd: string
  ring? : string;
  pic_default?: {
    nama?: string
    no_telp?: string
    jabatan?: string
    role?: string
  }
}

type PlanItem = {
  id: string; // local id for rendering
  ring: string;
  institusiQuery: string;
  selectedCompany: Company | null;
  kota: string;
  klpd: string;
  satuanKerja: string;
  selectedSatker: SatuanKerja | null;
  pic_default: {
    nama: string;
    no_telp: string;
    jabatan: string;
    role: string;
  };
  targetUserId?: string; // leader assigns to specific sales
  showSug: boolean;
  loadingSug: boolean;
  sugs: Company[];
  showSatkerSug: boolean;
  loadingSatkerSug: boolean;
  satkerSugs: SatuanKerja[];
};

type AssigneeOption = {
  userId: string;
  fullName?: string;
  username?: string;
  role?: string;
};

// --- Helpers ---

function displayAssignee(a: AssigneeOption) {
  const name = (a.fullName || "").trim() || (a.username || "").trim() || a.userId;
  const role = (a.role || "").trim();
  return role ? `${name} • ${role}` : name;
}

function pickArray(json: Record<string, unknown> | unknown[]) {
  const j = json as any;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.users)) return j.users;
  if (Array.isArray(j?.members)) return j.members;
  if (Array.isArray(j)) return j;
  return [];
}

function newItem(): PlanItem {
  return {
    id: crypto.randomUUID(),
    ring: '',
    institusiQuery: '',
    selectedCompany: null,
    kota: '',
    klpd: '',
    satuanKerja: '',
    selectedSatker: null,
    pic_default: { nama: "", no_telp: "", jabatan: "", role: "" },
    targetUserId: '',
    showSug: false,
    loadingSug: false,
    sugs: [],
    showSatkerSug: false,
    loadingSatkerSug: false,
    satkerSugs: [],
  };
}

// --- Main Content Component ---

function AddPlansContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const editId = sp.get("edit"); // Not yet handled for multi-edit
  const { user, loading: sessionLoading } = useSession();

  const [tanggal, setTanggal] = useState("");
  const [items, setItems] = useState<PlanItem[]>([newItem()]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Parameter master list (Rings)
  const [paramRing, setParamRing] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/parameters-baru")
      .then((res) => res.json())
      .then((json) => {
        const d = json?.data;
        if (d) setParamRing(d.ring || []);
      })
      .catch(() => { });
  }, []);

  // Guard & Access Control
  useEffect(() => {
    if (!sessionLoading && user) {
      const ok =
        user.role === 'SALES' ||
        user.role === 'LEADER' ||
        user.role === 'ADMIN' ||
        user.role === 'SUPERADMIN';
      if (!ok) router.replace('/');
    }
  }, [sessionLoading, user, router]);

  // Assignee Logic for Leader/Admin
  const canPickAssignee = useMemo(() => {
    return user?.role === "LEADER" || user?.role === "SUPERADMIN" || user?.role === "ADMIN";
  }, [user?.role]);

  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
  const [assigneeUserId, setAssigneeUserId] = useState<string>(""); // Global assignee for all items in this bulk save

  useEffect(() => {
    if (sessionLoading || !user || !canPickAssignee) return;

    (async () => {
      try {
        if (user.role === "LEADER") {
          const res = await fetch("/api/teams/me/members", { cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          const arr = pickArray(json);

          const list: AssigneeOption[] = arr
            .map((m: Record<string, unknown>) => {
              const member = m as any;
              return {
                userId: String(member.userId || member._id || ""),
                fullName: member.fullName ? String(member.fullName) : "",
                username: member.username ? String(member.username) : "",
                role: member.role ? String(member.role) : "SALES",
              };
            })
            .filter((x: AssigneeOption) => x.userId);

          setAssigneeOptions(list);
        } else if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
          const res = await fetch("/api/users", { cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          const arr = pickArray(json);

          const list: AssigneeOption[] = arr
            .map((u: Record<string, unknown>) => {
              const userObj = u as any;
              return {
                userId: String(userObj._id || userObj.userId || ""),
                fullName: userObj.fullName ? String(userObj.fullName) : "",
                username: userObj.username ? String(userObj.username) : "",
                role: userObj.role ? String(userObj.role) : "",
              };
            })
            .filter((x: AssigneeOption) => x.userId && (x.role === "SALES" || x.role === "LEADER"));

          setAssigneeOptions(list);
        }
      } catch {
        setAssigneeOptions([]);
      }
    })();
  }, [sessionLoading, user, canPickAssignee]);

  // Handlers
  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function patchItem(id: string, updates: Partial<PlanItem>) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...updates } : x)),
    );
  }

  function resetCompanyFields(id: string) {
    patchItem(id, {
      selectedCompany: null,
      institusiQuery: '',
      sugs: [],
      showSug: false,
      kota: "",
      klpd: "",
      satuanKerja: "",
      selectedSatker: null,
      satkerSugs: [],
      showSatkerSug: false,
      pic_default: { nama: "", no_telp: "", jabatan: "", role: "" },
    });
  }
  function pickCompany(id: string, c: Company) {
    console.log(c)
    patchItem(id, {
      selectedCompany: c,
      institusiQuery: c.institusiKerja || '',
      showSug: false,
      kota: c.kota || '',
      klpd: c.klpd || '',
      satuanKerja: '',
      selectedSatker: null,
      satkerSugs: [],
      showSatkerSug: false,
      pic_default: { nama: '', no_telp: '', jabatan: '', role: '' },
    });
  }
  function pickSatker(id: string, c: SatuanKerja) {
    patchItem(id, {
      selectedSatker: c,
      satuanKerja: c.satuanKerja || '',
      showSatkerSug: false,
      pic_default: {
        nama: c.pic_default?.nama || '',
        no_telp: c.pic_default?.no_telp || '',
        jabatan: c.pic_default?.jabatan || '',
        role: c.pic_default?.role || '',
      },
    });
  }

  async function fetchSuggestion(itemId: string, ring: string, q: string) {
    if (!ring) return;

    try {
      patchItem(itemId, { loadingSug: true, showSug: true });

      const qs = new URLSearchParams({
        ring,
        q: q || "",
        limit: "10",
      });

      const res = await fetch(`/api/companies/suggest?${qs.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        patchItem(itemId, { sugs: [], loadingSug: false });
        return;
      }

      const data = await res.json().catch(() => ({}));
      patchItem(itemId, {
        sugs: (data?.items ?? []) as Company[],
        loadingSug: false,
      });
    } catch {
      patchItem(itemId, { sugs: [], loadingSug: false });
    }
  }

  async function fetchSatkerSuggestion(itemId: string, ring: string, institusi: string, q: string) {
    if (!ring || !institusi) return;

    try {
      patchItem(itemId, { loadingSatkerSug: true, showSatkerSug: true });

      const qs = new URLSearchParams({
        ring,
        institusi,
        q: q || "",
        limit: "10",
      });

      const res = await fetch(`/api/companies/suggest-satker?${qs.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        patchItem(itemId, { satkerSugs: [], loadingSatkerSug: false });
        return;
      }

      const data = await res.json().catch(() => ({}));
      patchItem(itemId, {
        satkerSugs: (data?.items ?? []) as SatuanKerja[],
        loadingSatkerSug: false,
      });
    } catch {
      patchItem(itemId, { satkerSugs: [], loadingSatkerSug: false });
    }
  }

  const canSubmit = useMemo(() => {
    if (!tanggal) return false;
    if (!items.length) return false;
    return items.every((it) => it.ring && it.institusiQuery.trim());
  }, [tanggal, items]);

  async function submitAll() {
    if (!canSubmit) {
      alert("Tanggal wajib, dan setiap rencana wajib punya Ring + Institusi.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tanggal,
        createdBy: user?.userId || null,
        nama_sales: user?.fullName || null,
        items: items.map((it) => ({
          ring: it.ring,
          institusiKerja: it.institusiQuery,
          kota: it.kota,
          klpd: it.klpd,
          satuanKerja: it.satuanKerja,
          pic_default: it.pic_default,
          company_id: it.selectedCompany?._id || null,
          // If global assignee is set, use it; otherwise backend might default to creator
          targetUserId: canPickAssignee ? (assigneeUserId || null) : null,
        })),
      };

      const res = await fetch('/api/visits/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json?.error || "Gagal menyimpan rencana.");
        return;
      }

      alert(`Rencana berhasil disimpan (${json?.insertedCount ?? 0} item).`);
      router.push('/plan-activity');
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSaving(false);
    }
  }

  // --- UI ---

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-6'>
          <main className='w-full max-w-none'>
            {/* BREADCRUMB */}
            <nav className="mb-4 flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm font-medium text-gray-500">
                <li>
                  <button
                    onClick={() => router.push("/plan-activity")}
                    className="hover:text-blue-600 transition-colors"
                  >
                    Plan Activity
                  </button>
                </li>
                <li>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </li>
                <li aria-current="page">
                  <span className="text-black font-extrabold">
                    {editId ? "Edit Plans" : "Add Plans"}
                  </span>
                </li>
              </ol>
            </nav>

            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4 rounded-t-2xl">
                <button
                  onClick={() => router.push("/plan-activity")}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700 transition"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-extrabold tracking-wide text-black uppercase">
                    {editId ? "EDIT PLANS" : "ADD PLANS"}
                  </h1>
                  <p className="text-xs text-black/60 font-medium mt-0.5">
                    {editId ? "Ubah detail rencana aktivitas." : "Buat rencana aktivitas baru (bulk)."}
                  </p>
                </div>
              </div>

              {user?.role === 'SALES' && (
                <button
                  type="button"
                  onClick={() => router.push("/tambah-instansi")}
                  className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm ring-1 ring-blue-200 hover:bg-blue-600 hover:ring-blue-300 transition-all flex items-center gap-2"
                >
                  <Building className="w-4 h-4" />
                  REGISTER INSTANSI
                </button>
              )}
            </div>

            {/* TANGGAL & GLOBAL ASSIGNEE */}
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                    Tanggal <span className="text-gray-400 lowercase font-normal">(Berlaku untuk semua)</span>
                  </label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker();
                      }
                    }}
                    className="mt-2 block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all cursor-pointer"
                  />
                </div>

                {canPickAssignee && (
                  <div>
                    <label className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                      Assign To <span className="text-gray-400 lowercase font-normal">(Opsional)</span>
                    </label>
                    <SearchableSelect
                      value={assigneeUserId}
                      onChange={(val: string) => setAssigneeUserId(val)}
                      options={[
                        { value: "", label: "(Diri sendiri)" },
                        ...assigneeOptions.map((a) => ({
                          value: a.userId,
                          label: displayAssignee(a),
                        })),
                      ]}
                      placeholder="Pilih Sales/Assignee..."
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PLAN ITEMS LIST */}
            <div className="space-y-6">
              {items.map((it, idx) => (
                <div key={it.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 relative group">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs ring-4 ring-white">
                        {idx + 1}
                      </div>
                      <h3 className="font-extrabold text-sm text-gray-900 tracking-wide">DETAIL RENCANA</h3>
                    </div>

                    {items.length > 1 && (
                      <button
                        type='button'
                        onClick={() => removeItem(it.id)}
                        className="flex items-center gap-1.5 rounded-lg text-red-500 px-3 py-1.5 text-xs font-bold ring-1 ring-red-200 hover:bg-red-50 hover:ring-red-300 transition-colors"
                      >
                        HAPUS
                      </button>
                    )}
                  </div>

                  <div className="p-6 grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-2">
                    {/* RING SELECTION */}
                    <div>
                      <label className="text-xs font-bold tracking-wide text-gray-500 uppercase">Status Ring</label>
                      <SearchableSelect
                        value={it.ring}
                        onChange={(val: string) => {
                          patchItem(it.id, { ring: val });
                          resetCompanyFields(it.id);
                        }}
                        options={paramRing.map((opt) => ({ value: opt, label: opt }))}
                        placeholder="Pilih Status Ring..."
                        className="mt-2"
                      />
                    </div>

                    <div className="hidden md:block" />

                    {/* INSTITUSI AUTOCOMPLETE */}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                        Institusi <span className="text-gray-400 lowercase font-normal">(Sesuai Ring)</span>
                      </label>

                      <div className="relative mt-2">
                        <input
                          value={it.institusiQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            patchItem(it.id, { institusiQuery: val, showSug: true });
                            if (it.ring) fetchSuggestion(it.id, it.ring, val);
                          }}
                          onFocus={() => {
                            if (it.ring) fetchSuggestion(it.id, it.ring, it.institusiQuery);
                          }}
                          disabled={!it.ring}
                          placeholder={!it.ring ? "Pilih Ring dahulu" : "Ketik untuk mencari institusi..."}
                          className={`relative w-full rounded-lg border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset sm:text-sm sm:leading-6 transition-all ${!it.ring ? "bg-gray-50 text-gray-500 ring-gray-200 cursor-not-allowed" : "bg-white text-gray-900 ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
                            }`}
                        />

                        {it.showSug && it.ring && (
                          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-100">
                            <div className="max-h-60 overflow-y-auto">
                              {it.loadingSug ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading...</div>
                              ) : it.sugs.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">Tidak ada data ditemukan.</div>
                              ) : (
                                it.sugs.map((c) => (
                                  <button
                                    key={c._id}
                                    type="button"
                                    onClick={() => pickCompany(it.id, c)}
                                    className="block w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-none"
                                  >
                                    <div className="font-bold text-sm text-gray-900">{c.institusiKerja}</div>
                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                      {c.kota} • {c.klpd} • {c.satuanKerja}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end">
                              <button
                                onClick={() => patchItem(it.id, { showSug: false })}
                                className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                              >
                                Tutup
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AUTOFILL FIELDS */}
                    <div>
                      <label className="text-xs font-bold tracking-wide text-gray-400 uppercase">Kota/Kabupaten</label>
                      <input
                        value={it.kota}
                        readOnly
                        className="mt-2 block w-full rounded-lg bg-gray-50 border-0 py-2.5 px-4 text-gray-500 shadow-sm ring-1 ring-gray-200 sm:text-sm cursor-not-allowed"
                        placeholder="Terisi otomatis"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold tracking-wide text-gray-400 uppercase">KLPD</label>
                      <input
                        value={it.klpd}
                        readOnly
                        className="mt-2 block w-full rounded-lg bg-gray-50 border-0 py-2.5 px-4 text-gray-500 shadow-sm ring-1 ring-gray-200 sm:text-sm cursor-not-allowed"
                        placeholder="Terisi otomatis"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold tracking-wide text-gray-400 uppercase">Satuan Kerja</label>
                      <div className="relative mt-2">
                        <input
                          value={it.satuanKerja}
                          onChange={(e) => {
                            const val = e.target.value;
                            patchItem(it.id, { satuanKerja: val, showSatkerSug: true });
                            if (it.ring && it.institusiQuery) fetchSatkerSuggestion(it.id, it.ring, it.institusiQuery, val);
                          }}
                          onFocus={() => {
                            if (it.ring && it.institusiQuery) fetchSatkerSuggestion(it.id, it.ring, it.institusiQuery, it.satuanKerja);
                          }}
                          disabled={!it.institusiQuery}
                          placeholder={!it.institusiQuery ? "Pilih Institusi dahulu" : "Ketik untuk mencari satuan kerja..."}
                          className={`relative w-full rounded-lg border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset sm:text-sm sm:leading-6 transition-all ${!it.institusiQuery ? "bg-gray-50 text-gray-500 ring-gray-200 cursor-not-allowed" : "bg-white text-gray-900 ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
                            }`}
                        />

                        {it.showSatkerSug && it.institusiQuery && (
                          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-100">
                            <div className="max-h-60 overflow-y-auto">
                              {it.loadingSatkerSug ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading...</div>
                              ) : it.satkerSugs.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">Tidak ada data ditemukan.</div>
                              ) : (
                                it.satkerSugs.map((c) => (
                                  <button
                                    key={c._id}
                                    type="button"
                                    onClick={() => pickSatker(it.id, c)}
                                    className="block w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-none"
                                  >
                                    <div className="font-bold text-sm text-gray-900">{c.satuanKerja}</div>
                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                      {c.kota} • {c.klpd} • {c.ring}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end">
                              <button
                                onClick={() => patchItem(it.id, { showSatkerSug: false })}
                                className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                              >
                                Tutup
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 pb-12 border-t border-gray-200 pt-8">
              <button
                type='button'
                onClick={addItem}
                className="w-full md:w-auto flex items-center justify-center gap-2 h-11 rounded-xl bg-white px-6 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 transition-all active:scale-95"
              >
                + TAMBAH RENCANA LAIN
              </button>

              <button
                type='button'
                onClick={submitAll}
                disabled={!canSubmit || saving}
                className={`w-full md:w-56 flex items-center justify-center gap-2 h-11 rounded-xl px-8 text-sm font-extrabold text-white shadow-md transition-all active:scale-95
                  ${!canSubmit || saving ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"}`}
              >
                {saving ? "MENYIMPAN..." : "SIMPAN SEMUA RENCANA"}
              </button>
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus baris rencana ini?"
        confirmText="HAPUS"
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            removeItem(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

// --- Page Wrapper with Suspense ---

export default function AddPlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center bg-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-blue-900 animate-pulse text-center uppercase tracking-widest">Loading Page...</p>
        </div>
      </div>
    }>
      <AddPlansContent />
    </Suspense>
  );
}
