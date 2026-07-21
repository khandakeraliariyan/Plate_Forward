import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

export default function RestaurantProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    restaurantName: "",
    ownerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    latitude: "",
    longitude: "",
  });
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    api
      .get("/restaurants/me")
      .then((res) => {
        if (res.data.data) navigate("/marketplace", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const set = (key: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/restaurants", {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      });
      navigate("/donate/new");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save your restaurant profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center py-20 text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">Set Up Your Restaurant</h1>
        <p className="mt-2 text-sm text-slate-500">
          A few details about your restaurant are needed before you can post surplus food
          donations.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl bg-white p-8 shadow-sm">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Restaurant Name
            </label>
            <input
              required
              value={form.restaurantName}
              onChange={set("restaurantName")}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Owner Name
            </label>
            <input
              required
              value={form.ownerName}
              onChange={set("ownerName")}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Phone
              </label>
              <input
                required
                value={form.phone}
                onChange={set("phone")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Contact Email
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={set("email")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Address
            </label>
            <input
              required
              value={form.address}
              onChange={set("address")}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              City
            </label>
            <input
              required
              value={form.city}
              onChange={set("city")}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">
                Coordinates (optional)
              </label>
              <button
                type="button"
                disabled={locating}
                onClick={() => {
                  setLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setForm((f) => ({
                        ...f,
                        latitude: String(pos.coords.latitude),
                        longitude: String(pos.coords.longitude),
                      }));
                      setLocating(false);
                    },
                    () => setLocating(false)
                  );
                }}
                className="text-xs font-bold text-brand-700 hover:text-brand-800 disabled:opacity-50"
              >
                {locating ? "Locating…" : "📍 Use My Location"}
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              Powers map/distance features and listing in the Partner Directory.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={form.latitude}
                onChange={set("latitude")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={form.longitude}
                onChange={set("longitude")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-700 py-3.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save & Continue"}
          </button>
        </form>
      </main>
    </div>
  );
}
