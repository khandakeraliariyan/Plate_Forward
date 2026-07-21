import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import type { Donation } from "../types";

interface Quality {
  freshnessScore: number;
  freshnessLabel: string;
  riskScore: number;
  hoursUntilExpiry: number;
  recommendation: string;
}

const LABEL_COLOR: Record<string, string> = {
  fresh: "bg-brand-100 text-brand-700",
  good: "bg-brand-100 text-brand-700",
  "use soon": "bg-amber-100 text-amber-700",
  "high risk": "bg-red-100 text-red-700",
  expired: "bg-slate-200 text-slate-500",
};

export default function DonationDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [donation, setDonation] = useState<Donation | null>(
    (location.state as any)?.donation ?? null
  );
  const [notFound, setNotFound] = useState(false);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [reserved, setReserved] = useState(false);

  // GET /donations/:id is restaurant-only on this API - there's no public
  // single-donation lookup, so a direct/refreshed visit falls back to
  // scanning the public list for a matching id instead of a dedicated fetch.
  useEffect(() => {
    if (donation || !id) return;
    api
      .get("/donations", { params: { limit: 100 } })
      .then((res) => {
        const match = (res.data.data as Donation[]).find((d) => d._id === id);
        if (match) setDonation(match);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [id, donation]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/donations/${id}/quality`)
      .then((res) => setQuality(res.data.data))
      .catch(() => {});
  }, [id]);

  const reserve = async () => {
    if (!id) return;
    setReserveError(null);
    setReserving(true);
    try {
      await api.post(`/reservations/${id}`);
      setReserved(true);
    } catch (err: any) {
      setReserveError(err?.response?.data?.message ?? "Unable to reserve this donation.");
    } finally {
      setReserving(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-slate-500">
            This donation may have already been claimed, expired, or removed.
          </p>
          <Link to="/browse" className="mt-4 inline-block font-bold text-brand-700">
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-4xl animate-pulse px-6 py-10">
          <div className="h-80 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  const canClaim = user?.role === "ngo" && donation.status === "available";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          ← Back to Marketplace
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
              <div className="flex h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300">
                <span className="text-6xl">🍽️</span>
              </div>
              <div className="grid grid-rows-2 gap-3">
                {(donation.images ?? []).slice(0, 2).map((img, i) => (
                  <img key={i} src={img.url} className="h-full w-full rounded-2xl object-cover" />
                ))}
                {(donation.images?.length ?? 0) === 0 && (
                  <>
                    <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200" />
                    <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200" />
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                  {donation.foodType}
                </span>
                {quality && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      LABEL_COLOR[quality.freshnessLabel] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {quality.freshnessLabel}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{donation.title}</h1>

              <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-5 sm:grid-cols-4">
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">Quantity</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {donation.quantity} {donation.unit}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">Pickup Window</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {new Date(donation.pickupStartTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(donation.pickupEndTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">Expiry</div>
                  <div className="mt-1 font-semibold text-red-600">
                    {quality ? `${quality.hoursUntilExpiry}h left` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">Status</div>
                  <div className="mt-1 font-semibold capitalize text-slate-800">
                    {donation.status.replace("_", " ")}
                  </div>
                </div>
              </div>

              {donation.description && (
                <div className="mt-5">
                  <h2 className="font-bold text-slate-900">Description</h2>
                  <p className="mt-1 text-sm text-slate-600">{donation.description}</p>
                </div>
              )}

              {quality && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Handling recommendation: </span>
                  {quality.recommendation}
                </div>
              )}
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex h-40 items-center justify-center bg-slate-100 text-sm text-slate-400">
                Map preview not available
              </div>
              <div className="flex items-center gap-3 p-4">
                <span className="text-brand-700">📍</span>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">Pickup Location</div>
                  <div className="font-semibold text-slate-800">
                    {donation.pickupAddress}, {donation.city}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Status</span>
                <span
                  className={`flex items-center gap-1.5 font-bold capitalize ${
                    donation.status === "available" ? "text-brand-700" : "text-slate-500"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {donation.status.replace("_", " ")}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">City</dt>
                  <dd className="font-semibold text-slate-800">{donation.city}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Food Type</dt>
                  <dd className="font-semibold text-slate-800">{donation.foodType}</dd>
                </div>
              </dl>

              {reserveError && (
                <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {reserveError}
                </div>
              )}

              {reserved ? (
                <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-center text-sm font-bold text-brand-700">
                  ✓ Reserved — check My Reservations
                </div>
              ) : (
                <button
                  onClick={reserve}
                  disabled={!canClaim || reserving}
                  title={
                    user?.role !== "ngo"
                      ? "Only NGO accounts can reserve donations"
                      : donation.status !== "available"
                        ? "This donation is no longer available"
                        : undefined
                  }
                  className="mt-5 w-full rounded-xl bg-brand-700 py-3 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {reserving ? "Reserving…" : "✓ Reserve Donation"}
                </button>
              )}

              <p className="mt-3 text-center text-xs text-slate-400">
                Reserving this donation commits you to pickup within the specified window.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Donor Profile
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                  {donation.restaurant?.restaurantName?.charAt(0) ?? "?"}
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    {donation.restaurant?.restaurantName}
                  </div>
                  <div className="text-xs text-slate-500">{donation.city}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
