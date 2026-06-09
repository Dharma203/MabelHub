"use client";

import { useEffect, useState } from "react";

import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmModal from "@/components/modals/ConfirmModal";

type UserRole = "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES" | "TELEMARKETING";

type UserRow = {
  _id: string;
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 6V4h8v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 6l1 16h10l1-16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function apiListUsers(): Promise<UserRow[]> {
  const res = await fetch("/api/users", { cache: "no-store" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Gagal memuat user");
  }
  const json = await res.json();
  return (json?.data ?? []) as UserRow[];
}

async function apiCreateUser(payload: {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
}) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal membuat user");
  return json?.data as UserRow;
}

async function apiUpdateUser(
  id: string,
  payload: Partial<{
    fullName: string;
    email: string;
    username: string;
    password: string;
    role: UserRole;
    isActive: boolean;
  }>,
) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal update user");
  return json?.data as UserRow;
}

async function apiDeleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal menghapus user");
  return true;
}

/** ====== Page ====== **/
export default function AddUserPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  // ✅ Guard UI: kalau bukan superadmin, jangan kasih akses halaman
  useEffect(() => {
    if (!loading && user && user.role !== "SUPERADMIN") {
      router.replace("/dashboard-request"); // atau halaman lain yang kamu mau
    }
  }, [loading, user, router]);

  // list
  const [rows, setRows] = useState<UserRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // add form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("ADMIN");
  const [saving, setSaving] = useState(false);

  // modals
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);

  // edit form state
  const [eFullName, setEFullName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eUsername, setEUsername] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [eRole, setERole] = useState<UserRole>("ADMIN");
  const [eSaving, setESaving] = useState(false);

  // load list (hanya kalau session siap & superadmin)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (loading) return;
      if (!user) return; // middleware biasanya sudah handle
      if (user.role !== "SUPERADMIN") return;

      setListLoading(true);
      setErr("");
      try {
        const data = await apiListUsers();
        if (mounted) setRows(data);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "Gagal memuat user");
      } finally {
        if (mounted) setListLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loading, user]);

  const resetAddForm = () => {
    setFullName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setUserRole("ADMIN");
  };

  const openEdit = (u: UserRow) => {
    setSelected(u);
    setEFullName(u.fullName ?? "");
    setEEmail(u.email ?? "");
    setEUsername(u.username ?? "");
    setEPassword("");
    setERole(u.role ?? "ADMIN");
    setEditOpen(true);
  };

  const openDelete = (u: UserRow) => {
    setSelected(u);
    setDeleteOpen(true);
  };

  const onAdd = async () => {
    try {
      setErr("");
      if (!fullName.trim() || !email.trim() || !username.trim() || !password) {
        setErr("Nama lengkap, email, username, dan password wajib diisi.");
        return;
      }
      setSaving(true);
      const created = await apiCreateUser({
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        role: userRole,
      });
      setRows((prev) => [created, ...prev]);
      resetAddForm();
    } catch (e: any) {
      setErr(e?.message ?? "Gagal menambah user");
    } finally {
      setSaving(false);
    }
  };

  const onSaveEdit = async () => {
    if (!selected) return;
    try {
      setErr("");
      if (!eFullName.trim() || !eEmail.trim() || !eUsername.trim()) {
        setErr("Nama lengkap, email, dan username wajib diisi.");
        return;
      }
      setESaving(true);

      const payload: any = {
        fullName: eFullName.trim(),
        email: eEmail.trim(),
        username: eUsername.trim(),
        role: eRole,
      };
      if (ePassword.trim().length > 0) payload.password = ePassword;

      const updated = await apiUpdateUser(selected._id, payload);
      setRows((prev) =>
        prev.map((x) => (x._id === selected._id ? updated : x)),
      );
      setEditOpen(false);
      setSelected(null);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal edit user");
    } finally {
      setESaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selected) return;
    try {
      setErr("");
      setSaving(true);
      await apiDeleteUser(selected._id);
      setRows((prev) => prev.filter((x) => x._id !== selected._id));
      setDeleteOpen(false);
      setSelected(null);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal hapus user");
    } finally {
      setSaving(false);
    }
  };

  // sementara session masih loading
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-200">
        <div className="flex">
          
          <div className="flex-1 p-6 text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">
        

        <div className="flex-1  w-full p-6">
          <div className="px-7 pt-2 pb-2">
              <div className="text-3xl pl-4 font-extrabold text-black drop-shadow-sm">
                ADD USER
              </div>
            <div className="mt-2 ml-4 text-sm text-neutral-600">
              Kelola Users by (SUPERADMIN)
            </div>

            {/* Form Card */}

            <div className="mt-8 rounded-lg bg-white p-6 ring-1 ring-blue-200 shadow-md">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nama Lengkap">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 w-full rounded bg-white px-3 text-md outline-blue-200 ring-1 ring-gray-300 shadow-md"
                  />
                </Field>

                <Field label="Email">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded bg-white px-3 text-md outline-blue-200 ring-1 ring-gray-300 shadow-md"
                  />
                </Field>

                <Field label="Username">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10 w-full rounded bg-white px-3 text-md outline-blue-200 ring-1 ring-gray-300 shadow-md"
                  />
                </Field>

                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded bg-white px-3 text-md outline-blue-200 ring-1 ring-gray-300 shadow-md"
                  />
                </Field>

                <Field label="Role">
                  <SearchableSelect
                    value={userRole}
                    onChange={(val: string) => setUserRole(val as UserRole)}
                    options={[
                      { value: "SUPERADMIN", label: "Superadmin" },
                      { value: "ADMIN", label: "Admin" },
                      { value: "LEADER", label: "Leader" },
                      { value: "SALES", label: "Sales" },
                      { value: "TELEMARKETING", label: "Telemarketing" },
                    ]}
                    className="h-10 border-0"
                    placeholder="Pilih Role..."
                  />
                </Field>

                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onAdd}
                    className={cn(
                      "h-11 rounded-lg px-6 text-md font-extrabold shadow-sm",
                      saving
                        ? "bg-white text-black ring-1 ring-gray-700"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                    )}
                  >
                    {saving ? "SAVING..." : "ADD USER"}
                  </button>
                </div>
              </div>

              {err ? (
                <div className="mt-4 rounded bg-red-100 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              ) : null}
            </div>

            {/* Table */}
            <div className="mt-6 rounded-lg bg-blue-50 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-md">
                  <thead>
                    <tr className="bg-blue-200 text-left text-gray-800">
                      <th className="px-4 py-3 w-12">No</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">User Role</th>
                      <th className="px-4 py-3 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center">
                          Loading...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center">
                          Belum ada user.
                        </td>
                      </tr>
                    ) : (
                      rows.map((u, idx) => (
                        <tr
                          key={u._id}
                          className={cn(
                            "border-t border-neutral-300",
                            idx % 2 === 0
                              ? "bg-neutral-100"
                              : "bg-neutral-200/50",
                          )}
                        >
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3">{u.username}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            {u.role === "SUPERADMIN"
                              ? "Superadmin"
                              : u.role === "ADMIN"
                                ? "Admin"
                                : u.role === "LEADER"
                                  ? "Leader"
                                  : u.role === "TELEMARKETING"
                                  ? "Telemarketing"
                                  : u.role === "SALES"
                                    ? "Sales"
                                    : "Unknown"
                                }
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                className="text-gray-700 hover:text-gray-900"
                                aria-label="Edit"
                              >
                                <IconEdit />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(u)}
                                className="text-gray-700 hover:text-red-600"
                                aria-label="Delete"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="h-10" />
          </div>
        </div>
      </div>

      {/* ===== Edit Modal ===== */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="w-full max-w-6xl rounded-xl bg-white p-10 shadow-lg">
          <div className="text-lg font-extrabold text-gray-900">EDIT USER</div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nama Lengkap">
              <input
                value={eFullName}
                onChange={(e) => setEFullName(e.target.value)}
                className="h-10 w-full rounded bg-white px-3 text-sm ring-1 ring-gray-300"
              />
            </Field>

            <Field label="Email">
              <input
                value={eEmail}
                onChange={(e) => setEEmail(e.target.value)}
                className="h-10 w-full rounded bg-white px-3 text-sm ring-1 ring-gray-300"
              />
            </Field>

            <Field label="Username">
              <input
                value={eUsername}
                onChange={(e) => setEUsername(e.target.value)}
                className="h-10 w-full rounded bg-white px-3 text-sm ring-1 ring-gray-300"
              />
            </Field>

            <Field label="Password (opsional)">
              <input
                type="password"
                value={ePassword}
                onChange={(e) => setEPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diganti"
                className="h-10 w-full rounded bg-white px-3 text-sm ring-1 ring-gray-300"
              />
            </Field>

            <Field label="Role">
              <SearchableSelect
                value={eRole}
                onChange={(val: string) => setERole(val as UserRole)}
                options={[
                  { value: "SUPERADMIN", label: "Superadmin" },
                  { value: "ADMIN", label: "Admin" },
                  { value: "LEADER", label: "Leader" },
                  { value: "SALES", label: "Sales" },
                  { value: "TELEMARKETING", label: "Telemarketing" },
                ]}
                className="h-10 border-0"
                placeholder="Pilih Role..."
              />
            </Field>

            <div className="flex items-end justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-10 rounded-lg bg-red-600 px-5 text-white text-md font-bold"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={eSaving}
                onClick={onSaveEdit}
                className={cn(
                  "h-10 rounded-lg px-5 text-md font-bold",
                  eSaving
                    ? "bg-white text-black"
                    : "bg-blue-600 text-white hover:bg-blue-700",
                )}
              >
                {eSaving ? "SAVING..." : "EDIT USER"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ===== Delete Confirm Modal ===== */}
      {/* ===== Delete Confirm Modal ===== */}
      <ConfirmModal
        open={deleteOpen}
        loading={saving}
        title="Konfirmasi Hapus User"
        message={
          <>
            Apakah Anda yakin ingin menghapus user{" "}
            <span className="font-bold">{selected?.username}</span>?
          </>
        }
        confirmText="HAPUS"
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
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
    <div>
      <div className="mb-1 text-xs font-semibold text-gray-800">{label}</div>
      {children}
    </div>
  );
}

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        // klik di background => close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
