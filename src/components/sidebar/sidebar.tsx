"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Role, MenuSection } from "@/lib/menu";
import { getMenuByRole } from "@/lib/menu";
import { useSession } from "@/components/session/SessionProvider";
import NotificationMenu from "@/components/modals/NotificationMenu";
import * as Icons from "lucide-react";
import { Menu, X, ChevronUp, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarScrollProgress, setSidebarScrollProgress] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  // Swipe gesture tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Accordion state (default open)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("sidebarAccordionState");
          if (saved) return JSON.parse(saved);
        } catch (e) {}
      }
      return {};
    },
  );

  const role = user?.role as Role;
  const rawSections: MenuSection[] = user ? getMenuByRole(role) : [];

  const [companies, setCompanies] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/parameters")
      .then(res => res.json())
      .then(json => {
        if (json?.data?.perusahaan) {
          setCompanies(json.data.perusahaan);
        }
      })
      .catch(() => {});
  }, []);

  const sections = useMemo(() => {
    const toTitleCase = (str: string) => {
      if (!str) return "";
      return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    };

    return rawSections.map(section => {
      if (section.title === "FINANCE") {
        return {
          ...section,
          items: companies.map(company => ({
            label: toTitleCase(company),
            href: `/finance?perusahaan=${encodeURIComponent(company || "")}`,
            icon: "Building"
          }))
        };
      }
      if (section.title === "KONTRAK") {
        return {
          ...section,
          items: companies.map(company => ({
            label: toTitleCase(company),
            href: `/kontrak?perusahaan=${encodeURIComponent(company || "")}`,
            icon: "Building"
          }))
        };
      }
      return section;
    });
  }, [rawSections, companies]);

  const toggleSection = (e: React.MouseEvent, title: string) => {
    e.stopPropagation();
    setOpenSections((prev) => {
      const newState = { ...prev, [title]: prev[title] === false };
      try {
        localStorage.setItem("sidebarAccordionState", JSON.stringify(newState));
      } catch (err) {}
      return newState;
    });
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const el = navRef.current;
      if (!el) return;
      const totalHeight = el.scrollHeight - el.clientHeight;
      if (totalHeight <= 0) {
        setSidebarScrollProgress(0);
        return;
      }
      const progress = (el.scrollTop / totalHeight) * 100;
      setSidebarScrollProgress(progress);
    };

    const el = navRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll();
    }
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, [sections]);

  if (loading) {
    return (
      <aside className="fixed inset-y-0 left-0 z-50 flex w-20 flex-col border-r bg-blue-900 dark:bg-[#0d1f3c] items-center justify-center lg:sticky lg:h-screen">
        <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </aside>
    );
  }

  if (!user) return null;

  const userLabel =
    role === "SUPERADMIN"
      ? "SuperAdmin"
      : role === "ADMIN"
        ? "Admin"
        : role === "LEADER"
          ? "Leader"
          : role === "TELEMARKETING"
            ? "Telemarketing"
            : "Sales";

  const isActive = (href: string) => {
    const [basePath, query] = href.split("?");
    // Check if the current pathname matches the basePath
    if (pathname !== basePath && !pathname.startsWith(basePath + "/")) {
      return false;
    }
    // If the menu item has a query string, it must perfectly match the current URL's query parameters
    if (query) {
       const urlParams = new URLSearchParams(query);
       for (const [key, value] of Array.from(urlParams.entries())) {
          if (searchParams.get(key) !== value) return false;
       }
       return true;
    }
    return true;
  };

  const isSectionActive = (section: MenuSection) =>
    section.items.some(item => isActive(item.href));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      setIsOpen(false);
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  // Helper: on mobile when isOpen, labels should always be visible (not rely on hover)
  const labelVisibility = isOpen
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100";

  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          .main-content-area {
            padding-top: 4rem !important;
          }
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Mobile sidebar open: show scrollbar for usability */
        @media (max-width: 1023px) {
          .sidebar-nav-mobile::-webkit-scrollbar {
            width: 3px;
          }
          .sidebar-nav-mobile::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-nav-mobile::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
          }
        }
      `}</style>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-blue-900 dark:bg-[#0d1f3c] z-40 border-b border-white/10 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-extrabold text-white text-lg tracking-wide">
            MabelHubStaging
          </span>
        </div>
        <div className="flex items-center gap-3 text-white">
          <NotificationMenu />
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-blue-900 font-bold text-xs shadow-inner">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Wrapper Div to maintain layout width on desktop */}
      <div className="hidden lg:block w-20 flex-shrink-0 transition-all duration-300" />

      <aside
        suppressHydrationWarning
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 z-50 h-[100dvh] bg-[#1D80D9] dark:bg-[#0d1f3c] text-white transition-all duration-300 ease-in-out flex flex-col group 
          ${isOpen ? "translate-x-0 w-[280px] shadow-2xl shadow-blue-950/50" : "-translate-x-full lg:translate-x-0 w-20 lg:hover:w-[255px] lg:hover:shadow-2xl lg:hover:shadow-blue-950/50"}
        `}
      >
        {/* LOGO / HEAD SECTION */}
        <div className="flex items-center h-20 px-4 flex-shrink-0">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform">
             <Icons.ShieldCheck className="w-6 h-6 text-blue-900" />
          </div>
          <div className={`ml-4 flex flex-col ${labelVisibility} transition-opacity duration-300 whitespace-nowrap overflow-hidden`}>
            <span className="text-sm font-black text-white tracking-[0.1em]">MabelHubStaging</span>
            <span className="text-[10px] text-blue-100 font-medium whitespace-nowrap">Customer Relationship Management</span>
          </div>
          
          {/* Close Button Mobile */}
          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden ml-auto p-2 text-white/80 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* SCROLL PROGRESS */}
        <div className="h-[2px] w-full bg-white/10 relative flex-shrink-0">
          <div 
            className="absolute top-0 left-0 h-full bg-white transition-all duration-150 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ width: `${sidebarScrollProgress}%` }}
          />
        </div>

        {/* MENU */}
        <nav 
          ref={navRef}
          className={`flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-3 ${isOpen ? "sidebar-nav-mobile" : ""}`}
        >
          {sections.map((section) => {
            const SectionIcon = (Icons as any)[section.icon] || Icons.Circle;
            const expanded = openSections[section.title] !== false;
            const hasActiveItem = isSectionActive(section);

            return (
              <div key={section.title} className="space-y-1">
                {/* SECTION HEADER / ICON */}
                <button
                   onClick={(e) => toggleSection(e, section.title)}
                   className={`flex items-center w-full h-12 rounded-xl transition-all duration-200 px-3 
                    ${hasActiveItem && !expanded ? "bg-white text-blue-900" : "text-white/60 hover:text-white hover:bg-white/10"}
                   `}
                >
                  <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center mr-4 
                    ${hasActiveItem && !expanded ? "text-blue-900" : "text-white"}
                  `}>
                    <SectionIcon className="w-5 h-5" />
                  </div>
                  <div className={`flex-1 flex items-center justify-between overflow-hidden ${labelVisibility} transition-opacity duration-300`}>
                    <span className="text-[10px] font-bold tracking-widest uppercase truncate whitespace-nowrap">
                      {section.title}
                    </span>
                    <ChevronUp
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${expanded ? "" : "transform rotate-180"}`}
                    />
                  </div>
                </button>

                {/* ITEMS */}
                <div 
                  className={`space-y-1 overflow-hidden transition-all duration-300 
                    ${expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
                    ${!isOpen ? "lg:hidden lg:group-hover:block" : ""}
                  `}
                >
                  {section.items.map((item) => {
                    const ItemIcon = (Icons as any)[item.icon] || Icons.Circle;
                    const active = isActive(item.href);
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center h-11 rounded-xl transition-all duration-200 px-3 pl-4 group/item
                          ${active 
                            ? "bg-white text-blue-900 shadow-lg shadow-white/10" 
                            : "text-white/60 hover:bg-white/10 hover:text-white active:bg-white/20"}
                        `}
                      >
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-4">
                          <ItemIcon className={`w-4 h-4 ${active ? "text-blue-900" : "text-white/40 group-hover/item:text-white"}`} />
                        </div>
                        <span className={`whitespace-nowrap font-medium text-base ${labelVisibility} transition-opacity duration-300 ${active ? "text-blue-900" : ""}`}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* PROFILE & LOGOUT SECTION */}
        <div className="mt-auto border-t border-white/10 bg-black/20 dark:bg-black/40">
            {/* USER PROFILE */}
            <div className="px-4 py-4 flex items-center overflow-hidden">
                 <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white flex items-center justify-center text-blue-900 dark:text-[#0d1f3c] font-bold text-lg shadow-lg">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                 </div>
                 <div className={`ml-4 ${labelVisibility} transition-opacity duration-300 flex flex-col min-w-0`}>
                    <span className="text-white font-semibold truncate text-sm">{user.fullName}</span>
                    <span className="text-blue-100 dark:text-blue-300 font-bold text-[10px] tracking-wider">{userLabel.toUpperCase()}</span>
                 </div>
            </div>

            {/* LOGOUT */}
            <div className="p-3">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center justify-center h-12 w-full rounded-xl bg-white/10 text-white hover:bg-white hover:text-blue-900 dark:hover:text-[#0d1f3c] active:bg-white/20 transition-all duration-200 group/logout"
              >
                 <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center group-hover/logout:text-blue-900">
                    <Icons.LogOut className="w-5 h-5" />
                 </div>
                 <span className={`font-bold text-[10px] tracking-widest ${labelVisibility} transition-opacity duration-300 overflow-hidden whitespace-nowrap`}>
                    LOGOUT
                 </span>
              </button>
            </div>
        </div>
      </aside>
    </>
  );
}
