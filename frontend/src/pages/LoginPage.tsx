import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";
import { post } from "../api/axios";

// The OAuth button must point directly to the backend, not the Vite dev server.
const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:8080";

const GOOGLE_OAUTH_URL = `${BACKEND_URL}/oauth2/authorization/google`;

// ---------------------------------------------------------------------------
// Inline 6-digit verify panel — shown on LoginPage when the user needs to
// enter their code (either after being blocked, or after hitting "Resend").
// ---------------------------------------------------------------------------

const InlineVerifyPanel: React.FC<{
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}> = ({ email, onVerified, onCancel }) => {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [verifyError, setVerifyError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = async (code: string) => {
    setStatus("loading");
    setVerifyError("");
    try {
      await post<{ message: string }>("/auth/verify", { email, code });
      setStatus("success");
      // Brief pause so the user sees the success state, then call back
      setTimeout(onVerified, 800);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Incorrect code. Please try again.";
      setVerifyError(msg);
      // Reset to "idle" (not "error") so the next full code auto-submits cleanly.
      // This matches the working SixDigitVerify pattern in RegisterPage.
      setStatus("idle");
      // Clear digits so they can type fresh — don't leave partial bad input
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    // Clear any displayed error as soon as the user starts retyping
    setVerifyError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (digit && index === 5) {
      const full = next.join("");
      // Only auto-submit when idle — never while loading or after success
      if (full.length === 6 && status !== "loading" && status !== "success") submitCode(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setVerifyError("");
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6 && status !== "loading" && status !== "success") submitCode(pasted);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSent(false);
    setVerifyError("");
    try {
      await post("/auth/resend-verification", { email });
      setResendSent(true);
      setDigits(["", "", "", "", "", ""]);
      setStatus("idle");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      /* backend always returns 200 for resend */
    } finally {
      setResendLoading(false);
    }
  };

  const isLoading = status === "loading";
  const codeComplete = digits.join("").length === 6;

  return (
    <div className="login-verify-panel" role="region" aria-label="Email verification">
      <p className="login-verify-panel__title">Enter your verification code</p>
      <p className="login-verify-panel__hint">
        Sent to <strong>{email}</strong>
      </p>

      {/* 6-digit boxes */}
      <div className="reg-verify-digits" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={[
              "reg-verify-digit",
              verifyError ? "reg-verify-digit--error" : "",
              d ? "reg-verify-digit--filled" : "",
              status === "success" ? "reg-verify-digit--success" : "",
            ].filter(Boolean).join(" ")}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isLoading || status === "success"}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {status === "success" && (
        <p className="login-verify-panel__success">✅ Verified! Redirecting…</p>
      )}

      {verifyError && (
        <p className="login-verify-panel__error" role="alert">{verifyError}</p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-lg w-full"
        onClick={() => submitCode(digits.join(""))}
        disabled={isLoading || !codeComplete || status === "success"}
      >
        {isLoading
          ? <><span className="login-spinner animate-spin" aria-hidden="true" /> Verifying…</>
          : "Verify Email"}
      </button>

      {resendSent ? (
        <p className="login-verify-panel__resent">✅ New code sent! Check your inbox.</p>
      ) : (
        <p className="login-verify-panel__resend-hint">
          Didn't receive it?{" "}
          <button
            type="button"
            className="login-resend-btn"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? "Sending…" : "Resend code"}
          </button>
        </p>
      )}

      <button type="button" className="btn btn-ghost btn-sm w-full" onClick={onCancel}>
        ← Back to login
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  // Resend / verify panel state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  // When true, hide the normal form and show the inline 6-digit panel
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  const companyPending = searchParams.get("notice") === "company_pending";
  const oauthFailed    = searchParams.get("error")  === "oauth_failed";

  useEffect(() => {
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

  useEffect(() => {
    if (error) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  // Reset resend/panel state when email changes
  useEffect(() => {
    setResendSent(false);
    setShowVerifyPanel(false);
  }, [email]);

  // ── Detect "email not verified" error ─────────────────────────────────────
  const isEmailUnverifiedError =
    error?.toLowerCase().includes("verify your email") ||
    error?.toLowerCase().includes("verification");

  // ── Resend from the error banner (before panel is shown) ──────────────────
  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    try {
      await post("/auth/resend-verification", { email: email.trim() });
      setResendSent(true);
      // Now open the verify panel so the user has somewhere to type the code
      setShowVerifyPanel(true);
    } catch {
      /* backend always returns 200 */
    } finally {
      setResendLoading(false);
    }
  };

  // ── Open verify panel from the "enter code" button ────────────────────────
  const handleOpenVerifyPanel = () => {
    setShowVerifyPanel(true);
  };

  // ── Validation ────────────────────────────────────────────────────────────

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidAttempt(true);
    if (!validate()) return;
    await login({ email: email.trim(), password });
  };

  // ── If verify panel is open, render it instead of the full form ───────────
  if (showVerifyPanel) {
    return (
      <div className="login-page">
        <div className="login-bg" aria-hidden="true">
          <div className="login-bg__orb login-bg__orb--1" />
          <div className="login-bg__orb login-bg__orb--2" />
          <div className="login-bg__orb login-bg__orb--3" />
        </div>
        <div className="login-card card card-accent-top animate-fade-in">
          <div className="login-card__header">
            <div className="login-logo">
              <div className="logo-mark"><span className="login-logo__symbol">XP</span></div>
              <span className="login-logo__wordmark logo-wordmark">XPand</span>
            </div>
          </div>
          <div className="login-card__body card-body">
            <InlineVerifyPanel
              email={email.trim()}
              onVerified={() => {
                // Verification succeeded — close panel and let them log in normally
                setShowVerifyPanel(false);
                clearError();
              }}
              onCancel={() => {
                setShowVerifyPanel(false);
                clearError();
              }}
            />
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────

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

        {/* Company pending notice */}
        {companyPending && (
          <div className="login-info-banner" role="status">
            <span>🕐</span>
            <span>Your company account has been submitted and is pending admin approval.</span>
          </div>
        )}

        {/* OAuth failure notice */}
        {oauthFailed && (
          <div className="login-error-banner" role="alert">
            <span className="login-error-banner__icon">⚠</span>
            <span>Google sign-in failed. Please try again or use email/password.</span>
          </div>
        )}

        {/* Form */}
        <form className="login-card__body card-body" onSubmit={handleSubmit} noValidate>
          {/* API-level error banner */}
          {error && (
            <div className="login-error-banner" role="alert">
              <span className="login-error-banner__icon">⚠</span>
              <div className="login-error-banner__content">
                <span>{error}</span>

                {/* Email not verified — offer to enter code or resend */}
                {isEmailUnverifiedError && (
                  <div className="login-verify-actions">
                    {/* Primary action: open the digit panel to enter an existing code */}
                    <button
                      type="button"
                      className="login-resend-btn login-resend-btn--primary"
                      onClick={handleOpenVerifyPanel}
                      disabled={!email.trim()}
                    >
                      Enter verification code →
                    </button>

                    {/* Secondary: resend a fresh code and then open the panel */}
                    {resendSent ? (
                      <p className="login-verify-sent">
                        ✅ New code sent! Check your inbox.
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="login-resend-btn"
                        onClick={handleResendVerification}
                        disabled={resendLoading || !email.trim()}
                      >
                        {resendLoading ? "Sending…" : "Resend verification email"}
                      </button>
                    )}
                  </div>
                )}
              </div>
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

          <a
            href={GOOGLE_OAUTH_URL}
            className="btn btn-outline btn-lg w-full login-google-btn"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              className="login-google-icon"
            />
            Continue with Google
          </a>

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
// Styles
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
  .login-card__body { display: flex; flex-direction: column; gap: var(--space-5); }
  .login-error-banner {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-danger-bg); border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-md); color: var(--color-danger);
    font-size: var(--text-sm); animation: fadeIn 0.2s var(--ease-smooth);
    margin: 0 var(--space-8);
  }
  .login-error-banner__content { display: flex; flex-direction: column; gap: var(--space-2); }
  .login-info-banner {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-info-bg); border: 1px solid var(--color-info-border);
    border-radius: var(--radius-md); color: var(--color-text-secondary);
    font-size: var(--text-sm);
    margin: 0 var(--space-8);
  }
  /* Verify actions inside error banner */
  .login-verify-actions {
    display: flex; flex-direction: column; gap: var(--space-1); margin-top: var(--space-1);
  }
  .login-resend-btn {
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--color-danger); font-size: var(--text-xs);
    font-family: var(--font-body); text-decoration: underline;
    opacity: 0.9; text-align: left;
  }
  .login-resend-btn--primary {
    font-weight: var(--weight-semibold); opacity: 1;
    text-decoration: none;
    background: rgba(255,255,255,0.08);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }
  .login-resend-btn:hover { opacity: 1; }
  .login-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .login-verify-sent {
    font-size: var(--text-xs); color: var(--color-success); margin: 0;
  }
  /* Inline verify panel */
  .login-verify-panel {
    display: flex; flex-direction: column; align-items: center;
    gap: var(--space-4); text-align: center;
  }
  .login-verify-panel__title {
    font-family: var(--font-display); font-size: var(--text-lg);
    font-weight: var(--weight-bold); color: var(--color-text-primary);
  }
  .login-verify-panel__hint {
    font-size: var(--text-sm); color: var(--color-text-muted);
    margin-top: calc(var(--space-1) * -1);
  }
  .login-verify-panel__error {
    font-size: var(--text-sm); color: var(--color-danger); margin: 0;
  }
  .login-verify-panel__success {
    font-size: var(--text-sm); color: var(--color-success); margin: 0;
  }
  .login-verify-panel__resent {
    font-size: var(--text-xs); color: var(--color-success); margin: 0;
  }
  .login-verify-panel__resend-hint {
    font-size: var(--text-sm); color: var(--color-text-muted); margin: 0;
  }
  /* 6-digit boxes (reused from RegisterPage styles) */
  .reg-verify-digits {
    display: flex; gap: var(--space-2); justify-content: center;
  }
  .reg-verify-digit {
    width: 46px; height: 54px;
    text-align: center; font-size: var(--text-xl); font-family: var(--font-mono);
    font-weight: var(--weight-bold); color: var(--color-text-primary);
    background: var(--color-bg-overlay);
    border: 2px solid var(--color-border-default);
    border-radius: var(--radius-md);
    outline: none; caret-color: var(--color-primary-400);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .reg-verify-digit:focus {
    border-color: var(--color-primary-400);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.2);
  }
  .reg-verify-digit--filled { border-color: var(--color-primary-500,#7B5EA7); }
  .reg-verify-digit--error {
    border-color: var(--color-danger) !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important;
  }
  .reg-verify-digit--success {
    border-color: var(--color-success) !important;
    box-shadow: 0 0 0 3px rgba(52,211,153,0.2) !important;
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
  .login-google-btn {
    display: flex; align-items: center; justify-content: center;
    gap: var(--space-3); text-decoration: none;
  }
  .login-google-icon { width: 18px; height: 18px; }
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
  }
`;

export default LoginPage;
