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
import RestaurantProfile from "./pages/RestaurantProfile";
import AdminDonations from "./pages/AdminDonations";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import Directory from "./pages/Directory";
import RestaurantPublicProfile from "./pages/RestaurantPublicProfile";
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
            path="/directory"
            element={
              <ProtectedRoute>
                <Directory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id"
            element={
              <ProtectedRoute>
                <RestaurantPublicProfile />
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
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
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
            path="/restaurant/profile"
            element={
              <RoleProtectedRoute roles={["restaurant"]}>
                <RestaurantProfile />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/restaurant/dashboard"
            element={
              <RoleProtectedRoute roles={["restaurant"]}>
                <RestaurantDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/volunteer/dashboard"
            element={
              <RoleProtectedRoute roles={["volunteer"]}>
                <VolunteerDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RoleProtectedRoute roles={["admin"]}>
                <AdminAnalytics />
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
