import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import type { Donation, RestaurantSummary } from "../types";

export default function RestaurantPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantSummary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get("/donations", { params: { restaurant: id, limit: 20 } })
      .then((res) => {
        const list: Donation[] = res.data.data ?? [];
        setDonations(list);
        if (list[0]?.restaurant) {
          setRestaurant({
            _id: list[0].restaurant._id,
            restaurantName: list[0].restaurant.restaurantName,
            city: list[0].restaurant.city ?? "",
            address: list[0].restaurant.address ?? "",
            logo: list[0].restaurant.logo,
            isVerified: list[0].restaurant.isVerified ?? false,
          });
        } else {
          return api.get("/maps/restaurants").then((mapsRes) => {
            const match = (mapsRes.data.data as RestaurantSummary[]).find((r) => r._id === id);
            if (match) setRestaurant(match);
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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
  const available = donations.filter((d) => d.status === "available");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-4xl animate-pulse px-6 py-10">
          <div className="h-48 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-slate-500">Restaurant not found.</p>
          <Link to="/directory" className="mt-4 inline-block font-bold text-brand-700">
            ← Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {restaurant.logo ? (
              <img src={restaurant.logo} className="h-full w-full object-cover" />
            ) : (
              restaurant.restaurantName.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">
                {restaurant.restaurantName}
              </h1>
              {restaurant.isVerified && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {restaurant.address}, {restaurant.city}
            </p>
          </div>
        </div>

        {claimError && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {claimError}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Active Donations</h2>
          <div className="mt-4 space-y-3">
            {available.length === 0 && (
              <p className="text-sm text-slate-400">No active donations from this restaurant right now.</p>
            )}
            {available.map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
              >
                <Link to={`/donations/${d._id}`} state={{ donation: d }} className="font-semibold text-slate-800 hover:text-brand-700">
                  {d.title}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {d.quantity} {d.unit}
                  </span>
                </Link>
                <button
                  disabled={!canClaim || claiming === d._id}
                  onClick={() => claim(d._id)}
                  title={!canClaim ? "Only NGO accounts can reserve donations" : undefined}
                  className="rounded-lg bg-brand-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {claiming === d._id ? "Claiming…" : "Claim"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
