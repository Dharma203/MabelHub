"use client";

import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "max-w-5xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
        aria-label="Close modal"
      />
      <div
        className={clsx(
          "relative mt-16 w-[94%] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10",
          widthClass,
        )}
      >
        <div className="flex items-start justify-between border-b border-black/10 px-6 py-5">
          <div>
            <h2 className="text-base font-extrabold tracking-wide text-black">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-xs text-black/60">{subtitle}</p>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white text-xl font-bold text-black hover:bg-red-500"
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
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

function SolidButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "h-11 rounded-full px-7 text-md font-extrabold tracking-wide text-white/95",
        "bg-blue-500 hover:bg-blue-600",
        "disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

export type Company = {
  _id: string;
  kota_kab?: string;
  klpd?: string;
  institusi_kerja?: string;
  satuan_kerja?: string;
  kode_dinas?: string;
  status_ring?: string;
  pic_default?: {
    nama?: string;
    no_telp?: string;
    jabatan?: string;
    role?: string;
  };
};

export default function EditInstansiModal({
  open,
  onClose,
  company,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);

  // parameter master list
  const [paramKotaKab, setParamKotaKab] = useState<string[]>([]);
  const [paramKlpd, setParamKlpd] = useState<string[]>([]);
  const [paramRing, setParamRing] = useState<string[]>([]);
  const [paramPosisi, setParamPosisi] = useState<string[]>([]);

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
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
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

  useEffect(() => {
    if (!open || !company) return;

    setForm({
      institusi_kerja: company.institusi_kerja ?? "",
      kota_kab: company.kota_kab ?? "",
      klpd: company.klpd ?? "",
      satuan_kerja: company.satuan_kerja ?? "",
      status_ring: company.status_ring ?? "",
      kode_dinas: company.kode_dinas ?? "",
      pic_nama: company.pic_default?.nama ?? "",
      pic_telp: company.pic_default?.no_telp ?? "",
      pic_jabatan: company.pic_default?.jabatan ?? "",
      pic_role: company.pic_default?.role ?? "",
    });
  }, [open, company]);

  async function submit() {
    if (!company?._id) return;

    setSaving(true);
    try {
      const payload = {
        institusi_kerja: form.institusi_kerja,
        kota_kab: form.kota_kab,
        klpd: form.klpd,
        satuan_kerja: form.satuan_kerja,
        status_ring: form.status_ring,
        kode_dinas: form.kode_dinas,
        pic_default: {
          nama: form.pic_nama,
          no_telp: form.pic_telp,
          jabatan: form.pic_jabatan,
          role: form.pic_role,
        },
      };

      const url = `/api/companies/${encodeURIComponent(company._id)}`;

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text(); // ambil body mentah dulu
      if (!res.ok) {
        console.log("EDIT COMPANY ERROR", {
          url,
          status: res.status,
          statusText: res.statusText,
          body: text,
        });
        alert(`Gagal update instansi. (${res.status})\n${text}`);
        return;
      }

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="EDIT INSTANSI"
      subtitle="Ubah data instansi yang sudah APPROVED."
      widthClass="max-w-5xl"
    >
      <div className="text-md">
        <div className="grid grid-cols-1 gap-4">
          <Field label="NAMA INSTITUSI">
            <Input
              value={form.institusi_kerja}
              onChange={(e) =>
                setForm((p) => ({ ...p, institusi_kerja: e.target.value }))
              }
              placeholder="Contoh: PLN / RSUD / Dinkes..."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="KOTA/KABUPATEN">
              <SearchableSelect
                value={form.kota_kab}
                onChange={(val: string) =>
                  setForm((p) => ({ ...p, kota_kab: val }))
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
                  setForm((p) => ({ ...p, klpd: val }))
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="SATUAN KERJA">
              <Input
                value={form.satuan_kerja}
                onChange={(e) =>
                  setForm((p) => ({ ...p, satuan_kerja: e.target.value }))
                }
                placeholder="Contoh: Dinas / Office / Unit kerja..."
              />
            </Field>

            <Field label="STATUS SEGMEN (RING)">
              <SearchableSelect
                value={form.status_ring}
                onChange={(val: string) =>
                  setForm((p) => ({ ...p, status_ring: val }))
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="KODE DINAS (OPSIONAL)">
              <Input
                value={form.kode_dinas}
                onChange={(e) =>
                  setForm((p) => ({ ...p, kode_dinas: e.target.value }))
                }
                placeholder="Contoh: B2-CSMS"
              />
            </Field>

            <Field label="ROLE PIC (OPSIONAL)">
              <SearchableSelect
                value={form.pic_role}
                onChange={(val: string) =>
                  setForm((p) => ({ ...p, pic_role: val }))
                }
                options={paramPosisi.map((opt) => ({
                  value: opt,
                  label: opt,
                }))}
                placeholder="Pilih Jabatan PIC..."
                className="h-11 border-0"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="NAMA PIC (OPSIONAL)">
              <Input
                value={form.pic_nama}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pic_nama: e.target.value }))
                }
                placeholder="Contoh: Pak Rama"
              />
            </Field>

            <Field label="NO. TELEPON PIC (OPSIONAL)">
              <Input
                value={form.pic_telp}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pic_telp: e.target.value }))
                }
                placeholder="Contoh: 62812xxxx"
              />
            </Field>
          </div>

          <Field label="JABATAN PIC (OPSIONAL)">
            <Input
              value={form.pic_jabatan}
              onChange={(e) =>
                setForm((p) => ({ ...p, pic_jabatan: e.target.value }))
              }
              placeholder="Contoh: Pengadaan / IT / Kepala Bagian..."
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <SolidButton onClick={submit} disabled={saving}>
            {saving ? "MENYIMPAN..." : "SUBMIT"}
          </SolidButton>
        </div>
      </div>
    </Modal>
  );
}
