import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import {
  useProfile,
  type UpdateProfilePayload,
  type Education, type EducationPayload,
  type WorkExperience, type WorkExperiencePayload,
  type Certification, type CertificationPayload,
  type Project, type ProjectPayload,
} from "../../hooks/user/useProfile";
import { CITIES } from "../../constants/cities";

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

const fmtDate = (d?: string | null): string => {
  if (!d) return "";
  // LocalDate arrives as "YYYY-MM-DD", LocalDateTime as "YYYY-MM-DDTHH:mm:ss"
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

const fmtDateTime = (d: string): string =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const getInitials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

// ---------------------------------------------------------------------------
// Generic components
// ---------------------------------------------------------------------------

const Skeleton: React.FC<{ h?: number; w?: string }> = ({ h = 20, w = "100%" }) => (
  <div className="skeleton" style={{ height: h, width: w, borderRadius: "var(--radius-md)" }} />
);

const ProfileSection: React.FC<{
  title: string; icon: string; delay?: number;
  action?: React.ReactNode; children: React.ReactNode;
}> = ({ title, icon, delay = 0, action, children }) => (
  <section className="profile-section card animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
    <div className="card-header profile-section__header">
      <span className="profile-section__icon">{icon}</span>
      <h2 className="profile-section__title">{title}</h2>
      {action && <div className="profile-section__action">{action}</div>}
    </div>
    <div className="card-body">{children}</div>
  </section>
);

const InfoRow: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div className="profile-info-row">
      <span className="profile-info-row__label label">{label}</span>
      <span className={`profile-info-row__value${mono ? " font-mono" : ""}`}>{value}</span>
    </div>
  );
};

const LinkPill: React.FC<{ href: string; icon: string; label: string }> = ({ href, icon, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="profile-link-pill">
    <span>{icon}</span><span>{label}</span><span className="profile-link-pill__arrow">↗</span>
  </a>
);

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal">
      <div className="modal-header">
        <h3>{title}</h3>
        <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// Shared input helpers inside modals
const MField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="input-group">
    <label className="input-label">{label}</label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Edit Profile Modal
// ---------------------------------------------------------------------------

const EditProfileModal: React.FC<{
  initial: UpdateProfilePayload;
  isSaving: boolean;
  saveError: string | null;
  onSave: (p: UpdateProfilePayload) => Promise<boolean>;
  onClose: () => void;
}> = ({ initial, isSaving, saveError, onSave, onClose }) => {
  const [form, setForm] = useState<UpdateProfilePayload>(initial);
  const set = (k: keyof UpdateProfilePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value || null }));

  const handleSave = async () => {
    const ok = await onSave(form);
    if (ok) onClose();
  };

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="First Name">
          <input className="input" value={form.firstName ?? ""} onChange={set("firstName")} />
        </MField>
        <MField label="Last Name">
          <input className="input" value={form.lastName ?? ""} onChange={set("lastName")} />
        </MField>
        <MField label="Professional Title">
          <input className="input" placeholder="e.g. Full Stack Developer"
            value={form.professionalTitle ?? ""} onChange={set("professionalTitle")} />
        </MField>
        <MField label="Profile Picture URL">
          <input className="input" placeholder="https://…"
            value={form.profilePicture ?? ""} onChange={set("profilePicture")} />
        </MField>
        <MField label="Phone">
          <input className="input" placeholder="+961 XX XXX XXX"
            value={form.phoneNumber ?? ""} onChange={set("phoneNumber")} />
        </MField>
        <MField label="Country">
          <input className="input" value={form.country ?? ""} onChange={set("country")} />
        </MField>
        <MField label="City">
          <select className="input" value={form.city ?? ""} onChange={set("city")}>
            <option value="">Select a city…</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </MField>
        <MField label="LinkedIn URL">
          <input className="input" placeholder="https://linkedin.com/in/…"
            value={form.linkedinUrl ?? ""} onChange={set("linkedinUrl")} />
        </MField>
        <MField label="GitHub URL">
          <input className="input" placeholder="https://github.com/…"
            value={form.githubUrl ?? ""} onChange={set("githubUrl")} />
        </MField>
        <MField label="Portfolio URL">
          <input className="input" placeholder="https://…"
            value={form.portfolioUrl ?? ""} onChange={set("portfolioUrl")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="About Me">
            <textarea className="input prof-textarea" rows={4} placeholder="A short bio…"
              value={form.aboutMe ?? ""} onChange={set("aboutMe")} />
          </MField>
        </div>
        {saveError && <p className="prof-modal-error prof-modal-full">{saveError}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Education Modal
// ---------------------------------------------------------------------------

const EMPTY_EDU: EducationPayload = { institutionName: "", degree: "", fieldOfStudy: "", startDate: "", endDate: null, description: null };

const EducationModal: React.FC<{
  initial?: EducationPayload; isSaving: boolean; saveError: string | null;
  onSave: (p: EducationPayload) => Promise<boolean>; onClose: () => void;
}> = ({ initial = EMPTY_EDU, isSaving, saveError, onSave, onClose }) => {
  const [form, setForm] = useState<EducationPayload>(initial);
  const set = (k: keyof EducationPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value || null }));

  return (
    <Modal title={initial === EMPTY_EDU ? "Add Education" : "Edit Education"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Institution">
          <input className="input" value={form.institutionName} onChange={(e) => setForm(p => ({ ...p, institutionName: e.target.value }))} />
        </MField>
        <MField label="Degree">
          <input className="input" placeholder="e.g. Bachelor of Science"
            value={form.degree} onChange={(e) => setForm(p => ({ ...p, degree: e.target.value }))} />
        </MField>
        <MField label="Field of Study">
          <input className="input" value={form.fieldOfStudy} onChange={(e) => setForm(p => ({ ...p, fieldOfStudy: e.target.value }))} />
        </MField>
        <MField label="Start Date">
          <input className="input" type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} />
        </MField>
        <MField label="End Date (leave blank if ongoing)">
          <input className="input" type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="Description">
            <textarea className="input prof-textarea" rows={3} value={form.description ?? ""} onChange={set("description")} />
          </MField>
        </div>
        {saveError && <p className="prof-modal-error prof-modal-full">{saveError}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => { if (await onSave(form)) onClose(); }} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Work Experience Modal
// ---------------------------------------------------------------------------

const EMPTY_WORK: WorkExperiencePayload = { jobTitle: "", companyName: "", location: null, startDate: "", endDate: null, description: null };

const WorkModal: React.FC<{
  initial?: WorkExperiencePayload; isSaving: boolean; saveError: string | null;
  onSave: (p: WorkExperiencePayload) => Promise<boolean>; onClose: () => void;
}> = ({ initial = EMPTY_WORK, isSaving, saveError, onSave, onClose }) => {
  const [form, setForm] = useState<WorkExperiencePayload>(initial);
  const set = (k: keyof WorkExperiencePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value || null }));

  return (
    <Modal title={initial === EMPTY_WORK ? "Add Work Experience" : "Edit Experience"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Job Title">
          <input className="input" value={form.jobTitle} onChange={(e) => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
        </MField>
        <MField label="Company">
          <input className="input" value={form.companyName} onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))} />
        </MField>
        <MField label="Location">
          <input className="input" placeholder="City, Country or Remote"
            value={form.location ?? ""} onChange={set("location")} />
        </MField>
        <MField label="Start Date">
          <input className="input" type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} />
        </MField>
        <MField label="End Date (leave blank if current)">
          <input className="input" type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="Description">
            <textarea className="input prof-textarea" rows={3} value={form.description ?? ""} onChange={set("description")} />
          </MField>
        </div>
        {saveError && <p className="prof-modal-error prof-modal-full">{saveError}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => { if (await onSave(form)) onClose(); }} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Certification Modal
// ---------------------------------------------------------------------------

const EMPTY_CERT: CertificationPayload = { name: "", issuingOrganization: "", issueDate: "", expirationDate: null };

const CertModal: React.FC<{
  initial?: CertificationPayload; isSaving: boolean; saveError: string | null;
  onSave: (p: CertificationPayload) => Promise<boolean>; onClose: () => void;
}> = ({ initial = EMPTY_CERT, isSaving, saveError, onSave, onClose }) => {
  const [form, setForm] = useState<CertificationPayload>(initial);

  return (
    <Modal title={initial === EMPTY_CERT ? "Add Certification" : "Edit Certification"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Certification Name">
          <input className="input" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
        </MField>
        <MField label="Issuing Organization">
          <input className="input" value={form.issuingOrganization} onChange={(e) => setForm(p => ({ ...p, issuingOrganization: e.target.value }))} />
        </MField>
        <MField label="Issue Date">
          <input className="input" type="date" value={form.issueDate} onChange={(e) => setForm(p => ({ ...p, issueDate: e.target.value }))} />
        </MField>
        <MField label="Expiration Date (optional)">
          <input className="input" type="date" value={form.expirationDate ?? ""}
            onChange={(e) => setForm(p => ({ ...p, expirationDate: e.target.value || null }))} />
        </MField>
        {saveError && <p className="prof-modal-error prof-modal-full">{saveError}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => { if (await onSave(form)) onClose(); }} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Project Modal
// ---------------------------------------------------------------------------

const EMPTY_PROJ: ProjectPayload = { title: "", description: null, technologiesUsed: null, projectUrl: null, githubUrl: null, startDate: null, endDate: null };

const ProjectModal: React.FC<{
  initial?: ProjectPayload; isSaving: boolean; saveError: string | null;
  onSave: (p: ProjectPayload) => Promise<boolean>; onClose: () => void;
}> = ({ initial = EMPTY_PROJ, isSaving, saveError, onSave, onClose }) => {
  const [form, setForm] = useState<ProjectPayload>(initial);
  const set = (k: keyof ProjectPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value || null }));

  return (
    <Modal title={initial === EMPTY_PROJ ? "Add Project" : "Edit Project"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Project Title">
          <input className="input" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
        </MField>
        <MField label="Technologies Used">
          <input className="input" placeholder="React, TypeScript, Spring Boot…"
            value={form.technologiesUsed ?? ""} onChange={set("technologiesUsed")} />
        </MField>
        <MField label="Project URL">
          <input className="input" placeholder="https://…" value={form.projectUrl ?? ""} onChange={set("projectUrl")} />
        </MField>
        <MField label="GitHub URL">
          <input className="input" placeholder="https://github.com/…" value={form.githubUrl ?? ""} onChange={set("githubUrl")} />
        </MField>
        <MField label="Start Date">
          <input className="input" type="date" value={form.startDate ?? ""} onChange={set("startDate")} />
        </MField>
        <MField label="End Date">
          <input className="input" type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="Description">
            <textarea className="input prof-textarea" rows={3} value={form.description ?? ""} onChange={set("description")} />
          </MField>
        </div>
        {saveError && <p className="prof-modal-error prof-modal-full">{saveError}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => { if (await onSave(form)) onClose(); }} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

const ConfirmDelete: React.FC<{
  label: string; onConfirm: () => void; onCancel: () => void;
}> = ({ label, onConfirm, onCancel }) => (
  <Modal title="Confirm Delete" onClose={onCancel}>
    <div className="modal-body">
      <p style={{ color: "var(--color-text-secondary)" }}>
        Are you sure you want to delete <strong>{label}</strong>? This cannot be undone.
      </p>
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
    </div>
  </Modal>
);

// ---------------------------------------------------------------------------
// Reusable "Add" button
// ---------------------------------------------------------------------------
const AddBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button className="btn btn-ghost btn-sm" onClick={onClick}>+ {label}</button>
);

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------

type ModalState =
  | { type: "edit-profile" }
  | { type: "add-edu" }
  | { type: "edit-edu"; item: Education }
  | { type: "del-edu"; item: Education }
  | { type: "add-work" }
  | { type: "edit-work"; item: WorkExperience }
  | { type: "del-work"; item: WorkExperience }
  | { type: "add-cert" }
  | { type: "edit-cert"; item: Certification }
  | { type: "del-cert"; item: Certification }
  | { type: "add-proj" }
  | { type: "edit-proj"; item: Project }
  | { type: "del-proj"; item: Project }
  | null;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    profile, educations, workExperiences, certifications, projects,
    isLoading, isSaving, error, saveError, saveSuccess,
    updateProfile, refetch, clearSaveStatus,
    addEducation, updateEducation, deleteEducation,
    addWorkExperience, updateWorkExperience, deleteWorkExperience,
    addCertification, updateCertification, deleteCertification,
    addProject, updateProject, deleteProject,
  } = useProfile();

  const [modal, setModal] = useState<ModalState>(null);
  const closeModal = () => { setModal(null); clearSaveStatus(); };

  // ── Error ──────────────────────────────────────────────
  if (error) {
    return (
      <PageLayout pageTitle="Profile">
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

  // ── Loading ────────────────────────────────────────────
  if (isLoading || !profile) {
    return (
      <PageLayout pageTitle="Profile">
        <div className="profile-hero card">
          <div className="profile-hero__inner">
            <Skeleton h={88} w="88px" />
            <div className="flex-col gap-3" style={{ flex: 1 }}>
              <Skeleton h={28} w="220px" />
              <Skeleton h={16} w="160px" />
              <Skeleton h={14} w="120px" />
            </div>
          </div>
        </div>
        <div className="profile-grid mt-6">
          {[220, 300, 200, 260, 180, 240].map((h, i) => <Skeleton key={i} h={h} />)}
        </div>
        <style>{pageStyles}</style>
      </PageLayout>
    );
  }

  const hasLinks = profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl;

  // ── Render ─────────────────────────────────────────────
  return (
    <PageLayout pageTitle="Profile">

      {/* Save success toast */}
      {saveSuccess && (
        <div className="prof-toast">✅ Saved successfully</div>
      )}

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="profile-hero card card-accent-top animate-fade-in">
        <div className="profile-hero__banner" aria-hidden="true" />
        <div className="profile-hero__inner">
          <div className="profile-hero__avatar-wrap">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt={profile.firstName}
                className="profile-hero__avatar-img" />
            ) : (
              <div className="profile-hero__avatar-initials">
                {getInitials(profile.firstName, profile.lastName)}
              </div>
            )}
            <div className="profile-hero__avatar-ring" aria-hidden="true" />
          </div>

          <div className="profile-hero__identity">
            <div className="profile-hero__name-row">
              <h1 className="profile-hero__name">{profile.firstName} {profile.lastName}</h1>
              {profile.professionalTitle && (
                <span className="badge badge-primary">{profile.professionalTitle}</span>
              )}
            </div>
            <p className="profile-hero__email">{profile.email}</p>
            {(profile.city || profile.country) && (
              <p className="profile-hero__location">
                📍 {[profile.city, profile.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <div className="profile-hero__actions">
            <div className="profile-hero__xp-block">
              <span className="label">Total XP</span>
              <div className="xp-display">
                <span className="xp-icon">⚡</span>
                <span className="xp-amount">{profile.xpBalance.toLocaleString()}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-sm"
              onClick={() => setModal({ type: "edit-profile" })}>
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────── */}
      <div className="profile-grid mt-6">

        {/* LEFT */}
        <div className="profile-col flex-col gap-6">

          {/* About */}
          {profile.aboutMe && (
            <ProfileSection title="About Me" icon="💬" delay={60}>
              <p className="profile-about-text">{profile.aboutMe}</p>
            </ProfileSection>
          )}

          {/* Contact */}
          <ProfileSection title="Contact" icon="📞" delay={80}>
            <div className="profile-info-list">
              <InfoRow label="Email" value={profile.email} mono />
              <InfoRow label="Phone" value={profile.phoneNumber} mono />
              <InfoRow label="City" value={profile.city} />
              <InfoRow label="Country" value={profile.country} />
            </div>
            {!profile.phoneNumber && !profile.city && !profile.country && (
              <button className="prof-empty-cta" onClick={() => setModal({ type: "edit-profile" })}>
                + Add contact details
              </button>
            )}
          </ProfileSection>

          {/* Links */}
          {hasLinks ? (
            <ProfileSection title="Links" icon="🔗" delay={100}>
              <div className="profile-links-grid">
                {profile.linkedinUrl && <LinkPill href={profile.linkedinUrl} icon="💼" label="LinkedIn" />}
                {profile.githubUrl && <LinkPill href={profile.githubUrl} icon="🐙" label="GitHub" />}
                {profile.portfolioUrl && <LinkPill href={profile.portfolioUrl} icon="🌐" label="Portfolio" />}
              </div>
            </ProfileSection>
          ) : (
            <ProfileSection title="Links" icon="🔗" delay={100}>
              <button className="prof-empty-cta" onClick={() => setModal({ type: "edit-profile" })}>
                + Add your LinkedIn, GitHub or Portfolio
              </button>
            </ProfileSection>
          )}

          {/* Work Experience */}
          <ProfileSection title="Work Experience" icon="💼" delay={120}
            action={<AddBtn label="Add" onClick={() => setModal({ type: "add-work" })} />}>
            {workExperiences.length === 0 ? (
              <button className="prof-empty-cta" onClick={() => setModal({ type: "add-work" })}>
                + Add your first work experience
              </button>
            ) : (
              <div className="prof-timeline">
                {workExperiences.map((w) => (
                  <div key={w.id} className="prof-timeline-item">
                    <div className="prof-timeline-item__header">
                      <div>
                        <div className="prof-timeline-item__title">{w.jobTitle}</div>
                        <div className="prof-timeline-item__sub">
                          {w.companyName}{w.location ? ` · ${w.location}` : ""}
                        </div>
                        <div className="prof-timeline-item__dates">
                          {fmtDate(w.startDate)} — {w.endDate ? fmtDate(w.endDate) : "Present"}
                        </div>
                      </div>
                      <div className="prof-item-actions">
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => setModal({ type: "edit-work", item: w })}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => setModal({ type: "del-work", item: w })}>🗑️</button>
                      </div>
                    </div>
                    {w.description && <p className="prof-timeline-item__desc">{w.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>
        </div>

        {/* RIGHT */}
        <div className="profile-col flex-col gap-6">

          {/* Account */}
          <ProfileSection title="Account" icon="🛡️" delay={60}>
            <div className="profile-xp-bar mt-4">
              <div className="profile-xp-bar__labels">
                <span className="label">XP Balance</span>
                <span className="xp-pill">⚡ {profile.xpBalance.toLocaleString()}</span>
              </div>
              <div className="progress-track progress-track-lg mt-2">
                <div className="progress-fill progress-xp animated"
                  style={{ width: `${Math.min((profile.xpBalance / 5000) * 100, 100)}%` }}
                  role="progressbar" aria-valuenow={profile.xpBalance} aria-valuemin={0} aria-valuemax={5000} />
              </div>
              <p className="profile-xp-bar__hint">
                {Math.max(0, 5000 - profile.xpBalance).toLocaleString()} XP to Level 6
              </p>
            </div>
          </ProfileSection>

          {/* Education */}
          <ProfileSection title="Education" icon="🎓" delay={80}
            action={<AddBtn label="Add" onClick={() => setModal({ type: "add-edu" })} />}>
            {educations.length === 0 ? (
              <button className="prof-empty-cta" onClick={() => setModal({ type: "add-edu" })}>
                + Add your education
              </button>
            ) : (
              <div className="prof-timeline">
                {educations.map((e) => (
                  <div key={e.id} className="prof-timeline-item">
                    <div className="prof-timeline-item__header">
                      <div>
                        <div className="prof-timeline-item__title">{e.degree} in {e.fieldOfStudy}</div>
                        <div className="prof-timeline-item__sub">{e.institutionName}</div>
                        <div className="prof-timeline-item__dates">
                          {fmtDate(e.startDate)} — {e.endDate ? fmtDate(e.endDate) : "Present"}
                        </div>
                      </div>
                      <div className="prof-item-actions">
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => setModal({ type: "edit-edu", item: e })}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => setModal({ type: "del-edu", item: e })}>🗑️</button>
                      </div>
                    </div>
                    {e.description && <p className="prof-timeline-item__desc">{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>

          {/* Certifications */}
          <ProfileSection title="Certifications" icon="🏅" delay={100}
            action={<AddBtn label="Add" onClick={() => setModal({ type: "add-cert" })} />}>
            {certifications.length === 0 ? (
              <button className="prof-empty-cta" onClick={() => setModal({ type: "add-cert" })}>
                + Add a certification
              </button>
            ) : (
              <div className="prof-cert-list">
                {certifications.map((c) => (
                  <div key={c.id} className="prof-cert-item">
                    <div className="prof-cert-item__info">
                      <div className="prof-timeline-item__title">{c.name}</div>
                      <div className="prof-timeline-item__sub">{c.issuingOrganization}</div>
                      <div className="prof-timeline-item__dates">
                        Issued {fmtDate(c.issueDate)}
                        {c.expirationDate ? ` · Expires ${fmtDate(c.expirationDate)}` : " · No expiry"}
                      </div>
                    </div>
                    <div className="prof-item-actions">
                      <button className="btn btn-ghost btn-icon btn-icon-sm"
                        onClick={() => setModal({ type: "edit-cert", item: c })}>✏️</button>
                      <button className="btn btn-ghost btn-icon btn-icon-sm"
                        onClick={() => setModal({ type: "del-cert", item: c })}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>

          {/* Projects */}
          <ProfileSection title="Projects" icon="🚀" delay={120}
            action={<AddBtn label="Add" onClick={() => setModal({ type: "add-proj" })} />}>
            {projects.length === 0 ? (
              <button className="prof-empty-cta" onClick={() => setModal({ type: "add-proj" })}>
                + Add a project
              </button>
            ) : (
              <div className="prof-timeline">
                {projects.map((p) => (
                  <div key={p.id} className="prof-timeline-item">
                    <div className="prof-timeline-item__header">
                      <div>
                        <div className="prof-timeline-item__title">{p.title}</div>
                        {p.technologiesUsed && (
                          <div className="prof-tech-chips">
                            {p.technologiesUsed.split(",").map((t) => (
                              <span key={t} className="prof-tech-chip">{t.trim()}</span>
                            ))}
                          </div>
                        )}
                        <div className="prof-proj-links">
                          {p.projectUrl && <a href={p.projectUrl} target="_blank" rel="noopener noreferrer" className="prof-proj-link">🌐 Live</a>}
                          {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="prof-proj-link">🐙 Code</a>}
                        </div>
                      </div>
                      <div className="prof-item-actions">
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => setModal({ type: "edit-proj", item: p })}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => setModal({ type: "del-proj", item: p })}>🗑️</button>
                      </div>
                    </div>
                    {p.description && <p className="prof-timeline-item__desc">{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>

          {/* Quick actions */}
          <ProfileSection title="Quick Actions" icon="⚡" delay={140}>
            <div className="profile-actions-list">
              {[
                { label: "My Skills & Badges", icon: "🎯", path: "/skills" },
                { label: "Browse Jobs", icon: "💼", path: "/jobs" },
                { label: "Active Challenges", icon: "🏆", path: "/challenges" },
                { label: "XP Store", icon: "🛒", path: "/store" },
              ].map((item) => (
                <button key={item.path} className="profile-action-btn" onClick={() => navigate(item.path)}>
                  <span className="profile-action-btn__icon">{item.icon}</span>
                  <span className="profile-action-btn__label">{item.label}</span>
                  <span className="profile-action-btn__arrow">→</span>
                </button>
              ))}
            </div>
          </ProfileSection>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {modal?.type === "edit-profile" && (
        <EditProfileModal
          initial={{
            firstName: profile.firstName, lastName: profile.lastName,
            phoneNumber: profile.phoneNumber, country: profile.country, city: profile.city,
            linkedinUrl: profile.linkedinUrl, githubUrl: profile.githubUrl,
            portfolioUrl: profile.portfolioUrl, profilePicture: profile.profilePicture,
            professionalTitle: profile.professionalTitle, aboutMe: profile.aboutMe,
          }}
          isSaving={isSaving} saveError={saveError}
          onSave={updateProfile} onClose={closeModal}
        />
      )}

      {modal?.type === "add-edu" && (
        <EducationModal isSaving={isSaving} saveError={saveError} onSave={addEducation} onClose={closeModal} />
      )}
      {modal?.type === "edit-edu" && (
        <EducationModal
          initial={{
            institutionName: modal.item.institutionName, degree: modal.item.degree,
            fieldOfStudy: modal.item.fieldOfStudy, startDate: modal.item.startDate,
            endDate: modal.item.endDate, description: modal.item.description
          }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateEducation(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-edu" && (
        <ConfirmDelete label={modal.item.institutionName}
          onConfirm={async () => { await deleteEducation(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}

      {modal?.type === "add-work" && (
        <WorkModal isSaving={isSaving} saveError={saveError} onSave={addWorkExperience} onClose={closeModal} />
      )}
      {modal?.type === "edit-work" && (
        <WorkModal
          initial={{
            jobTitle: modal.item.jobTitle, companyName: modal.item.companyName,
            location: modal.item.location, startDate: modal.item.startDate,
            endDate: modal.item.endDate, description: modal.item.description
          }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateWorkExperience(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-work" && (
        <ConfirmDelete label={`${modal.item.jobTitle} at ${modal.item.companyName}`}
          onConfirm={async () => { await deleteWorkExperience(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}

      {modal?.type === "add-cert" && (
        <CertModal isSaving={isSaving} saveError={saveError} onSave={addCertification} onClose={closeModal} />
      )}
      {modal?.type === "edit-cert" && (
        <CertModal
          initial={{
            name: modal.item.name, issuingOrganization: modal.item.issuingOrganization,
            issueDate: modal.item.issueDate, expirationDate: modal.item.expirationDate
          }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateCertification(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-cert" && (
        <ConfirmDelete label={modal.item.name}
          onConfirm={async () => { await deleteCertification(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}

      {modal?.type === "add-proj" && (
        <ProjectModal isSaving={isSaving} saveError={saveError} onSave={addProject} onClose={closeModal} />
      )}
      {modal?.type === "edit-proj" && (
        <ProjectModal
          initial={{
            title: modal.item.title, description: modal.item.description,
            technologiesUsed: modal.item.technologiesUsed, projectUrl: modal.item.projectUrl,
            githubUrl: modal.item.githubUrl, startDate: modal.item.startDate, endDate: modal.item.endDate
          }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateProject(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-proj" && (
        <ConfirmDelete label={modal.item.title}
          onConfirm={async () => { await deleteProject(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}

      <style>{pageStyles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyles = `
  /* Hero */
  .profile-hero { position:relative;overflow:hidden; }
  .profile-hero__banner { position:absolute;top:0;left:0;right:0;height:80px;background:var(--gradient-brand, var(--gradient-premium));opacity:0.12;pointer-events:none; }
  .profile-hero__inner { display:flex;align-items:center;gap:var(--space-6);padding:var(--space-8);flex-wrap:wrap;position:relative;z-index:1; }

  .profile-hero__avatar-wrap { position:relative;flex-shrink:0; }
  .profile-hero__avatar-img,
  .profile-hero__avatar-initials { width:88px;height:88px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:#fff;object-fit:cover; }
  .profile-hero__avatar-initials { background:var(--gradient-premium, var(--gradient-primary)); }
  .profile-hero__avatar-ring { position:absolute;inset:-4px;border-radius:var(--radius-full);border:2px solid transparent;background:var(--gradient-premium, var(--gradient-brand)) border-box;-webkit-mask:linear-gradient(#fff 0 0) padding-box,linear-gradient(#fff 0 0);-webkit-mask-composite:destination-out;mask-composite:exclude;pointer-events:none; }

  .profile-hero__identity { flex:1;min-width:0; }
  .profile-hero__name-row { display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-1); }
  .profile-hero__name { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-text-primary); }
  .profile-hero__email { font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-text-muted);margin:0; }
  .profile-hero__location { font-size:var(--text-sm);color:var(--color-text-muted);margin:var(--space-1) 0 0; }

  .profile-hero__actions { display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-3);flex-shrink:0; }
  .profile-hero__xp-block { text-align:right; }
  .profile-hero__xp-block .label { display:block;margin-bottom:2px; }

  /* Grid */
  .profile-grid { display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);align-items:start; }
  .profile-col { display:flex;flex-direction:column; }

  /* Section */
  .profile-section__header { display:flex;align-items:center;gap:var(--space-3); }
  .profile-section__icon { font-size:var(--text-base);width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:var(--color-bg-overlay);border-radius:var(--radius-md);border:1px solid var(--color-border-subtle);flex-shrink:0; }
  .profile-section__title { font-family:var(--font-display);font-size:var(--text-base);font-weight:var(--weight-semibold);color:var(--color-text-primary);flex:1; }
  .profile-section__action { margin-left:auto; }

  /* Info rows */
  .profile-info-list { display:flex;flex-direction:column; }
  .profile-info-row { display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-4);padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle); }
  .profile-info-row:last-child { border-bottom:none; }
  .profile-info-row__label { flex-shrink:0;min-width:90px;color:var(--color-text-muted); }
  .profile-info-row__value { font-size:var(--text-sm);color:var(--color-text-primary);text-align:right;word-break:break-all; }

  .profile-about-text { font-size:var(--text-sm);color:var(--color-text-secondary);line-height:var(--leading-relaxed);margin:0; }

  /* Links */
  .profile-links-grid { display:flex;flex-direction:column;gap:var(--space-2); }
  .profile-link-pill { display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-bg-overlay);border:1px solid var(--color-border-default);border-radius:var(--radius-md);text-decoration:none;color:var(--color-text-secondary);font-size:var(--text-sm);transition:all var(--duration-fast); }
  .profile-link-pill:hover { border-color:var(--color-premium,var(--color-primary-500));color:var(--color-premium,var(--color-primary-400));text-decoration:none; }
  .profile-link-pill__arrow { margin-left:auto;color:var(--color-text-disabled); }

  /* XP bar */
  .profile-xp-bar__labels { display:flex;align-items:center;justify-content:space-between; }
  .profile-xp-bar__hint { font-size:var(--text-xs);color:var(--color-text-disabled);margin-top:var(--space-1); }

  /* Actions */
  .profile-actions-list { display:flex;flex-direction:column;gap:var(--space-2); }
  .profile-action-btn { display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-bg-overlay);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);color:var(--color-text-secondary);font-family:var(--font-body);font-size:var(--text-sm);cursor:pointer;text-align:left;width:100%;transition:all var(--duration-fast); }
  .profile-action-btn:hover { border-color:var(--color-border-strong);background:var(--color-bg-hover);color:var(--color-text-primary); }
  .profile-action-btn__icon { font-size:var(--text-base);width:20px;text-align:center; }
  .profile-action-btn__label { flex:1; }
  .profile-action-btn__arrow { color:var(--color-text-disabled); }

  /* Timeline items */
  .prof-timeline { display:flex;flex-direction:column;gap:var(--space-4); }
  .prof-timeline-item { padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-subtle); }
  .prof-timeline-item:last-child { border-bottom:none;padding-bottom:0; }
  .prof-timeline-item__header { display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2); }
  .prof-timeline-item__title { font-weight:var(--weight-semibold);color:var(--color-text-primary);font-size:var(--text-sm); }
  .prof-timeline-item__sub { font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:2px; }
  .prof-timeline-item__dates { font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px; }
  .prof-timeline-item__desc { font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-2);line-height:var(--leading-relaxed); }

  /* Cert list */
  .prof-cert-list { display:flex;flex-direction:column;gap:var(--space-3); }
  .prof-cert-item { display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-subtle); }
  .prof-cert-item:last-child { border-bottom:none; }

  /* Item action buttons */
  .prof-item-actions { display:flex;gap:var(--space-1);flex-shrink:0; }

  /* Tech chips */
  .prof-tech-chips { display:flex;flex-wrap:wrap;gap:var(--space-1);margin-top:var(--space-1); }
  .prof-tech-chip { font-family:var(--font-mono);font-size:10px;padding:1px 8px;background:var(--color-bg-overlay);border:1px solid var(--color-border-default);border-radius:var(--radius-full);color:var(--color-text-muted); }

  /* Project links */
  .prof-proj-links { display:flex;gap:var(--space-3);margin-top:var(--space-1); }
  .prof-proj-link { font-size:var(--text-xs);color:var(--color-premium,var(--color-primary-400));text-decoration:none; }
  .prof-proj-link:hover { text-decoration:underline; }

  /* Empty CTA */
  .prof-empty-cta { background:none;border:1px dashed var(--color-border-default);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);color:var(--color-text-muted);font-size:var(--text-sm);font-family:var(--font-body);cursor:pointer;width:100%;text-align:center;transition:all var(--duration-fast); }
  .prof-empty-cta:hover { border-color:var(--color-premium,var(--color-primary-400));color:var(--color-premium,var(--color-primary-400)); }

  /* Modal extras */
  .prof-modal-grid { display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4); }
  .prof-modal-full { grid-column:1/-1; }
  .prof-textarea { resize:vertical;min-height:80px;font-family:var(--font-body); }
  .prof-modal-error { color:var(--color-danger);font-size:var(--text-sm); }

  /* Modal — sits between navbar (top) and bottom dock (bottom) */
  .modal-backdrop {
    position: fixed;
    top: var(--layout-navbar-height, 60px);
    left: 0;
    right: 0;
    bottom: 72px;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    overflow-y: auto;
  }
  .modal {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 560px;
    max-height: 100%;
    overflow-y: auto;
    animation: modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1);
    margin: auto;
  }
  @keyframes modal-in {
    from { opacity:0; transform:scale(0.95) translateY(10px); }
    to   { opacity:1; transform:scale(1)    translateY(0);    }
  }
  .modal-header {
    display:flex; align-items:center; justify-content:space-between;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
    position: sticky; top: 0;
    background: var(--color-bg-elevated);
    z-index: 1;
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  }
  .modal-body { padding: var(--space-5) var(--space-6); }
  .modal-footer {
    display:flex; align-items:center; justify-content:flex-end; gap:var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
    position: sticky; bottom: 0;
    background: var(--color-bg-elevated);
    z-index: 1;
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
  }

  /* Success toast — sits above the bottom dock */
  .prof-toast { position:fixed;bottom:calc(72px + var(--space-4));right:var(--space-6);background:var(--color-bg-elevated);border:1px solid var(--color-success-border);border-left:3px solid var(--color-success);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-5);color:var(--color-success);font-size:var(--text-sm);box-shadow:var(--shadow-xl);z-index:var(--z-toast);animation:fadeIn 0.3s ease; }

  @media (max-width:900px) { .profile-grid { grid-template-columns:1fr; } }
  @media (max-width:600px) {
    .profile-hero__inner { flex-direction:column;align-items:flex-start; }
    .profile-hero__actions { align-items:flex-start;flex-direction:row;width:100%;justify-content:space-between; }
    .prof-modal-grid { grid-template-columns:1fr; }
  }
`;

export default ProfilePage;