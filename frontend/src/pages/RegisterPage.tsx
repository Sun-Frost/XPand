import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRegister } from "../hooks/useRegister";
import { put, get, post } from "../api/axios";
import { CITIES } from "../constants/cities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = "user" | "company";

interface AccountFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ProfileFields {
  profilePicture: string;
  phoneNumber: string;
  country: string;
  city: string;
  professionalTitle: string;
  aboutMe: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
}

interface CompanyFields {
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  description: string;
  industry: string;
  location: string;
  websiteUrl: string;
}

interface SkillItem { id: number; name: string; category: string; }

type AccountErrors = Partial<Record<keyof AccountFields, string>>;
type CompanyErrors = Partial<Record<keyof CompanyFields, string>>;

const INITIAL_ACCOUNT: AccountFields = {
  firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
};
const INITIAL_PROFILE: ProfileFields = {
  profilePicture: "", phoneNumber: "", country: "", city: "",
  professionalTitle: "", aboutMe: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "",
};
const INITIAL_COMPANY: CompanyFields = {
  companyName: "", email: "", password: "", confirmPassword: "",
  description: "", industry: "", location: "", websiteUrl: "",
};

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

type StrengthLevel = 0 | 1 | 2 | 3;

const getPasswordStrength = (pw: string): StrengthLevel => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score >= 4) return 3;
  if (score >= 2) return 2;
  return 1;
};

const STRENGTH_META: Record<StrengthLevel, { label: string; className: string }> = {
  0: { label: "", className: "" },
  1: { label: "Weak", className: "strength--weak" },
  2: { label: "Fair", className: "strength--fair" },
  3: { label: "Strong", className: "strength--strong" },
};

// Password requirement checklist shown below the password field
const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const checks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", met: /[a-z]/.test(password) },
    { label: "One number (0–9)", met: /\d/.test(password) },
    { label: "One special character (!@#$…)", met: /[^A-Za-z\d]/.test(password) },
  ];
  return (
    <ul className="reg-pw-requirements">
      {checks.map(({ label, met }) => (
        <li key={label} className={`reg-pw-req ${met ? "reg-pw-req--met" : ""}`}>
          <span className="reg-pw-req__icon">{met ? "✓" : "○"}</span>
          {label}
        </li>
      ))}
    </ul>
  );
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const getPasswordError = (pw: string): string => {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/\d/.test(pw)) return "Password must contain at least one number.";
  if (!/[^A-Za-z\d]/.test(pw)) return "Password must contain at least one special character.";
  return "";
};

const validateAccount = (f: AccountFields): AccountErrors => {
  const e: AccountErrors = {};
  if (!f.firstName.trim()) e.firstName = "First name is required.";
  else if (f.firstName.trim().length < 2) e.firstName = "Must be at least 2 characters.";
  if (!f.lastName.trim()) e.lastName = "Last name is required.";
  else if (f.lastName.trim().length < 2) e.lastName = "Must be at least 2 characters.";
  if (!f.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address.";
  const pwErr = getPasswordError(f.password);
  if (pwErr) e.password = pwErr;
  if (!f.confirmPassword) e.confirmPassword = "Please confirm your password.";
  else if (f.confirmPassword !== f.password) e.confirmPassword = "Passwords do not match.";
  return e;
};

const validateCompany = (f: CompanyFields): CompanyErrors => {
  const e: CompanyErrors = {};
  if (!f.companyName.trim()) e.companyName = "Company name is required.";
  if (!f.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address.";
  const pwErr = getPasswordError(f.password);
  if (pwErr) e.password = pwErr;
  if (!f.confirmPassword) e.confirmPassword = "Please confirm your password.";
  else if (f.confirmPassword !== f.password) e.confirmPassword = "Passwords do not match.";
  if (!f.description.trim()) e.description = "Description is required.";
  if (!f.industry.trim()) e.industry = "Industry is required.";
  if (!f.location.trim()) e.location = "Location is required.";
  if (!f.websiteUrl.trim()) e.websiteUrl = "Website URL is required.";
  else if (!/^https?:\/\/.+/.test(f.websiteUrl)) e.websiteUrl = "Must start with http:// or https://";
  return e;
};

// ---------------------------------------------------------------------------
// Shared form components
// ---------------------------------------------------------------------------

interface FieldProps {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; error?: string; disabled?: boolean; autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
  required?: boolean;
}

const FormField: React.FC<FieldProps> = ({
  id, label, type = "text", placeholder, value, error,
  disabled, autoComplete, inputRef, onChange, children, required,
}) => (
  <div className="input-group">
    <label htmlFor={id} className="input-label">
      {label}{required && <span className="reg-required"> *</span>}
    </label>
    <div className={children ? "reg-pw-wrapper" : undefined}>
      <input
        ref={inputRef} id={id} type={type}
        className={`input${children ? " reg-pw-input" : ""}${error ? " input-error" : ""}`}
        placeholder={placeholder} value={value} onChange={onChange}
        disabled={disabled} autoComplete={autoComplete}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {children}
    </div>
    {error && <span id={`${id}-error`} className="input-helper error" role="alert">{error}</span>}
  </div>
);

const TextAreaField: React.FC<{
  id: string; label: string; placeholder?: string; value: string;
  disabled?: boolean; error?: string; required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}> = ({ id, label, placeholder, value, disabled, onChange, error, required }) => (
  <div className="input-group">
    <label htmlFor={id} className="input-label">
      {label}{required && <span className="reg-required"> *</span>}
    </label>
    <textarea id={id} className={`input reg-textarea${error ? " input-error" : ""}`}
      placeholder={placeholder} value={value} onChange={onChange}
      disabled={disabled} rows={3} />
    {error && <span className="input-helper error" role="alert">{error}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = ["Account", "Profile", "Skills"];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="reg-steps">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const done = n < current;
      const active = n === current;
      return (
        <React.Fragment key={label}>
          <div className={`reg-step ${active ? "reg-step--active" : done ? "reg-step--done" : "reg-step--upcoming"}`}>
            <span className="reg-step__dot">{done ? "✓" : n}</span>
            <span className="reg-step__label">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`reg-step__line ${done ? "reg-step__line--done" : ""}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// Orbs background
// ---------------------------------------------------------------------------

const Orbs: React.FC = () => (
  <div className="register-bg" aria-hidden="true">
    <div className="register-bg__orb register-bg__orb--1" />
    <div className="register-bg__orb register-bg__orb--2" />
    <div className="register-bg__orb register-bg__orb--3" />
  </div>
);

// ---------------------------------------------------------------------------
// Role Picker
// ---------------------------------------------------------------------------

const RolePicker: React.FC<{ onSelect: (r: Role) => void; onSignIn: () => void }> = ({ onSelect, onSignIn }) => (
  <div className="register-page">
    <Orbs />
    <div className="register-card card card-accent-top animate-fade-in">
      <div className="register-card__header">
        <div className="register-logo">
          <div className="logo-mark"><span className="register-logo__symbol">XP</span></div>
          <span className="register-logo__wordmark logo-wordmark">XPand</span>
        </div>
        <h1 className="register-card__title">Join XPand</h1>
        <p className="register-card__subtitle">Who are you signing up as?</p>
      </div>

      <div className="register-card__body card-body">
        <button className="reg-role-card" onClick={() => onSelect("user")}>
          <span className="reg-role-card__icon">🧑‍💻</span>
          <div className="reg-role-card__content">
            <div className="reg-role-card__title">Job Seeker / Professional</div>
            <div className="reg-role-card__desc">
              Build your verified skill profile, earn XP badges, and apply for jobs.
            </div>
          </div>
          <span className="reg-role-card__arrow">→</span>
        </button>

        <button className="reg-role-card" onClick={() => onSelect("company")}>
          <span className="reg-role-card__icon">🏢</span>
          <div className="reg-role-card__content">
            <div className="reg-role-card__title">Company / Employer</div>
            <div className="reg-role-card__desc">
              Post jobs, find verified talent, and manage your hiring pipeline.
            </div>
          </div>
          <span className="reg-role-card__arrow">→</span>
        </button>

        <div className="divider-with-text">already have an account?</div>
        <p className="register-login-cta">
          <button type="button" className="register-login-link" onClick={onSignIn}>Sign in instead</button>
        </p>
      </div>
    </div>
    <style>{pageStyles}</style>
  </div>
);

// ---------------------------------------------------------------------------
// Company Registration Form
// ---------------------------------------------------------------------------

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:8080";
const GOOGLE_OAUTH_URL = `${BACKEND_URL}/oauth2/authorization/google`;

const CompanyRegisterForm: React.FC<{
  onBack: () => void;
  onSuccess: (email: string) => void;
  onSignIn: () => void;
}> = ({ onBack, onSuccess, onSignIn }) => {
  const { registerCompany, isLoading, error, clearError } = useRegister();
  const [form, setForm] = useState<CompanyFields>(INITIAL_COMPANY);
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [didAttempt, setDidAttempt] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);
  useEffect(() => { if (error) clearError(); }, [form.email, form.password]);
  useEffect(() => { if (didAttempt) setErrors(validateCompany(form)); }, [form, didAttempt]);

  const set = (k: keyof CompanyFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidAttempt(true);
    const errs = validateCompany(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const result = await registerCompany({
      companyName: form.companyName.trim(),
      email: form.email.trim(),
      password: form.password,
      description: form.description.trim(),
      industry: form.industry.trim(),
      location: form.location.trim(),
      websiteUrl: form.websiteUrl.trim(),
    });

    if (result) onSuccess(form.email.trim());
  };

  return (
    <div className="register-page">
      <Orbs />
      <div className="register-card card card-accent-top animate-fade-in" style={{ maxWidth: 560 }}>
        <div className="register-card__header">
          <div className="register-logo">
            <div className="logo-mark"><span className="register-logo__symbol">XP</span></div>
            <span className="register-logo__wordmark logo-wordmark">XPand</span>
          </div>
          <h1 className="register-card__title">Company Registration</h1>
          <p className="register-card__subtitle">All fields are required to create a company account.</p>
        </div>

        <div className="reg-company-notice">
          <span>ℹ️</span>
          <span>Company accounts require admin approval before you can post jobs.</span>
        </div>

        <form className="register-card__body card-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="register-error-banner" role="alert">
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <div className="reg-section-label">Company Details</div>

          <FormField id="companyName" label="Company Name" placeholder="Acme Corp"
            value={form.companyName} error={errors.companyName}
            disabled={isLoading} inputRef={nameRef} required
            onChange={set("companyName") as any} />

          <div className="register-name-row">
            <FormField id="industry" label="Industry" placeholder="e.g. Technology"
              value={form.industry} error={errors.industry}
              disabled={isLoading} required onChange={set("industry") as any} />
            <div className="input-group">
              <label htmlFor="location" className="input-label">
                Location<span className="reg-required"> *</span>
              </label>
              <select
                id="location"
                className={`input${errors.location ? " input-error" : ""}`}
                value={form.location}
                disabled={isLoading}
                onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
              >
                <option value="">Select a city…</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.location && (
                <span className="input-helper error" role="alert">{errors.location}</span>
              )}
            </div>
          </div>

          <FormField id="websiteUrl" label="Website URL" placeholder="https://yourcompany.com"
            value={form.websiteUrl} error={errors.websiteUrl}
            disabled={isLoading} required onChange={set("websiteUrl") as any} />

          <TextAreaField id="description" label="Company Description"
            placeholder="Tell candidates about your company, mission, and culture…"
            value={form.description} error={errors.description}
            disabled={isLoading} required
            onChange={set("description") as any} />

          <div className="reg-section-label">Account Credentials</div>

          <FormField id="co-email" label="Work Email" type="email" placeholder="hr@yourcompany.com"
            value={form.email} error={errors.email}
            disabled={isLoading} autoComplete="email" required
            onChange={set("email") as any} />

          <FormField id="co-password" label="Password"
            type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
            value={form.password} error={errors.password}
            disabled={isLoading} autoComplete="new-password" required
            onChange={set("password") as any}>
            <button type="button" className="reg-pw-toggle btn btn-ghost btn-icon btn-icon-sm"
              onClick={() => setShowPw(v => !v)} tabIndex={-1}
              aria-label={showPw ? "Hide" : "Show"}>
              {showPw ? "🙈" : "👁"}
            </button>
          </FormField>

          <FormField id="co-confirmPassword" label="Confirm Password"
            type={showConfirm ? "text" : "password"} placeholder="Repeat your password"
            value={form.confirmPassword} error={errors.confirmPassword}
            disabled={isLoading} autoComplete="new-password" required
            onChange={set("confirmPassword") as any}>
            <button type="button" className="reg-pw-toggle btn btn-ghost btn-icon btn-icon-sm"
              onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
              {showConfirm ? "🙈" : "👁"}
            </button>
          </FormField>

          <p className="register-terms">
            By registering you agree to our{" "}
            <button type="button" className="register-terms__link">Terms of Service</button>{" "}and{" "}
            <button type="button" className="register-terms__link">Privacy Policy</button>.
          </p>

          <button type="submit" className="btn btn-primary btn-lg w-full register-submit" disabled={isLoading}>
            {isLoading
              ? <><span className="register-spinner animate-spin" />Submitting…</>
              : "Submit for Approval →"}
          </button>

          <div className="reg-step-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-ghost btn-lg w-full" onClick={onBack}>
              ← Back
            </button>
          </div>

          <div className="divider-with-text">already have an account?</div>
          <p className="register-login-cta">
            <button type="button" className="register-login-link" onClick={onSignIn}>Sign in instead</button>
          </p>
        </form>
      </div>
      <style>{pageStyles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared 6-digit verify component — used by both User and Company flows
// ---------------------------------------------------------------------------

/**
 * FIX: Extracted into a shared component so both flows get the same bug fixes:
 *
 * 1. On wrong code → digits clear, verifyStatus resets to "idle" (not stuck on "error").
 *    This ensures the auto-submit at digit-5 fires cleanly on the next attempt.
 * 2. handleDigitChange explicitly resets status to "idle" on any new typing,
 *    so the button disabled-check and auto-submit always start from a clean state.
 */
const SixDigitVerify: React.FC<{
  email: string;
  title: string;
  subtitle: React.ReactNode;
  submitLabel: string;
  onSuccess: () => void;
  onGoToLogin: () => void;
  successContent: React.ReactNode;
}> = ({ email, title, subtitle, submitLabel, onSuccess, onGoToLogin, successContent }) => {
  const [digits, setDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const [verifyStatus, setVerifyStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [verifyError, setVerifyError] = React.useState("");

  const [resendLoading, setResendLoading] = React.useState(false);
  const [resendSent, setResendSent] = React.useState(false);

  React.useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const submitCode = async (code: string) => {
    setVerifyStatus("loading");
    setVerifyError("");
    try {
      await post<{ message: string }>("/auth/verify", { email, code });
      setVerifyStatus("success");
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Incorrect code. Please try again.";
      setVerifyError(msg);
      // Reset to "idle" (not "error") so the next full code auto-submits cleanly
      setVerifyStatus("idle");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    // Clear error message as soon as user starts retyping
    setVerifyError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (digit && index === 5) {
      const full = next.join("");
      if (full.length === 6) submitCode(full);
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
    if (pasted.length === 6) submitCode(pasted);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSent(false);
    try {
      await post("/auth/resend-verification", { email });
      setResendSent(true);
      setDigits(["", "", "", "", "", ""]);
      setVerifyError("");
      setVerifyStatus("idle");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch { /* backend always returns 200 */ } finally {
      setResendLoading(false);
    }
  };

  if (verifyStatus === "success") {
    return (
      <div className="register-page">
        <Orbs />
        <div className="register-card card card-accent-top animate-fade-in">
          <div className="register-success">
            {successContent}
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div className="register-page">
      <Orbs />
      <div className="register-card card card-accent-top animate-fade-in">
        <div className="register-success">
          <div className="register-success__icon">✉️</div>
          <h2 className="register-success__title">{title}</h2>
          <p className="register-success__message">{subtitle}</p>

          <div className="reg-verify-digits" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`reg-verify-digit${verifyError ? " reg-verify-digit--error" : ""}${d ? " reg-verify-digit--filled" : ""}`}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifyStatus === "loading"}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {verifyError && (
            <p className="register-resend-error" role="alert">{verifyError}</p>
          )}

          <button
            type="button"
            className="btn btn-primary btn-lg w-full"
            onClick={() => submitCode(digits.join(""))}
            disabled={verifyStatus === "loading" || digits.join("").length < 6}
          >
            {verifyStatus === "loading"
              ? <><span className="register-spinner animate-spin" /> Verifying…</>
              : submitLabel}
          </button>

          {resendSent ? (
            <p className="register-resend-sent">✅ New code sent! Check your inbox.</p>
          ) : (
            <p className="register-resend-hint">
              Didn't receive it?{" "}
              <button
                type="button"
                className="register-text-link"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? "Sending…" : "Resend code"}
              </button>
            </p>
          )}

          <button type="button" className="btn btn-ghost" onClick={onGoToLogin}>
            Back to Login
          </button>
        </div>
      </div>
      <style>{pageStyles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// UserVerifyPending — uses SixDigitVerify
// ---------------------------------------------------------------------------

const UserVerifyPending: React.FC<{
  email: string;
  onGoToLogin: () => void;
  onContinueSetup?: () => void;
}> = ({ email, onGoToLogin, onContinueSetup }) => {
  const [done, setDone] = React.useState(false);

  if (done) {
    return (
      <div className="register-page">
        <Orbs />
        <div className="register-card card card-accent-top animate-fade-in">
          <div className="register-success">
            <div className="register-success__icon">🎉</div>
            <h2 className="register-success__title">Email Verified!</h2>
            <p className="register-success__message">
              Your account is active! Complete your profile and select skills to get discovered by employers faster.
            </p>
            {onContinueSetup && (
              <button
                type="button"
                className="btn btn-primary btn-lg w-full"
                onClick={onContinueSetup}
              >
                Complete Profile Setup →
              </button>
            )}
            <button type="button" className={onContinueSetup ? "btn btn-ghost btn-lg w-full" : "btn btn-primary btn-lg"} onClick={onGoToLogin}>
              {onContinueSetup ? "Skip — Go to Login" : "Go to Login"}
            </button>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  return (
    <SixDigitVerify
      email={email}
      title="Check your email"
      subtitle={<>We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.</>}
      submitLabel="Verify Email"
      onSuccess={() => setDone(true)}
      onGoToLogin={onGoToLogin}
      successContent={null /* handled by done state above */}
    />
  );
};

// ---------------------------------------------------------------------------
// CompanyVerifyPending — uses SixDigitVerify
// ---------------------------------------------------------------------------

const CompanyVerifyPending: React.FC<{
  email: string;
  onGoToLogin: () => void;
}> = ({ email, onGoToLogin }) => {
  const [done, setDone] = React.useState(false);

  if (done) {
    return (
      <div className="register-page">
        <Orbs />
        <div className="register-card card card-accent-top animate-fade-in">
          <div className="register-success">
            <div className="register-success__icon">⏳</div>
            <h2 className="register-success__title">Application Submitted!</h2>
            <p className="register-success__message">
              Your email has been verified. Your company account is now
              pending admin approval — you'll receive an email once it's approved.
            </p>
            <button type="button" className="btn btn-ghost" onClick={onGoToLogin}>
              Back to Login
            </button>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  return (
    <SixDigitVerify
      email={email}
      title="Verify your email"
      subtitle={<>We sent a 6-digit code to <strong>{email}</strong>. Verify your email to submit your company for review.</>}
      submitLabel="Verify & Submit Application"
      onSuccess={() => setDone(true)}
      onGoToLogin={onGoToLogin}
      successContent={null /* handled by done state above */}
    />
  );
};

// ---------------------------------------------------------------------------
// Main RegisterPage — orchestrates role picker + user / company flows
// ---------------------------------------------------------------------------

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser, isLoading: registerLoading, error: registerError, clearError } = useRegister();

  const [role, setRole] = useState<Role | null>(null);
  const [done, setDone] = useState<"user-verify" | "company-verify" | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [postVerify, setPostVerify] = useState(false); // true when continuing setup after email verification

  // User flow state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [account, setAccount] = useState<AccountFields>(INITIAL_ACCOUNT);
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [didAttempt, setDidAttempt] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>(INITIAL_PROFILE);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set());
  const [skillSearch, setSkillSearch] = useState("");

  const firstNameRef = useRef<HTMLInputElement>(null);
  const strength = getPasswordStrength(account.password);
  const strengthMeta = STRENGTH_META[strength];

  useEffect(() => {
    if (role === "user" && step === 1) firstNameRef.current?.focus();
  }, [role, step]);

  useEffect(() => {
    if (registerError) clearError();
  }, [account.email, account.password]);

  useEffect(() => {
    if (didAttempt) setAccountErrors(validateAccount(account));
  }, [account, didAttempt]);

  useEffect(() => {
    if (step !== 3) return;
    setSkillsLoading(true);
    get<SkillItem[]>("/skills")
      .then(setSkills)
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
  }, [step]);

  const handleAccountChange = (k: keyof AccountFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAccount(p => ({ ...p, [k]: e.target.value }));

  const handleProfileChange = (k: keyof ProfileFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setProfile(p => ({ ...p, [k]: e.target.value }));

  const toggleSkill = (id: number) =>
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidAttempt(true);
    const errs = validateAccount(account);
    setAccountErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const result = await registerUser({
      firstName: account.firstName.trim(),
      lastName: account.lastName.trim(),
      email: account.email.trim(),
      password: account.password,
    });
    if (result) {
      setRegisteredEmail(account.email.trim());
      setDone("user-verify");
    }
  };

  const handleProfileSubmit = async (skip = false) => {
    if (skip) { setStep(3); return; }
    setProfileLoading(true);
    setProfileError(null);
    try {
      await put("/user/profile", {
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        phoneNumber: profile.phoneNumber || null,
        country: profile.country || null,
        city: profile.city || null,
        professionalTitle: profile.professionalTitle || null,
        aboutMe: profile.aboutMe || null,
        linkedinUrl: profile.linkedinUrl || null,
        githubUrl: profile.githubUrl || null,
        portfolioUrl: profile.portfolioUrl || null,
        profilePicture: profile.profilePicture || null,
      });
      setStep(3);
    } catch {
      setProfileError("Failed to save profile. You can update it later.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleFinish = () => {
    if (selectedSkillIds.size > 0)
      localStorage.setItem("onboarding_skill_ids", JSON.stringify([...selectedSkillIds]));
    if (postVerify) {
      navigate("/dashboard");
    } else {
      setDone("user-verify");
    }
  };

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(skillSearch.toLowerCase())
  );
  const groupedSkills = filteredSkills.reduce<Record<string, SkillItem[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  // ── Verification screens ───────────────────────────────────────────────────
  if (done === "user-verify") return (
    <UserVerifyPending
      email={registeredEmail}
      onGoToLogin={() => navigate("/login")}
      onContinueSetup={async () => {
        // Auto-login with the credentials from step 1, then continue to step 2
        try {
          const loginData = await post<{ token: string; role: string; id: number; email: string }>(
            "/auth/user/login",
            { email: account.email.trim(), password: account.password }
          );
          if (loginData?.token) {
            localStorage.setItem("access_token", loginData.token);
          }
        } catch {
          // Login failed — redirect to login page so user can sign in manually
          navigate("/login");
          return;
        }
        setDone(null);
        setPostVerify(true);
        setStep(2);
      }}
    />
  );
  if (done === "company-verify") return (
    <CompanyVerifyPending
      email={registeredEmail}
      onGoToLogin={() => navigate("/login?notice=company_pending")}
    />
  );

  // ── Role picker ────────────────────────────────────────────────────────────
  if (!role) return (
    <RolePicker onSelect={setRole} onSignIn={() => navigate("/login")} />
  );

  // ── Company flow ───────────────────────────────────────────────────────────
  if (role === "company") return (
    <CompanyRegisterForm
      onBack={() => setRole(null)}
      onSuccess={(email) => { setRegisteredEmail(email); setDone("company-verify"); }}
      onSignIn={() => navigate("/login")}
    />
  );

  // ── User flow ──────────────────────────────────────────────────────────────
  return (
    <div className="register-page">
      <Orbs />
      <div className="register-card card card-accent-top animate-fade-in">

        <div className="register-card__header">
          <div className="register-logo">
            <div className="logo-mark"><span className="register-logo__symbol">XP</span></div>
            <span className="register-logo__wordmark logo-wordmark">XPand</span>
          </div>
          <h1 className="register-card__title">
            {step === 1 ? "Create your account" : step === 2 ? "Build your profile" : "Choose your skills"}
          </h1>
          <p className="register-card__subtitle">
            {step === 1
              ? "Join thousands of professionals levelling up their verified skill set."
              : step === 2
              ? "Help employers find you. You can always update this later."
              : "Pick skills you want to verify. You'll take short tests to earn badges."}
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <form className="register-card__body card-body" onSubmit={handleAccountSubmit} noValidate>
            {registerError && (
              <div className="register-error-banner" role="alert">
                <span>⚠</span><span>{registerError}</span>
              </div>
            )}

            <div className="register-name-row">
              <FormField id="firstName" label="First Name" placeholder="Alex"
                value={account.firstName} error={accountErrors.firstName}
                disabled={registerLoading} autoComplete="given-name"
                inputRef={firstNameRef} onChange={handleAccountChange("firstName")} />
              <FormField id="lastName" label="Last Name" placeholder="Morgan"
                value={account.lastName} error={accountErrors.lastName}
                disabled={registerLoading} autoComplete="family-name"
                onChange={handleAccountChange("lastName")} />
            </div>

            <FormField id="email" label="Email" type="email" placeholder="you@example.com"
              value={account.email} error={accountErrors.email}
              disabled={registerLoading} autoComplete="email"
              onChange={handleAccountChange("email")} />

            <FormField id="password" label="Password"
              type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
              value={account.password} error={accountErrors.password}
              disabled={registerLoading} autoComplete="new-password"
              onChange={handleAccountChange("password")}>
              <button type="button" className="reg-pw-toggle btn btn-ghost btn-icon btn-icon-sm"
                onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? "🙈" : "👁"}
              </button>
            </FormField>

            {account.password && (
              <div className="register-strength">
                <div className="register-strength__track">
                  <div className={`register-strength__fill ${strengthMeta.className}`}
                    style={{ width: `${(strength / 3) * 100}%` }} />
                </div>
                {strengthMeta.label && (
                  <span className={`register-strength__label ${strengthMeta.className}`}>
                    {strengthMeta.label}
                  </span>
                )}
              </div>
            )}

            {account.password && <PasswordRequirements password={account.password} />}

            <FormField id="confirmPassword" label="Confirm Password"
              type={showConfirm ? "text" : "password"} placeholder="Repeat your password"
              value={account.confirmPassword} error={accountErrors.confirmPassword}
              disabled={registerLoading} autoComplete="new-password"
              onChange={handleAccountChange("confirmPassword")}>
              <button type="button" className="reg-pw-toggle btn btn-ghost btn-icon btn-icon-sm"
                onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                {showConfirm ? "🙈" : "👁"}
              </button>
            </FormField>

            <div className="divider-with-text">or</div>

            <a
              href={GOOGLE_OAUTH_URL}
              className="btn btn-outline btn-lg w-full register-google-btn"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                className="register-google-icon"
                aria-hidden="true"
              />
              Continue with Google
            </a>

            <p className="register-terms">
              By creating an account you agree to our{" "}
              <button type="button" className="register-terms__link">Terms of Service</button>{" "}and{" "}
              <button type="button" className="register-terms__link">Privacy Policy</button>.
            </p>

            <button type="submit" className="btn btn-primary btn-lg w-full register-submit"
              disabled={registerLoading}>
              {registerLoading
                ? <><span className="register-spinner animate-spin" />Creating account…</>
                : "Create Account & Continue →"}
            </button>

            <button type="button" className="btn btn-ghost btn-sm w-full"
              onClick={() => setRole(null)}>
              ← Change account type
            </button>

            <div className="divider-with-text">already have an account?</div>
            <p className="register-login-cta">
              <button type="button" className="register-login-link"
                onClick={() => navigate("/login")}>Sign in instead</button>
            </p>
          </form>
        )}

        {/* ── Step 2: Profile ── */}
        {step === 2 && (
          <div className="register-card__body card-body">
            {profileError && (
              <div className="register-error-banner" role="alert">
                <span>⚠</span><span>{profileError}</span>
              </div>
            )}

            <div className="reg-section-label">Photo & Location</div>
            <FormField id="profilePicture" label="Profile Picture URL"
              placeholder="https://example.com/photo.jpg"
              value={profile.profilePicture} disabled={profileLoading}
              onChange={handleProfileChange("profilePicture") as any} />
            <div className="register-name-row">
              <FormField id="country" label="Country" placeholder="Lebanon"
                value={profile.country} disabled={profileLoading}
                onChange={handleProfileChange("country") as any} />
              <div className="input-group">
                <label htmlFor="city" className="input-label">City</label>
                <select
                  id="city"
                  className="input"
                  value={profile.city}
                  disabled={profileLoading}
                  onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                >
                  <option value="">Select a city…</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <FormField id="phoneNumber" label="Phone Number" placeholder="+961 XX XXX XXX"
              value={profile.phoneNumber} disabled={profileLoading}
              autoComplete="tel" onChange={handleProfileChange("phoneNumber") as any} />

            <div className="reg-section-label">Professional Info</div>
            <FormField id="professionalTitle" label="Professional Title"
              placeholder="e.g. Full Stack Developer"
              value={profile.professionalTitle} disabled={profileLoading}
              onChange={handleProfileChange("professionalTitle") as any} />
            <div className="input-group">
              <label className="input-label">About Me</label>
              <textarea className="input reg-textarea" placeholder="A short bio about yourself…"
                value={profile.aboutMe} disabled={profileLoading} rows={3}
                onChange={handleProfileChange("aboutMe") as any} />
            </div>

            <div className="reg-section-label">Links</div>
            <FormField id="linkedinUrl" label="LinkedIn URL"
              placeholder="https://linkedin.com/in/yourname"
              value={profile.linkedinUrl} disabled={profileLoading}
              onChange={handleProfileChange("linkedinUrl") as any} />
            <FormField id="githubUrl" label="GitHub URL"
              placeholder="https://github.com/yourname"
              value={profile.githubUrl} disabled={profileLoading}
              onChange={handleProfileChange("githubUrl") as any} />
            <FormField id="portfolioUrl" label="Portfolio URL"
              placeholder="https://yourportfolio.com"
              value={profile.portfolioUrl} disabled={profileLoading}
              onChange={handleProfileChange("portfolioUrl") as any} />

            <div className="reg-step-actions">
              <button type="button" className="btn btn-ghost btn-lg"
                disabled={profileLoading} onClick={() => handleProfileSubmit(true)}>
                Skip for now
              </button>
              <button type="button" className="btn btn-primary btn-lg reg-step-actions__main"
                disabled={profileLoading} onClick={() => handleProfileSubmit(false)}>
                {profileLoading
                  ? <><span className="register-spinner animate-spin" />Saving…</>
                  : "Save & Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Skills ── */}
        {step === 3 && (
          <div className="register-card__body card-body">
            <p className="reg-skills-hint">
              Select skills you want to verify. You'll take short tests to earn shareable badges.
              <strong> Optional</strong> — you can add skills from your profile later.
            </p>
            <input className="input" placeholder="Search skills…"
              value={skillSearch} onChange={e => setSkillSearch(e.target.value)} />

            {skillsLoading ? (
              <div className="reg-skills-loading">Loading skills…</div>
            ) : (
              <div className="reg-skills-scroll">
                {Object.entries(groupedSkills).map(([cat, items]) => (
                  <div key={cat} className="reg-skill-group">
                    <div className="reg-skill-group__label">{cat}</div>
                    <div className="reg-skill-chips">
                      {items.map(skill => {
                        const sel = selectedSkillIds.has(skill.id);
                        return (
                          <button key={skill.id} type="button"
                            className={`reg-skill-chip ${sel ? "reg-skill-chip--selected" : ""}`}
                            onClick={() => toggleSkill(skill.id)}>
                            {sel && <span className="reg-skill-chip__check">✓</span>}
                            {skill.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(groupedSkills).length === 0 && !skillsLoading && (
                  <p className="reg-skills-empty">No skills match your search.</p>
                )}
              </div>
            )}

            {selectedSkillIds.size > 0 && (
              <div className="reg-skills-count">
                {selectedSkillIds.size} skill{selectedSkillIds.size > 1 ? "s" : ""} selected
              </div>
            )}

            <div className="reg-step-actions">
              <button type="button" className="btn btn-ghost btn-lg" onClick={handleFinish}>
                Skip for now
              </button>
              <button type="button" className="btn btn-primary btn-lg reg-step-actions__main"
                onClick={handleFinish}>
                {selectedSkillIds.size > 0 ? "Finish →" : "Continue →"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{pageStyles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles — identical to original, no removals
// ---------------------------------------------------------------------------

const pageStyles = `
  .register-page {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: var(--space-8) var(--space-6);
    position: relative; overflow: hidden;
  }
  .register-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .register-bg__orb {
    position: absolute; border-radius: 50%;
    filter: blur(90px); opacity: 0.16;
    animation: reg-orb-drift 14s ease-in-out infinite alternate;
  }
  .register-bg__orb--1 { width:520px;height:520px;top:-180px;right:-100px;background:var(--color-accent-500,#8B5CF6);animation-duration:16s; }
  .register-bg__orb--2 { width:400px;height:400px;bottom:-120px;left:-80px;background:var(--color-primary-500,#7B5EA7);animation-duration:12s;animation-delay:-5s; }
  .register-bg__orb--3 { width:200px;height:200px;top:50%;left:50%;background:var(--color-indigo-500,#5B5BD6);opacity:0.08;animation-duration:18s;animation-delay:-9s; }
  @keyframes reg-orb-drift { from{transform:translate(0,0) scale(1);} to{transform:translate(-28px,22px) scale(1.07);} }

  .register-card {
    position: relative; z-index: 1; width: 100%; max-width: 520px;
    box-shadow: var(--shadow-xl), 0 0 60px rgba(204,48,224,0.06);
  }
  .register-card__header { padding: var(--space-8) var(--space-8) var(--space-2); text-align: center; }
  .register-logo { display: inline-flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-5); }
  .register-logo__symbol { font-family: var(--font-display); font-weight: var(--weight-bold); font-size: var(--text-sm); color: #fff; letter-spacing: var(--tracking-wider); }
  .register-logo__wordmark { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide); }
  .register-card__title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin-bottom: var(--space-2); }
  .register-card__subtitle { font-size: var(--text-sm); color: var(--color-text-muted); line-height: var(--leading-relaxed); max-width: 360px; margin: 0 auto; }

  .reg-role-card {
    display: flex; align-items: center; gap: var(--space-4);
    padding: var(--space-5); width: 100%; text-align: left;
    background: var(--color-bg-overlay); border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg); cursor: pointer;
    transition: all 180ms ease; font-family: var(--font-body);
  }
  .reg-role-card:hover { border-color: var(--color-primary-500,#7B5EA7); background: var(--color-bg-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .reg-role-card__icon { font-size: 2rem; flex-shrink: 0; }
  .reg-role-card__content { flex: 1; }
  .reg-role-card__title { font-weight: var(--weight-semibold); color: var(--color-text-primary); font-size: var(--text-base); margin-bottom: var(--space-1); }
  .reg-role-card__desc { font-size: var(--text-sm); color: var(--color-text-muted); line-height: var(--leading-relaxed); }
  .reg-role-card__arrow { color: var(--color-text-disabled); font-size: var(--text-lg); flex-shrink: 0; }

  .reg-company-notice {
    display: flex; align-items: flex-start; gap: var(--space-2);
    margin: 0 var(--space-8); padding: var(--space-3) var(--space-4);
    background: var(--color-info-bg, rgba(139,92,246,0.08));
    border: 1px solid var(--color-info-border, rgba(139,92,246,0.22));
    border-radius: var(--radius-md); font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .reg-required { color: var(--color-danger); margin-left: 2px; }

  .reg-steps { display: flex; align-items: center; justify-content: center; padding: var(--space-5) var(--space-8) var(--space-2); }
  .reg-step { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); }
  .reg-step__dot {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 50%;
    font-size: var(--text-xs); font-weight: var(--weight-bold); font-family: var(--font-mono);
    background: var(--color-bg-overlay); color: var(--color-text-disabled);
    border: 2px solid var(--color-border-subtle);
    transition: all 180ms ease;
  }
  .reg-step--active .reg-step__dot { background: var(--color-primary-500,#7B5EA7); color: #fff; border-color: var(--color-primary-500,#7B5EA7); box-shadow: 0 0 12px rgba(123,94,167,0.4); }
  .reg-step--done .reg-step__dot { background: var(--color-success,#34D399); color: #fff; border-color: var(--color-success,#34D399); }
  .reg-step__label { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--color-text-disabled); }
  .reg-step--active .reg-step__label { color: var(--color-primary-400,#A78BFA); }
  .reg-step--done .reg-step__label { color: var(--color-success,#34D399); }
  .reg-step__line { flex: 1; height: 2px; min-width: 48px; background: var(--color-border-subtle); margin: 0 var(--space-2) var(--space-4); transition: background 180ms; }
  .reg-step__line--done { background: var(--color-success,#34D399); }

  .register-card__body { display: flex; flex-direction: column; gap: var(--space-4); }

  .register-name-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
  .register-error-banner { display: flex; align-items: flex-start; gap: var(--space-2); padding: var(--space-3) var(--space-4); background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-md); color: var(--color-danger); font-size: var(--text-sm); }
  .reg-pw-wrapper { position: relative; display: flex; align-items: center; }
  .reg-pw-input { padding-right: 2.8rem !important; }
  .reg-pw-toggle { position: absolute; right: var(--space-2); background: transparent; border: none; color: var(--color-text-muted); font-size: var(--text-base); cursor: pointer; display: flex; align-items: center; }
  .register-strength { display: flex; align-items: center; gap: var(--space-3); margin-top: calc(var(--space-1) * -1); }
  .register-strength__track { flex: 1; height: 4px; background: var(--color-bg-overlay); border-radius: var(--radius-full); overflow: hidden; }
  .register-strength__fill { height: 100%; border-radius: var(--radius-full); transition: width 0.4s ease, background 0.3s; }
  .register-strength__fill.strength--weak { background: var(--color-danger); }
  .register-strength__fill.strength--fair { background: var(--color-warning); }
  .register-strength__fill.strength--strong { background: var(--color-success); }
  .register-strength__label { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-medium); min-width: 44px; text-align: right; }
  .register-strength__label.strength--weak { color: var(--color-danger); }
  .register-strength__label.strength--fair { color: var(--color-warning); }
  .register-strength__label.strength--strong { color: var(--color-success); }
  .register-terms { font-size: var(--text-xs); color: var(--color-text-muted); line-height: var(--leading-relaxed); text-align: center; }
  .register-terms__link { background: none; border: none; padding: 0; color: var(--color-primary-400,#A78BFA); font-size: var(--text-xs); font-family: var(--font-body); cursor: pointer; }
  .register-submit { font-family: var(--font-display); font-size: var(--text-md); letter-spacing: var(--tracking-wider); margin-top: var(--space-1); }
  .register-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; }
  .register-login-cta { text-align: center; }
  .register-login-link { background: none; border: none; padding: 0; color: var(--color-primary-400,#A78BFA); font-weight: var(--weight-semibold); font-size: var(--text-sm); font-family: var(--font-body); cursor: pointer; }

  .register-google-btn {
    display: flex; align-items: center; justify-content: center;
    gap: var(--space-3); text-decoration: none;
  }
  .register-google-icon { width: 18px; height: 18px; }

  .reg-section-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--color-text-muted); padding-top: var(--space-2); border-top: 1px solid var(--color-border-subtle); margin-top: var(--space-1); }
  .reg-textarea { resize: vertical; min-height: 80px; font-family: var(--font-body); }

  .reg-step-actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }
  .reg-step-actions__main { flex: 1; }

  .reg-skills-hint { font-size: var(--text-sm); color: var(--color-text-muted); line-height: var(--leading-relaxed); }
  .reg-skills-scroll { max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-4); padding-right: var(--space-1); }
  .reg-skills-scroll::-webkit-scrollbar { width: 4px; }
  .reg-skills-scroll::-webkit-scrollbar-track { background: transparent; }
  .reg-skills-scroll::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--radius-full); }
  .reg-skill-group__label { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--color-text-muted); margin-bottom: var(--space-2); }
  .reg-skill-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .reg-skill-chip { display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-3); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-full); background: var(--color-bg-overlay); color: var(--color-text-secondary); font-size: var(--text-xs); font-family: var(--font-body); cursor: pointer; transition: all 120ms ease; }
  .reg-skill-chip:hover { border-color: var(--color-primary-500,#7B5EA7); color: var(--color-primary-400,#A78BFA); }
  .reg-skill-chip--selected { background: var(--color-primary-500,#7B5EA7); border-color: var(--color-primary-500,#7B5EA7); color: #fff; }
  .reg-skill-chip__check { font-size: 10px; }
  .reg-skills-loading { text-align: center; color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-8) 0; }
  .reg-skills-empty { text-align: center; color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-6) 0; }
  .reg-skills-count { font-size: var(--text-xs); color: var(--color-primary-400,#A78BFA); font-family: var(--font-mono); text-align: right; }

  .register-success {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: var(--space-4); padding: var(--space-10) var(--space-8); text-align: center;
  }
  .register-success__icon { font-size: 3rem; }
  .register-success__title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); }
  .register-success__message { font-size: var(--text-sm); color: var(--color-text-muted); max-width: 320px; line-height: var(--leading-relaxed); }
  .register-resend-hint { font-size: var(--text-sm); color: var(--color-text-muted); }
  .register-resend-sent {
    font-size: var(--text-sm); color: var(--color-success);
    background: var(--color-success-bg); padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
  }
  .register-resend-error { font-size: var(--text-sm); color: var(--color-danger); }
  .register-text-link {
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--color-primary-400,#A78BFA); font-size: inherit;
    font-family: inherit; text-decoration: underline;
  }
  .register-text-link:hover { color: var(--color-primary-300); }
  .register-text-link:disabled { opacity: 0.6; cursor: not-allowed; }

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

  @media (max-width: 540px) {
    .register-card { max-width: 100%; }
    .register-name-row { grid-template-columns: 1fr; }
    .reg-step-actions { flex-direction: column-reverse; }
    .register-card__header { padding: var(--space-6) var(--space-5) var(--space-2); }
  }

  /* ── Password requirement checklist ─────────────────────────────────────── */
  .reg-pw-requirements {
    list-style: none; margin: calc(var(--space-1) * -1) 0 0; padding: 0;
    display: flex; flex-direction: column; gap: 3px;
  }
  .reg-pw-req {
    display: flex; align-items: center; gap: var(--space-2);
    font-size: var(--text-xs); color: var(--color-text-muted);
    transition: color 0.2s;
  }
  .reg-pw-req--met { color: var(--color-success, #34D399); }
  .reg-pw-req__icon {
    font-size: 10px; font-family: var(--font-mono);
    width: 12px; text-align: center; flex-shrink: 0;
  }
`;

export default RegisterPage;
