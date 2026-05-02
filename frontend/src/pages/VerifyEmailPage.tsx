import xpandLogo from "../assets/xpand.svg";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { post } from "../api/axios";
import { Icon } from "../components/ui/Icon";

// ---------------------------------------------------------------------------
// VerifyEmailPage
//
// Route: /verify
// Also reachable via /verify?email=user@example.com (pre-fills the email field)
//
// The user receives a 6-digit code in their email and types it here.
// Calls POST /api/auth/verify  { email, code }
// ---------------------------------------------------------------------------

type Status = "idle" | "loading" | "success" | "error";

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pre-fill email if passed as a query param (from registration flow)
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  // Six individual digit slots
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");

  // Focus first digit box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ── Digit input handling ──────────────────────────────────────────────────

  const handleDigitChange = (index: number, value: string) => {
    // Only accept a single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setErrorMsg("");

    // Auto-advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 are filled
    if (digit && index === 5) {
      const fullCode = [...next].join("");
      if (fullCode.length === 6) submitCode(email.trim(), fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Jump back on backspace when current box is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Allow paste of a 6-digit code into any slot
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setErrorMsg("");
    // Focus the slot after the last pasted digit, or the last slot
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    // Auto-submit if all 6 filled
    if (pasted.length === 6) submitCode(email.trim(), pasted);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const submitCode = async (emailVal: string, code: string) => {
    if (!emailVal) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await post<{ message: string }>("/auth/verify", { email: emailVal, code });
      setStatus("success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Incorrect code or expired. Please try again or request a new code.";
      setErrorMsg(msg);
      setStatus("error");
      // Clear digits so user can re-enter cleanly
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setErrorMsg("Please enter all 6 digits.");
      return;
    }
    submitCode(email.trim(), code);
  };

  // ── Resend ────────────────────────────────────────────────────────────────

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setResendError("Please enter your email address first.");
      return;
    }
    setResendLoading(true);
    setResendError("");
    setResendSent(false);
    try {
      await post("/auth/resend-verification", { email: email.trim() });
      setResendSent(true);
      // Reset digits and refocus
      setDigits(["", "", "", "", "", ""]);
      setErrorMsg("");
      setStatus("idle");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setResendError("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="verify-page">
      <div className="verify-bg" aria-hidden="true">
        <div className="verify-bg__orb verify-bg__orb--1" />
        <div className="verify-bg__orb verify-bg__orb--2" />
      </div>

      <div className="verify-card card card-accent-top animate-fade-in">
        <div className="verify-card__inner">

          <img src={xpandLogo} alt="XPand" className="verify-logo" />

          {/* ── Success ── */}
          {status === "success" ? (
            <>
              <div className="verify-icon verify-icon--success" aria-hidden="true"><Icon name="success" size={28} label="" /></div>
              <h1 className="verify-title">Email Verified!</h1>
              <p className="verify-subtitle">Your account is now active. You can sign in.</p>
              <button
                className="btn btn-primary btn-lg verify-cta"
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              <div className="verify-icon verify-icon--code" aria-hidden="true"><Icon name="contact" size={30} label="" /></div>
              <h1 className="verify-title">Enter your code</h1>
              <p className="verify-subtitle">
                We sent a 6-digit code to your email address.
                Enter it below to verify your account.
              </p>

              <form className="verify-form" onSubmit={handleSubmit} noValidate>
                {/* Email field (hidden if pre-filled and not yet errored) */}
                <div className="input-group">
                  <label htmlFor="verify-email" className="input-label">Email address</label>
                  <input
                    id="verify-email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setResendSent(false);
                    }}
                    autoComplete="email"
                    disabled={status === "loading"}
                  />
                </div>

                {/* 6-digit code boxes */}
                <div className="verify-digits" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {inputRefs.current[i] = el;}}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`verify-digit-box${errorMsg ? " verify-digit-box--error" : ""}${d ? " verify-digit-box--filled" : ""}`}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      disabled={status === "loading"}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                {errorMsg && (
                  <p className="verify-error-msg" role="alert">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={status === "loading" || digits.join("").length < 6}
                >
                  {status === "loading" ? (
                    <><span className="verify-spinner" aria-hidden="true" /> Verifying…</>
                  ) : (
                    "Verify Email"
                  )}
                </button>
              </form>

              {/* Resend section */}
              <div className="verify-divider"><span>Didn't receive a code?</span></div>

              {resendSent ? (
                <p className="verify-resend-success">
                  <Icon name="check" size={14} label="" style={{verticalAlign:'middle',marginRight:4}} /> A new code has been sent. Check your inbox (and spam folder).
                </p>
              ) : (
                <form className="verify-resend-form" onSubmit={handleResend} noValidate>
                  {resendError && (
                    <span className="input-helper error" role="alert">{resendError}</span>
                  )}
                  <button
                    type="submit"
                    className="btn btn-outline btn-lg w-full"
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Sending…" : "Resend Code"}
                  </button>
                </form>
              )}

              <button
                className="btn btn-ghost verify-back-btn"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
            </>
          )}

        </div>
      </div>

      <style>{pageStyles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scoped styles
// ---------------------------------------------------------------------------

const pageStyles = `
  .verify-page {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: var(--space-6);
    position: relative; overflow: hidden;
  }
  .verify-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .verify-bg__orb {
    position: absolute; border-radius: 50%; filter: blur(80px);
    opacity: 0.18; animation: orb-drift 12s ease-in-out infinite alternate;
  }
  .verify-bg__orb--1 {
    width: 400px; height: 400px; top: -120px; left: -100px;
    background: var(--color-primary-500);
  }
  .verify-bg__orb--2 {
    width: 300px; height: 300px; bottom: -80px; right: -60px;
    background: var(--color-accent-500); animation-delay: -5s;
  }
  
  .verify-logo {
    width: 48px; height: 48px; object-fit: contain;
    border-radius: var(--radius-lg);
    margin-bottom: calc(var(--space-2) * -1);
  }
  .verify-card {
    position: relative; z-index: 1; width: 100%; max-width: 460px;
    box-shadow: var(--shadow-xl), 0 0 60px rgba(0,184,217,0.07);
  }
  .verify-card__inner {
    padding: var(--space-8) var(--space-8) var(--space-10);
    display: flex; flex-direction: column; align-items: center;
    gap: var(--space-5); text-align: center;
  }
  .verify-icon {
    width: 64px; height: 64px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem;
  }
  .verify-icon--success { background: var(--color-success-bg); color: var(--color-success); }
  .verify-icon--code { background: var(--color-info-bg, rgba(139,92,246,0.1)); font-size: 2.2rem; }
  .verify-title {
    font-family: var(--font-display); font-size: var(--text-2xl);
    font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0;
  }
  .verify-subtitle {
    color: var(--color-text-secondary); line-height: var(--leading-relaxed);
    max-width: 340px; font-size: var(--text-sm); margin: 0;
  }
  /* Form */
  .verify-form {
    width: 100%; display: flex; flex-direction: column; gap: var(--space-4);
  }
  /* 6-digit boxes */
  .verify-digits {
    display: flex; gap: var(--space-2); justify-content: center;
  }
  .verify-digit-box {
    width: 48px; height: 56px;
    text-align: center; font-size: var(--text-xl); font-family: var(--font-mono);
    font-weight: var(--weight-bold); color: var(--color-text-primary);
    background: var(--color-bg-overlay);
    border: 2px solid var(--color-border-default);
    border-radius: var(--radius-md);
    outline: none; caret-color: var(--color-primary-400);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .verify-digit-box:focus {
    border-color: var(--color-primary-400);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.2);
  }
  .verify-digit-box--filled {
    border-color: var(--color-primary-500, #7B5EA7);
  }
  .verify-digit-box--error {
    border-color: var(--color-danger) !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important;
  }
  .verify-error-msg {
    color: var(--color-danger); font-size: var(--text-sm);
    text-align: center; margin: 0;
  }
  .verify-spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle;
    margin-right: var(--space-2);
  }
  .verify-cta { margin-top: var(--space-2); width: 100%; }
  .verify-divider {
    width: 100%; display: flex; align-items: center; gap: var(--space-3);
    color: var(--color-text-muted); font-size: var(--text-sm);
  }
  .verify-divider::before,
  .verify-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--color-border);
  }
  .verify-resend-form {
    width: 100%; display: flex; flex-direction: column; gap: var(--space-3);
  }
  .verify-resend-success {
    font-size: var(--text-sm); color: var(--color-success);
    background: var(--color-success-bg); padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md); width: 100%; text-align: left;
  }
  .verify-back-btn { color: var(--color-text-muted); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 480px) {
    .verify-digit-box { width: 40px; height: 48px; font-size: var(--text-lg); }
    .verify-card__inner { padding: var(--space-6) var(--space-5) var(--space-8); }
  }
`;

export default VerifyEmailPage;