"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-blue-50 via-sky-100 to-indigo-100">
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            {/* Left: copy */}
            <div className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-medium text-blue-700">
                VISIT TRACKING • ERROR
              </div>

              <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900">
                404
              </h1>

              <p className="mt-2 text-lg font-semibold text-slate-800">
                Halaman tidak ditemukan
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Sepertinya kamu nyasar atau link-nya sudah berubah. Kamu bisa
                kembali ke dashboard atau kembali ke halaman sebelumnya.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/dashboard-request")}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 active:scale-[0.99]"
                >
                  Ke Dashboard
                </button>

                <button
                  onClick={() => router.back()}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 active:scale-[0.99]"
                >
                  Kembali
                </button>

                <button
                  onClick={() => router.push("/")}
                  className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-100 hover:bg-red-100 active:scale-[0.99]"
                >
                  Ke Home
                </button>
              </div>

              <div className="mt-8 rounded-2xl bg-white/70 p-4 ring-1 ring-white/60">
                <p className="text-xs font-medium text-slate-500">Tips</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  <li>Periksa kembali URL yang kamu ketik.</li>
                  <li>Kalau link dari menu, coba refresh halaman.</li>
                  <li>Jika tetap error, hubungi admin sistem.</li>
                </ul>
              </div>
            </div>

            {/* Right: illustration */}
            <div className="relative flex items-center justify-center bg-linear-to-br from-blue-600/10 via-sky-600/10 to-indigo-600/10 p-8 md:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.20),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.20),transparent_55%)]" />
              <div className="relative w-full max-w-sm">
                <div className="rounded-3xl border border-white/40 bg-white/60 p-6 shadow-lg backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">
                      Visit Tracking
                    </div>
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                    </div>
                  </div>

                  {/* Simple SVG */}
                  <svg
                    viewBox="0 0 420 220"
                    className="mt-6 h-auto w-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0" stopColor="rgba(37,99,235,0.85)" />
                        <stop offset="1" stopColor="rgba(99,102,241,0.85)" />
                      </linearGradient>
                    </defs>

                    <rect
                      x="20"
                      y="20"
                      width="380"
                      height="180"
                      rx="18"
                      fill="rgba(255,255,255,0.55)"
                      stroke="rgba(255,255,255,0.55)"
                    />

                    <path
                      d="M60 150 C110 80, 160 170, 210 110 C260 50, 310 160, 360 85"
                      fill="none"
                      stroke="url(#g1)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />

                    <circle cx="210" cy="110" r="18" fill="url(#g1)" />
                    <circle cx="210" cy="110" r="7" fill="white" />

                    <text
                      x="60"
                      y="70"
                      fontSize="16"
                      fill="rgba(15,23,42,0.75)"
                      fontFamily="ui-sans-serif, system-ui"
                      fontWeight="700"
                    >
                      Oops! Route missing
                    </text>

                    <text
                      x="60"
                      y="95"
                      fontSize="12"
                      fill="rgba(15,23,42,0.55)"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      The page you&apos;re looking for doesn&apos;t exist.
                    </text>
                  </svg>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/60">
                      <p className="text-[10px] text-slate-500">Status</p>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        Not Found
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/60">
                      <p className="text-[10px] text-slate-500">Module</p>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        Routing
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/60">
                      <p className="text-[10px] text-slate-500">Action</p>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        Redirect
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-slate-600">
                  pastikan kamu punya akses role yang sesuai.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/50 px-8 py-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} MabelHub</span>
            <span className="font-medium text-slate-600">Error Code: 404</span>
          </div>
        </div>
      </div>
    </div>
  );
}
