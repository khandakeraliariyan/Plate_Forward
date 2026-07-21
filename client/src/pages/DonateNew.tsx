import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";

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

const UNITS = ["Plate", "Box", "Package", "Tray", "Kg", "Liter", "Piece"];

const STEPS = ["Details", "Quantity", "Pickup", "Confirm"];

const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DonateNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    api
      .get("/restaurants/me")
      .then((res) => setHasProfile(!!res.data.data))
      .finally(() => setCheckingProfile(false));
  }, []);

  const now = new Date();
  const [form, setForm] = useState({
    title: "",
    description: "",
    foodType: "Cooked Meal",
    quantity: "1",
    unit: "Plate",
    expiryTime: toLocalInputValue(new Date(now.getTime() + 6 * 3_600_000)),
    pickupStartTime: toLocalInputValue(now),
    pickupEndTime: toLocalInputValue(new Date(now.getTime() + 2 * 3_600_000)),
    pickupAddress: "",
    city: "",
    notes: "",
  });
  const [images, setImages] = useState<File[]>([]);

  const set = (key: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const stepValid = () => {
    if (step === 0) return form.title.trim().length >= 3 && form.foodType;
    if (step === 1) return Number(form.quantity) > 0 && form.unit;
    if (step === 2)
      return (
        form.pickupAddress.trim().length >= 5 &&
        form.city.trim().length >= 2 &&
        form.expiryTime &&
        form.pickupStartTime &&
        form.pickupEndTime
      );
    return true;
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("title", form.title);
      if (form.description) body.append("description", form.description);
      body.append("foodType", form.foodType);
      body.append("quantity", form.quantity);
      body.append("unit", form.unit);
      body.append("expiryTime", new Date(form.expiryTime).toISOString());
      body.append("pickupStartTime", new Date(form.pickupStartTime).toISOString());
      body.append("pickupEndTime", new Date(form.pickupEndTime).toISOString());
      body.append("pickupAddress", form.pickupAddress);
      body.append("city", form.city);
      if (form.notes) body.append("notes", form.notes);
      images.forEach((img) => body.append("images", img));

      const res = await api.post("/donations", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/donations/${res.data.data._id}`, { state: { donation: res.data.data } });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to create this donation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center py-20 text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Set Up Your Restaurant First</h1>
          <p className="mt-2 text-sm text-slate-500">
            You'll need a restaurant profile before you can post surplus food donations.
          </p>
          <button
            onClick={() => navigate("/restaurant/profile")}
            className="mt-5 rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white hover:bg-brand-800"
          >
            Set Up Restaurant Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10 md:px-10">
        <h1 className="text-center text-4xl font-extrabold text-slate-900">Donate Surplus Food</h1>

        <div className="mt-8 flex items-center justify-center rounded-2xl bg-white p-4 shadow-sm">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    i <= step ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-sm font-semibold ${i === step ? "text-slate-900" : "text-slate-400"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="mx-3 h-px w-10 bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Item Name
                </label>
                <input
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g., Organic Roasted Mediterranean Veggies"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Detailed Description
                </label>
                <textarea
                  value={form.description}
                  onChange={set("description")}
                  rows={4}
                  placeholder="Mention ingredients, dietary info, and storage requirements…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Food Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FOOD_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, foodType: t }))}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                        form.foodType === t
                          ? "border-brand-600 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={set("quantity")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Unit
                  </label>
                  <select
                    value={form.unit}
                    onChange={set("unit")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Photos (optional, up to 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 5))}
                  className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm"
                />
                {images.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{images.length} file(s) selected</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expiryTime}
                    onChange={set("expiryTime")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Pickup Start
                  </label>
                  <input
                    type="datetime-local"
                    value={form.pickupStartTime}
                    onChange={set("pickupStartTime")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Pickup End
                  </label>
                  <input
                    type="datetime-local"
                    value={form.pickupEndTime}
                    onChange={set("pickupEndTime")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Pickup Address
                </label>
                <input
                  value={form.pickupAddress}
                  onChange={set("pickupAddress")}
                  placeholder="452 Market St"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={set("city")}
                  placeholder="San Francisco"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Notes for volunteers (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Review your donation</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-400">Item</dt>
                  <dd className="text-slate-700">{form.title || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-400">Food Type</dt>
                  <dd className="text-slate-700">{form.foodType}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-400">Quantity</dt>
                  <dd className="text-slate-700">
                    {form.quantity} {form.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-400">Photos</dt>
                  <dd className="text-slate-700">{images.length || "None"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-400">Pickup Window</dt>
                  <dd className="text-slate-700">
                    {new Date(form.pickupStartTime).toLocaleString()} –{" "}
                    {new Date(form.pickupEndTime).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-400">Expires</dt>
                  <dd className="text-slate-700">{new Date(form.expiryTime).toLocaleString()}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase text-slate-400">Pickup Location</dt>
                  <dd className="text-slate-700">
                    {form.pickupAddress}, {form.city}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-0"
            >
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!stepValid()}
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-2 rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-200"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="flex items-center gap-2 rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {submitting ? "Publishing…" : "Publish Donation"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
          🔒 Secured food rescue logistics platform
        </p>
      </main>
    </div>
  );
}
