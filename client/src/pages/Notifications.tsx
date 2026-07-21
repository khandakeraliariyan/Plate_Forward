import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import type { Notification } from "../types";

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get("/notifications", { params: { limit: 50 } })
      .then((res) => setNotifications(res.data.data.notifications ?? []))
      .catch(() => setError("Unable to load notifications."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch("/notifications/read-all");
    } catch {
      load();
    }
  };

  const remove = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      load();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900">Inbox</h1>
            <p className="mt-1 text-sm text-slate-500">
              Stay updated on your food rescue activity.
            </p>
          </div>
          <button
            onClick={markAllRead}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            ✓ Mark All Read
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 space-y-3">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}

          {!loading && notifications.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              You're all caught up — no notifications yet.
            </p>
          )}

          {notifications.map((n) => (
            <div
              key={n._id}
              className={`flex items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ${
                n.isRead ? "" : "ring-1 ring-brand-200"
              }`}
            >
              <div className="flex gap-3">
                {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{n.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        PRIORITY_STYLE[n.priority] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {n.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 text-xs font-bold">
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n._id)}
                    className="text-brand-700 hover:text-brand-800"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  onClick={() => remove(n._id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
