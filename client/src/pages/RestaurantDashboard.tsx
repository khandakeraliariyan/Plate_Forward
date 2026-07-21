import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

interface RestaurantAnalytics {
  totalDonations: number;
  completedDonations: number;
  acceptanceRate: number | null;
  foodSaved: { kg: number };
  impactScore: number;
  monthlyTrend: { year: number; month: number; count: number }[];
  topFoodTypes: { foodType: string; count: number }[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function RestaurantDashboard() {
  const [data, setData] = useState<RestaurantAnalytics | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/analytics/restaurant"), api.get("/restaurants/me")])
      .then(([analyticsRes, restaurantRes]) => {
        setData(analyticsRes.data.data);
        setRestaurantName(restaurantRes.data.data?.restaurantName ?? "");
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Unable to load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const chartData =
    data?.monthlyTrend.map((m) => ({
      label: MONTH_LABELS[m.month - 1],
      donations: m.count,
    })) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
              Welcome Back
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900">
              {restaurantName || "Your Restaurant"}
            </h1>
          </div>
          <Link
            to="/donate/new"
            className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
          >
            🍴 Create New Donation
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-white" />}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">{data.totalDonations}</div>
                <div className="text-xs font-semibold text-slate-400">Total Donations</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">
                  {data.completedDonations}
                </div>
                <div className="text-xs font-semibold text-slate-400">Completed</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">{data.foodSaved.kg} kg</div>
                <div className="text-xs font-semibold text-slate-400">Food Saved</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-brand-700">{data.impactScore}%</div>
                <div className="text-xs font-semibold text-slate-400">Impact Score</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">Donation Trends</h2>
                <p className="text-xs text-slate-400">Donations posted per month, last 12 months</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="donations"
                        stroke="#15854a"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">Top Food Types</h2>
                <div className="mt-4 space-y-3">
                  {data.topFoodTypes.length === 0 && (
                    <p className="text-sm text-slate-400">No donations yet.</p>
                  )}
                  {data.topFoodTypes.map((t) => (
                    <div key={t.foodType} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{t.foodType}</span>
                      <span className="font-bold text-slate-900">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
