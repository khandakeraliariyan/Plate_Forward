import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {user ? (
        <Navbar />
      ) : (
        <header className="border-b border-slate-100 bg-white px-6 py-6 md:px-16">
          <Link to="/" className="text-xl font-bold text-brand-700">
            PlateForward
          </Link>
        </header>
      )}

      <main className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div className="flex justify-center">
          <div className="flex h-64 w-64 flex-col items-center justify-center gap-4 rounded-[2.5rem] bg-white shadow-sm">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-brand-600 text-4xl font-black text-brand-600">
              !
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold tracking-wide text-brand-700">
              ERROR 404
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">Lost in the Logistics.</h1>
          <p className="mt-3 text-slate-500">
            We couldn't find the page you're looking for. It might have been moved or the
            delivery route has changed.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              to={user ? "/marketplace" : "/"}
              className="flex items-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white hover:bg-brand-800"
            >
              🏠 Back to Home
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Go Back
            </button>
          </div>

          {user && (
            <>
              <hr className="my-6 border-slate-100" />
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Helpful Destinations
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-600">
                <Link to="/browse" className="hover:text-brand-700">
                  🗺️ Browse Donations
                </Link>
                <Link to="/marketplace" className="hover:text-brand-700">
                  📊 Your Impact
                </Link>
                <Link to="/mission" className="hover:text-brand-700">
                  ❓ Our Mission
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
