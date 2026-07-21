import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Donation } from "../types";

const NAV = [
  { icon: "📊", label: "Dashboard", active: false },
  { icon: "🍽️", label: "Rescues", active: true },
  { icon: "📦", label: "Inventory", active: false },
  { icon: "🧑‍🤝‍🧑", label: "Volunteers", active: false },
  { icon: "⚙️", label: "Settings", active: false },
];

const STATUS_STYLE: Record<string, string> = {
  available: "bg-brand-100 text-brand-700",
  reserved: "bg-amber-100 text-amber-700",
  picked_up: "bg-blue-100 text-blue-700",
  delivered: "bg-blue-100 text-blue-700",
  completed: "bg-slate-200 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
};

interface AdminStats {
  foodSavedKg: number;
  platformGrowth: { totalNgos: number; totalRestaurants: number };
  activeUsers: number;
}

export default function AdminDonations() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/donations", { params: { status: status || undefined, page, limit: 8 } })
      .then((res) => {
        setDonations(res.data.data ?? []);
        setPagination(res.data.pagination ?? { total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => {
    api
      .get("/analytics/admin")
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const forceDelete = async (id: string) => {
    if (!confirm("Remove this donation from the platform?")) return;
    setActionError(null);
    setDeleting(id);
    try {
      await api.delete(`/admin/donations/${id}`, { data: { reason: "Removed by admin" } });
      setDonations((prev) => prev.filter((d) => d._id !== id));
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? "Unable to remove this donation.");
    } finally {
      setDeleting(null);
    }
  };

  const expiryLabel = (donation: Donation) => {
    if (donation.status === "expired") return "Expired";
    const diffMs = new Date(donation.expiryTime).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
    const hours = Math.floor(diffMs / 3_600_000);
    const mins = Math.floor((diffMs % 3_600_000) / 60_000);
    return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 flex-col border-r border-slate-100 bg-white p-5 md:flex">
        <div className="flex items-center gap-2 text-brand-700">
          <span className="text-xl">🍽️</span>
          <div>
            <div className="font-bold leading-tight">PlateForward</div>
            <div className="text-[11px] font-semibold text-slate-400">Admin Console</div>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <div
              key={n.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                n.active ? "bg-brand-600 text-white" : "cursor-not-allowed text-slate-400"
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h1 className="text-2xl font-extrabold text-slate-900">Donation Management</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">🔔</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <option value="">Status: All</option>
              {Object.keys(STATUS_STYLE).map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold text-slate-400">
              {pagination.total} total donation{pagination.total === 1 ? "" : "s"}
            </span>
          </div>

          {actionError && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Donation Item</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Expiry Time</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Restaurant</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && donations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No donations match this filter.
                    </td>
                  </tr>
                )}
                {donations.map((d) => (
                  <tr key={d._id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{d.title}</div>
                      <div className="text-xs text-slate-400">{d.foodType}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                          STATUS_STYLE[d.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{expiryLabel(d)}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {d.quantity} {d.unit}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{d.restaurant?.restaurantName}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => forceDelete(d._id)}
                        disabled={deleting === d._id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === d._id ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                <span>
                  Page {page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>

          {stats && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl">♻️</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  {Math.round(stats.foodSavedKg * 2.20462)} lbs
                </div>
                <div className="text-xs font-semibold text-slate-400">Total Food Saved</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl">🤝</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  {stats.platformGrowth.totalNgos}
                </div>
                <div className="text-xs font-semibold text-slate-400">Partner NGOs</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl">⚡</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  {stats.activeUsers}
                </div>
                <div className="text-xs font-semibold text-slate-400">Active Users (30d)</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
