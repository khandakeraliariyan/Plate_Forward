import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LandingLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      navigate("/marketplace");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to sign in. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 to-white">
      <header className="flex items-center justify-between px-6 py-6 md:px-16">
        <span className="text-xl font-bold text-brand-700">PlateForward</span>
        <nav className="flex items-center gap-6">
          <a href="#support" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Support
          </a>
          <Link
            to="/register"
            className="text-sm font-bold text-brand-700 hover:text-brand-800"
          >
            Register
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-20 pt-6 md:px-16 lg:grid-cols-2 lg:items-start">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
            🌱 Rescuing Surplus, Feeding Hope
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Premium Logistics for
            <br />
            <span className="text-brand-700">Sustainable Impact.</span>
          </h1>

          <p className="mt-5 max-w-md text-slate-500">
            Join the global network of restaurants and organizations dedicated to
            eliminating food waste through real-time logistics.
          </p>

          <div className="mt-8 flex gap-10 rounded-2xl bg-brand-50/70 px-6 py-5">
            <div>
              <div className="text-2xl font-extrabold text-brand-700">1.2M+</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Meals Rescued
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-brand-700">450+</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Partner NGOs
              </div>
            </div>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-2xl">
            <div className="aspect-[16/10] w-full bg-gradient-to-br from-brand-200 to-brand-400" />
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                ✓
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Verified Logistics Network</div>
                <div className="text-xs text-slate-500">ISO 22000 Food Safety Standards</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 lg:mt-2">
          <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p className="mt-1 text-sm text-slate-500">Secure access to your rescue dashboard.</p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-800">Password</label>
                <Link to="/forgot-password" className="text-sm font-semibold text-brand-700">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Keep me signed in for 30 days
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-700 py-3.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-60"
            >
              {submitting ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <hr className="my-6 border-slate-100" />

          <p className="text-center text-sm text-slate-600">
            New to PlateForward?{" "}
            <Link to="/register" className="font-bold text-brand-700">
              Create Account
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-100 px-6 py-6 md:px-16">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} PlateForward Food Rescue. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#privacy" className="hover:text-slate-600">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-slate-600">
              Terms of Service
            </a>
            <a href="#support" className="hover:text-slate-600">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
