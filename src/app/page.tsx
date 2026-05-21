"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession(); // ✅ ambil refresh dari provider

  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function checkSession() {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (json?.user) redirectByRole(json.user.role);
    }
    checkSession();
  }, []);

  function redirectByRole(role: string) {
    if (role === "SUPERADMIN" || role === "ADMIN") {
      router.replace("/dashboard-response");
    } else {
      router.replace("/dashboard-request");
    }
  }

  async function onLogin() {
    try {
      setErr("");

      if (!identity.trim() || !password.trim()) {
        setErr("Username dan password wajib diisi.");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Login gagal");

      // ✅ ini kuncinya: update SessionProvider agar Sidebar langsung dapat user
      await refresh();

      // ✅ redirect
      redirectByRole(json?.user?.role);

      // (opsional tapi bagus) paksa server component ikut baca cookie terbaru
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-100 dark:bg-[#0d1117] transition-colors duration-200">
      <div className="flex w-225 rounded-3xl bg-white dark:bg-[#161b22] p-10 shadow-lg border-l-8 border-blue-500 dark:border-blue-600">
        <div className="flex w-1/2 flex-col items-center justify-center">
          <Image
            src="/logo.png"
            alt="MabelHub Logo"
            width={200}
            height={160}
            className="mt-7"
            unoptimized
          />
          <h1 className="text-2xl font-semibold text-black dark:text-white">MabelHub</h1>
        </div>

        <div className="flex w-1/2 flex-col justify-center px-10">
          <h2 className="mb-8 text-center text-3xl font-semibold dark:text-white">LOGIN</h2>

          <div className="mb-5">
            <label className="mb-2 block text-sm dark:text-slate-300">Username</label>
            <input
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("passwordInput")?.focus();
                }
              }}
              placeholder="Username atau Email"
              className="h-11 w-full rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#1e2430] px-3 outline-none focus:ring-2 focus:ring-blue-300 dark:text-white dark:placeholder-slate-500 transition-colors"
            />
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-sm dark:text-slate-300">Password</label>
            <input
              id="passwordInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onLogin();
              }}
              placeholder="Password"
              className="h-11 w-full rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#1e2430] px-3 outline-none focus:ring-2 focus:ring-blue-300 dark:text-white dark:placeholder-slate-500 transition-colors"
            />
          </div>

          {err ? <div className="mb-4 text-sm text-red-600 dark:text-red-400">{err}</div> : null}

          <button
            disabled={loading}
            onClick={onLogin}
            className="h-11 rounded-full bg-blue-600 text-sm text-white transition hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
