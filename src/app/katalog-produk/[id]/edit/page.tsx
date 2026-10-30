"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function EditProductRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  useEffect(() => {
    if (id) {
      router.replace(`/katalog-produk/tambah?id=${id}`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Membuka formulir edit produk...</p>
      </div>
    </div>
  );
}
