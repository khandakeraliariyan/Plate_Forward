import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import LandingLogin from "./pages/LandingLogin";
import Register from "./pages/Register";
import Marketplace from "./pages/Marketplace";
import Mission from "./pages/Mission";
import Browse from "./pages/Browse";
import DonationDetail from "./pages/DonationDetail";
import DonateNew from "./pages/DonateNew";
import AdminDonations from "./pages/AdminDonations";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mission" element={<Mission />} />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/browse"
            element={
              <ProtectedRoute>
                <Browse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donations/:id"
            element={
              <ProtectedRoute>
                <DonationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donate/new"
            element={
              <RoleProtectedRoute roles={["restaurant"]}>
                <DonateNew />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/admin/donations"
            element={
              <RoleProtectedRoute roles={["admin"]}>
                <AdminDonations />
              </RoleProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
