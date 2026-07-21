import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

export default function RoleProtectedRoute({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/marketplace" replace />;

  return <>{children}</>;
}
