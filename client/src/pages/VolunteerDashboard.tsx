import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

interface VolunteerAnalytics {
  deliveries: number;
  distance: { totalKm: number; averageKm: number | null };
  averageTimeMinutes: number | null;
  completionRate: number | null;
  rating: { average: number | null; count: number };
}

interface RouteStop {
  type: "pickup" | "dropoff";
  reservationId: string;
  label: string;
  lat: number;
  lng: number;
}

export default function VolunteerDashboard() {
  const [stats, setStats] = useState<VolunteerAnalytics | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRoute = () =>
    api.get("/maps/my-route").then((res) => setStops(res.data.data.orderedStops ?? []));

  useEffect(() => {
    Promise.all([api.get("/analytics/volunteer"), loadRoute()])
      .then(([analyticsRes]) => setStats(analyticsRes.data.data))
      .catch((err) => setError(err?.response?.data?.message ?? "Unable to load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const act = async (stop: RouteStop) => {
    setError(null);
    setActing(stop.reservationId);
    try {
      const action = stop.type === "pickup" ? "pickup" : "deliver";
      await api.patch(`/reservations/${stop.reservationId}/${action}`);
      await loadRoute();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to update this stop.");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Volunteer Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Your delivery stats and active route.</p>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-white" />}

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">{stats.deliveries}</div>
              <div className="text-xs font-semibold text-slate-400">Deliveries</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.distance.totalKm} km
              </div>
              <div className="text-xs font-semibold text-slate-400">Total Distance</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.completionRate ?? "—"}%
              </div>
              <div className="text-xs font-semibold text-slate-400">Completion Rate</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-slate-900">
                {stats.rating.average ?? "—"}
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Rating ({stats.rating.count})
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Active Route</h2>
          <p className="mt-1 text-xs text-slate-400">
            Reservations already assigned to you, in pickup → drop-off order.
          </p>

          <div className="mt-4 space-y-3">
            {!loading && stops.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No active stops right now. New jobs are assigned when a restaurant accepts a
                reservation and you pick it up by reservation link — there's currently no job
                board to browse open reservations from here.
              </p>
            )}

            {stops.map((stop, i) => (
              <div
                key={`${stop.reservationId}-${stop.type}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">
                      {stop.type === "pickup" ? "Pickup" : "Drop-off"}
                    </div>
                    <div className="font-semibold text-slate-800">{stop.label}</div>
                  </div>
                </div>
                <button
                  onClick={() => act(stop)}
                  disabled={acting === stop.reservationId}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  {acting === stop.reservationId
                    ? "Updating…"
                    : stop.type === "pickup"
                      ? "Confirm Pickup"
                      : "Confirm Delivery"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
