"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Briefcase, Megaphone, Info, Building, X, Clock, CheckCheck, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: "TASK" | "ANNOUNCEMENT" | "REQUEST" | "SYSTEM";
  isRead: boolean;
  link?: string;
  createdAt: string;
};

const TYPE_CONFIG = {
  TASK: {
    icon: Briefcase,
    bgClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-100 dark:border-blue-900/30",
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    bgClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-100 dark:border-amber-900/30",
  },
  REQUEST: {
    icon: Building,
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-100 dark:border-emerald-900/30",
  },
  SYSTEM: {
    icon: Info,
    bgClass: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-100 dark:border-purple-900/30",
  },
  DEFAULT: {
    icon: Info,
    bgClass: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700",
  },
};

export default function NotificationMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for Auto Popup
  const [popup, setPopup] = useState<NotificationItem | null>(null);
  const isFirstLoad = useRef(true);
  const prevUnreadCount = useRef(0);

  // Resolve config for popup if it exists
  const popupConfig = popup ? (TYPE_CONFIG[popup.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.DEFAULT) : null;
  const PopupIcon = popupConfig ? popupConfig.icon : null;

  useEffect(() => {
    fetchUnreadCount();

    // Polling setiap 30 detik untuk update badge secara real-time
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        const newCount = data.unreadCount || 0;

        // Show popup if it's not the initial load and the count has increased
        if (!isFirstLoad.current && newCount > prevUnreadCount.current) {
          fetchLatestForPopup();
        }

        if (isFirstLoad.current) {
          isFirstLoad.current = false;
        }

        prevUnreadCount.current = newCount;
        setUnreadCount(newCount);
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  }

  async function fetchLatestForPopup() {
    try {
      const res = await fetch("/api/notifications?limit=1");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setPopup(data.items[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch latest for popup", err);
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleMenu() {
    const newState = !open;
    setOpen(newState);
    if (newState) {
      fetchNotifications();
    }
  }

  async function markAsRead(id: string, link?: string) {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        prevUnreadCount.current = next;
        return next;
      });

      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });

      if (link) {
        setOpen(false);
        router.push(link);
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  }

  async function markAllAsRead() {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      prevUnreadCount.current = 0;

      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Baru saja";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} mnt yang lalu`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className="relative grid h-12 w-12 place-items-center rounded-full bg-white dark:bg-slate-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-slate-700 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 dark:bg-rose-600 px-1 text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Modal Notification List (Centered) */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
          <div className="w-[90%] max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-200 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    {unreadCount} Baru
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Tandai dibaca
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="max-h-[350px] overflow-y-auto mb-6 pr-1 flex flex-col gap-2.5 scrollbar-thin">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-12 gap-3">
                  <span className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 animate-pulse">Memuat pesan...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-14 w-14 rounded-full bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center mb-3">
                    <BellRing className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada pesan</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Anda akan menerima pemberitahuan di sini.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.DEFAULT;
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={`group relative flex items-start gap-3.5 cursor-pointer rounded-xl p-3.5 transition-all duration-200 border ${
                        !n.isRead
                          ? "bg-blue-50/40 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/20 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                      onClick={() => {
                        markAsRead(n.id, n.link);
                      }}
                    >
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${config.bgClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${!n.isRead ? "font-semibold text-slate-900 dark:text-white" : "font-normal text-slate-600 dark:text-slate-400"}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatRelativeTime(n.createdAt)}</span>
                        </div>
                      </div>
                      {!n.isRead && (
                        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)] shrink-0"></span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions */}
            <div>
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.98]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup (Centered Auto-Trigger) */}
      {popup && popupConfig && PopupIcon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
          <div className="w-[90%] max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-200 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pemberitahuan Baru
                </h3>
              </div>
              <button
                onClick={() => setPopup(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div
              className="group relative flex items-start gap-4 cursor-pointer rounded-xl p-4 mb-6 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/20 transition-all duration-200 shadow-sm"
              onClick={() => {
                markAsRead(popup.id, popup.link);
                setPopup(null);
              }}
            >
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${popupConfig.bgClass}`}>
                <PopupIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-relaxed font-semibold text-slate-900 dark:text-white">
                  {popup.message}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Baru saja</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  markAsRead(popup.id, popup.link);
                  setPopup(null);
                }}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
              >
                Lihat Detail
              </button>
              <button
                onClick={() => setPopup(null)}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.98]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
