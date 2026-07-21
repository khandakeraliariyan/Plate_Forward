import { useEffect, useState } from "react";
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

interface AdminStats {
  platformGrowth: {
    totalUsers: number;
    newUsersLast30Days: number;
    growthRatePercent: number | null;
    monthlyNewUsers: { year: number; month: number; count: number }[];
  };
  foodSavedKg: number;
  co2ReducedKg: number;
  mealsServed: number;
  totalDonations: number;
  totalReservations: number;
  activeUsers: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/admin")
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const chartData =
    data?.platformGrowth.monthlyNewUsers.map((m) => ({
      label: MONTH_LABELS[m.month - 1],
      newUsers: m.count,
    })) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Platform Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Real-time impact tracking across PlateForward.</p>

        {loading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white" />}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">{data.mealsServed}</div>
                <div className="text-xs font-semibold text-slate-400">Meals Served</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">{data.foodSavedKg} kg</div>
                <div className="text-xs font-semibold text-slate-400">Food Saved</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">
                  {data.co2ReducedKg} kg
                </div>
                <div className="text-xs font-semibold text-slate-400">CO2-eq Avoided</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">{data.activeUsers}</div>
                <div className="text-xs font-semibold text-slate-400">Active Users (30d)</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">User Growth</h2>
              <p className="text-xs text-slate-400">
                New signups per month, last 12 months
                {data.platformGrowth.growthRatePercent !== null && (
                  <span className="ml-2 font-bold text-brand-700">
                    {data.platformGrowth.growthRatePercent > 0 ? "+" : ""}
                    {data.platformGrowth.growthRatePercent}% vs prior 30 days
                  </span>
                )}
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#15854a"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xl font-extrabold text-slate-900">{data.totalDonations}</div>
                <div className="text-xs font-semibold text-slate-400">Total Donations</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xl font-extrabold text-slate-900">
                  {data.totalReservations}
                </div>
                <div className="text-xs font-semibold text-slate-400">Total Reservations</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xl font-extrabold text-slate-900">
                  {data.platformGrowth.newUsersLast30Days}
                </div>
                <div className="text-xs font-semibold text-slate-400">New Users (30d)</div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
