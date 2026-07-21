import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import type { Donation } from "../types";

const FOOD_TYPES = [
  "Cooked Meal",
  "Bakery",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Beverages",
  "Snacks",
  "Frozen",
  "Other",
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "expiry", label: "Expiring Soon" },
  { value: "quantity", label: "Largest Quantity" },
];

const timeUntil = (iso: string) => {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
};

export default function Browse() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [city, setCity] = useState("");
  const [foodType, setFoodType] = useState<string[]>([]);
  const [availableNow, setAvailableNow] = useState(true);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/donations", {
        params: {
          status: "available",
          city: city || undefined,
          foodType: foodType.length === 1 ? foodType[0] : undefined,
          availableNow: availableNow || undefined,
          sort,
          page,
          limit: 9,
        },
      })
      .then((res) => {
        setDonations(res.data.data ?? []);
        setPagination(res.data.pagination ?? { total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [city, foodType, availableNow, sort, page]);

  const toggleFoodType = (type: string) => {
    setPage(1);
    setFoodType((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const claim = async (donationId: string) => {
    setClaimError(null);
    setClaiming(donationId);
    try {
      await api.post(`/reservations/${donationId}`);
      setDonations((prev) => prev.filter((d) => d._id !== donationId));
    } catch (err: any) {
      setClaimError(err?.response?.data?.message ?? "Unable to reserve this donation.");
    } finally {
      setClaiming(null);
    }
  };

  const canClaim = user?.role === "ngo";

  // /donations only accepts one foodType per request, so a second+ selection
  // narrows the current page client-side rather than issuing a new request.
  const visibleDonations =
    foodType.length > 1 ? donations.filter((d) => foodType.includes(d.foodType)) : donations;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              City
            </label>
            <input
              value={city}
              onChange={(e) => {
                setPage(1);
                setCity(e.target.value);
              }}
              placeholder="Any city"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={availableNow}
              onChange={(e) => {
                setPage(1);
                setAvailableNow(e.target.checked);
              }}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Available for pickup right now
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Food Type
            </div>
            <div className="mt-3 space-y-2">
              {FOOD_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={foodType.includes(type)}
                    onChange={() => toggleFoodType(type)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {type}
                </label>
              ))}
            </div>
          </aside>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading ? "Loading…" : `${pagination.total} donation${pagination.total === 1 ? "" : "s"} found`}
              </p>
            </div>

            {claimError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {claimError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
                ))}

              {!loading && visibleDonations.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-slate-500">
                  No donations match your filters right now.
                </p>
              )}

              {visibleDonations.map((d) => (
                <div key={d._id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <button
                    onClick={() => navigate(`/donations/${d._id}`, { state: { donation: d } })}
                    className="relative flex h-36 w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-300"
                  >
                    <span className="text-3xl">🍽️</span>
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                      {timeUntil(d.expiryTime)}
                    </span>
                  </button>
                  <div className="p-4">
                    <button
                      onClick={() => navigate(`/donations/${d._id}`, { state: { donation: d } })}
                      className="text-left font-bold text-slate-900 hover:text-brand-700"
                    >
                      {d.title}
                    </button>
                    <div className="text-xs text-slate-500">{d.restaurant?.restaurantName}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        ⚖️ {d.quantity} {d.unit}
                      </span>
                      <span>📍 {d.city}</span>
                    </div>
                    <button
                      disabled={!canClaim || claiming === d._id}
                      onClick={() => claim(d._id)}
                      title={!canClaim ? "Only NGO accounts can reserve donations" : undefined}
                      className="mt-4 w-full rounded-xl bg-brand-700 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {claiming === d._id ? "Claiming…" : "Claim Donation"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-9 w-9 rounded-full border border-slate-200 text-sm disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`h-9 w-9 rounded-full text-sm font-semibold ${
                        n === page ? "bg-brand-700 text-white" : "border border-slate-200 text-slate-600"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-9 w-9 rounded-full border border-slate-200 text-sm disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
