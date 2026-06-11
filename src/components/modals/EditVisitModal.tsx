"use client";

import React, { useState, useEffect } from "react";

type EditModalProps = {
  isOpen: boolean;
  editId: string;
  onClose: () => void;
  onSuccess: () => void;
  posisiOptions: string[];
  statusKunjunganOptions: string[];
  kegiatanOptions: string[];
  currentUserId?: string;
  currentUserRole?: string;
};

export default function EditVisitModal({
  isOpen,
  editId,
  onClose,
  onSuccess,
  posisiOptions,
  statusKunjunganOptions,
  kegiatanOptions,
  currentUserId,
  currentUserRole,
}: EditModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileObj, setFileObj] = useState<File | null>(null);

  const [form, setForm] = useState({
    pic_name: "",
    pic_phone: "",
    pic_role: "", // Jabatan
    pic_position: "", // Posisi
    status_visit: "",
    kegiatan_status: "",
    descriptions: "",
    tindak_lanjut: "",
    visit_image: "",
    reschedule_date: "",
    reschedule_note: "",
  });

  const isReschedule = form.status_visit.toLowerCase().includes('reschedule');
  // Track the owner of the visit data
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    if (!isOpen || !editId) return;

    let isMounted = true;
    setLoading(true);
    setFileObj(null);
    setForm({
      pic_name: "",
      pic_phone: "",
      pic_role: "",
      pic_position: "",
      status_visit: "",
      kegiatan_status: "",
      descriptions: "",
      tindak_lanjut: "",
      visit_image: "",
      reschedule_date: "",
      reschedule_note: "",
    });

    fetch(`/api/visits/${editId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        return json.data;
      })
      .then((data) => {
        if (!isMounted) return;
        setOwnerId(data.user_id || "");
        setForm({
          pic_name: data.pic_name || "",
          pic_phone: data.pic_phone || "",
          pic_role: data.pic_role || "",
          pic_position: data.pic_position || "",
          status_visit: data.status_visit || "",
          kegiatan_status: data.kegiatan_status || "",
          descriptions: data.descriptions || "",
          tindak_lanjut: data.tindak_lanjut || "",
          visit_image: data.visit_image || "",
          reschedule_date: data.reschedule_date || "",
          reschedule_note: data.reschedule_note || "",
        });
      })
      .catch((e: any) => {
        alert("Gagal load data edit: " + e.message);
        onClose();
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, editId, onClose]);

  async function handleSave() {
    if (!editId) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...form };

      // Clear reschedule fields if status is not Reschedule
      if (!payload.status_visit?.toLowerCase().includes('reschedule')) {
        payload.reschedule_date = "";
        payload.reschedule_note = "";
      }

      if (fileObj) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(fileObj);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
        payload.visit_image = base64;
      }

      const res = await fetch(`/api/visits/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      onSuccess();
    } catch (e: any) {
      alert("Gagal simpan data: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const isOwner = ownerId === currentUserId;
  const isPrivileged =
    currentUserRole === "ADMIN" ||
    currentUserRole === "SUPERADMIN" ||
    currentUserRole === "LEADER";
  const canEdit = isOwner || isPrivileged;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-extrabold text-black uppercase tracking-wide">
            Edit Kunjungan
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 font-bold text-xl text-black select-none hover:bg-red-500"
          >
            X
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 overflow-y-auto w-full">
          {loading ? (
            <div className="py-20 text-center font-bold text-gray-600">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Row 1 */}
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Nama PIC
                </label>
                <input
                  value={form.pic_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pic_name: e.target.value }))
                  }
                  readOnly={!canEdit}
                  className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${
                    canEdit
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Nomor PIC
                </label>
                <input
                  value={form.pic_phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pic_phone: e.target.value }))
                  }
                  placeholder="08XXX"
                  readOnly={!canEdit}
                  className={`rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${
                    canEdit
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed"
                  }`}
                />
              </div>

              {/* Row 2 */}
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Jabatan
                </label>
                <input
                  value={form.pic_role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pic_role: e.target.value }))
                  }
                  readOnly={!canEdit}
                  className={`rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${
                    canEdit
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Posisi
                </label>
                <div className="relative">
                  <select
                    value={form.pic_position}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pic_position: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    className={`rounded-lg h-10 w-full appearance-none bg-white border border-gray-300 outline-none px-3 pr-8 shadow-sm ${
                      canEdit
                        ? "focus:ring-1 focus:ring-blue-300 text-black"
                        : "text-black cursor-not-allowed"
                    }`}
                  >
                    <option value="">-</option>
                    {posisiOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black">
                    ▾
                  </span>
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Status Kunjungan
                </label>
                <div className="relative">
                  <select
                    value={form.status_visit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status_visit: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    className={`rounded-lg h-10 w-full appearance-none bg-white border border-gray-300 outline-none px-3 pr-8 shadow-sm ${
                      canEdit
                        ? "focus:ring-1 focus:ring-blue-300 text-black"
                        : "text-black cursor-not-allowed"
                    }`}
                  >
                    <option value="">-</option>
                    {statusKunjunganOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black">
                    ▾
                  </span>
                </div>
              </div>

              {/* Reschedule fields — only when status = Reschedule */}
              {isReschedule && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-black">
                      Tanggal Reschedule
                    </label>
                    <input
                      type="date"
                      value={form.reschedule_date}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          reschedule_date: e.target.value,
                        }))
                      }
                      readOnly={!canEdit}
                      className={`rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${
                        canEdit
                          ? "focus:ring-1 focus:ring-blue-300 text-black"
                          : "text-black cursor-not-allowed"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-black">
                      Catatan Reschedule
                    </label>
                    <input
                      value={form.reschedule_note}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          reschedule_note: e.target.value,
                        }))
                      }
                      placeholder="Alasan reschedule..."
                      readOnly={!canEdit}
                      className={`rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${
                        canEdit
                          ? "focus:ring-1 focus:ring-blue-300 text-black"
                          : "text-black cursor-not-allowed"
                      }`}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Kegiatan
                </label>
                <div className="relative">
                  <select
                    value={form.kegiatan_status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        kegiatan_status: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    className={`rounded-lg h-10 w-full appearance-none bg-white border border-gray-300 outline-none px-3 pr-8 shadow-sm ${
                      canEdit
                        ? "focus:ring-1 focus:ring-blue-300 text-black"
                        : "text-black cursor-not-allowed"
                    }`}
                  >
                    <option value="">-</option>
                    {kegiatanOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black">
                    ▾
                  </span>
                </div>
              </div>

              {/* Row 4 */}
              <div className="col-span-1 md:col-span-2">
                <label className="mb-1 block text-sm font-bold text-black">
                  Keterangan
                </label>
                <textarea
                  value={form.descriptions}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      descriptions: e.target.value,
                    }))
                  }
                  readOnly={!canEdit}
                  className={`rounded-lg h-28 w-full bg-white resize-none border border-gray-300 outline-none p-3 ${
                    canEdit
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed"
                  }`}
                />
              </div>

              {/* Row Tindak Lanjut */}
              <div className="col-span-1 md:col-span-2">
                <label className="mb-1 block text-sm font-bold text-black">
                  Tindak Lanjut
                </label>
                <textarea
                  value={form.tindak_lanjut}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tindak_lanjut: e.target.value,
                    }))
                  }
                  readOnly={!canEdit}
                  className={`rounded-lg h-28 w-full bg-white resize-none border border-gray-300 outline-none p-3 ${
                    canEdit
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed"
                  }`}
                />
              </div>

              {/* Row 5 / Image Upload/Preview */}
              <div className="col-span-1 md:col-span-2">
                <label className="mb-2 text-sm font-medium text-gray-800 flex items-center justify-between">
                  <span>
                    Upload Foto <span className="text-red-500">*</span>
                  </span>
                  {form.visit_image && (
                    <button
                      type="button"
                      onClick={() => {
                        const w = window.open("");
                        if (w) {
                          w.document.write(`
                            <html>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#0e0e0e;height:100vh;">
                                <img src="${form.visit_image}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                              </body>
                            </html>
                          `);
                          w.document.close();
                        }
                      }}
                      className="text-blue-600 hover:underline text-xs bg-transparent border-none cursor-pointer p-0"
                    >
                      Buka Gambar Penuh
                    </button>
                  )}
                </label>

                {form.visit_image && !fileObj && (
                  <div className="mb-3">
                    <img
                      src={form.visit_image}
                      alt="Preview Kunjungan"
                      className="w-full h-40 object-contain bg-gray-200 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                {fileObj && (
                  <div className="mb-3 text-sm text-green-700 font-medium px-2 py-1 bg-green-100 rounded border border-green-200">
                    File baru terpilih: {fileObj.name}
                  </div>
                )}

                <div className="flex items-center h-10 w-full bg-white px-2 rounded">
                  <label
                    className={`bg-gray-100 px-3 py-1 rounded-lg text-sm font-bold ring-1 ring-gray-300 text-black ${
                      canEdit
                        ? "cursor-pointer hover:bg-gray-200"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!canEdit}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileObj(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  <span className="ml-3 text-sm text-gray-700 truncate">
                    {fileObj ? fileObj.name : "No file chosen"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && canEdit && (
          <div className="px-6 pb-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 w-32 rounded-full bg-blue-600 text-white font-bold tracking-wide flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
