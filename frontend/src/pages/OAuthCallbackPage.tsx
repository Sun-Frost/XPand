import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Icon } from "../components/ui/Icon";

// ---------------------------------------------------------------------------
// OAuthCallbackPage
//
// Route: /oauth-callback
//
// After the user authenticates with Google, the backend's OAuth2LoginSuccessHandler
// redirects here with:
//   /oauth-callback?token=<jwt>&role=<user|company|admin>&id=<int>
//
// This page reads those params, persists them to localStorage (same shape
// as the normal login flow), and navigates to the appropriate dashboard.
// ---------------------------------------------------------------------------

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const role  = searchParams.get("role");
    const id    = searchParams.get("id");

    // Required debug log — helps diagnose OAuth callback issues
    console.log("[OAuthCallback] Received params:", { token: token ? "present" : "missing", role, id });

    // If backend reported an OAuth failure it redirects to /login?error=oauth_failed
    // (handled by LoginPage). But guard here too.
    if (!token || !role) {
      console.error("[OAuthCallback] Missing token or role — OAuth flow failed.");
      setError("OAuth login failed. Please try again.");
      return;
    }

    // Normalise role to lowercase — backend sends "USER" but we store "user"
    const normalisedRole = role.toLowerCase();

    // Persist to localStorage — same keys as the normal login hook
    localStorage.setItem("access_token", token);
    localStorage.setItem("role", normalisedRole);
    localStorage.setItem(
      "user",
      JSON.stringify({ userId: id ? parseInt(id) : null, role: normalisedRole })
    );

    console.log("[OAuthCallback] Stored token. Navigating for role:", normalisedRole);

    // Navigate to the correct dashboard based on role
    if (normalisedRole === "admin") {
      navigate("/admin/overview", { replace: true });
    } else if (normalisedRole === "company") {
      navigate("/company/dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="oauth-callback-page">
        <div className="oauth-callback-card card">
          <div className="oauth-callback-inner">
            <div className="oauth-error-icon"><Icon name="close" size={24} label="" /></div>
            <h1>Login Failed</h1>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate("/login")}>
              Back to Login
            </button>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-card card">
        <div className="oauth-callback-inner">
          <div className="oauth-spinner" aria-label="Signing you in…" />
          <p className="oauth-callback-text">Signing you in…</p>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .oauth-callback-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
  }
  .oauth-callback-card {
    width: 100%; max-width: 360px; padding: var(--space-10);
    box-shadow: var(--shadow-xl);
  }
  .oauth-callback-inner {
    display: flex; flex-direction: column; align-items: center;
    gap: var(--space-4); text-align: center;
  }
  .oauth-spinner {
    width: 48px; height: 48px;
    border: 3px solid rgba(255,255,255,0.15);
    border-top-color: var(--color-primary-400);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .oauth-callback-text { color: var(--color-text-secondary); }
  .oauth-error-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--color-danger-bg); color: var(--color-danger);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: bold;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default OAuthCallbackPage;