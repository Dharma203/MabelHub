"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { useSession } from "@/components/session/SessionProvider";
import ConfirmModal from "@/components/modals/ConfirmModal";

type EProcRow = {
  requestId: string;
  requestor: string;
  pemohon: string;
  lokasi: string;
  segmen: string;
  deadlineUsulan: string | Date;
  tanggalSubmit: string | Date;
  catatan?: string;
  takenByAdminId?: string | null;
  takenByAdminName?: string | null;
  takenAt?: string | Date | null;

  items?: any[];

  // Finance Fields
  tanggalKontrak?: string;
  nominalKontrak?: number | string;
  tanggalPembayaran?: string;
  nominalPembayaran?: number | string;
};

function fmtDate(d: string | Date | undefined | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function fmtDateTime(d: string | Date | undefined | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`;
}

async function apiListTakeable(): Promise<EProcRow[]> {
  const res = await fetch("/api/e-procurement/requests?mode=takeable", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return (json?.data ?? []) as EProcRow[];
}

async function apiTake(requestId: string) {
  const res = await fetch(
    `/api/e-procurement/requests/${encodeURIComponent(requestId)}/take`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ adminId/adminName TIDAK dikirim lagi (ambil dari session di server)
      body: JSON.stringify({}),
    },
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal TAKE");
  return (json?.data ?? null) as EProcRow | null;
}

export default function EProcurementResponsePage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [rows, setRows] = useState<EProcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [confirmTakeId, setConfirmTakeId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const [openDetail, setOpenDetail] = useState<string | null>(null);

  // ✅ Guard: hanya ADMIN / SUPERADMIN
  useEffect(() => {
    if (!sessionLoading && user) {
      if (user.role !== "SUPERADMIN" && user.role !== "ADMIN") {
        router.replace("/dashboard-request");
      }
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (sessionLoading) return;
      if (!user) return;

      setLoading(true);
      setError("");
      const data = await apiListTakeable();
      if (mounted) setRows(data);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [sessionLoading, user]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const timeA = new Date(a.tanggalSubmit).getTime();
      const timeB = new Date(b.tanggalSubmit).getTime();
      return timeA - timeB; // Oldest first
    });
  }, [rows]);

  const isEmpty = useMemo(
    () => !loading && sortedRows.length === 0,
    [loading, sortedRows],
  );

  async function handleConfirmTake() {
    if (!confirmTakeId) return;
    const reqId = confirmTakeId;

    try {
      setError("");
      setTakingId(reqId);

      await apiTake(reqId);

      // remove from takeable list
      setRows((prev) => prev.filter((x) => x.requestId !== reqId));
    } catch (e: any) {
      setError(e?.message ?? "Gagal mengambil request");
    } finally {
      setTakingId(null);
      setConfirmTakeId(null);
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex relative z-10">


        <div className="flex-1 p-3 sm:p-6">
          <div className="px-3 pt-2 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl pl-4 font-extrabold text-black drop-shadow-sm">
                  E-PROCUREMENT REQUEST
                </div>
                <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                  Request e-procurement yang bisa diambil admin.
                </div>
              </div>
            </div>

            {/* Main container */}
            <div className="mt-8 rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-200">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Request List
                </h3>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
                  {sortedRows.length} requests
                </span>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-slate-700">Loading...</div>
              ) : isEmpty ? (
                <div className="p-10 text-center text-sm text-slate-700">
                  Tidak ada request yang bisa diambil.
                </div>
              ) : (
                <div className="w-full overflow-x-hidden sm:overflow-x-auto">
                  <table className="w-full text-sm border-collapse block lg:table">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-semibold hidden lg:table-header-group">
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Request ID
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Requestor
                        </th>

                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Total Barang
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Total Qty
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Tanggal Masuk
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Deadline
                        </th>
                        <th className="px-5 py-4 text-center whitespace-nowrap">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="block lg:table-row-group">
                      {sortedRows.map((r) => {
                        const isOpen = openDetail === r.requestId;
                        const isTaking = takingId === r.requestId;

                        return (
                          <FragmentRow
                            key={r.requestId}
                            r={r}
                            isOpen={isOpen}
                            isTaking={isTaking}
                            onToggle={() =>
                              setOpenDetail(isOpen ? null : r.requestId)
                            }
                            onTake={() => setConfirmTakeId(r.requestId)}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {error ? (
              <div className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="h-10" />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmTakeId}
        loading={takingId === confirmTakeId}
        title="Konfirmasi Pengambilan"
        message={`Apakah Anda yakin ingin TAKE request ${confirmTakeId}?`}
        confirmText="TAKE"
        onConfirm={handleConfirmTake}
        onCancel={() => setConfirmTakeId(null)}
      />
    </div>
  );
}

const NOW = Date.now();

function FragmentRow({
  r,
  isOpen,
  isTaking,
  onToggle,
  onTake,
}: {
  r: EProcRow;
  isOpen: boolean;
  isTaking: boolean;
  onToggle: () => void;
  onTake: () => void;
}) {
  const isDelayed =
    NOW - new Date(r.tanggalSubmit).getTime() > 3 * 24 * 60 * 60 * 1000;

  return (
    <>
      <tr
        className={`block lg:table-row border border-slate-200 lg:border-0 border-b lg:border-b border-slate-100/80 hover:bg-slate-50 cursor-pointer transition-colors mb-4 lg:mb-0 rounded-xl lg:rounded-none p-4 lg:p-0 shadow-sm lg:shadow-none bg-white ${isOpen ? "bg-indigo-50/20" : isDelayed ? "bg-rose-50/40" : ""
          }`}
        onClick={onToggle}
        title="Klik untuk lihat detail"
      >
        <td className="px-1 py-2 sm:px-5 lg:py-4 font-semibold text-slate-800 flex justify-between items-center lg:table-cell border-b lg:border-0 border-slate-100 border-dashed">
          <span className="lg:hidden text-[10px] font-bold text-slate-400">REQUEST ID</span>
          <div className="flex items-center justify-end gap-2 text-right">
            {r.requestId}
            {isDelayed && (
              <span
                title="Mendesak (>3 hari)"
                className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"
              />
            )}
          </div>
        </td>
        <td className="px-1 py-2 sm:px-5 lg:py-4 text-slate-600 flex justify-between items-center lg:table-cell border-b lg:border-0 border-slate-100 border-dashed">
          <span className="lg:hidden text-[10px] font-bold text-slate-400">REQUESTOR</span>
          <span className="text-right">{r.requestor}</span>
        </td>
        <td className="px-1 py-2 sm:px-5 lg:py-4 text-slate-600 font-medium flex justify-between items-center lg:table-cell border-b lg:border-0 border-slate-100 border-dashed">
          <span className="lg:hidden text-[10px] font-bold text-slate-400">TOTAL BARANG</span>
          <span className="text-right">{r.items?.length || 0} Barang</span>
        </td>
        <td className="px-1 py-2 sm:px-5 lg:py-4 flex justify-between items-center lg:table-cell border-b lg:border-0 border-slate-100 border-dashed">
          <span className="lg:hidden text-[10px] font-bold text-slate-400">TOTAL QTY</span>
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            {r.items?.reduce((acc, it) => acc + (Number(it.qty) || 0), 0) || 0} Qty
          </span>
        </td>
        <td className="px-1 py-2 sm:px-5 lg:py-4 text-slate-600 flex justify-between items-center lg:table-cell border-b lg:border-0 border-slate-100 border-dashed">
          <span className="lg:hidden text-[10px] font-bold text-slate-400">TANGGAL MASUK</span>
          <span className="text-right">{fmtDate(r.tanggalSubmit)}</span>
        </td>
        <td
          className={`px-1 py-2 sm:px-5 lg:py-4 font-medium flex justify-between items-center lg:table-cell border-b lg:border-0 border-slate-100 border-dashed ${isDelayed ? "text-rose-600" : "text-slate-600"}`}
        >
          <span className="lg:hidden text-[10px] font-bold text-slate-400 text-slate-400">DEADLINE</span>
          <span className="text-right">{fmtDate(r.deadlineUsulan)}</span>
        </td>

        <td className="px-1 py-3 sm:px-5 lg:py-4 text-center lg:table-cell mt-2 lg:mt-0 w-full sm:w-auto">
          <button
            disabled={isTaking}
            onClick={(e) => {
              e.stopPropagation();
              onTake();
            }}
            className={[
              "h-10 sm:h-8 w-full sm:w-auto rounded-xl sm:rounded-full px-5 text-xs font-bold transition-all flex items-center justify-center mx-auto shadow-sm",
              isTaking
                ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed"
                : isDelayed
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 active:scale-95"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-95",
            ].join(" ")}
          >
            {isTaking ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-slate-500"
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
                TAKING...
              </>
            ) : isDelayed ? (
              "TAKE NOW"
            ) : (
              "TAKE"
            )}
          </button>
        </td>
      </tr>

      {isOpen ? (
        <tr className="border border-slate-200 lg:border-0 lg:border-b sm:border-slate-100 bg-slate-50/50 block lg:table-row relative sm:static -mt-6 lg:mt-0 z-0 lg:z-auto rounded-b-xl lg:rounded-none pt-4 sm:pt-0 pb-2 lg:pb-0">
          <td colSpan={7} className="px-5 py-5 text-sm block lg:table-cell">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
              <div>
                <span className="font-semibold text-slate-700">
                  Tanggal Submit:
                </span>{" "}
                <span className="text-slate-600">
                  {fmtDateTime(r.tanggalSubmit)}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Catatan:</span>{" "}
                <span className="text-slate-600">
                  {r.catatan?.trim() ? r.catatan : "-"}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 shadow-sm rounded-xl p-6 bg-white w-full mb-6">
              <h4 className="font-semibold text-slate-800 mb-4 inline-flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                <svg
                  className="w-4 h-4 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Rincian Items ({r.items?.length || 0})
              </h4>
              {r.items && r.items.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 shadow-sm rounded-xl bg-white">
                  <table className="w-full text-xs text-left block lg:table">
                    <thead className="bg-slate-50 border-b border-slate-100 hidden lg:table-header-group">
                      <tr className="text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="px-3 py-3 font-semibold">Merek</th>
                        <th className="px-3 py-3 font-semibold">
                          Sub Kategori
                        </th>
                        <th className="px-3 py-3 font-semibold">Spesifikasi</th>
                        <th className="px-3 py-3 font-semibold">Qty</th>
                        <th className="px-3 py-3 font-semibold pl-4">Pagu</th>
                        <th className="px-3 py-3 font-semibold">
                          Harga Tayang
                        </th>
                        <th className="px-3 py-3 font-semibold">
                          Link Inaproc
                        </th>
                        <th className="px-3 py-3 font-semibold">Link ECom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 block lg:table-row-group">
                      {r.items.map((it, idx) => (
                        <tr
                          key={it.id || idx}
                          className="hover:bg-slate-50 transition-colors block lg:table-row py-2 sm:py-0 border-b border-slate-100 lg:border-0"
                        >
                          <td className="px-3 py-1.5 lg:py-3 font-medium text-slate-800 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400">MEREK</span>
                            <span className="text-right lg:text-left">{it.merek || "-"}</span>
                          </td>
                          <td className="px-3 py-1.5 lg:py-3 text-slate-600 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400 whitespace-nowrap">SUB KATEGORI</span>
                            <span className="text-right lg:text-left">{it.subKategori || "-"}</span>
                          </td>
                          <td
                            className="px-3 py-1.5 lg:py-3 text-slate-600 sm:line-clamp-2 flex flex-col lg:table-cell items-start gap-1"
                            title={it.spesifikasi}
                          >
                            <span className="lg:hidden font-bold text-[10px] text-slate-400 w-full">SPESIFIKASI</span>
                            <span className="text-left w-full bg-slate-50 sm:bg-transparent p-2 lg:p-0 rounded-md lg:rounded-none mt-1 lg:mt-0 text-xs sm:text-[11px]">{it.spesifikasi || "-"}</span>
                          </td>
                          <td className="px-3 py-1.5 lg:py-3 font-semibold text-slate-700 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400">QTY</span>
                            <span className="text-right lg:text-left">{it.qty ?? "-"}</span>
                          </td>
                          <td className="px-3 py-1.5 lg:py-3 sm:pl-4 text-slate-600 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400">PAGU</span>
                            <span className="text-right lg:text-left">{it.paguPerItem || "-"}</span>
                          </td>
                          <td className="px-3 py-1.5 lg:py-3 text-slate-600 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400">HARGA TAYANG</span>
                            <span className="text-right lg:text-left">{it.hargaTayang || "-"}</span>
                          </td>
                          <td className="px-3 py-1.5 lg:py-3 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400">LINK INAPROC</span>
                            {it.linkInaproc ? (
                              <a
                                href={it.linkInaproc}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()} // in case
                              >
                                Link{" "}
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 lg:py-3 flex justify-between lg:table-cell items-start gap-2">
                            <span className="lg:hidden font-bold text-[10px] text-slate-400">LINK ECOM</span>
                            {it.linkEcom ? (
                              <a
                                href={it.linkEcom}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Link{" "}
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-slate-500 text-xs flex items-center gap-2 p-4 border border-dashed border-slate-200 rounded-lg bg-white">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Tidak ada item rincian
                </div>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
