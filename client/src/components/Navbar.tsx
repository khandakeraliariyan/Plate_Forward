import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .get("/notifications/unread-count")
      .then((res) => setUnread(res.data?.data?.unreadCount ?? 0))
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link to="/marketplace" className="text-lg font-bold text-brand-700">
          PlateForward
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 md:flex">
          <span className="text-slate-900">Marketplace</span>
          <span className="cursor-not-allowed opacity-50">Logistics</span>
          <span className="cursor-not-allowed opacity-50">Impact</span>
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Notifications"
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-50"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <div className="group relative">
            <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="invisible absolute right-0 mt-2 w-44 rounded-xl border border-slate-100 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
              <div className="px-3 py-2 text-xs text-slate-400">{user?.email}</div>
              <button
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
