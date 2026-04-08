import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  // Pass navigate callback — hook calls it after token is stored
  const { login, isLoading, error, clearError } = useLogin((role) => {
    if (role === "admin" || role === "ADMIN") {
      navigate("/admin/overview", { replace: true });
    } else if (role === "company" || role === "COMPANY") {
      navigate("/company/dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [didAttempt, setDidAttempt] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If already logged in, redirect based on stored role
    const token = localStorage.getItem("access_token");
    const role  = localStorage.getItem("role");
    if (token && (role === "admin" || role === "ADMIN")) {
      navigate("/admin/overview", { replace: true });
    } else if (token && (role === "company" || role === "COMPANY")) {
      navigate("/company/dashboard", { replace: true });
    } else if (token) {
      navigate("/dashboard", { replace: true });
    }
    emailRef.current?.focus();
  }, [navigate]);
  // Clear API-level error when user starts typing
  useEffect(() => {
    if (error) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidAttempt(true);
    if (!validate()) return;
    await login({ email: email.trim(), password });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__orb login-bg__orb--3" />
      </div>

      <div className="login-card card card-accent-top animate-fade-in">
        {/* Header */}
        <div className="login-card__header">
          <div className="login-logo">
            <div className="logo-mark">
              <span className="login-logo__symbol">XP</span>
            </div>
            <span className="login-logo__wordmark logo-wordmark">XPand</span>
          </div>
          <h1 className="login-card__title">Welcome back</h1>
          <p className="login-card__subtitle">
            Sign in to continue levelling up your skills.
          </p>
        </div>


        {/* Form */}
        <form className="login-card__body card-body" onSubmit={handleSubmit} noValidate>
          {/* API-level error banner */}
          {error && (
            <div className="login-error-banner" role="alert">
              <span className="login-error-banner__icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              className={`input${fieldErrors.email ? " input-error" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (didAttempt) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              autoComplete="email"
              disabled={isLoading}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" className="input-helper error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="input-group">
            <div className="login-password-label-row">
              <label htmlFor="password" className="input-label">Password</label>
              <button
                type="button"
                className="login-forgot-link"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </button>
            </div>
            <div className="login-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`input login-password-input${fieldErrors.password ? " input-error" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (didAttempt) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                autoComplete="current-password"
                disabled={isLoading}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                className="login-password-toggle btn btn-ghost btn-icon btn-icon-sm"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
            {fieldErrors.password && (
              <span id="password-error" className="input-helper error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full login-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-spinner animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="divider-with-text">or</div>

          <p className="login-register-cta">
            Don't have an account?&nbsp;
            <button
              type="button"
              className="login-register-link"
              onClick={() => navigate("/register")}
            >
              Create one free
            </button>
          </p>
        </form>
      </div>

      <style>{pageStyles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scoped styles
// ---------------------------------------------------------------------------

const pageStyles = `
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    position: relative;
    overflow: hidden;
  }
  .login-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .login-bg__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.18;
    animation: orb-drift 12s ease-in-out infinite alternate;
  }
  .login-bg__orb--1 {
    width: 480px; height: 480px; top: -160px; left: -120px;
    background: var(--color-primary-500); animation-duration: 14s;
  }
  .login-bg__orb--2 {
    width: 360px; height: 360px; bottom: -100px; right: -80px;
    background: var(--color-accent-500); animation-duration: 10s; animation-delay: -4s;
  }
  .login-bg__orb--3 {
    width: 240px; height: 240px; top: 40%; left: 60%;
    background: var(--color-indigo-500); animation-duration: 16s; animation-delay: -8s; opacity: 0.10;
  }
  @keyframes orb-drift {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(30px, 20px) scale(1.06); }
  }
  .login-card {
    position: relative; z-index: 1;
    width: 100%; max-width: 440px;
    box-shadow: var(--shadow-xl), 0 0 60px rgba(0,184,217,0.07);
  }
  .login-card__header { padding: var(--space-8) var(--space-8) var(--space-4); text-align: center; }
  .login-logo { display: inline-flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6); }
  .login-logo__symbol {
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: var(--text-sm); color: #fff; letter-spacing: var(--tracking-wider);
  }
  .login-logo__wordmark {
    font-family: var(--font-display); font-size: var(--text-2xl);
    font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide);
  }
  .login-card__title {
    font-family: var(--font-display); font-size: var(--text-2xl);
    font-weight: var(--weight-bold); color: var(--color-text-primary); margin-bottom: var(--space-2);
  }
  .login-card__subtitle { font-size: var(--text-sm); color: var(--color-text-muted); line-height: var(--leading-relaxed); }
  .login-demo-hint {
    display: flex; align-items: center; gap: var(--space-2);
    margin: 0 var(--space-8); padding: var(--space-3) var(--space-4);
    background: var(--color-info-bg); border: 1px solid var(--color-info-border);
    border-radius: var(--radius-md); font-size: var(--text-xs);
    color: var(--color-text-secondary); font-family: var(--font-mono);
  }
  .login-card__body { display: flex; flex-direction: column; gap: var(--space-5); }
  .login-error-banner {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-danger-bg); border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-md); color: var(--color-danger);
    font-size: var(--text-sm); animation: fadeIn 0.2s var(--ease-smooth);
  }
  .login-password-label-row { display: flex; align-items: center; justify-content: space-between; }
  .login-forgot-link {
    background: none; border: none; padding: 0;
    font-size: var(--text-xs); color: var(--color-primary-400);
    cursor: pointer; font-family: var(--font-body);
    transition: color var(--duration-fast) var(--ease-smooth);
  }
  .login-forgot-link:hover { color: var(--color-primary-300); }
  .login-password-wrapper { position: relative; display: flex; align-items: center; }
  .login-password-input { padding-right: 2.8rem; }
  .login-password-toggle {
    position: absolute; right: var(--space-2);
    background: transparent; border: none;
    color: var(--color-text-muted); font-size: var(--text-base);
    cursor: pointer; display: flex; align-items: center;
  }
  .login-submit { margin-top: var(--space-2); font-family: var(--font-display); font-size: var(--text-md); letter-spacing: var(--tracking-wider); }
  .login-spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%;
  }
  .login-register-cta { text-align: center; font-size: var(--text-sm); color: var(--color-text-muted); }
  .login-register-link {
    background: none; border: none; padding: 0;
    color: var(--color-primary-400); font-weight: var(--weight-semibold);
    font-size: var(--text-sm); font-family: var(--font-body); cursor: pointer;
    transition: color var(--duration-fast) var(--ease-smooth);
  }
  .login-register-link:hover { color: var(--color-primary-300); }
  @media (max-width: 480px) {
    .login-card { max-width: 100%; }
    .login-card__header { padding: var(--space-6) var(--space-5) var(--space-3); }
    .login-card__body { padding: var(--space-5); }
    .login-demo-hint { margin: 0 var(--space-5); }
  }
`;

export default LoginPage;