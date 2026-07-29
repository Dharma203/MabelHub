"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/modals/ConfirmModal";
import * as XLSX from "xlsx-js-style";
import { Download, Upload } from "lucide-react";

type ParamKey =
  | "kota_kabupaten"
  | "klpd"
  | "ring"
  | "segmen"
  | "posisi"
  | "status_kunjungan"
  | "kegiatan"
  | "perusahaan"
  | "status_akhir"
  | "status_keputusan"
  | "lokasi"
  | "entity"
  | "sub_kategori";

type ParamDoc = {
  _id: string;
  kota_kabupaten: string[];
  klpd: string[];
  ring: string[];
  segmen: string[];
  posisi: string[];
  status_kunjungan: string[];
  kegiatan: string[];
  perusahaan: string[];
  status_akhir: string[];
  status_keputusan: string[];
  lokasi: string[];
  entity: string[];
  sub_kategori: string[];
  updatedAt?: string;
};

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const KEY_LABEL: Record<ParamKey, string> = {
  kota_kabupaten: "Kota/Kabupaten",
  klpd: "KLPD",
  ring: "Ring",
  segmen: "Segmen",
  posisi: "Posisi",
  status_kunjungan: "Status Kunjungan",
  kegiatan: "Kegiatan",
  perusahaan: "Perusahaan",
  status_akhir: "Status Akhir",
  status_keputusan: "Status Keputusan",
  lokasi: "Lokasi",
  entity: "Entity",
  sub_kategori: "Sub Kategori",
};

const ALL_KEYS: ParamKey[] = [
  "kota_kabupaten",
  "klpd",
  "ring",
  "segmen",
  "posisi",
  "status_kunjungan",
  "kegiatan",
  "perusahaan",
  "status_akhir",
  "status_keputusan",
  "lokasi",
  "entity",
  "sub_kategori",
];

export default function ParameterPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // Guard superadmin
  useEffect(() => {
    if (!sessionLoading && user) {
      if (user.role !== "SUPERADMIN") router.replace("/");
    }
  }, [sessionLoading, user, router]);

  const [doc, setDoc] = useState<ParamDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [key, setKey] = useState<ParamKey>("kota_kabupaten");
  const [value, setValue] = useState("");
  const [parentRing, setParentRing] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<{
    k: ParamKey;
    v: string;
  } | null>(null); // Untuk Segmen
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    // URL to the template file in public/templates folder
    const templatePath = "/templates/Template_Parameter.xlsx";

    // Create an invisible link to trigger the download
    const link = document.createElement("a");
    link.href = templatePath;
    link.download = "Template_Parameter.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setErr("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

        const bulkData: Record<string, string[]> = {};
        ALL_KEYS.forEach((k) => (bulkData[k] = []));

        data.forEach((row) => {
          Object.keys(row).forEach((header) => {
            const keyByLabel = Object.keys(KEY_LABEL).find(
              (k) => KEY_LABEL[k as ParamKey] === header,
            ) as ParamKey;
            const val = row[header];

            if (keyByLabel && val) {
              bulkData[keyByLabel].push(String(val).trim());
            } else if (ALL_KEYS.includes(header as ParamKey) && val) {
              bulkData[header as ParamKey].push(String(val).trim());
            }
          });
        });

        const res = await fetch("/api/parameters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bulk: bulkData }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Gagal upload parameter");

        setDoc(json?.data ?? null);
        alert("Berhasil upload parameter!");
      } catch (error: any) {
        setErr(error?.message ?? "Gagal memproses file Excel");
        alert(error?.message ?? "Gagal memproses file Excel");
      } finally {
        setSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  async function fetchDoc() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/parameters", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Gagal load parameter");
      setDoc(json?.data ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal load parameter");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoc();
  }, []);

  const listByKey = useMemo(() => {
    const d = doc;
    return {
      kota_kabupaten: d?.kota_kabupaten ?? [],
      klpd: d?.klpd ?? [],
      ring: d?.ring ?? [],
      segmen: d?.segmen ?? [],
      posisi: d?.posisi ?? [],
      status_kunjungan: d?.status_kunjungan ?? [],
      kegiatan: d?.kegiatan ?? [],
      perusahaan: d?.perusahaan ?? [],
      status_akhir: d?.status_akhir ?? [],
      status_keputusan: d?.status_keputusan ?? [],
      lokasi: d?.lokasi ?? [],
      entity: d?.entity ?? [],
      sub_kategori: d?.sub_kategori ?? [],
    } as Record<ParamKey, string[]>;
  }, [doc]);

  async function onAdd() {
    const v = value.trim();
    if (!v) return;

    let finalValue = v;
    if (key === "segmen") {
      if (!parentRing) {
        setErr("Silakan pilih Parent Ring untuk segmen ini!");
        return;
      }
      finalValue = `${parentRing}::${v}`;
    }

    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: finalValue }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Gagal tambah");
      setDoc(json?.data ?? null);
      setValue("");
    } catch (e: any) {
      setErr(e?.message ?? "Gagal tambah");
    } finally {
      setSaving(false);
    }
  }

  function onDeleteItem(k: ParamKey, v: string) {
    setConfirmDelete({ k, v });
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    const { k, v } = confirmDelete;

    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/parameters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k, value: v }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Gagal hapus");
      setDoc(json?.data ?? null);
      if (selectedValue === v && selectedKey === k) {
        setSelectedKey(null);
        setSelectedValue(null);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Gagal hapus");
    } finally {
      setSaving(false);
      setConfirmDelete(null);
    }
  }

  // optional: “klik item lalu tombol hapus di kanan” feel seperti screenshot
  const [selectedKey, setSelectedKey] = useState<ParamKey | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  function pick(k: ParamKey, v: string) {
    setSelectedKey(k);
    setSelectedValue(v);
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex min-h-screen">
        

        <div className="flex-1 p-6">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 pt-2 pb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-black drop-shadow-sm">
                PARAMETER
              </h1>
              <div className="text-sm mt-2 text-slate-500 font-medium">
                Kelola parameter untuk dropdown pada sistem
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUploadExcel}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:focus:ring-2 hover:bg-green-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Upload Excel
              </button>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:focus:ring-2 hover:bg-orange-600"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </div>

          {/* Add box */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/10">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
              <div className="md:col-span-5">
                <div className="text-md font-extrabold tracking-wider text-black">
                  Parameter
                </div>
                <div className="relative mt-2">
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value as ParamKey)}
                    className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {ALL_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {KEY_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">
                    ▾
                  </span>
                </div>
              </div>

              {key === "segmen" && (
                <div className="md:col-span-3">
                  <div className="text-md font-extrabold tracking-wider text-black">
                    Parent Ring
                  </div>
                  <div className="relative mt-2">
                    <select
                      value={parentRing}
                      onChange={(e) => setParentRing(e.target.value)}
                      className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Pilih Ring...</option>
                      {listByKey.ring.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">
                      ▾
                    </span>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  key === "segmen" ? "md:col-span-2" : "md:col-span-5",
                )}
              >
                <div className="text-md font-extrabold tracking-wider text-black">
                  Value Baru
                </div>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAdd();
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Isi value..."
                />
              </div>

              <div className="mt-8 md:col-span-2 md:flex md:justify-end">
                <button
                  onClick={onAdd}
                  disabled={saving || !value.trim()}
                  className={cn(
                    "h-12 w-full rounded-xl px-5 text-md font-semibold shadow-sm",
                    saving || !value.trim()
                      ? "bg-blue-700 text-white"
                      : "bg-blue-700 text-white",
                  )}
                >
                  TAMBAH
                </button>
              </div>
            </div>
          </section>

          {/* Grid lists */}
          <section className="mt-6 grid gap-6 md:grid-cols-3">
            {(
              [
                ["kota_kabupaten", "klpd", "ring"],
                ["segmen", "posisi", "status_kunjungan"],
                ["kegiatan", "perusahaan", "status_akhir", "status_keputusan"],
                ["lokasi", "entity", "sub_kategori"],
              ] as ParamKey[][]
            )
              .flat()
              .map((k) => (
                <CardList
                  key={k}
                  title={KEY_LABEL[k]}
                  items={listByKey[k]}
                  loading={loading}
                  onDelete={(v) => onDeleteItem(k, v)}
                  isSegmen={k === "segmen"}
                />
              ))}
          </section>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        loading={saving}
        title="Konfirmasi Hapus Parameter"
        message={
          <>
            Apakah Anda yakin ingin menghapus parameter{" "}
            <span className="font-bold">{confirmDelete?.v}</span>?
          </>
        }
        confirmText="HAPUS"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function formatSegmen(raw: string) {
  if (!raw.includes("::")) return raw;
  const [r, s] = raw.split("::");
  return `${s} (${r})`;
}

function CardList({
  title,
  items,
  loading,
  onDelete,
  isSegmen,
}: {
  title: string;
  items: string[];
  loading: boolean;
  onDelete: (v: string) => void;
  isSegmen?: boolean;
}) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden transition-all hover:shadow-md">
      {/* TITLE */}
      <div className="bg-blue-200 font-bold px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">{title}</div>
        <span className="bg-blue-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
          {sorted.length} item
        </span>
      </div>

      <div className="p-3 bg-gray-50/50 flex-1 overflow-y-auto max-h-[250px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-xs font-semibold text-gray-500">
              Memuat data...
            </span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-8 flex flex-col flex-1 items-center justify-center text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            <svg
              className="w-8 h-8 mb-2 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            Belum ada data
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((v) => {
              return (
                <div
                  key={v}
                  className="group flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-gray-200 hover:ring-blue-400 hover:shadow-md transition-all"
                >
                  <span className="flex-1 text-left text-sm font-bold text-gray-700 group-hover:text-blue-700 transition-colors">
                    {isSegmen ? formatSegmen(v) : v}
                  </span>

                  <button
                    type="button"
                    onClick={() => onDelete(v)}
                    className="ml-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-200 hover:bg-red-100 hover:text-red-700 hover:shadow-sm transition-all opacity-70 group-hover:opacity-100"
                    aria-label="Delete"
                    title="Hapus"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
