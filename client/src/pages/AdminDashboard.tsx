import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import type { Role } from "../types";

interface AdminStats {
  platformGrowth: {
    totalUsers: number;
    totalRestaurants: number;
    totalNgos: number;
    totalVolunteers: number;
    growthRatePercent: number | null;
  };
  totalDonations: number;
  totalReservations: number;
  foodSavedKg: number;
  co2ReducedKg: number;
  mealsServed: number;
  activeUsers: number;
}

interface HeatmapPoint {
  city: string;
  foodType: string;
  weight: number;
}

const ROLES: Role[] = ["restaurant", "ngo", "volunteer", "admin"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [roles, setRoles] = useState<Role[]>([]);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get("/analytics/admin"), api.get("/analytics/admin/heatmap")])
      .then(([statsRes, heatmapRes]) => {
        setStats(statsRes.data.data);
        setHeatmap(heatmapRes.data.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const cityTotals = heatmap.reduce<Record<string, number>>((acc, p) => {
    acc[p.city] = (acc[p.city] ?? 0) + p.weight;
    return acc;
  }, {});
  const topCities = Object.entries(cityTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const toggleRole = (r: Role) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const sendBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    setSendMsg(null);
    setSendErr(null);
    setSending(true);
    try {
      await api.post("/notifications/broadcast", {
        title,
        message,
        priority,
        roles: roles.length ? roles : undefined,
      });
      setSendMsg("Broadcast sent.");
      setTitle("");
      setMessage("");
      setRoles([]);
    } catch (err: any) {
      setSendErr(err?.response?.data?.message ?? "Unable to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-slate-900">The Command Center</h1>
          <div className="flex gap-3 text-sm font-bold">
            <Link to="/admin/donations" className="text-brand-700 hover:text-brand-800">
              Donation Management →
            </Link>
            <Link to="/admin/analytics" className="text-brand-700 hover:text-brand-800">
              Platform Analytics →
            </Link>
          </div>
        </div>

        {loading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white" />}

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.platformGrowth.totalRestaurants}
              </div>
              <div className="text-xs font-semibold text-slate-400">Restaurants</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.platformGrowth.totalVolunteers}
              </div>
              <div className="text-xs font-semibold text-slate-400">Volunteers</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.platformGrowth.totalNgos}
              </div>
              <div className="text-xs font-semibold text-slate-400">Partner NGOs</div>
            </div>
            <div className="rounded-2xl bg-brand-50 p-5">
              <div className="text-2xl font-extrabold text-brand-700">{stats.mealsServed}</div>
              <div className="text-xs font-semibold text-brand-600">Meals Served</div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Donation Activity by City</h2>
            <p className="mt-1 text-xs text-slate-400">
              Weighted by quantity, from active donation pickup locations. (No map tiles are
              wired up server-side, so this is shown as a ranked list instead of a live map.)
            </p>
            <div className="mt-4 space-y-2">
              {topCities.length === 0 && (
                <p className="text-sm text-slate-400">No geotagged donations yet.</p>
              )}
              {topCities.map(([city, weight]) => (
                <div key={city} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{city}</span>
                  <span className="font-bold text-slate-900">{weight}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={sendBroadcast} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Broadcast Center</h2>
            <p className="mt-1 text-xs text-slate-400">Send a notification to users by role.</p>

            {sendMsg && <p className="mt-3 text-sm text-brand-700">{sendMsg}</p>}
            {sendErr && <p className="mt-3 text-sm text-red-600">{sendErr}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${
                    roles.includes(r)
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              No roles selected sends to everyone.
            </p>

            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>

            <button
              type="submit"
              disabled={sending}
              className="mt-4 w-full rounded-xl bg-brand-700 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {sending ? "Sending…" : "▶ Launch Broadcast"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
