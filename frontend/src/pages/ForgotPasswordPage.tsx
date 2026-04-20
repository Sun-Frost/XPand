import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../api/axios";

// ---------------------------------------------------------------------------
// ForgotPasswordPage
//
// Route: /forgot-password
//
// Four inline steps — no page navigation between them:
//
//   Step 1 — Email entry
//     POST /api/auth/forgot-password  { email }
//     Backend now validates the email: it must belong to a registered,
//     verified, LOCAL (non-OAuth) account. If the email is not found,
//     unverified, or belongs to an OAuth account, the backend returns a
//     400 with a clear message that we surface to the user.
//     Only on success (200) do we advance to Step 2.
//
//   Step 2 — 6-digit code entry
//     POST /api/auth/verify-reset-code  { email, code }
//     Code validated before advancing to password step.
//
//   Step 3 — New password entry
//     POST /api/auth/reset-password  { email, code, newPassword }
//     Password must meet policy: ≥8 chars, uppercase, lowercase, digit, special.
//
//   Step 4 — Success confirmation
// ---------------------------------------------------------------------------

// ── Password strength ────────────────────────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3;

const getStrength = (pw: string): StrengthLevel => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s >= 4) return 3;
  if (s >= 2) return 2;
  return 1;
};

const getPasswordPolicyError = (pw: string): string => {
  if (!pw)                       return "Password is required.";
  if (pw.length < 8)             return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw))         return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw))         return "Password must contain at least one lowercase letter.";
  if (!/\d/.test(pw))            return "Password must contain at least one number.";
  if (!/[^A-Za-z\d]/.test(pw))  return "Password must contain at least one special character.";
  return "";
};

const STRENGTH_META: Record<StrengthLevel, { label: string; cls: string }> = {
  0: { label: "",       cls: "" },
  1: { label: "Weak",   cls: "strength--weak" },
  2: { label: "Fair",   cls: "strength--fair" },
  3: { label: "Strong", cls: "strength--strong" },
};

const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const checks = [
    { label: "At least 8 characters",         met: password.length >= 8 },
    { label: "One uppercase letter (A–Z)",    met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)",    met: /[a-z]/.test(password) },
    { label: "One number (0–9)",              met: /\d/.test(password) },
    { label: "One special character (!@#$…)", met: /[^A-Za-z\d]/.test(password) },
  ];
  return (
    <ul className="fp-pw-requirements">
      {checks.map(({ label, met }) => (
        <li key={label} className={`fp-pw-req ${met ? "fp-pw-req--met" : ""}`}>
          <span className="fp-pw-req__icon">{met ? "✓" : "○"}</span>
          {label}
        </li>
      ))}
    </ul>
  );
};

// ── Shared layout ─────────────────────────────────────────────────────────────

const Orbs: React.FC = () => (
  <div className="fp-bg" aria-hidden="true">
    <div className="fp-bg__orb fp-bg__orb--1" />
    <div className="fp-bg__orb fp-bg__orb--2" />
    <div className="fp-bg__orb fp-bg__orb--3" />
  </div>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fp-page">
    <Orbs />
    <div className="fp-card card card-accent-top animate-fade-in">
      <div className="fp-card__header">
        <div className="fp-logo">
          <div className="logo-mark"><span className="fp-logo__symbol">XP</span></div>
          <span className="fp-logo__wordmark logo-wordmark">XPand</span>
        </div>
      </div>
      <div className="fp-card__body card-body">
        {children}
      </div>
    </div>
    <style>{pageStyles}</style>
  </div>
);

// ---------------------------------------------------------------------------
// Step 1 — Email input
// ---------------------------------------------------------------------------

const StepEmail: React.FC<{
  onSent: (email: string) => void;
  onBack: () => void;
}> = ({ onSent, onBack }) => {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await post("/auth/forgot-password", { email: trimmed });
      // Backend returned 200 — email is registered, verified, and LOCAL.
      // Advance to the code-entry step.
      onSent(trimmed);
    } catch (err: any) {
      // Backend returned a 4xx with a specific message — show it.
      const msg =
        err?.response?.data?.message ??
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="fp-step-header">
        <div className="fp-step-icon">🔑</div>
        <h1 className="fp-title">Forgot your password?</h1>
        <p className="fp-subtitle">
          Enter the email address you registered with and we'll send you a
          6-digit reset code.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="input-group">
          <label htmlFor="fp-email" className="input-label">Email address</label>
          <input
            ref={inputRef}
            id="fp-email"
            type="email"
            className={`input${error ? " input-error" : ""}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            autoComplete="email"
            disabled={loading}
          />
          {error && <span className="input-helper error" role="alert">{error}</span>}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full fp-submit"
          disabled={loading}
        >
          {loading
            ? <><span className="fp-spinner animate-spin" aria-hidden="true" /> Sending code…</>
            : "Send Reset Code →"}
        </button>
      </form>

      <button type="button" className="btn btn-ghost btn-sm w-full fp-back" onClick={onBack}>
        ← Back to Login
      </button>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Step 2 — 6-digit code entry
// ---------------------------------------------------------------------------

const StepCode: React.FC<{
  email: string;
  onVerified: (code: string) => void;
  onBack: () => void;
}> = ({ email, onVerified, onBack }) => {
  const [digits, setDigits]       = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError]         = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendLoading, setRL]    = useState(false);
  const [resendSent, setRS]       = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const codeComplete = digits.join("").length === 6;

  const verifyCode = async (code: string) => {
    if (verifying) return;
    setVerifying(true);
    setError("");
    try {
      await post("/auth/verify-reset-code", { email, code });
      onVerified(code);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Incorrect or expired code. Please try again.";
      setError(msg);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    setError("");
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (digit && i === 5 && next.join("").length === 6) {
      verifyCode(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError("");
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyCode(pasted);
  };

  const handleResend = async () => {
    setRL(true);
    setRS(false);
    setError("");
    try {
      await post("/auth/forgot-password", { email });
      setRS(true);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Failed to resend. Please try again.";
      setError(msg);
    } finally {
      setRL(false);
    }
  };

  return (
    <Card>
      <div className="fp-step-header">
        <div className="fp-step-icon">✉️</div>
        <h1 className="fp-title">Check your email</h1>
        <p className="fp-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>.
          Enter it below — it expires in 15 minutes.
        </p>
      </div>

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
              error ? "reg-verify-digit--error" : "",
              d ? "reg-verify-digit--filled" : "",
            ].filter(Boolean).join(" ")}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={verifying}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {error && <p className="fp-error" role="alert">{error}</p>}

      <button
        type="button"
        className="btn btn-primary btn-lg w-full fp-submit"
        disabled={!codeComplete || verifying}
        onClick={() => verifyCode(digits.join(""))}
      >
        {verifying
          ? <><span className="fp-spinner animate-spin" aria-hidden="true" /> Verifying…</>
          : "Continue →"}
      </button>

      {resendSent ? (
        <p className="fp-resend-sent">✅ New code sent! Check your inbox.</p>
      ) : (
        <p className="fp-resend-hint">
          Didn't receive it?{" "}
          <button
            type="button"
            className="fp-link"
            onClick={handleResend}
            disabled={resendLoading || verifying}
          >
            {resendLoading ? "Sending…" : "Resend code"}
          </button>
        </p>
      )}

      <button type="button" className="btn btn-ghost btn-sm w-full fp-back" onClick={onBack}
        disabled={verifying}>
        ← Use a different email
      </button>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Step 3 — New password
// ---------------------------------------------------------------------------

const StepNewPassword: React.FC<{
  email: string;
  code: string;
  onSuccess: () => void;
  onBack: () => void;
}> = ({ email, code, onSuccess, onBack }) => {
  const [pw, setPw]           = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [showCf, setShowCf]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => { pwRef.current?.focus(); }, []);

  const strength     = getStrength(pw);
  const strengthMeta = STRENGTH_META[strength];

  const validate = (): string => {
    const pwErr = getPasswordPolicyError(pw);
    if (pwErr) return pwErr;
    if (!confirm)       return "Please confirm your password.";
    if (pw !== confirm) return "Passwords do not match.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError("");
    setLoading(true);
    try {
      await post("/auth/reset-password", { email, code, newPassword: pw });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Reset failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="fp-step-header">
        <div className="fp-step-icon">🔒</div>
        <h1 className="fp-title">Set new password</h1>
        <p className="fp-subtitle">
          Choose a strong password for <strong>{email}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* New password */}
        <div className="input-group">
          <label htmlFor="fp-pw" className="input-label">New password</label>
          <div className="fp-pw-wrapper">
            <input
              ref={pwRef}
              id="fp-pw"
              type={showPw ? "text" : "password"}
              className="input fp-pw-input"
              placeholder="Min. 8 characters"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(""); }}
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              className="fp-pw-toggle btn btn-ghost btn-icon btn-icon-sm"
              onClick={() => setShowPw(v => !v)}
              tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Strength bar */}
        {pw && (
          <div className="fp-strength">
            <div className="fp-strength__track">
              <div
                className={`fp-strength__fill ${strengthMeta.cls}`}
                style={{ width: `${(strength / 3) * 100}%` }}
              />
            </div>
            {strengthMeta.label && (
              <span className={`fp-strength__label ${strengthMeta.cls}`}>
                {strengthMeta.label}
              </span>
            )}
          </div>
        )}

        {pw && <PasswordRequirements password={pw} />}

        {/* Confirm password */}
        <div className="input-group" style={{ marginTop: "var(--space-4)" }}>
          <label htmlFor="fp-cf" className="input-label">Confirm password</label>
          <div className="fp-pw-wrapper">
            <input
              id="fp-cf"
              type={showCf ? "text" : "password"}
              className={`input fp-pw-input${confirm && pw !== confirm ? " input-error" : ""}`}
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              className="fp-pw-toggle btn btn-ghost btn-icon btn-icon-sm"
              onClick={() => setShowCf(v => !v)}
              tabIndex={-1}
            >
              {showCf ? "🙈" : "👁"}
            </button>
          </div>
          {confirm && pw !== confirm && (
            <span className="input-helper error">Passwords do not match.</span>
          )}
        </div>

        {error && <p className="fp-error" role="alert" style={{ marginTop: "var(--space-2)" }}>{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full fp-submit"
          disabled={loading}
        >
          {loading
            ? <><span className="fp-spinner animate-spin" aria-hidden="true" /> Saving…</>
            : "Set New Password →"}
        </button>
      </form>

      <button type="button" className="btn btn-ghost btn-sm w-full fp-back" onClick={onBack}>
        ← Re-enter code
      </button>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Step 4 — Success
// ---------------------------------------------------------------------------

const StepSuccess: React.FC<{ onGoToLogin: () => void }> = ({ onGoToLogin }) => (
  <Card>
    <div className="fp-success">
      <div className="fp-success__icon">🎉</div>
      <h1 className="fp-title">Password updated!</h1>
      <p className="fp-subtitle">
        Your password has been changed successfully. You can now sign in with
        your new password.
      </p>
      <button
        type="button"
        className="btn btn-primary btn-lg w-full fp-submit"
        onClick={onGoToLogin}
      >
        Go to Login
      </button>
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

type Step = "email" | "code" | "password" | "success";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep]   = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode]   = useState("");

  switch (step) {
    case "email":
      return (
        <StepEmail
          onSent={(e) => { setEmail(e); setStep("code"); }}
          onBack={() => navigate("/login")}
        />
      );

    case "code":
      return (
        <StepCode
          email={email}
          onVerified={(c) => { setCode(c); setStep("password"); }}
          onBack={() => setStep("email")}
        />
      );

    case "password":
      return (
        <StepNewPassword
          email={email}
          code={code}
          onSuccess={() => setStep("success")}
          onBack={() => { setCode(""); setStep("code"); }}
        />
      );

    case "success":
      return <StepSuccess onGoToLogin={() => navigate("/login")} />;
  }
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyles = `
  .fp-page {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: var(--space-6);
    position: relative; overflow: hidden;
  }
  .fp-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .fp-bg__orb {
    position: absolute; border-radius: 50%;
    filter: blur(80px); opacity: 0.18;
    animation: orb-drift 12s ease-in-out infinite alternate;
  }
  .fp-bg__orb--1 {
    width: 480px; height: 480px; top: -160px; left: -120px;
    background: var(--color-primary-500); animation-duration: 14s;
  }
  .fp-bg__orb--2 {
    width: 360px; height: 360px; bottom: -100px; right: -80px;
    background: var(--color-accent-500); animation-duration: 10s; animation-delay: -4s;
  }
  .fp-bg__orb--3 {
    width: 240px; height: 240px; top: 40%; left: 60%;
    background: var(--color-indigo-500); animation-duration: 16s; animation-delay: -8s; opacity: 0.10;
  }
  @keyframes orb-drift {
    from { transform: translate(0,0) scale(1); }
    to   { transform: translate(30px,20px) scale(1.06); }
  }

  .fp-card {
    position: relative; z-index: 1;
    width: 100%; max-width: 440px;
    box-shadow: var(--shadow-xl), 0 0 60px rgba(0,184,217,0.07);
  }
  .fp-card__header {
    padding: var(--space-8) var(--space-8) var(--space-2); text-align: center;
  }
  .fp-logo {
    display: inline-flex; align-items: center; gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .fp-logo__symbol {
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: var(--text-sm); color: #fff; letter-spacing: var(--tracking-wider);
  }
  .fp-logo__wordmark {
    font-family: var(--font-display); font-size: var(--text-2xl);
    font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide);
  }
  .fp-card__body {
    display: flex; flex-direction: column; gap: var(--space-4);
  }

  .fp-step-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
  .fp-step-icon { font-size: 2.5rem; }
  .fp-title {
    font-family: var(--font-display); font-size: var(--text-2xl);
    font-weight: var(--weight-bold); color: var(--color-text-primary);
  }
  .fp-subtitle {
    font-size: var(--text-sm); color: var(--color-text-muted);
    line-height: var(--leading-relaxed); max-width: 320px;
  }

  .reg-verify-digits { display: flex; gap: var(--space-2); justify-content: center; }
  .reg-verify-digit {
    width: 46px; height: 54px; text-align: center;
    font-size: var(--text-xl); font-family: var(--font-mono);
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

  .fp-error {
    font-size: var(--text-sm); color: var(--color-danger);
    background: var(--color-danger-bg); border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-md); padding: var(--space-2) var(--space-3);
    margin: 0;
  }

  .fp-submit { margin-top: var(--space-2); font-family: var(--font-display); letter-spacing: var(--tracking-wider); }
  .fp-back { color: var(--color-text-muted); margin-top: 0; }

  .fp-resend-hint { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; margin: 0; }
  .fp-resend-sent {
    font-size: var(--text-sm); color: var(--color-success); text-align: center;
    background: var(--color-success-bg); padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md); margin: 0;
  }
  .fp-link {
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--color-primary-400); font-size: inherit; font-family: inherit;
    text-decoration: underline;
  }
  .fp-link:hover { color: var(--color-primary-300); }
  .fp-link:disabled { opacity: 0.5; cursor: not-allowed; }

  .fp-pw-wrapper { position: relative; display: flex; align-items: center; }
  .fp-pw-input { padding-right: 2.8rem !important; }
  .fp-pw-toggle {
    position: absolute; right: var(--space-2);
    background: transparent; border: none;
    color: var(--color-text-muted); font-size: var(--text-base);
    cursor: pointer; display: flex; align-items: center;
  }

  .fp-strength { display: flex; align-items: center; gap: var(--space-3); margin-top: calc(var(--space-1) * -1); }
  .fp-strength__track { flex: 1; height: 4px; background: var(--color-bg-overlay); border-radius: var(--radius-full); overflow: hidden; }
  .fp-strength__fill { height: 100%; border-radius: var(--radius-full); transition: width 0.4s ease, background 0.3s; }
  .fp-strength__fill.strength--weak   { background: var(--color-danger); }
  .fp-strength__fill.strength--fair   { background: var(--color-warning); }
  .fp-strength__fill.strength--strong { background: var(--color-success); }
  .fp-strength__label { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-medium); min-width: 44px; text-align: right; }
  .fp-strength__label.strength--weak   { color: var(--color-danger); }
  .fp-strength__label.strength--fair   { color: var(--color-warning); }
  .fp-strength__label.strength--strong { color: var(--color-success); }

  .fp-success {
    display: flex; flex-direction: column; align-items: center;
    gap: var(--space-4); text-align: center;
  }
  .fp-success__icon { font-size: 3rem; }

  .fp-spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%;
  }

  @media (max-width: 480px) {
    .fp-card { max-width: 100%; }
    .fp-card__header { padding: var(--space-6) var(--space-5) var(--space-2); }
    .fp-card__body { padding: var(--space-5); }
  }

  .fp-pw-requirements {
    list-style: none; margin: calc(var(--space-1) * -1) 0 0; padding: 0;
    display: flex; flex-direction: column; gap: 3px;
  }
  .fp-pw-req {
    display: flex; align-items: center; gap: var(--space-2);
    font-size: var(--text-xs); color: var(--color-text-muted);
    transition: color 0.2s;
  }
  .fp-pw-req--met { color: var(--color-success, #34D399); }
  .fp-pw-req__icon {
    font-size: 10px; font-family: var(--font-mono);
    width: 12px; text-align: center; flex-shrink: 0;
  }
`;

export default ForgotPasswordPage;
