import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import SplashScreen from "./SplashScreen";

/**
 * AppEntry — startup flow controller
 *
 * Sequence:
 *   1. Mount → show SplashScreen
 *   2. SplashScreen.onFinish() → check localStorage token
 *   3. Token present  → <Navigate to="/dashboard" />
 *   4. Token absent   → <Navigate to="/landing"   />
 */
const AppEntry = () => {
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  /* ── Still in splash phase ───────────────────────────────── */
  if (!splashDone) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  /* ── Session check ───────────────────────────────────────── */
  const token = localStorage.getItem("access_token");
  const role  = localStorage.getItem("role");

  if (token) {
    return role === "company"
      ? <Navigate to="/company/dashboard" replace />
      : <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/landing" replace />;
};

export default AppEntry;