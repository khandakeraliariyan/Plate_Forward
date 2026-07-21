import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import type { RestaurantSummary } from "../types";

export default function Directory() {
  const [city, setCity] = useState("");
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/maps/restaurants", { params: { city: city || undefined } })
      .then((res) => setRestaurants(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Rescue Partner Directory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Restaurants donating surplus food through PlateForward.
        </p>

        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Search by city…"
          className="mt-5 w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 sm:w-80"
        />

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}

          {!loading && restaurants.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-500">
              No geotagged restaurants found{city ? ` in "${city}"` : ""}.
            </p>
          )}

          {restaurants.map((r) => (
            <Link
              key={r._id}
              to={`/restaurants/${r._id}`}
              className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700">
                  {r.logo ? (
                    <img src={r.logo} className="h-full w-full object-cover" />
                  ) : (
                    r.restaurantName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    {r.restaurantName}
                    {r.isVerified && <span className="text-brand-600">✓</span>}
                  </div>
                  <div className="text-xs text-slate-500">{r.city}</div>
                </div>
              </div>
              <p className="mt-3 truncate text-xs text-slate-400">{r.address}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
