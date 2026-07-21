import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const PILLARS = [
  {
    icon: "♻️",
    title: "Zero-Waste Tech",
    desc: "Estimating shelf-life and freshness from donation metadata to help volunteers prioritize pickups before food spoils.",
  },
  {
    icon: "🤝",
    title: "Radical Integrity",
    desc: "Every donor, NGO, and volunteer is a verified account on the platform, with an auditable trail of every reservation.",
  },
  {
    icon: "🌍",
    title: "Community Scalability",
    desc: "Built as an open network any restaurant, NGO, or volunteer can join in — no city is locked out by design.",
  },
];

const STEPS = [
  { title: "Surplus Logged", desc: "Donors list surplus food through the restaurant dashboard." },
  { title: "Matched", desc: "NGOs browse or get recommended donations near them." },
  { title: "Picked Up", desc: "Volunteers coordinate pickup and delivery." },
  { title: "Impact Recorded", desc: "Completion and impact are tracked per reservation." },
];

export default function Mission() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {user ? (
        <Navbar />
      ) : (
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-6 md:px-16">
          <Link to="/" className="text-xl font-bold text-brand-700">
            PlateForward
          </Link>
          <Link to="/" className="text-sm font-bold text-brand-700">
            Sign In
          </Link>
        </header>
      )}

      <main className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <section className="grid grid-cols-1 items-center gap-10 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
              Our Mission
            </span>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight text-slate-900">
              Ending Hunger Through <span className="text-brand-700">Transparent Logistics.</span>
            </h1>
            <p className="mt-4 text-sm text-slate-500">
              We connect restaurants with surplus food to NGOs and volunteers who can get it to
              people who need it — before it goes to waste. Every reservation is tracked from
              donation to delivery.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to={user ? "/browse" : "/register"}
                className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
              >
                {user ? "Browse Donations" : "Join the Network"}
              </Link>
              <Link
                to="/marketplace"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                View Impact
              </Link>
            </div>
          </div>
          <div className="flex h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300">
            <span className="text-6xl">🥗</span>
          </div>
        </section>

        <section className="mt-14 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">How PlateForward Works</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-white p-5 text-left shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="mt-3 text-sm font-bold text-slate-900">{s.title}</div>
                <div className="mt-1 text-xs text-slate-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <span className="text-3xl">{p.icon}</span>
              <div className="mt-3 font-bold text-slate-900">{p.title}</div>
              <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-3xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900">Ready to make an impact?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Join restaurants, NGOs, and volunteers already turning surplus into support.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              to={user ? "/browse" : "/register"}
              className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white hover:bg-brand-800"
            >
              {user ? "Browse Donations" : "Get Started"}
            </Link>
            <a
              href="#support"
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Contact Support
            </a>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-slate-100 bg-white px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
          <span className="font-bold text-brand-700">PlateForward</span>
          <span>© {new Date().getFullYear()} PlateForward Food Rescue. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
