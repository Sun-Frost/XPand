import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useProfile } from "../../hooks/user/useProfile";
import type { UpdateProfilePayload as ProfileUpdatePayload, UserProfile } from "../../hooks/user/useProfile";
import { CITIES } from "../../constants/cities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormFields = ProfileUpdatePayload;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getInitials = (u: UserProfile) =>
  `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const URL_REGEX = /^https?:\/\/.+\..+/;
const PHONE_REGEX = /^[+\d\s\-().]{6,20}$/;

const validate = (f: FormFields): FieldErrors => {
  const e: FieldErrors = {};
  if (!f.firstName?.trim()) e.firstName = "First name is required.";
  else if (f.firstName.trim().length < 2) e.firstName = "Must be at least 2 characters.";
  if (!f.lastName?.trim()) e.lastName = "Last name is required.";
  else if (f.lastName.trim().length < 2) e.lastName = "Must be at least 2 characters.";
  if (f.phoneNumber && !PHONE_REGEX.test(f.phoneNumber)) e.phoneNumber = "Enter a valid phone number.";
  if (f.linkedinUrl && !URL_REGEX.test(f.linkedinUrl)) e.linkedinUrl = "Enter a valid URL (https://…).";
  if (f.githubUrl && !URL_REGEX.test(f.githubUrl)) e.githubUrl = "Enter a valid URL (https://…).";
  if (f.portfolioUrl && !URL_REGEX.test(f.portfolioUrl)) e.portfolioUrl = "Enter a valid URL (https://…).";
  if (f.aboutMe && f.aboutMe.length > 600) e.aboutMe = "Bio must be 600 characters or fewer.";
  return e;
};

const toPayload = (u: UserProfile): FormFields => ({
  firstName: u.firstName,
  lastName: u.lastName,
  phoneNumber: u.phoneNumber ?? "",
  country: u.country ?? "",
  city: u.city ?? "",
  professionalTitle: u.professionalTitle ?? "",
  aboutMe: u.aboutMe ?? "",
  linkedinUrl: u.linkedinUrl ?? "",
  githubUrl: u.githubUrl ?? "",
  portfolioUrl: u.portfolioUrl ?? "",
});

const isEqual = (a: FormFields, b: FormFields) =>
  JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  prefix?: string;
  hint?: string;
  onChange: (v: string) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  id, label, value, error, disabled, placeholder, type = "text",
  autoComplete, maxLength, prefix, hint, onChange,
}) => (
  <div className="input-group">
    <label htmlFor={id} className="input-label">{label}</label>
    <div className={prefix ? "ep-prefix-wrap" : undefined}>
      {prefix && <span className="ep-prefix">{prefix}</span>}
      <input
        id={id} type={type}
        className={`input${prefix ? " ep-prefix-input" : ""}${error ? " input-error" : ""}`}
        value={value} placeholder={placeholder}
        disabled={disabled} autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
      />
    </div>
    {hint && !error && <span id={`${id}-hint`} className="input-helper">{hint}</span>}
    {error && <span id={`${id}-err`} className="input-helper error" role="alert">{error}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// AvatarUpload sub-component
// ---------------------------------------------------------------------------

interface AvatarUploadProps {
  user: UserProfile;
  isSaving: boolean;
  onUpload: (file: File) => Promise<boolean>;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ user, isSaving, onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(user.profilePicture ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    await onUpload(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const initials = getInitials(user);

  return (
    <div className="ep-avatar-section card">
      <div className="card-header">
        <h2 className="ep-section-title">Profile Photo</h2>
      </div>
      <div className="card-body">
        <div className="ep-avatar-stage">
          {/* Avatar preview */}
          <div className="ep-avatar-preview-wrap">
            {preview ? (
              <img src={preview} alt="Profile preview" className="ep-avatar-preview-img" />
            ) : (
              <div className="ep-avatar-preview-initials">{initials}</div>
            )}
            {isSaving && (
              <div className="ep-avatar-loading-overlay">
                <span className="ep-spinner animate-spin" />
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            className={`ep-avatar-drop-zone${isDragging ? " ep-avatar-drop-zone--active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            aria-label="Upload profile photo"
          >
            <span className="ep-avatar-drop-zone__icon">📷</span>
            <p className="ep-avatar-drop-zone__primary">
              {isDragging ? "Drop to upload" : "Click or drag & drop"}
            </p>
            <p className="ep-avatar-drop-zone__hint">PNG, JPG, WebP · Max 5 MB</p>
            <input ref={inputRef} type="file" accept="image/*"
              className="sr-only" tabIndex={-1}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
          </div>
        </div>

        {preview && (
          <button className="btn btn-ghost btn-xs ep-avatar-remove"
            onClick={() => setPreview(null)} disabled={isSaving}>
            Remove photo
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EditProfilePage
// ---------------------------------------------------------------------------

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    profile: user, isLoading, isSaving, error,
    saveError, saveSuccess,
    updateProfile, refetch,
  } = useProfile();
  // uploadAvatar is not yet implemented in the hook; stub it out
  const uploadAvatar = async (_file: File): Promise<boolean> => false;

  const [fields, setFields] = useState<FormFields | null>(null);
  const [baseline, setBaseline] = useState<FormFields | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [didAttempt, setDidAttempt] = useState(false);

  // Populate form once user loads
  useEffect(() => {
    if (user && !fields) {
      const p = toPayload(user);
      setFields(p);
      setBaseline(p);
    }
  }, [user, fields]);

  // Live-validate after first submit attempt
  useEffect(() => {
    if (didAttempt && fields) setFieldErrors(validate(fields));
  }, [fields, didAttempt]);

  const isDirty = fields && baseline ? !isEqual(fields, baseline) : false;

  const set = (key: keyof FormFields) => (value: string) =>
    setFields((prev) => prev ? { ...prev, [key]: value } : prev);

  const handleDiscard = () => {
    if (baseline) { setFields({ ...baseline }); setFieldErrors({}); setDidAttempt(false); }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!fields) return;
    setDidAttempt(true);
    const errors = validate(fields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const ok = await updateProfile(fields);
    if (ok) {
      const fresh = { ...fields };
      setBaseline(fresh);
      setFieldErrors({});
      setDidAttempt(false);
    }
  };

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <PageLayout pageTitle="Edit Profile">  {/* FIXED: removed user={null} */}
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load profile</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
        <style>{pageStyles}</style>
      </PageLayout>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────
  if (isLoading || !user || !fields) {
    return (
      <PageLayout pageTitle="Edit Profile">  {/* FIXED: removed user={null} */}
        <div className="ep-skeleton">
          <div className="skeleton ep-skeleton__header" />
          <div className="ep-two-col mt-6">
            <div className="flex-col gap-4">
              <div className="skeleton" style={{ height: 220, borderRadius: "var(--radius-xl)" }} />
              <div className="skeleton" style={{ height: 280, borderRadius: "var(--radius-xl)" }} />
            </div>
            <div className="flex-col gap-4">
              <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-xl)" }} />
              <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-xl)" }} />
            </div>
          </div>
        </div>
        <style>{pageStyles}</style>
      </PageLayout>
    );
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <PageLayout pageTitle="Edit Profile">  {/* FIXED: removed user={user} */}

      {/* ── Page header ──────────────────────────────────── */}
      <div className="ep-page-header animate-fade-in">
        <div className="ep-page-header__left">
          <button className="btn btn-ghost btn-sm ep-back-btn"
            onClick={() => navigate("/profile")}>
            ← Back to Profile
          </button>
          <h1 className="ep-page-title">Edit Profile</h1>
        </div>

        {/* Dirty indicator pill */}
        {isDirty && (
          <div className="ep-dirty-bar animate-fade-in">
            <span className="ep-dirty-bar__dot" />
            <span className="ep-dirty-bar__text">Unsaved changes</span>
            <button className="btn btn-ghost btn-xs" onClick={handleDiscard}
              disabled={isSaving}>Discard</button>
            <button className="btn btn-primary btn-xs" onClick={() => handleSubmit()}
              disabled={isSaving}>
              {isSaving ? <><span className="ep-spinner animate-spin" />Saving…</> : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* ── Global save feedback ─────────────────────────── */}
      {saveSuccess && (
        <div className="ep-toast ep-toast--success animate-fade-in" role="status">
          ✅ Profile saved successfully!
        </div>
      )}
      {saveError && (
        <div className="ep-toast ep-toast--error animate-fade-in" role="alert">
          ⚠️ {saveError}
        </div>
      )}

      {/* ── Two-column form ──────────────────────────────── */}
      <form className="ep-two-col mt-6" onSubmit={handleSubmit} noValidate>

        {/* ── LEFT COLUMN ────────────────────────────────── */}
        <div className="flex-col gap-6">

          {/* Avatar upload */}
          <AvatarUpload user={user} isSaving={isSaving} onUpload={uploadAvatar} />

          {/* Basic info */}
          <div className="card animate-fade-in" style={{ animationDelay: "60ms" }}>
            <div className="card-header">
              <h2 className="ep-section-title">Basic Information</h2>
            </div>
            <div className="card-body flex-col gap-4">
              <div className="ep-name-row">
                <InputField id="firstName" label="First Name" value={fields.firstName ?? ""}
                  error={fieldErrors.firstName} disabled={isSaving}
                  placeholder="Alex" autoComplete="given-name"
                  onChange={set("firstName")} />
                <InputField id="lastName" label="Last Name" value={fields.lastName ?? ""}
                  error={fieldErrors.lastName} disabled={isSaving}
                  placeholder="Morgan" autoComplete="family-name"
                  onChange={set("lastName")} />
              </div>
              <InputField id="professionalTitle" label="Professional Title"
                value={fields.professionalTitle ?? ""} disabled={isSaving}
                placeholder="e.g. Frontend Developer" autoComplete="organization-title"
                onChange={set("professionalTitle")} />
              <div className="input-group">
                <label htmlFor="aboutMe" className="input-label">
                  Bio
                  <span className={`ep-char-count${(fields.aboutMe?.length ?? 0) > 600 ? " ep-char-count--over" : ""
                    }`}>
                    {fields.aboutMe?.length ?? 0} / 600
                  </span>
                </label>
                <textarea
                  id="aboutMe"
                  className={`input ep-textarea${fieldErrors.aboutMe ? " input-error" : ""}`}
                  value={fields.aboutMe ?? ""}
                  placeholder="Tell employers a bit about yourself…"
                  rows={4} maxLength={650} disabled={isSaving}
                  onChange={(e) => set("aboutMe")(e.target.value)}
                />
                {fieldErrors.aboutMe && (
                  <span className="input-helper error" role="alert">{fieldErrors.aboutMe}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="card animate-fade-in" style={{ animationDelay: "120ms" }}>
            <div className="card-header">
              <h2 className="ep-section-title">Contact Details</h2>
            </div>
            <div className="card-body flex-col gap-4">
              <InputField id="phoneNumber" label="Phone" value={fields.phoneNumber ?? ""}
                error={fieldErrors.phoneNumber} disabled={isSaving}
                placeholder="+1 555 000 0000" type="tel" autoComplete="tel"
                onChange={set("phoneNumber")} />
              <div className="ep-name-row">
                <div className="input-group">
                  <label htmlFor="city" className="input-label">City</label>
                  <select
                    id="city"
                    className="input"
                    value={fields.city ?? ""}
                    disabled={isSaving}
                    onChange={(e) => set("city")(e.target.value)}
                  >
                    <option value="">Select a city…</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <InputField id="country" label="Country" value={fields.country ?? ""}
                  disabled={isSaving} placeholder="Lebanon" autoComplete="country-name"
                  onChange={set("country")} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────── */}
        <div className="flex-col gap-6">

          {/* Online presence */}
          <div className="card animate-fade-in" style={{ animationDelay: "80ms" }}>
            <div className="card-header">
              <h2 className="ep-section-title">Online Presence</h2>
            </div>
            <div className="card-body flex-col gap-4">
              <InputField id="linkedinUrl" label="LinkedIn" value={fields.linkedinUrl ?? ""}
                error={fieldErrors.linkedinUrl} disabled={isSaving}
                placeholder="https://linkedin.com/in/yourname"
                prefix="💼" hint="Full URL including https://"
                onChange={set("linkedinUrl")} />
              <InputField id="githubUrl" label="GitHub" value={fields.githubUrl ?? ""}
                error={fieldErrors.githubUrl} disabled={isSaving}
                placeholder="https://github.com/yourname"
                prefix="🐙" hint="Full URL including https://"
                onChange={set("githubUrl")} />
              <InputField id="portfolioUrl" label="Portfolio" value={fields.portfolioUrl ?? ""}
                error={fieldErrors.portfolioUrl} disabled={isSaving}
                placeholder="https://yoursite.com"
                prefix="🌐" hint="Full URL including https://"
                onChange={set("portfolioUrl")} />
            </div>
          </div>

          {/* Account (read-only) */}
          <div className="card animate-fade-in" style={{ animationDelay: "140ms" }}>
            <div className="card-header">
              <h2 className="ep-section-title">Account</h2>
            </div>
            <div className="card-body flex-col gap-3">
              <div className="ep-readonly-row">
                <span className="ep-readonly-row__label label">Email</span>
                <span className="ep-readonly-row__value font-mono">{user.email}</span>
              </div>
              <div className="ep-readonly-row">
                <span className="ep-readonly-row__label label">Member since</span>
                <span className="ep-readonly-row__value">{formatDate(user.createdAt)}</span>
              </div>
              <div className="ep-readonly-row">
                <span className="ep-readonly-row__label label">XP Balance</span>
                <span className="ep-readonly-row__value xp-pill">⚡ {user.xpBalance.toLocaleString()}</span>
              </div>
              <button type="button" className="btn btn-ghost btn-xs ep-security-link mt-2"
                onClick={() => navigate("/settings/security")}>
                🔐 Change password →
              </button>
            </div>
          </div>

          {/* Submit block */}
          <div className="ep-submit-block card animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="card-body flex-col gap-3">
              <button type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={isSaving || !isDirty}>
                {isSaving
                  ? <><span className="ep-spinner animate-spin" aria-hidden="true" />Saving changes…</>
                  : isDirty ? "Save Changes" : "No changes to save"}
              </button>
              <button type="button"
                className="btn btn-ghost btn-sm w-full"
                onClick={() => navigate("/profile")}
                disabled={isSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{pageStyles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Scoped styles — identical to original
// ---------------------------------------------------------------------------

const pageStyles = `
  /* ── Page header ─────────────────────────────────────────── */
  .ep-page-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-2);
  }
  .ep-page-header__left { display: flex; flex-direction: column; gap: var(--space-1); }
  .ep-back-btn { align-self: flex-start; color: var(--color-text-muted); padding-left: 0; }
  .ep-back-btn:hover { color: var(--color-text-primary); }
  .ep-page-title {
    font-family: var(--font-display); font-size: var(--text-2xl);
    font-weight: var(--weight-bold); color: var(--color-text-primary);
  }
  .ep-dirty-bar {
    display: flex; align-items: center; gap: var(--space-3);
    background: var(--color-bg-elevated); border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-full); padding: var(--space-2) var(--space-4);
    box-shadow: var(--shadow-md);
  }
  .ep-dirty-bar__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-warning); flex-shrink: 0; }
  .ep-dirty-bar__text { font-size: var(--text-xs); color: var(--color-text-muted); white-space: nowrap; }

  .ep-toast {
    padding: var(--space-3) var(--space-5); border-radius: var(--radius-md);
    font-size: var(--text-sm); margin-bottom: var(--space-4);
  }
  .ep-toast--success { background: var(--color-success-bg); border: 1px solid var(--color-success-border); color: var(--color-success); }
  .ep-toast--error   { background: var(--color-danger-bg);  border: 1px solid var(--color-danger-border);  color: var(--color-danger); }

  .ep-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); align-items: start; }
  .ep-section-title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
  .ep-name-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
  .ep-textarea { resize: vertical; min-height: 100px; font-family: var(--font-body); }
  .ep-char-count { float: right; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-disabled); font-weight: var(--weight-normal); transition: color var(--duration-fast); }
  .ep-char-count--over { color: var(--color-danger); }
  .ep-prefix-wrap { display: flex; align-items: center; position: relative; }
  .ep-prefix { position: absolute; left: var(--space-3); font-size: var(--text-base); pointer-events: none; z-index: 1; }
  .ep-prefix-input { padding-left: 2.4rem !important; }
  .ep-readonly-row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-subtle); }
  .ep-readonly-row:last-of-type { border-bottom: none; }
  .ep-readonly-row__label { flex-shrink: 0; min-width: 100px; }
  .ep-readonly-row__value { font-size: var(--text-sm); color: var(--color-text-primary); text-align: right; word-break: break-all; }
  .ep-security-link { color: var(--color-primary-400); padding: 0; align-self: flex-start; }
  .ep-avatar-stage { display: flex; gap: var(--space-5); align-items: flex-start; }
  .ep-avatar-preview-wrap { position: relative; width: 80px; height: 80px; border-radius: var(--radius-full); flex-shrink: 0; overflow: hidden; border: 2px solid var(--color-border-strong); }
  .ep-avatar-preview-img { width: 100%; height: 100%; object-fit: cover; }
  .ep-avatar-preview-initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--gradient-primary); color: #fff; font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); }
  .ep-avatar-loading-overlay { position: absolute; inset: 0; background: rgba(6,8,15,0.55); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); }
  .ep-avatar-drop-zone { flex: 1; min-height: 80px; border: 2px dashed var(--color-border-default); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1); cursor: pointer; text-align: center; transition: border-color var(--duration-base), background var(--duration-base); }
  .ep-avatar-drop-zone:hover, .ep-avatar-drop-zone--active { border-color: var(--color-primary-500); background: var(--color-primary-glow); }
  .ep-avatar-drop-zone__icon { font-size: var(--text-2xl); }
  .ep-avatar-drop-zone__primary { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-secondary); margin: 0; }
  .ep-avatar-drop-zone__hint { font-size: var(--text-xs); color: var(--color-text-disabled); margin: 0; }
  .ep-avatar-remove { color: var(--color-danger); margin-top: var(--space-2); }
  .ep-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; }
  .ep-submit-block .card-body { gap: var(--space-3); }
  .ep-skeleton { display: flex; flex-direction: column; }
  .ep-skeleton__header { height: 64px; border-radius: var(--radius-xl); }

  @media (max-width: 960px) { .ep-two-col { grid-template-columns: 1fr; } }
  @media (max-width: 600px) {
    .ep-name-row { grid-template-columns: 1fr; }
    .ep-dirty-bar { flex-wrap: wrap; border-radius: var(--radius-xl); }
    .ep-page-header { flex-direction: column; align-items: flex-start; }
  }
`;

export default EditProfilePage;