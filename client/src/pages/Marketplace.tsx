import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import type { Donation } from "../types";

interface StatTile {
  label: string;
  value: string;
}

const STEPS = [
  { n: 1, title: "Donate", desc: "Restaurants list surplus items in our real-time marketplace." },
  { n: 2, title: "Match", desc: "An algorithm pairs donations with the closest high-need NGOs." },
  { n: 3, title: "Pick-up", desc: "Volunteers are dispatched via our optimized routing system." },
  { n: 4, title: "Deliver", desc: "Fresh food is delivered, tracked, and its impact is recorded." },
];

const FAQS = [
  {
    q: "How is food safety maintained during transport?",
    a: "We use temperature-monitored containers for all perishables. Every volunteer follows food-handling protocols and each delivery is time-tracked from pickup to drop-off.",
  },
  {
    q: "Who is eligible to receive donations?",
    a: "Verified NGOs registered on the platform can browse and reserve available donations that match their preferences.",
  },
  {
    q: "Can individuals donate home-cooked meals?",
    a: "Currently donations are listed by verified restaurant accounts. Individual donor support is on the roadmap.",
  },
];

const timeUntil = (iso: string) => {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 24) return `Expires in ${Math.floor(hours / 24)}d`;
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
};

export default function Marketplace() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatTile[]>([]);
  const [impact, setImpact] = useState<{ label: string; value: number; suffix: string } | null>(
    null
  );
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    api
      .get("/donations", { params: { status: "available", limit: 3, sort: "newest" } })
      .then((res) => setDonations(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    api
      .get(`/analytics/${user.role}`)
      .then((res) => {
        const d = res.data?.data ?? {};

        if (user.role === "admin") {
          setStats([
            { label: "Meals Served", value: `${d.mealsServed ?? 0}` },
            { label: "Restaurants", value: `${d.platformGrowth?.totalRestaurants ?? 0}` },
            { label: "NGO Partners", value: `${d.platformGrowth?.totalNgos ?? 0}` },
            { label: "Volunteers", value: `${d.platformGrowth?.totalVolunteers ?? 0}` },
          ]);
          setImpact({ label: "CO2-eq Avoided", value: d.co2ReducedKg ?? 0, suffix: " kg" });
        } else if (user.role === "ngo") {
          setStats([
            { label: "Reservations", value: `${d.reservations ?? 0}` },
            { label: "Completed", value: `${d.completed ?? 0}` },
            { label: "Est. Meals Received", value: `${d.mealsReceived?.estimatedMeals ?? 0}` },
            { label: "Est. Kg Rescued", value: `${d.mealsReceived?.estimatedKg ?? 0}` },
          ]);
          setImpact({
            label: "Meals Received",
            value: d.mealsReceived?.estimatedMeals ?? 0,
            suffix: "",
          });
        } else if (user.role === "restaurant") {
          setStats([
            { label: "Total Donations", value: `${d.totalDonations ?? 0}` },
            { label: "Completed", value: `${d.completedDonations ?? 0}` },
            { label: "Acceptance Rate", value: `${d.acceptanceRate ?? 0}%` },
            { label: "Food Saved", value: `${d.foodSaved?.kg ?? 0} kg` },
          ]);
          setImpact({ label: "Impact Score", value: d.impactScore ?? 0, suffix: "%" });
        } else if (user.role === "volunteer") {
          setStats([
            { label: "Deliveries", value: `${d.deliveries ?? 0}` },
            { label: "Avg Distance", value: `${d.distance?.averageKm ?? 0} km` },
            { label: "Avg Time", value: `${d.averageTimeMinutes ?? 0} min` },
            { label: "Rating", value: `${d.rating?.average ?? "—"}` },
          ]);
          setImpact({ label: "Completion Rate", value: d.completionRate ?? 0, suffix: "%" });
        }
      })
      .catch(() => setStats([]));
  }, [user]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        {/* Hero */}
        <section className="grid grid-cols-1 gap-8 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
              ● Active Rescue Protocol
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900">
              Rescue Food, <span className="text-brand-700">Feed Communities</span>
            </h1>
            <p className="mt-3 max-w-md text-sm text-slate-500">
              Bridge the gap between surplus food and those in need. Our premium logistics
              network ensures nutritious meals move from donors to tables in record time.
            </p>
            <div className="mt-5 flex gap-3">
              <Link
                to="/browse"
                className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
              >
                Join the Rescue →
              </Link>
              <Link
                to="/mission"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Our Mission
              </Link>
              {user?.role === "restaurant" && (
                <Link
                  to="/donate/new"
                  className="rounded-xl border border-brand-200 px-5 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
                >
                  Donate Surplus Food
                </Link>
              )}
            </div>
          </div>
          <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 md:h-52">
            <span className="text-5xl">💚</span>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(stats.length ? stats : Array.from({ length: 4 })).map((s, i) => (
            <div key={i} className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <div className="text-2xl font-extrabold text-brand-700">
                {s ? (s as StatTile).value : "—"}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {s ? (s as StatTile).label : "Loading…"}
              </div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="mt-14 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">A Seamless Connection</h2>
          <p className="mt-1 text-sm text-slate-500">
            Our horizontal logistics flow ensures maximum freshness.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-5 text-left shadow-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {s.n}
                </div>
                <div className="mt-3 text-sm font-bold text-slate-900">{s.title}</div>
                <div className="mt-1 text-xs text-slate-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Marketplace */}
        <section id="marketplace" className="mt-14">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Live Marketplace</h2>
              <p className="mt-1 text-sm text-slate-500">
                Rescue these donations before they expire.
              </p>
            </div>
            <Link to="/browse" className="text-sm font-bold text-brand-700 hover:text-brand-800">
              View All Live Items →
            </Link>
          </div>

          {claimError && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {claimError}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
              ))}

            {!loading && donations.length === 0 && (
              <p className="col-span-full text-sm text-slate-500">
                No available donations right now — check back soon.
              </p>
            )}

            {donations.map((d) => (
              <div key={d._id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <Link
                  to={`/donations/${d._id}`}
                  state={{ donation: d }}
                  className="relative flex h-36 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-300"
                >
                  <span className="text-3xl">🍽️</span>
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                    {timeUntil(d.expiryTime)}
                  </span>
                </Link>
                <div className="p-4">
                  <Link
                    to={`/donations/${d._id}`}
                    state={{ donation: d }}
                    className="font-bold text-slate-900 hover:text-brand-700"
                  >
                    {d.title}
                  </Link>
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
                    {claiming === d._id ? "Claiming…" : "Claim Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Impact */}
        {impact && (
          <section className="mt-14 grid grid-cols-1 gap-8 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Your Impact on Earth</h2>
              <p className="mt-2 text-sm text-slate-500">
                Real numbers pulled from your own activity on the platform this session.
              </p>
              <div className="mt-5">
                <div className="text-3xl font-extrabold text-brand-700">
                  {impact.value}
                  {impact.suffix}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {impact.label}
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <ImpactRing value={impact.suffix === "%" ? impact.value : Math.min(100, impact.value)} />
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mx-auto mt-14 max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-slate-900"
                >
                  {f.q}
                  <span className="text-slate-400">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-4 text-sm text-slate-500">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-slate-100 bg-white px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
          <span className="font-bold text-brand-700">PlateForward</span>
          <span>© {new Date().getFullYear()} PlateForward Food Rescue. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

function ImpactRing({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#15854a"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="76" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
