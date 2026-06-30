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
  const [visitDate, setVisitDate] = useState<string>("");
  const [savedStatusVisit, setSavedStatusVisit] = useState("");
  const [originalPic, setOriginalPic] = useState({
    pic_name: "", pic_phone: "", pic_role: "", pic_position: ""
  });

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
    company_id: "",
  });

  // Track the owner of the visit data
  const [ownerId, setOwnerId] = useState("");
  const [picChangeHistory, setPicChangeHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !editId) return;

    let isMounted = true;

    const fetchData = async () => {
      // ✅ setState di dalam async function — aman
      if (isMounted) setLoading(true);
      if (isMounted) setFileObj(null);
      if (isMounted) setForm({
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
        company_id: "",
      });

      try {
        // ✅ Fetch spesifik berdasarkan editId
        const res = await fetch(`/api/visits/${editId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        const data = json.data;
        if (!isMounted) return;

        setVisitDate(data.visit_date || data.tanggal || "");
        setSavedStatusVisit(data.status_visit || "");
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
          company_id: data.company_id || "",
        });
        setOriginalPic({
          pic_name: data.pic_name || "",
          pic_phone: data.pic_phone || "",
          pic_role: data.pic_role || "",
          pic_position: data.pic_position || "",
        });
        setPicChangeHistory(data.pic_change_history || []);

      } catch (e: any) {
        alert("Gagal load data edit: " + e.message);
        onClose();
      } finally {
        // ✅ setLoading hanya dipanggil sekali
        if (isMounted) setLoading(false);
      }
    };

    fetchData(); // ✅ Hanya satu fetch call

    return () => {
      isMounted = false;
    };
  }, [isOpen, editId, onClose]);

  async function handleSave() {
    const isPicChanged =
      form.pic_name !== originalPic.pic_name ||
      form.pic_phone !== originalPic.pic_phone ||
      form.pic_role !== originalPic.pic_role ||
      form.pic_position !== originalPic.pic_position;
    if (!editId) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        ...form,
        ...(isPicChanged && {
          pic_changed: true,
          previous_pic: originalPic,       // PIC lama dikirim ke backend
          pic_changed_by: currentUserId,
          pic_changed_at: new Date().toISOString(),
        }),
      };

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
      setSavedStatusVisit(form.status_visit);

      onSuccess();
    } catch (e: any) {
      alert("Gagal simpan data: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;
  const isOwner = ownerId === currentUserId;
  const isPrivileged = ["ADMIN", "SUPERADMIN", "LEADER"].includes(currentUserRole ?? "");

  // --- WIB (UTC+7) Time ---
  const wibNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const todayWIB = new Date(wibNow);
  todayWIB.setHours(0, 0, 0, 0);

  // --- Visit Date (midnight WIB) ---
  const visitDateWIB = visitDate
    ? (() => {
      const d = new Date(
        new Date(visitDate).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );
      d.setHours(0, 0, 0, 0);
      return d;
    })()
    : null;

  // --- Deadline: H+1 pukul 09:00 WIB ---
  const deadlineWIB = visitDate
    ? (() => {
      const d = new Date(
        new Date(visitDate).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );
      d.setDate(d.getDate() + 1); // H+1
      d.setHours(9, 0, 0, 0);    // 09:00 WIB
      return d;
    })()
    : null;



  // --- Status Flags ---
  const isAlreadyVisited = savedStatusVisit.toLowerCase() === "visited";
  const isVisitDatePassed = visitDateWIB ? todayWIB > visitDateWIB : false;
  const isPastDeadline = deadlineWIB ? wibNow >= deadlineWIB : false;
  const isReschedule = form.status_visit.toLowerCase().includes("reschedule");

  type LockableField =
    | "pic_name" | "pic_phone" | "pic_role" | "pic_position"
    | "status_visit" | "kegiatan_status"
    | "descriptions" | "tindak_lanjut"
    | "visit_image"
    | "reschedule_date" | "reschedule_note";

  function isFieldLocked(field: LockableField): boolean {
    // Privileged (Admin/Superadmin/Leader) selalu bisa edit
    if (isPrivileged) return false;

    // Bukan owner → semua locked
    if (!isOwner) return true;

    // Status sudah Visited → semua field locked tanpa pengecualian
    if (isAlreadyVisited) {
      return true;
    }


    // Lewat deadline (H+1 09:00 WIB) → hanya reschedule field yang bisa diisi
    if (isPastDeadline) {
      const rescheduleOnlyFields: LockableField[] = [
        "status_visit",
        "reschedule_date",
        "reschedule_note",
      ];
      return !rescheduleOnlyFields.includes(field);
    }

    // Tanggal lewat tapi masih dalam deadline → status bisa diubah, data utama tetap bisa edit
    return false;
  }

  // --- Edit Permissions ---
  // canEditMain   : semua field data (nama, deskripsi, foto, dll)
  // canEditStatus : hanya status kunjungan + field reschedule
  const canEditMain = isPrivileged || (isOwner && !isPastDeadline);
  const canEditStatus = isPrivileged || (isOwner && !isAlreadyVisited);

  // Mode reschedule-only: lewat deadline, belum visited, bukan privileged
  const isRescheduleOnly = !isAlreadyVisited && isPastDeadline && !isPrivileged;

  // --- Filtered Status Options ---
  const availableStatusOptions = (() => {
    if (isAlreadyVisited) {
      // Sudah visited → hapus opsi reschedule
      return statusKunjunganOptions.filter(
        (opt) => !opt.toLowerCase().includes("reschedule")
      );
    }
    if (isPastDeadline) {
      // Lewat H+1 09:00 → hanya reschedule
      return statusKunjunganOptions.filter(
        (opt) => opt.toLowerCase().includes("reschedule")
      );
    }
    if (isVisitDatePassed) {
      // Tanggal lewat tapi masih dalam deadline → Not Visit atau Reschedule
      return statusKunjunganOptions.filter(
        (opt) =>
          opt.toLowerCase().includes("not visit") ||
          opt.toLowerCase().includes("reschedule")
      );
    }
    return statusKunjunganOptions;
  })();

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

        {/* Info lock message */}
        {!loading && (
          <>
            {/* {isAlreadyVisited && (
              <div className="mx-6 mb-2 flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <span className="text-green-600">✓</span>
                <p className="text-sm text-green-800 font-medium">
                  Kunjungan sudah berstatus <strong>Visited</strong> dan tidak dapat diedit.
                </p>
              </div>
            )} */}
            {isRescheduleOnly && (
              <div className="mx-6 mb-2 flex items-start gap-3 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
                <span className="text-orange-500">⏰</span>
                <p className="text-sm text-orange-800 font-medium">
                  Batas waktu input laporan <strong>(H+1 pukul 09.00 WIB)</strong> telah terlewat.
                  Data tidak dapat diubah. Pilih <strong>Reschedule</strong> untuk menjadwal ulang.
                </p>
              </div>
            )}
            {isVisitDatePassed && !isPastDeadline && !isAlreadyVisited && (
              <div className="mx-6 mb-2 flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
                <span className="text-yellow-600">⚠️</span>
                <p className="text-sm text-yellow-800 font-medium">
                  Tanggal kunjungan sudah lewat. Status hanya dapat diubah ke{" "}
                  <strong>Not Visit</strong> atau <strong>Reschedule</strong>.
                </p>
              </div>
            )}
          </>
        )}

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
                  readOnly={isFieldLocked("pic_name")}
                  className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("pic_name")
                    ? "focus:ring-1 focus:ring-blue-300 text-black"
                    : "text-black cursor-not-allowed bg-gray-100"
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
                  readOnly={isFieldLocked("pic_phone")}
                  className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("pic_phone")
                    ? "focus:ring-1 focus:ring-blue-300 text-black"
                    : "text-black cursor-not-allowed bg-gray-100"
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
                  readOnly={isFieldLocked("pic_role")}
                  className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("pic_role")
                    ? "focus:ring-1 focus:ring-blue-300 text-black"
                    : "text-black cursor-not-allowed bg-gray-100"
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
                    disabled={isFieldLocked("pic_position")}
                    className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("pic_position")
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed bg-gray-100"
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
                    disabled={isFieldLocked("status_visit")}
                    className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("status_visit")
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed bg-gray-100"
                      }`}
                  >
                    <option value="">-</option>
                    {availableStatusOptions.map((opt) => (
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
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker();
                        }
                      }}
                      readOnly={isFieldLocked("reschedule_date")}
                      className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("reschedule_date")
                        ? "focus:ring-1 focus:ring-blue-300 text-black"
                        : "text-black cursor-not-allowed bg-gray-100"
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
                      readOnly={isFieldLocked("reschedule_note")}
                      className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("reschedule_note")
                        ? "focus:ring-1 focus:ring-blue-300 text-black"
                        : "text-black cursor-not-allowed bg-gray-100"
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
                    disabled={isFieldLocked("kegiatan_status")}
                    className={` rounded-lg h-10 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("kegiatan_status")
                      ? "focus:ring-1 focus:ring-blue-300 text-black"
                      : "text-black cursor-not-allowed bg-gray-100"
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
                  readOnly={isFieldLocked("descriptions")}
                  className={` rounded-lg h-28 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("descriptions")
                    ? "focus:ring-1 focus:ring-blue-300 text-black"
                    : "text-black cursor-not-allowed bg-gray-100"
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
                  readOnly={isFieldLocked("tindak_lanjut")}
                  className={` rounded-lg h-28 w-full bg-white border border-gray-300 outline-none px-3 shadow-sm ${!isFieldLocked("tindak_lanjut")
                    ? "focus:ring-1 focus:ring-blue-300 text-black"
                    : "text-black cursor-not-allowed bg-gray-100"
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
                    className={`bg-gray-100 px-3 py-1 rounded-lg text-sm font-bold ring-1 ring-gray-300 text-black ${canEditMain
                      ? "cursor-pointer hover:bg-gray-200"
                      : "opacity-50 cursor-not-allowed"
                      }`}
                  >
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isFieldLocked("visit_image")}
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

        {/* Riwayat Perubahan PIC */}
        {!loading && picChangeHistory && picChangeHistory.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-md font-bold text-gray-800 mb-2">Riwayat Perubahan PIC</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {picChangeHistory.map((history, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center mb-2 border-b pb-1">
                    <span className="font-semibold text-gray-700">Diubah oleh: {history.changed_by_name}</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(history.changed_at).toLocaleString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {history.changes?.map((change: any, cIdx: number) => (
                      <div key={cIdx} className="grid grid-cols-[1fr_1fr_auto_1fr] gap-2 items-center">
                        <span className="font-medium text-gray-600">{change.label}</span>
                        <span className="text-red-500 line-through truncate text-right" title={change.old_value}>{change.old_value || "-"}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium truncate" title={change.new_value}>{change.new_value || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (canEditMain || (isRescheduleOnly && isReschedule)) && (
          <div className="px-6 pb-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 w-32 rounded-full bg-blue-600 text-white font-bold ..."
            >
              {saving ? "Saving..." : isRescheduleOnly ? "Reschedule" : "Update"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
