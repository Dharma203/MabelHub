"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session/SessionProvider";
import { FileUp, Upload } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmModal from "@/components/modals/ConfirmModal";

// Get Contact
import { Platform, PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';


type Role = "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES";

type InstansiForm = {
  institusi_kerja: string;
  kota_kab: string;
  klpd: string;
  satuan_kerja: string;
  status_ring: string;
  kode_dinas: string;
  pic_nama: string;
  pic_telp: string;
  pic_jabatan: string;
  pic_role: string;
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold tracking-wide text-black/70">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-11 w-full rounded-xl bg-white px-4 text-md text-black outline-none",
        "ring-1 ring-black/10 focus:ring-2 focus:ring-black/20",
        props.className || "",
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "h-11 w-full rounded-xl bg-white px-4 text-sm text-gray-500 outline-none",
        "ring-1 ring-black/10 focus:ring-2 focus:ring-black/20",
        props.className || "",
      )}
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "h-11 rounded-full px-6 text-md font-extrabold tracking-wide",
        "ring-1 ring-black/15 shadow-sm hover:bg-black/5",
        className || "",
      )}
    >
      {children}
    </button>
  );
}

function SolidButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "h-11 rounded-full px-7 text-md font-extrabold tracking-wider ring-1",
        "ring-1 ring-black/15 shadow-sm hover:bg-black/5",
        className || "",
      )}
    >
      {children}
    </button>
  );
}

const emptyForm = (): InstansiForm => ({
  institusi_kerja: "",
  kota_kab: "",
  klpd: "",
  satuan_kerja: "",
  status_ring: "",
  kode_dinas: "",
  pic_nama: "",
  pic_telp: "",
  pic_jabatan: "",
  pic_role: "",
});

export default function AddInstansiPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // const requestContactPermission = async () => {
  //   if (Platform.OS === 'android') {
  //     const granted = await PermissionsAndroid.request(
  //       PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  //       {
  //         title: 'Izinkan akses kontak',
  //         message: 'Izinkan akses kontak untuk mengambil data kontak',
  //       }
  //     );
  //     return granted === PermissionsAndroid.RESULTS.GRANTED;
  //   }
  //   return true;
  // };

  // ✅ multi instansi (layout seperti yang kamu mau: scroll tengah, footer fixed)
  const [forms, setForms] = useState<InstansiForm[]>([emptyForm()]);
  const [saving, setSaving] = useState(false);

  const handleGetContact = async (idx: number) => {
  try {
    // ✅ Check 1: Harus HTTPS
    if (!window.isSecureContext) {
      alert(
        "Fitur ini membutuhkan koneksi HTTPS.\n" +
        `Saat ini: ${window.location.protocol}//${window.location.host}\n\n` +
        "Hubungi developer untuk mengaktifkan HTTPS."
      );
      return;
    }

    // ✅ Check 2: API tersedia (Android Chrome 80+, bukan iOS)
    if (!('contacts' in navigator)) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        alert("Fitur ini tidak didukung di iOS/Safari.\nIsikan nomor secara manual.");
      } else if (!isAndroid) {
        alert("Fitur ini hanya tersedia di Chrome Android.");
      } else {
        alert(
          "Fitur pilih kontak tidak tersedia.\n" +
          "Pastikan Chrome versi 80+ dan halaman diakses via HTTPS."
        );
      }
      return;
    }

    const props = ["name", "tel"];
    const opts = { multiple: false };
    const contacts = await (navigator as any).contacts.select(props, opts);

    if (!contacts || contacts.length === 0) return;

    const c = contacts[0];
    const name = (c.name?.[0] || "").trim();
    let phone = c.tel?.[0] || "";

    phone = phone.replace(/\D/g, "");

    if (phone.startsWith("62")) {
      phone = phone.substring(2);       // "628123..." → "8123..."
    } else if (phone.startsWith("0")) {
      phone = phone.substring(1);       // "0812..."   → "812..."
    }
    // Format lokal "812..." → biarkan

    updateForm(idx, { pic_telp: phone });

    if (name && !forms[idx].pic_nama) {
      updateForm(idx, { pic_nama: name });
    }

  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") return; // User cancel
    console.error(error);
    alert("Gagal mengambil kontak.\nPastikan izin akses kontak sudah diberikan.");
  }
};

  // parameter master list
  const [paramKotaKab, setParamKotaKab] = useState<string[]>([]);
  const [paramKlpd, setParamKlpd] = useState<string[]>([]);
  const [paramRing, setParamRing] = useState<string[]>([]);
  const [paramPosisi, setParamPosisi] = useState<string[]>([]);

  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/parameters")
      .then((res) => res.json())
      .then((json) => {
        const d = json?.data;
        if (d) {
          setParamKotaKab(d.kota_kabupaten || []);
          setParamKlpd(d.klpd || []);
          setParamRing(d.ring || []);
          setParamPosisi(d.posisi || []);
        }
      })
      .catch(() => { });
  }, []);

  // file upload excel (opsional, kalau kamu tetap pakai)
  const fileRef = useRef<HTMLInputElement | null>(null);

  // role guard
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;

    const ok =
      user.role === "SALES" ||
      user.role === "LEADER" ||
      user.role === "ADMIN" ||
      user.role === "SUPERADMIN";

    if (!ok) router.replace("/");
  }, [sessionLoading, user, router]);

  const role = (user?.role || "SALES") as Role;

  // ✅ bedakan fungsi berdasarkan role
  const isDirectApproved = role === "SUPERADMIN" || role === "ADMIN";
  const endpoint = isDirectApproved
    ? "/api/companies"
    : "/api/company-requests";

  const title = isDirectApproved ? "TAMBAH INSTANSI" : "REGISTER COMPANY";
  const subtitle = isDirectApproved
    ? "Tambah instansi langsung APPROVED."
    : "Request instansi akan masuk ke pending (menunggu approve).";

  function updateForm(idx: number, patch: Partial<InstansiForm>) {
    setForms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addMore() {
    setForms((prev) => [...prev, emptyForm()]);
  }

  function removeAt(idx: number) {
    setForms((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }

  const canSubmit = useMemo(() => {
    return forms.every(
      (f) =>
        f.institusi_kerja &&
        f.kota_kab &&
        f.klpd &&
        f.satuan_kerja &&
        f.status_ring,
    );
  }, [forms]);

  async function submit() {
    if (!canSubmit) {
      alert(
        "Lengkapi: Nama Institusi, Kota/Kabupaten, KLPD, Satuan Kerja, Status Segmen.",
      );
      return;
    }

    setSaving(true);
    try {
      for (const f of forms) {
        const payload = {
          institusi_kerja: f.institusi_kerja.trim(),
          kota_kab: f.kota_kab.trim(),
          klpd: f.klpd.trim(),
          satuan_kerja: f.satuan_kerja.trim(),
          status_ring: f.status_ring,
          kode_dinas: f.kode_dinas.trim(),
          pic_default: {
            nama: f.pic_nama.trim(),
            no_telp: f.pic_telp ? `62${f.pic_telp}` : "",
            jabatan: f.pic_jabatan.trim(),
            role: f.pic_role.trim(),
          },
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(json?.error || "Gagal submit.");
          return;
        }
      }

      alert(
        isDirectApproved
          ? "Instansi berhasil ditambahkan (Approved)."
          : "Request berhasil dikirim (Pending).",
      );

      // reset & balik
      setForms([emptyForm()]);
      router.back();
    } finally {
      setSaving(false);
    }
  }
  async function handleUploadExcel(file: File) {
    try {
      const XLSX = await import("xlsx-js-style");

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
        defval: "",
      });

      const mapped: InstansiForm[] = rows
        .map((r) => ({
          institusi_kerja: String(r["Institusi Kerja"] || "").trim(),
          kota_kab: String(r["Kota/Kabupaten"] || "").trim(),
          klpd: String(r["KLPD"] || "").trim(),
          satuan_kerja: String(r["Satuan Kerja"] || "").trim(),
          status_ring: String(r["Status Ring"] || "").trim(),

          kode_dinas: "",

          pic_nama: String(r["Nama PIC"] || "").trim(),
          pic_telp: String(r["No Telepon PIC"] || "").trim(),
          pic_jabatan: String(r["Jabatan PIC"] || "").trim(),
          pic_role: String(r["Role PIC"] || "").trim(),
        }))
        .filter(
          (x) =>
            x.institusi_kerja ||
            x.kota_kab ||
            x.klpd ||
            x.satuan_kerja ||
            x.status_ring,
        );

      if (mapped.length === 0) {
        alert(
          "File kosong / header tidak sesuai. Pastikan pakai sheet 'Template' dan isi mulai baris ke-2.",
        );
        return;
      }

      setForms(mapped);
    } catch (e) {
      alert("Gagal membaca Excel. Pastikan file .xlsx valid.");
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">


        <div className="flex-1 p-6 min-">
          <main className="w-full max-w-none">
            {/* BREADCRUMB */}
            <nav className="mb-4 flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm font-medium text-gray-500">
                {user?.role === "SUPERADMIN" || user?.role === "ADMIN" ? (
                  <>
                    <li>
                      <button
                        onClick={() => router.push("/instansi")}
                        className="hover:text-blue-600 transition-colors"
                      >
                        Instansi
                      </button>
                    </li>
                    <li>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <button
                        onClick={() => router.push("/plan-activity")}
                        className="hover:text-blue-600 transition-colors"
                      >
                        Plan Activity
                      </button>
                    </li>
                    <li>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </li>
                    <li>
                      <button
                        onClick={() => router.push("/plan-activity/add")}
                        className="hover:text-blue-600 transition-colors"
                      >
                        Add Plans
                      </button>
                    </li>
                    <li>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </li>
                  </>
                )}
                <li aria-current="page">
                  <span className="text-black font-extrabold">
                    Register Company
                  </span>
                </li>
              </ol>
            </nav>

            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700 transition"
                    aria-label="Back"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  </button>
                  <div className="flex flex-col">
                    <h1 className="text-2xl font-extrabold tracking-wide text-black">
                      {title}
                    </h1>
                    <p className="text-xs text-black/60 font-medium mt-0.5">
                      {subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* card container */}
            <div className="pt-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="mb-6 flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Upload Data Instansi Massal
                    </h3>
                    <p className="text-xs text-gray-500">
                      Gunakan template Excel yang tersedia untuk menambahkan
                      instansi sekaligus.
                    </p>
                  </div>
                </div>
                <a
                  href="/templates/template_instansi.xlsx"
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-sm font-bold text-blue-600 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                  download
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Unduh Template
                </a>
              </div>

              {/* layout: middle scroll */}
              <div className="flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 gap-8">
                    {forms.map((form, idx) => (
                      <div key={idx} className="relative group">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs ring-4 ring-white">
                              {idx + 1}
                            </div>
                            <h3 className="font-extrabold text-sm text-gray-900 tracking-wide uppercase">
                              DATA INSTANSI
                            </h3>
                          </div>

                          {forms.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteIdx(idx)}
                              className="flex items-center gap-1.5 rounded-lg text-red-500 px-3 py-1.5 text-xs font-bold ring-1 ring-red-200 hover:bg-red-50 hover:ring-red-300 transition-colors"
                            >
                              <svg
                                className="w-3.5 h-3.5"
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
                              HAPUS
                            </button>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                          <Field label="NAMA INSTITUSI">
                            <Input
                              value={form.institusi_kerja}
                              onChange={(e) =>
                                updateForm(idx, {
                                  institusi_kerja: e.target.value,
                                })
                              }
                              placeholder="Contoh: PLN / RSUD / Dinkes..."
                              className="border-0 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 rounded-lg h-11"
                            />
                          </Field>

                          <div className="grid grid-cols-1 gap-y-5 gap-x-6 md:grid-cols-2">
                            <Field label="KOTA/KABUPATEN">
                              <SearchableSelect
                                value={form.kota_kab}
                                onChange={(val: string) =>
                                  updateForm(idx, { kota_kab: val })
                                }
                                options={paramKotaKab.map((opt) => ({
                                  value: opt,
                                  label: opt,
                                }))}
                                placeholder="Pilih Kota/Kabupaten..."
                                className="h-11 border-0"
                              />
                            </Field>

                            <Field label="KLPD">
                              <SearchableSelect
                                value={form.klpd}
                                onChange={(val: string) =>
                                  updateForm(idx, { klpd: val })
                                }
                                options={paramKlpd.map((opt) => ({
                                  value: opt,
                                  label: opt,
                                }))}
                                placeholder="Pilih KLPD..."
                                className="h-11 border-0"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-1 gap-y-5 gap-x-6 md:grid-cols-2">
                            <Field label="SATUAN KERJA">
                              <Input
                                value={form.satuan_kerja}
                                onChange={(e) =>
                                  updateForm(idx, {
                                    satuan_kerja: e.target.value,
                                  })
                                }
                                placeholder="Contoh: Dinas / Office / Unit kerja..."
                                className="border-0 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 rounded-lg h-11"
                              />
                            </Field>

                            <Field label="STATUS SEGMEN (RING)">
                              <SearchableSelect
                                value={form.status_ring}
                                onChange={(val: string) =>
                                  updateForm(idx, {
                                    status_ring: val,
                                  })
                                }
                                options={paramRing.map((opt) => ({
                                  value: opt,
                                  label: opt,
                                }))}
                                placeholder="Pilih Status Ring..."
                                className="h-11 border-0"
                              />
                            </Field>
                          </div>

                          <div className="mt-2 bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              Informasi Opsional / Tambahan
                            </h4>

                            <div className="grid grid-cols-1 gap-y-5 gap-x-6 md:grid-cols-2">
                              <Field label="KODE INSTANSI (OPSIONAL)">
                                <Input
                                  value={form.kode_dinas}
                                  onChange={(e) =>
                                    updateForm(idx, {
                                      kode_dinas: e.target.value,
                                    })
                                  }
                                  placeholder="Contoh: B2-CSMS"
                                  className="border-0 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 rounded-lg h-11 bg-white"
                                />
                              </Field>

                              <Field label="ROLE PIC (OPSIONAL)">
                                <SearchableSelect
                                  value={form.pic_role}
                                  onChange={(val: string) =>
                                    updateForm(idx, {
                                      pic_role: val,
                                    })
                                  }
                                  options={paramPosisi.map((opt) => ({
                                    value: opt,
                                    label: opt,
                                  }))}
                                  placeholder="Pilih Jabatan PIC..."
                                  className="h-11 border-0"
                                />
                              </Field>

                              <Field label="NAMA PIC (OPSIONAL)">
                                <Input
                                  value={form.pic_nama}
                                  onChange={(e) =>
                                    updateForm(idx, {
                                      pic_nama: e.target.value,
                                    })
                                  }
                                  placeholder="Contoh: Pak Rama"
                                  className="border-0 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 rounded-lg h-11 bg-white"
                                />
                              </Field>

                              <Field label="NO. TELEPON PIC (OPSIONAL)">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Input
                                      value={form.pic_telp}
                                      onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '');

                                        if (val.startsWith('0') || val.startsWith('6')) {
                                          val = val.substring(1);
                                        }

                                        updateForm(idx, { pic_telp: val });
                                      }}
                                      placeholder="Contoh: 62812xxxx"
                                      className="border-0 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 rounded-lg h-11 bg-white w-full"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleGetContact(idx)}
                                    className="h-11 px-4 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg ring-1 ring-inset ring-blue-200 hover:bg-blue-100 transition-colors whitespace-nowrap"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Get Contact
                                  </button>
                                </div>
                              </Field>
                            </div>

                            <div className="mt-5">
                              <Field label="JABATAN PIC (OPSIONAL)">
                                <Input
                                  value={form.pic_jabatan}
                                  onChange={(e) =>
                                    updateForm(idx, {
                                      pic_jabatan: e.target.value,
                                    })
                                  }
                                  placeholder="Contoh: Pengadaan / IT / Kepala Bagian..."
                                  className="border-0 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 rounded-lg h-11 bg-white"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>

                        {idx < forms.length - 1 ? (
                          <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-200" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* footer fixed */}
                <div className="mt-8 flex flex-col-reverse md:flex-row items-center justify-between border-t border-gray-200/60 pt-6">
                  <button
                    type="button"
                    onClick={addMore}
                    className="w-full md:w-auto flex items-center justify-center gap-2 h-11 rounded-lg bg-white px-6 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 transition-colors mt-4 md:mt-0"
                  >
                    TAMBAH FORM LAIN
                  </button>

                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={saving}
                      className="w-full md:w-auto flex items-center justify-center gap-2 h-11 rounded-lg px-6 text-md font-bold text-green-700 bg-white shadow-sm ring-1 ring-inset ring-green-400 hover:bg-green-100 transition-colors"
                    >
                      < FileUp className="w-4 h-4" />
                      UPLOAD EXCEL
                    </button>

                    <button
                      type="button"
                      onClick={submit}
                      disabled={saving || !canSubmit}
                      className={`w-full md:w-48 flex items-center justify-center gap-2 h-11 rounded-lg px-6 text-md font-extrabold text-white/95 shadow-sm transition-all
                        ${!canSubmit || saving
                          ? "bg-blue-400 cursor-not-allowed opacity-80"
                          : "bg-blue-600 hover:bg-blue-700 hover:shadow ring-1 ring-blue-700"
                        }`}
                    >
                      {saving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          SIMPAN DATA
                        </>
                      )}
                    </button>
                  </div>

                  <input ref={fileRef} type="file" className="hidden" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteIdx !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus baris form instansi ini?"
        confirmText="HAPUS"
        onConfirm={() => {
          if (confirmDeleteIdx !== null) {
            removeAt(confirmDeleteIdx);
            setConfirmDeleteIdx(null);
          }
        }}
        onCancel={() => setConfirmDeleteIdx(null)}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          await handleUploadExcel(f);
        }}
      />
    </div>
  );
}
