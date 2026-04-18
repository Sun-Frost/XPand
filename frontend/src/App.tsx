import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/user/DashboardPage";
import ProfilePage from "./pages/user/ProfilePage";
import EditProfilePage from "./pages/user/EditProfilePage";
import SkillsLibraryPage from "./pages/user/SkillsLibraryPage";
import SkillTestPage from "./pages/user/SkillTestPage";
import TestResultPage from "./pages/user/TestResultPage";
import JobsPage from "./pages/user/JobsPage";
import JobDetailPage from "./pages/user/JobDetailsPage";
import ApplicationPage from "./pages/user/ApplicationPage";
import ChallengesPage from "./pages/user/ChallengesPage";
import StorePage from "./pages/user/StorePage";
import MockInterviewPage from "./pages/user/MockInterviewPage";
import ReadinessReportPage from "./pages/user/ReadinessReportPage";
import CollectionPage from "./pages/user/CollectionPage";

import AppEntry from "./components/AppEntry";
import LandingPage from "./pages/LandingPage";

import CompanyDashboardPage from "./pages/company/CompanyDashboardPage";
import ManageJobsPage from "./pages/company/ManageJobsPage";
import JobApplicantsPage from "./pages/company/JobApplicantsPage";
import MarketInsightsPage from "./pages/company/MarketInsightsPage";
import CompanyProfilePage from "./pages/company/CompanyProfilePage";
import CreateEditJobPage from "./pages/company/CreateEditJobs";

import AdminDashboardPage  from "./pages/admin/AdminOverviewPage";
import AdminUsersPage      from "./pages/admin/AdminUsersPage";
import AdminCompaniesPage  from "./pages/admin/AdminCompaniesPage";
import AdminChallengesPage from "./pages/admin/AdminChallengesPage";
import AdminStorePage      from "./pages/admin/AdminStorePage";
import AdminSkillsPage     from "./pages/admin/AdminSkillsPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
// ---------------------------------------------------------------------------
// Auth guards — token + role aware
// ---------------------------------------------------------------------------

/** Only for role === "user" (or anything that isn't "company") */
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const role  = localStorage.getItem("role");
  if (!token) return <Navigate to="/login" replace />;
  if (role === "company") return <Navigate to="/company/dashboard" replace />;
  return <>{children}</>;
};

/** Only for role === "company" */
const CompanyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const role  = localStorage.getItem("role");
  if (!token) return <Navigate to="/login" replace />;
  if (role !== "company") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export const AdminGuard: React.FC = () => {
  const token = localStorage.getItem("access_token");
  const role  = localStorage.getItem("role")?.toLowerCase();
 
  if (!token) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/login" replace />;
 
  return <Outlet />;
};

// ---------------------------------------------------------------------------
// App routes — defined inside BrowserRouter so useNavigate works in children
// ---------------------------------------------------------------------------

const AppRoutes: React.FC = () => {
  const token = localStorage.getItem("access_token");
  const role  = localStorage.getItem("role");

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AppEntry />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route path="/verify"          element={<VerifyEmailPage />} />
      <Route path="/oauth-callback"  element={<OAuthCallbackPage />} />

      {/* ── User-only routes ── */}
      <Route path="/dashboard"                      element={<UserRoute><DashboardPage /></UserRoute>} />
      <Route path="/profile"                        element={<UserRoute><ProfilePage /></UserRoute>} />
      <Route path="/profile/edit"                   element={<UserRoute><EditProfilePage /></UserRoute>} />
      <Route path="/skills"                         element={<UserRoute><SkillsLibraryPage /></UserRoute>} />
      <Route path="/skills/test/:skillId"           element={<UserRoute><SkillTestPage /></UserRoute>} />
      <Route path="/skills/result"                  element={<UserRoute><TestResultPage /></UserRoute>} />
      <Route path="/jobs"                           element={<UserRoute><JobsPage /></UserRoute>} />
      <Route path="/jobs/:jobId"                    element={<UserRoute><JobDetailPage /></UserRoute>} />
      <Route path="/applications"                   element={<UserRoute><ApplicationPage /></UserRoute>} />
      <Route path="/challenges"                     element={<UserRoute><ChallengesPage /></UserRoute>} />
      <Route path="/store"                          element={<StorePage />} />
      <Route path="/store/mock-interview/:purchaseId"  element={<MockInterviewPage />} />
      <Route path="/store/readiness-report/:purchaseId" element={<ReadinessReportPage />} />
      <Route path="/store/purchases" element={<CollectionPage />} />
      {/* ── Company-only routes ── */}
      <Route path="/company/dashboard"              element={<CompanyRoute><CompanyDashboardPage /></CompanyRoute>} />
      <Route path="/company/jobs"                   element={<CompanyRoute><ManageJobsPage /></CompanyRoute>} />
      <Route path="/company/jobs/:jobId/applicants" element={<CompanyRoute><JobApplicantsPage /></CompanyRoute>} />
      <Route path="/company/insights"               element={<CompanyRoute><MarketInsightsPage /></CompanyRoute>} />
      <Route path="/company/profile"                element={<CompanyRoute><CompanyProfilePage /></CompanyRoute>} />
      <Route path="/company/jobs/create"            element={<CompanyRoute><CreateEditJobPage /></CompanyRoute>} />
      <Route path="/company/jobs/:jobId/edit"       element={<CompanyRoute><CreateEditJobPage /></CompanyRoute>} />
      
      {/* ── Admin-only routes ── */}
      <Route element={<AdminGuard />}>
        <Route path="/admin/overview"  element={<AdminDashboardPage />} />
        <Route path="/admin/users"      element={<AdminUsersPage />} />
        <Route path="/admin/companies"  element={<AdminCompaniesPage />} />
        <Route path="/admin/challenges" element={<AdminChallengesPage />} />
        <Route path="/admin/store"      element={<AdminStorePage />} />
        <Route path="/admin/skills"     element={<AdminSkillsPage />} />
        {/* Redirect /admin → /admin/dashboard */}
        <Route path="/admin" element={<Navigate to="" replace />} />
      </Route>

      {/* Default — role-aware redirect */}
      <Route
        path="*"
        element={
          !token
            ? <Navigate to="/login" replace />
            : role === "admin"
              ? <Navigate to="/admin/overview" replace />
              : role === "company"
                ? <Navigate to="/company/dashboard" replace />
                : <Navigate to="/dashboard" replace />
        }
      />
    </Routes>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
