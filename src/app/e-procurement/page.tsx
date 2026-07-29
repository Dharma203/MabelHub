'use client'

import React, { useMemo, useState, useEffect } from "react";

import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";
import SearchableSelect from "@/components/ui/SearchableSelect";

type ToastProps = {
  message: string
  duration?: number;
  onDone?: () => void;
}

type TeamMember = {
  userId: string;
  fullName: string;
  username: string;
  role: string;
};

type ProductItem = {
  id: string;
  merek: string;
  subKategori: string;
  qty: number;
  spesifikasi: string;
  paguPerItem: number | "";
  hargaTayang: number | "";
  linkInaproc: string;
  linkEcom: string;
};

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function pickArray(json: any) {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.users)) return json.users;
  if (Array.isArray(json?.members)) return json.members;
  if (Array.isArray(json)) return json;
  return [];
}

function displayName(m: {
  fullName?: string;
  username?: string;
  userId: string;
  role?: string;
}) {
  const name =
    (m.fullName || "").trim() || (m.username || "").trim() || m.userId;
  return m.role ? `${name} • ${m.role}` : name;
}

async function apiCreateEProc(payload: any) {
  const res = await fetch("/api/e-procurement/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal kirim request");
  return json?.data;
}

async function apiLoadEProc(requestId: string) {
  const res = await fetch(
    `/api/e-procurement/requests/${encodeURIComponent(requestId)}`,
    { cache: "no-store" },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal load request");
  return json?.data;
}

async function apiUpdateEProc(requestId: string, payload: any) {
  const res = await fetch(
    `/api/e-procurement/requests/${encodeURIComponent(requestId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal update request");
  return json?.data;
}

export function Toast({ message, duration = 2500, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300); // tunggu animasi fade selesai
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl
        bg-green-600 text-white text-sm font-semibold
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <span className="text-lg">✓</span>
      {message}
    </div>
  );
}

export default function EProcurementRequestPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // ✅ assignee options (team members or all users)
  const [assigneeOptions, setAssigneeOptions] = useState<TeamMember[]>([]);
  const [assignedToUserId, setAssignedToUserId] = useState(""); // "" = self
  const [statusAkhir, setStatusAkhir] = useState("");
  const [statusUsulan, setStatusUsulan] = useState("");
  const [requestor, setRequestor] = useState("");
  const [pemohon, setPemohon] = useState("");
  const [segmen, setSegmen] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  const deadlineWarning = useMemo(() => {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dlDate = new Date(deadline);
    dlDate.setHours(0, 0, 0, 0);
    if (isNaN(dlDate.getTime())) return null;
    const diffTime = dlDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 3) {
      return "Deadline usulan minimal 3 hari dari hari ini.";
    }
    return null;
  }, [deadline]);
  const [lokasi, setLokasi] = useState<string[]>([]);
  const [entity, setEntity] = useState<string[]>([]);
  const [produk, setProduk] = useState<string[]>([]);
  const [catatanHeader, setCatatanHeader] = useState("");

  // Parameter API
  const [paramLokasi, setParamLokasi] = useState<string[]>([]);
  const [paramRing, setParamRing] = useState<string[]>([]);
  const [paramSegmen, setParamSegmen] = useState<string[]>([]);
  const [paramEntity, setParamEntity] = useState<string[]>([]);
  const [paramSubKategori, setParamSubKategori] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/parameters")
      .then((res) => res.json())
      .then((json) => {
        const d = json?.data;
        if (d) {
          setParamRing(d.ring || []);
          setParamSegmen(d.segmen || []);
          setParamLokasi(d.kota_kabupaten || []);
          setParamEntity(d.entity || []);
          setParamSubKategori(d.sub_kategori || []);
        }
      })
      .catch(() => { });
  }, []);

  const [selectedRing, setSelectedRing] = useState("");

  const availableSegmen = useMemo(() => {
    if (!selectedRing) return [];
    return paramSegmen
      .filter((s) => s.startsWith(selectedRing + "::"))
      .map((s) => s.split("::")[1]);
  }, [selectedRing, paramSegmen]);

  // ===== ID info (footer) =====
  const [infoId, setInfoId] = useState('REQ-')

  // ===== Products state =====
  const [items, setItems] = useState<ProductItem[]>([
    {
      id: '1',
      merek: '',
      subKategori: '',
      qty: 1,
      spesifikasi: "",
      paguPerItem: "",
      hargaTayang: "",
      linkInaproc: "",
      linkEcom: "",
    },
  ])

  const totalProduk = useMemo(() => items.length, [items])

  // ===== Modal state =====
  const [openRevisi, setOpenRevisi] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [revisiId, setRevisiId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canPickAssignee =
    user?.role === "LEADER" ||
    user?.role === "SUPERADMIN" ||
    user?.role === "ADMIN";

  // Prefill requestor untuk non-leader/superadmin (dan tetap bisa edit manual)
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    const myName =
      (user.fullName || "").trim() || (user.username || "").trim() || "";
    setRequestor((prev) => prev || myName);
  }, [sessionLoading, user]);

  // ✅ Load options sesuai role
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        // SALES: no dropdown
        if (user.role === "SALES") {
          setAssigneeOptions([]);
          setAssignedToUserId("");
          return;
        }

        // LEADER: team members (sales)
        if (user.role === "LEADER") {
          const res = await fetch("/api/teams/me/members", {
            cache: "no-store",
          });
          const j = await res.json().catch(() => ({}));
          const arr = pickArray(j);

          const sales = arr
            .map((m: any) => ({
              userId: String(m.userId || m._id || ""),
              fullName: m.fullName ? String(m.fullName) : "",
              username: m.username ? String(m.username) : "",
              role: String(m.role || "SALES"),
            }))
            .filter((m: TeamMember) => m.userId && m.role === "SALES");

          setAssigneeOptions(sales);
          setAssignedToUserId(""); // default self
          return;
        }

        // SUPERADMIN/ADMIN: all sales + leader
        if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
          const res = await fetch("/api/users", { cache: "no-store" });
          const j = await res.json().catch(() => ({}));
          const arr = pickArray(j);

          const list: TeamMember[] = arr
            .map((u: any) => ({
              userId: String(u._id || u.userId || ""),
              fullName: u.fullName ? String(u.fullName) : "",
              username: u.username ? String(u.username) : "",
              role: String(u.role || ""),
            }))
            .filter(
              (m: TeamMember) =>
                m.userId && (m.role === "SALES" || m.role === "LEADER"),
            );

          setAssigneeOptions(list);
          setAssignedToUserId(""); // default self
          return;
        }

        setAssigneeOptions([]);
        setAssignedToUserId("");
      } catch {
        setAssigneeOptions([]);
        setAssignedToUserId("");
      }
    })();
  }, [user]);

  // ✅ kalau assignee berubah: set requestor otomatis (biar dokumen kebaca)
  useEffect(() => {
    if (!user) return;
    if (!canPickAssignee) return;

    const myName =
      (user.fullName || "").trim() || (user.username || "").trim() || "";

    if (!assignedToUserId) {
      // self
      setRequestor(myName);
      return;
    }

    const picked = assigneeOptions.find((x) => x.userId === assignedToUserId);
    if (picked)
      setRequestor((picked.fullName || picked.username || "").trim() || myName);
  }, [assignedToUserId, assigneeOptions, user, canPickAssignee]);

  const addItem = () => {
    const defaultId = String(
      Date.now() + Math.random().toString(36).substr(2, 5),
    );
    setItems((prev) => [
      ...prev,
      {
        id: defaultId,
        merek: "",
        subKategori: "",
        qty: 1,
        spesifikasi: "",
        paguPerItem: 0,
        hargaTayang: 0,
        linkInaproc: "",
        linkEcom: "",
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const updateItem = <K extends keyof ProductItem>(
    id: string,
    key: K,
    value: ProductItem[K],
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)),
    )
  }

  const closeModal = () => {
    setOpenRevisi(false)
    setOpenUpload(false)
  }

  const handleRevisi = () => setOpenRevisi(true)
  const handleUploadProduk = () => setOpenUpload(true)

  const handleLoadId = async () => {
    try {
      if (!revisiId.trim()) return alert("Masukkan Request ID");
      const data = await apiLoadEProc(revisiId.trim());

      setStatusAkhir(data.statusAkhir ?? data.statusAkhir ?? "");
      setStatusUsulan(data.statusUsulan ?? data.statusUsulan ?? "");
      setRequestor(data.header?.requestor ?? data.requestor ?? "");
      setPemohon(data.header?.pemohon ?? data.pemohon ?? "");
      setSegmen((data.header?.segmen ?? data.segmen ?? "") as string);
      setDeadline(
        data.header?.deadlineUsulan ??
        data.deadlineUsulan ??
        data.header?.deadline ??
        "",
      );
      setLokasi(data.header?.lokasi ?? data.lokasi ?? "");
      setCatatanHeader(data.header?.catatanHeader ?? data.catatan ?? "");

      setItems(
        Array.isArray(data.items) && data.items.length ? data.items : items,
      );

      setInfoId(data.infoId ?? data.requestId ?? "REQ-");
      setOpenRevisi(false);
    } catch (e: any) {
      alert(e?.message ?? "Gagal load");
    }
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setUploadFile(f)
  }

  const handleSubmitUpload = () => {
    if (!uploadFile) {
      alert("Pilih file Excel terlebih dahulu");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const rows = jsonData.slice(1); // Lewati header di baris pertama

        const newItems: ProductItem[] = rows
          .map((row, index) => ({
            id: String(Date.now() + index),
            merek: row[0] ? String(row[0]).trim() : "",
            subKategori: row[1] ? String(row[1]).trim() : "",
            qty:
              row[2] && !isNaN(Number(row[2]))
                ? Math.max(1, Number(row[2]))
                : 1,
            spesifikasi: row[3] ? String(row[3]).trim() : "",
            paguPerItem: row[4] && !isNaN(Number(row[4])) ? Number(row[4]) : 0,
            hargaTayang: row[5] && !isNaN(Number(row[5])) ? Number(row[5]) : 0,
            linkInaproc: row[6] ? String(row[6]).trim() : "",
            linkEcom: row[7] ? String(row[7]).trim() : "",
          }))
          .filter((item) => item.merek || item.subKategori || item.spesifikasi); // Abaikan baris kosong

        if (newItems.length > 0) {
          setItems(newItems);
          alert(`Berhasil memuat ${newItems.length} produk dari Excel`);
          setOpenUpload(false);
          setUploadFile(null); // Reset file yang dipilih setelah berhasil upload
        } else {
          alert("Data Excel kosong atau tidak sesuai dengan format template.");
        }
      } catch (err) {
        console.error("Excel parse error:", err);
        alert(
          "Terjadi kesalahan saat membaca file Excel. Pastikan file tidak rusak dan sesuai template.",
        );
      }
    };
    reader.readAsBinaryString(uploadFile);
  };

  const handleKirim = async () => {
    if (!deadline) {
      alert("Deadline usulan wajib diisi!");
      return;
    }
    if (deadlineWarning) {
      alert(deadlineWarning);
      return;
    }

    // Validasi kelengkapan data produk
    const hasActiveItem = items.some((it) => it.qty > 0);
    if (!hasActiveItem) {
      alert("Minimal harus ada 1 produk.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.qty > 0) {
        if (
          !String(it.merek).trim() ||
          !String(it.subKategori).trim() ||
          !it.qty ||
          !String(it.spesifikasi).trim() ||
          it.paguPerItem === "" ||
          it.hargaTayang === "" ||
          !String(it.linkInaproc).trim() ||
          !String(it.linkEcom).trim()
        ) {
          alert(`Data produk ke-${i + 1} belum lengkap. Harap isi semua kolom (Merek, SubKategori, Qty, Spesifikasi, Pagu, Harga, Link Inaproc, Link Ecom).`);
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        header: {
          requestor,
          pemohon: entity[0] || "",
          segmen,
          deadline,
          lokasi: lokasi[0] || "",
          catatanHeader,
          assignedToUserId: canPickAssignee ? assignedToUserId : "",
        },
        items,
      };

      if (infoId && infoId !== "REQ-") {
        await apiUpdateEProc(infoId, payload);
        setToast("Request berhasil diperbarui!");

      } else {
        const created = await apiCreateEProc(payload);
        setToast(`Request berhasil diajukan! REQ ID: ${created.infoId}`);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      alert(e?.message ?? "Gagal kirim");
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">


        <div className="flex-1 p-6 ">
          <div className="px-3 pt-2 pb-2">
            <h1 className="text-3xl font-extrabold pl-4 text-black drop-shadow-sm">
              E-PROCUREMENT
            </h1>
            <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
              Ajukan Request dan Kelola Permintaan Pengadaan.
            </div>
            <div className="w-full px-6 py-3"></div>
          </div>

          <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className='text-sm font-semibold text-blue-600'>
                  REQUESTOR
                </label>

                <div className="relative mt-2">
                  {canPickAssignee ? (
                    <SearchableSelect
                      value={assignedToUserId}
                      onChange={(val: string) => setAssignedToUserId(val)}
                      options={[
                        { value: "", label: "(Diri sendiri)" },
                        ...assigneeOptions.map((m) => ({
                          value: m.userId,
                          label: displayName(m),
                        })),
                      ]}
                      className="border-0 bg-white"
                      placeholder="Pilih Assignee..."
                    />
                  ) : (
                    // SALES: requestor tampil auto (boleh edit manual kalau mau)
                    <input
                      value={requestor}
                      onChange={(e) => setRequestor(e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Nama requestor"
                    />
                  )}
                </div>

                {canPickAssignee ? (
                  <div className="mt-2 text-xs text-gray-600">
                    Leader: bisa assign ke sales team atau diri sendiri.
                    Superadmin/Admin: semua sales/leader.
                  </div>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-semibold text-blue-600'>
                  PEMOHON (ENTITY)
                </label>
                <SearchableSelect
                  value={entity[0] || ""}
                  onChange={(val: string) => setEntity([val])}
                  options={[
                    { value: "", label: "-- Pilih Entity --" },
                    ...paramEntity.map((l) => ({ value: l, label: l })),
                  ]}
                  className="mt-1 border-0 bg-white"
                  placeholder="Pilih Entity..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-blue-600">
                    PILIH RING
                  </label>
                  <div className="relative mt-2">
                    <SearchableSelect
                      value={selectedRing}
                      onChange={(val: string) => {
                        setSelectedRing(val);
                        setSegmen("");
                      }}
                      options={[
                        { value: "", label: "-- Pilih --" },
                        ...paramRing.map((r) => ({ value: r, label: r })),
                      ]}
                      className="border-0 bg-white"
                      placeholder="Pilih Ring..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-blue-600">
                    SEGMEN
                  </label>
                  <div className="relative mt-2">
                    <SearchableSelect
                      value={segmen}
                      onChange={(val: string) => setSegmen(val)}
                      isDisabled={!selectedRing}
                      options={[
                        { value: "", label: "-- Pilih --" },
                        ...availableSegmen.map((s) => ({
                          value: `${selectedRing}::${s}`,
                          label: s,
                        })),
                      ]}
                      className="border-0 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      placeholder="Pilih Segmen..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className='text-sm font-semibold text-blue-600'>
                  DEADLINE USULAN
                </label>
                <div className='relative mt-2'>
                  <input
                    type='date'
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker();
                      }
                    }}
                    className={cn(
                      'h-12 w-full rounded-xl border px-4 pr-12 text-sm outline-none focus:ring-2 cursor-pointer',
                      deadlineWarning
                        ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                        : 'border-gray-200 focus:ring-blue-200'
                    )}
                  />
                </div>
                {deadlineWarning && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">
                    ⚠️ {deadlineWarning}
                  </p>
                )}
              </div>

              <div>
                <label className='text-sm font-semibold text-blue-600'>
                  LOKASI
                </label>
                <SearchableSelect
                  value={lokasi[0] || ""}
                  onChange={(val: string) => setLokasi([val])}
                  options={[
                    { value: "", label: "-- Pilih Lokasi --" },
                    ...paramLokasi.map((l) => ({ value: l, label: l })),
                  ]}
                  className="mt-1 border-0 bg-white"
                  placeholder="Pilih Lokasi..."
                />
              </div>

              <div>
                <label className='text-sm font-semibold text-blue-600'>
                  CATATAN HEADER
                </label>
                <input
                  value={catatanHeader}
                  onChange={(e) => setCatatanHeader(e.target.value)}
                  className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-3xl my-6 font-semibold text-black">
                Daftar Produk
              </h2>
              <span className='grid h-10 min-w-10 place-items-center rounded-xl bg-gray-600 px-3 text-white'>
                {totalProduk}
              </span>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                onClick={handleRevisi}
                className='h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white ring-1 ring-black/10 hover:bg-red-700'
              >
                Load/Revisi
              </button>

              <button
                onClick={handleUploadProduk}
                className='h-11 rounded-full bg-green-600 px-5 text-sm font-semibold text-white ring-1 ring-black/10 hover:bg-green-700'
              >
                Upload Produk
              </button>
            </div>
          </section>

          {/* PRODUCT CARDS */}
          <section className="space-y-6">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
              >
                <div
                  className={`absolute inset-y-0 left-0 w-2 ${it.qty === 0 ? "bg-red-500" : "bg-blue-600"}`}
                />

                <div
                  className={`absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white ${it.qty === 0 ? "bg-red-500" : "bg-blue-600"}`}
                >
                  {idx + 1}
                </div>

                {it.qty > 0 && (
                  <button
                    onClick={() => removeItem(it.id)}
                    className="absolute right-6 top-4 rounded-full px-3 py-2 ring-1 ring-gray-300 bg-white text-black font-extrabold hover:bg-gray-100"
                    aria-label="Remove item"
                    title="Remove item"
                  >
                    X
                  </button>
                )}

                {it.qty === 0 && (
                  <div className="absolute right-6 top-4 rounded-md px-3 py-1 bg-red-100 text-red-700 text-xs font-bold ring-1 ring-red-200">
                    DIHAPUS
                  </div>
                )}

                <div className="mb-6 p-8 pl-20">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <label className="text-sm font-semibold text-blue-600">
                        MEREK PRODUK
                      </label>
                      <input
                        disabled={it.qty === 0}
                        required
                        value={it.merek}
                        onChange={(e) =>
                          updateItem(it.id, 'merek', e.target.value)
                        }
                        className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                      />
                    </div>

                    <div className='md:col-span-4 '>
                      <label className='text-sm font-semibold text-blue-600'>
                        SUB-KATEGORI
                      </label>
                      <SearchableSelect
                        isDisabled={it.qty === 0}
                        required
                        value={it.subKategori}
                        onChange={(val: string) => updateItem(it.id, 'subKategori', val)}
                        options={[
                          { value: "", label: "-- Pilih Produk --" },
                          ...paramSubKategori.map((l) => ({ value: l, label: l })),
                        ]}
                        className="mt-2 border-0 bg-white"
                        placeholder="Pilih Produk..."
                      />
                    </div>

                    <div className='md:col-span-2'>
                      <label className='text-sm font-semibold text-blue-600'>
                        QTY
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        disabled={it.qty === 0}
                        value={it.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateItem(it.id, "qty", val < 0 ? 0 : val);
                        }}
                        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className='mt-6'>
                    <label className='text-sm font-semibold text-blue-600'>
                      SPESIFIKASI DETAIL
                    </label>
                    <textarea
                      required
                      disabled={it.qty === 0}
                      value={it.spesifikasi}
                      onChange={(e) =>
                        updateItem(it.id, 'spesifikasi', e.target.value)
                      }
                      rows={4}
                      className='mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                    />
                  </div>

                  <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-12'>
                    <div className='md:col-span-3'>
                      <label className='text-sm font-semibold text-blue-600'>
                        PAGU PER ITEM
                      </label>
                      <input
                        required
                        disabled={it.qty === 0}
                        type="number"
                        value={it.paguPerItem}
                        onChange={(e) =>
                          updateItem(
                            it.id,
                            "paguPerItem",
                            Number(e.target.value),
                          )
                        }
                        className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                      />
                    </div>

                    <div className='md:col-span-3'>
                      <label className='text-sm font-semibold text-blue-600'>
                        HARGA TAYANG
                      </label>
                      <input
                        required
                        disabled={it.qty === 0}
                        type="number"
                        min={0}
                        value={it.hargaTayang}
                        onChange={(e) =>
                          updateItem(
                            it.id,
                            "hargaTayang",
                            Number(e.target.value),
                          )
                        }
                        className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                      />
                    </div>

                    <div className='md:col-span-3'>
                      <label className='text-sm font-semibold text-blue-600'>
                        LINK INAPROC
                      </label>
                      <input
                        required
                        disabled={it.qty === 0}
                        value={it.linkInaproc}
                        onChange={(e) =>
                          updateItem(it.id, 'linkInaproc', e.target.value)
                        }
                        className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                      />
                    </div>

                    <div className='md:col-span-3'>
                      <label className='text-sm font-semibold text-blue-600'>
                        LINK E-COM
                      </label>
                      <input
                        required
                        disabled={it.qty === 0}
                        value={it.linkEcom}
                        onChange={(e) =>
                          updateItem(it.id, 'linkEcom', e.target.value)
                        }
                        className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-black/5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
              <div className="md:col-span-4">
                <div className="flex h-14 w-full items-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700">
                  <span className="text-gray-500">ID :</span>
                  <span className="ml-2">{infoId || "-"}</span>
                </div>
              </div>

              <div className="md:col-span-8 flex w-full justify-end gap-4">
                <button
                  onClick={addItem}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-blue-600 px-6 text-md font-extrabold text-gray-50 shadow-sm hover:bg-blue-700"
                >
                  <span className="text-lg leading-none"></span> TAMBAH PRODUK
                </button>

                <button
                  onClick={handleKirim}
                  disabled={isSubmitting}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-green-600 px-32 text-md font-extrabold tracking-wide text-gray-50 shadow-sm hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="mr-3 h-5 w-5 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      MENGIRIM...
                    </>
                  ) : (
                    "KIRIM REQUEST"
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>

        {openRevisi && (
          <div className='fixed inset-0 z-50 flex items-center justify-center'>
            <div
              className='absolute inset-0 bg-black/35'
              onClick={closeModal}
            />
            <div className='relative w-180 max-w-[92vw] rounded-2xl bg-white p-7 shadow-xl'>
              <div className='text-sm font-semibold tracking-wide text-gray-900'>
                MASUKAN ID
              </div>

              <div className='mt-4 flex overflow-hidden rounded-xl bg-gray-300/70'>
                <input
                  value={revisiId}
                  onChange={(e) => setRevisiId(e.target.value)}
                  className='h-12 flex-1 bg-transparent px-4 text-sm outline-none'
                />
                <button
                  onClick={handleLoadId}
                  className='h-12 bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700'
                >
                  LOAD ID
                </button>
              </div>
            </div>
          </div>
        )}

        {openUpload && (
          <div className='fixed inset-0 z-50 flex items-center justify-center'>
            <div
              className='absolute inset-0 bg-black/35'
              onClick={closeModal}
            />
            <div className='relative w-180 max-w-[92vw] rounded-2xl bg-white p-7 shadow-xl'>
              <div className='text-sm font-semibold tracking-wide text-gray-900'>
                UPLOAD EXCEL
              </div>

              <div className='mt-4 rounded-xl bg-gray-300/70 px-4 py-3'>
                <label className='flex cursor-pointer items-center justify-center gap-3 rounded-lg py-2 text-sm font-semibold text-gray-700 hover:bg-black/5'>
                  <input
                    type='file'
                    accept='.xlsx,.xls,.csv'
                    className='hidden'
                    onChange={handlePickFile}
                  />
                  PILIH FILE
                  {uploadFile && (
                    <span className='ml-2 text-xs font-medium text-gray-600'>
                      ({uploadFile.name})
                    </span>
                  )}
                </label>
              </div>

              <div className='mt-3 text-center text-sm text-gray-800'>
                Unduh Template?{' '}
                <a
                  href='/templates/template-eproc.xlsx'
                  className='font-semibold text-blue-600 hover:underline'
                  download
                >
                  download
                </a>
              </div>

              <div className='mt-5 flex justify-end gap-2'>
                <button
                  onClick={closeModal}
                  className='h-10 rounded-lg bg-white px-4 text-sm font-semibold ring-1 ring-black/10 hover:bg-gray-50'
                >
                  BATAL
                </button>
                <button
                  onClick={handleSubmitUpload}
                  className='h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700'
                >
                  UPLOAD
                </button>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <Toast
            message={toast}
            duration={2500}
            onDone={() => {
              setToast(null);
              window.location.reload(); // reload setelah toast hilang
            }}
          />
        )}
      </div>
    </div>
  )
}
