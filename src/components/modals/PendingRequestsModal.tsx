"use client";

import React from "react";
import { normalizeRing } from "@/lib/ring";

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
          "relative mt-16 w-[80%] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10",
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

function StatusPill({ value }: { value?: string }) {
  const v = normalizeRing(value) || "-";
  const isB2G =
    v.includes("RING 1") ||
    v.includes("RING 2") ||
    v.includes("RING 3");
  const isB2B = v.includes("RING 4");

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold",
        "ring-1 ring-black/10",
        isB2G && "bg-blue-50 text-blue-700",
        isB2B && "bg-emerald-50 text-emerald-700",
        !isB2G && !isB2B && "bg-gray-50 text-gray-700",
      )}
    >
      {v}
    </span>
  );
}

export default function PendingRequestsModal({
  open,
  onClose,
  pending,
  pendingLoading,
  busyId,
  approveRequest,
  rejectRequest,
}: any) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="REQUEST PENDING"
      subtitle="Daftar instansi dari USER/LEADER yang menunggu persetujuan."
      widthClass="item-center max-w-8xl"
    >
      {pendingLoading ? (
        <div className="py-12 text-center text-md text-black/60">
          Loading...
        </div>
      ) : pending.length === 0 ? (
        <div className="py-12 text-center text-sm text-black/60">
          Tidak ada request.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-md">
              <thead className="bg-white">
                <tr>
                  {[
                    "Kota",
                    "KLPD",
                    "Institusi",
                    "Satuan Kerja",
                    "PIC",
                    "No PIC",
                    "Jabatan",
                    "Role",
                    "Segmen",
                    "Aksi",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-black/10 px-4 py-3 text-left text-md font-bold tracking-wide text-black"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white">
                {pending.map((p: any) => (
                  <tr key={p._id} className="border-t border-black/10">
                    <td className="px-4 py-4">{p.kota_kab ?? "-"}</td>
                    <td className="px-4 py-4">{p.klpd ?? "-"}</td>
                    <td className="px-4 py-4">
                      {p.institusi_kerja ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      {p.satuan_kerja ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      {p.pic_default?.nama ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      {p.pic_default?.no_telp ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      {p.pic_default?.jabatan ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      {p.pic_default?.role ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill value={p.status_ring} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyId === p._id}
                          onClick={() => approveRequest(p._id)}
                          className="h-10 rounded-xl bg-blue-500 px-4 text-xs font-extrabold text-white/95 hover:bg-blue-600 disabled:opacity-50"
                        >
                          {busyId === p._id ? "..." : "APPROVE"}
                        </button>
                        <button
                          disabled={busyId === p._id}
                          onClick={() => rejectRequest(p._id)}
                          className="h-10 rounded-xl bg-red-500 px-4 text-xs font-extrabold text-white/95 hover:bg-red-600 disabled:opacity-50"
                        >
                          REJECT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black/10 px-5 py-4 text-xs text-black/60">
            Total pending:{" "}
            <b className="text-black">{pending.length}</b>
          </div>
        </div>
      )}
    </Modal>
  );
}
