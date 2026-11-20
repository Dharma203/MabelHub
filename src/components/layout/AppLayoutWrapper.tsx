"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar/sidebar";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Halaman login utama "/" dieksklusi dari Sidebar
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[100dvh] bg-blue-50 overflow-hidden relative">
      <Suspense fallback={<div className="w-20 bg-blue-900 h-screen hidden lg:block" />}>
        <Sidebar />
      </Suspense>
      <div 
        className="flex-1 w-full min-w-0 h-[100dvh] overflow-y-auto relative main-content-area"
      >
        {children}
      </div>
    </div>
  );
}
