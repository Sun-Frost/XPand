import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";
import {
  useProfile,
  type UpdateProfilePayload,
  type Education, type EducationPayload,
  type WorkExperience, type WorkExperiencePayload,
  type Certification, type CertificationPayload,
  type Project, type ProjectPayload,
} from "../../hooks/user/useProfile";
import { useSkills, type BadgeLevel } from "../../hooks/user/useSkills";
import { CITIES } from "../../constants/cities";
import Modal from "../../components/ui/Modal";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseSaveError = (err: string | null): string | null => {
  if (!err) return null;
  const nullMatch = err.match(/null value in column "([^"]+)"/i);
  if (nullMatch) {
    const col = nullMatch[1].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `"${col}" is required. Please fill it in before saving.`;
  }
  if (/unique constraint|duplicate key/i.test(err)) return "This entry already exists. Please check for duplicates.";
  if (/foreign key constraint/i.test(err)) return "A referenced record no longer exists. Please refresh and try again.";
  if (/could not execute statement|SQL \[/i.test(err)) return "Something went wrong while saving. Please check all fields and try again.";
  return err;
};

const fmtDate = (d?: string | null): string => {
  if (!d) return "";
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

const getInitials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

// Badge tier data
const BADGE_META: Record<BadgeLevel, { label: string; color: string; glow: string; icon: string | React.ReactNode }> = {
  BRONZE: { label: "Bronze", color: "#cd7f32", glow: "rgba(205,127,50,0.4)", icon: <Icon name="medal" /> },
  SILVER: { label: "Silver", color: "#c0c0c0", glow: "rgba(192,192,192,0.4)", icon: <Icon name="medal" /> },
  GOLD:   { label: "Gold",   color: "#ffd700", glow: "rgba(255,215,0,0.5)",   icon: <Icon name="medal" /> },
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const Skeleton: React.FC<{ h?: number; w?: string; radius?: string }> = ({ h = 20, w = "100%", radius = "var(--radius-md)" }) => (
  <div className="skeleton" style={{ height: h, width: w, borderRadius: radius }} />
);

// ---------------------------------------------------------------------------
// Modal shell — uses Portal so navbar/dock never overlap
// ---------------------------------------------------------------------------

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <Modal onClose={onClose}>
    <div className="modal">
      <div className="modal-header">
        <h3>{title}</h3>
        <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}><Icon name="close" size={14} label="Close" /></button>
      </div>
      {children}
    </div>
  </Modal>
);

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
    if (await onSave(form)) onClose();
  };

  return (
    <ModalShell title="Edit Profile" onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="First Name"><input className="input" value={form.firstName ?? ""} onChange={set("firstName")} /></MField>
        <MField label="Last Name"><input className="input" value={form.lastName ?? ""} onChange={set("lastName")} /></MField>
        <MField label="Professional Title">
          <input className="input" placeholder="e.g. Full Stack Developer" value={form.professionalTitle ?? ""} onChange={set("professionalTitle")} />
        </MField>
        <MField label="Profile Picture URL">
          <input className="input" placeholder="https://…" value={form.profilePicture ?? ""} onChange={set("profilePicture")} />
        </MField>
        <MField label="Phone"><input className="input" placeholder="+961 XX XXX XXX" value={form.phoneNumber ?? ""} onChange={set("phoneNumber")} /></MField>
        <MField label="Country"><input className="input" value={form.country ?? ""} onChange={set("country")} /></MField>
        <MField label="City">
          <select className="input" value={form.city ?? ""} onChange={set("city")}>
            <option value="">Select a city…</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </MField>
        <MField label="LinkedIn URL">
          <input className="input" placeholder="https://linkedin.com/in/…" value={form.linkedinUrl ?? ""} onChange={set("linkedinUrl")} />
        </MField>
        <MField label="GitHub URL">
          <input className="input" placeholder="https://github.com/…" value={form.githubUrl ?? ""} onChange={set("githubUrl")} />
        </MField>
        <MField label="Portfolio URL">
          <input className="input" placeholder="https://…" value={form.portfolioUrl ?? ""} onChange={set("portfolioUrl")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="About Me">
            <textarea className="input prof-textarea" rows={4} placeholder="A short bio…" value={form.aboutMe ?? ""} onChange={set("aboutMe")} />
          </MField>
        </div>
        {parseSaveError(saveError) && <p className="prof-modal-error prof-modal-full">{parseSaveError(saveError)}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save Changes"}</button>
      </div>
    </ModalShell>
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EducationPayload, string>>>({});
  const set = (k: keyof EducationPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value || null }));
      if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
    };

  const handleSave = async () => {
    const errors: Partial<Record<keyof EducationPayload, string>> = {};
    if (!form.institutionName?.trim()) errors.institutionName = "Institution name is required.";
    if (!form.degree?.trim()) errors.degree = "Degree is required.";
    if (!form.fieldOfStudy?.trim()) errors.fieldOfStudy = "Field of study is required.";
    if (!form.startDate?.trim()) errors.startDate = "Start date is required.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    if (await onSave(form)) onClose();
  };

  return (
    <ModalShell title={initial === EMPTY_EDU ? "Add Education" : "Edit Education"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Institution *">
          <input className={`input${fieldErrors.institutionName ? " input-error" : ""}`} value={form.institutionName}
            onChange={(e) => { setForm(p => ({ ...p, institutionName: e.target.value })); if (fieldErrors.institutionName) setFieldErrors(fe => ({ ...fe, institutionName: undefined })); }} />
          {fieldErrors.institutionName && <span className="prof-field-error">{fieldErrors.institutionName}</span>}
        </MField>
        <MField label="Degree *">
          <input className={`input${fieldErrors.degree ? " input-error" : ""}`} placeholder="e.g. Bachelor of Science"
            value={form.degree} onChange={(e) => { setForm(p => ({ ...p, degree: e.target.value })); if (fieldErrors.degree) setFieldErrors(fe => ({ ...fe, degree: undefined })); }} />
          {fieldErrors.degree && <span className="prof-field-error">{fieldErrors.degree}</span>}
        </MField>
        <MField label="Field of Study *">
          <input className={`input${fieldErrors.fieldOfStudy ? " input-error" : ""}`} value={form.fieldOfStudy}
            onChange={(e) => { setForm(p => ({ ...p, fieldOfStudy: e.target.value })); if (fieldErrors.fieldOfStudy) setFieldErrors(fe => ({ ...fe, fieldOfStudy: undefined })); }} />
          {fieldErrors.fieldOfStudy && <span className="prof-field-error">{fieldErrors.fieldOfStudy}</span>}
        </MField>
        <MField label="Start Date *">
          <input className={`input${fieldErrors.startDate ? " input-error" : ""}`} type="date" value={form.startDate}
            onChange={(e) => { setForm(p => ({ ...p, startDate: e.target.value })); if (fieldErrors.startDate) setFieldErrors(fe => ({ ...fe, startDate: undefined })); }} />
          {fieldErrors.startDate && <span className="prof-field-error">{fieldErrors.startDate}</span>}
        </MField>
        <MField label="End Date (leave blank if ongoing)">
          <input className="input" type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="Description">
            <textarea className="input prof-textarea" rows={3} value={form.description ?? ""} onChange={set("description")} />
          </MField>
        </div>
        {parseSaveError(saveError) && <p className="prof-modal-error prof-modal-full">{parseSaveError(saveError)}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof WorkExperiencePayload, string>>>({});
  const set = (k: keyof WorkExperiencePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value || null }));
      if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
    };

  const handleSave = async () => {
    const errors: Partial<Record<keyof WorkExperiencePayload, string>> = {};
    if (!form.jobTitle?.trim()) errors.jobTitle = "Job title is required.";
    if (!form.companyName?.trim()) errors.companyName = "Company name is required.";
    if (!form.startDate?.trim()) errors.startDate = "Start date is required.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    if (await onSave(form)) onClose();
  };

  return (
    <ModalShell title={initial === EMPTY_WORK ? "Add Work Experience" : "Edit Work Experience"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Job Title *">
          <input className={`input${fieldErrors.jobTitle ? " input-error" : ""}`} value={form.jobTitle}
            onChange={(e) => { setForm(p => ({ ...p, jobTitle: e.target.value })); if (fieldErrors.jobTitle) setFieldErrors(fe => ({ ...fe, jobTitle: undefined })); }} />
          {fieldErrors.jobTitle && <span className="prof-field-error">{fieldErrors.jobTitle}</span>}
        </MField>
        <MField label="Company *">
          <input className={`input${fieldErrors.companyName ? " input-error" : ""}`} value={form.companyName}
            onChange={(e) => { setForm(p => ({ ...p, companyName: e.target.value })); if (fieldErrors.companyName) setFieldErrors(fe => ({ ...fe, companyName: undefined })); }} />
          {fieldErrors.companyName && <span className="prof-field-error">{fieldErrors.companyName}</span>}
        </MField>
        <MField label="Location"><input className="input" value={form.location ?? ""} onChange={set("location")} /></MField>
        <MField label="Start Date *">
          <input className={`input${fieldErrors.startDate ? " input-error" : ""}`} type="date" value={form.startDate}
            onChange={(e) => { setForm(p => ({ ...p, startDate: e.target.value })); if (fieldErrors.startDate) setFieldErrors(fe => ({ ...fe, startDate: undefined })); }} />
          {fieldErrors.startDate && <span className="prof-field-error">{fieldErrors.startDate}</span>}
        </MField>
        <MField label="End Date (leave blank if current)">
          <input className="input" type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
        </MField>
        <div className="prof-modal-full">
          <MField label="Description">
            <textarea className="input prof-textarea" rows={3} value={form.description ?? ""} onChange={set("description")} />
          </MField>
        </div>
        {parseSaveError(saveError) && <p className="prof-modal-error prof-modal-full">{parseSaveError(saveError)}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CertificationPayload, string>>>({});

  const handleSave = async () => {
    const errors: Partial<Record<keyof CertificationPayload, string>> = {};
    if (!form.name?.trim()) errors.name = "Certification name is required.";
    if (!form.issuingOrganization?.trim()) errors.issuingOrganization = "Issuing organization is required.";
    if (!form.issueDate?.trim()) errors.issueDate = "Issue date is required.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    if (await onSave(form)) onClose();
  };

  return (
    <ModalShell title={initial === EMPTY_CERT ? "Add Certification" : "Edit Certification"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Certification Name *">
          <input className={`input${fieldErrors.name ? " input-error" : ""}`} value={form.name}
            onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); if (fieldErrors.name) setFieldErrors(fe => ({ ...fe, name: undefined })); }} />
          {fieldErrors.name && <span className="prof-field-error">{fieldErrors.name}</span>}
        </MField>
        <MField label="Issuing Organization *">
          <input className={`input${fieldErrors.issuingOrganization ? " input-error" : ""}`} value={form.issuingOrganization}
            onChange={(e) => { setForm(p => ({ ...p, issuingOrganization: e.target.value })); if (fieldErrors.issuingOrganization) setFieldErrors(fe => ({ ...fe, issuingOrganization: undefined })); }} />
          {fieldErrors.issuingOrganization && <span className="prof-field-error">{fieldErrors.issuingOrganization}</span>}
        </MField>
        <MField label="Issue Date *">
          <input className={`input${fieldErrors.issueDate ? " input-error" : ""}`} type="date" value={form.issueDate}
            onChange={(e) => { setForm(p => ({ ...p, issueDate: e.target.value })); if (fieldErrors.issueDate) setFieldErrors(fe => ({ ...fe, issueDate: undefined })); }} />
          {fieldErrors.issueDate && <span className="prof-field-error">{fieldErrors.issueDate}</span>}
        </MField>
        <MField label="Expiration Date (optional)">
          <input className="input" type="date" value={form.expirationDate ?? ""}
            onChange={(e) => setForm(p => ({ ...p, expirationDate: e.target.value || null }))} />
        </MField>
        {parseSaveError(saveError) && <p className="prof-modal-error prof-modal-full">{parseSaveError(saveError)}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectPayload, string>>>({});
  const set = (k: keyof ProjectPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value || null }));
      if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
    };

  const handleSave = async () => {
    const errors: Partial<Record<keyof ProjectPayload, string>> = {};
    if (!form.title?.trim()) errors.title = "Project title is required.";
    if (!form.description?.trim()) errors.description = "Description is required.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    if (await onSave(form)) onClose();
  };

  return (
    <ModalShell title={initial === EMPTY_PROJ ? "Add Project" : "Edit Project"} onClose={onClose}>
      <div className="modal-body prof-modal-grid">
        <MField label="Project Title *">
          <input className={`input${fieldErrors.title ? " input-error" : ""}`} value={form.title}
            onChange={(e) => { setForm(p => ({ ...p, title: e.target.value })); if (fieldErrors.title) setFieldErrors(fe => ({ ...fe, title: undefined })); }} />
          {fieldErrors.title && <span className="prof-field-error">{fieldErrors.title}</span>}
        </MField>
        <MField label="Technologies Used">
          <input className="input" placeholder="React, TypeScript, Spring Boot…" value={form.technologiesUsed ?? ""} onChange={set("technologiesUsed")} />
        </MField>
        <MField label="Project URL">
          <input className="input" placeholder="https://…" value={form.projectUrl ?? ""} onChange={set("projectUrl")} />
        </MField>
        <MField label="GitHub URL">
          <input className="input" placeholder="https://github.com/…" value={form.githubUrl ?? ""} onChange={set("githubUrl")} />
        </MField>
        <MField label="Start Date"><input className="input" type="date" value={form.startDate ?? ""} onChange={set("startDate")} /></MField>
        <MField label="End Date"><input className="input" type="date" value={form.endDate ?? ""} onChange={set("endDate")} /></MField>
        <div className="prof-modal-full">
          <MField label="Description *">
            <textarea className={`input prof-textarea${fieldErrors.description ? " input-error" : ""}`} rows={3}
              value={form.description ?? ""} onChange={set("description")} />
            {fieldErrors.description && <span className="prof-field-error">{fieldErrors.description}</span>}
          </MField>
        </div>
        {parseSaveError(saveError) && <p className="prof-modal-error prof-modal-full">{parseSaveError(saveError)}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

const ConfirmDelete: React.FC<{ label: string; onConfirm: () => void; onCancel: () => void }> = ({ label, onConfirm, onCancel }) => (
  <ModalShell title="Confirm Delete" onClose={onCancel}>
    <div className="modal-body">
      <p style={{ color: "var(--color-text-secondary)" }}>
        Are you sure you want to delete <strong>{label}</strong>? This cannot be undone.
      </p>
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
    </div>
  </ModalShell>
);

// ---------------------------------------------------------------------------
// Badge component
// ---------------------------------------------------------------------------

const BadgePip: React.FC<{ level: BadgeLevel; skillName: string; category: string }> = ({ level, skillName, category }) => {
  const meta = BADGE_META[level];
  return (
    <div className="badge-pip" title={`${skillName} — ${meta.label}`} style={{ "--badge-color": meta.color, "--badge-glow": meta.glow } as React.CSSProperties}>
      <span className="badge-pip__icon">{meta.icon}</span>
      <div className="badge-pip__info">
        <span className="badge-pip__name">{skillName}</span>
        <span className="badge-pip__cat">{category}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// XP Display (read-only balance — no level/progress concepts)
// ---------------------------------------------------------------------------

const XpDisplay: React.FC<{ xp: number }> = ({ xp }) => (
  <div className="xp-display">
    <span className="xp-display__icon"><Icon name="xp" /></span>
    <span className="xp-display__value">{xp.toLocaleString()}</span>
    <span className="xp-display__unit">XP</span>
  </div>
);

// ---------------------------------------------------------------------------
// Next Goal panel
// ---------------------------------------------------------------------------

const NextGoalPanel: React.FC<{
  skills: ReturnType<typeof useSkills>["data"];
}> = ({ skills }) => {
  const goals: Array<{ label: string; done: boolean; cta?: string; path?: string }> = [];

  const totalBadges = skills?.skills.filter(s => s.verification?.currentBadge).length ?? 0;
  const goldBadges  = skills?.skills.filter(s => s.verification?.currentBadge === "GOLD").length ?? 0;
  const silverBadges = skills?.skills.filter(s => s.verification?.currentBadge === "SILVER").length ?? 0;

  goals.push({ label: "Earn your first badge", done: totalBadges >= 1, path: "/skills" });
  goals.push({ label: "Reach 5 verified badges", done: totalBadges >= 5, path: "/skills" });
  goals.push({ label: "Earn a Silver badge", done: silverBadges >= 1, path: "/skills" });
  goals.push({ label: "Earn a Gold badge", done: goldBadges >= 1, path: "/skills" });

  const nextGoal = goals.find(g => !g.done);

  if (!nextGoal) {
    return (
      <div className="next-goal-panel next-goal-panel--complete">
        <div className="next-goal-panel__icon"><Icon name="trophy" /></div>
        <div className="next-goal-panel__text">
          <span className="next-goal-panel__title">Profile Champion</span>
          <span className="next-goal-panel__sub">All milestone goals cleared!</span>
        </div>
      </div>
    );
  }

  const completedCount = goals.filter(g => g.done).length;

  return (
    <div className="next-goal-panel">
      <div className="next-goal-panel__track">
        <div className="next-goal-panel__track-fill" style={{ width: `${(completedCount / goals.length) * 100}%` }} />
      </div>
      <div className="next-goal-panel__body">
        <div className="next-goal-panel__icon"><Icon name="target" /></div>
        <div className="next-goal-panel__text">
          <span className="next-goal-panel__eyebrow">Next goal · {completedCount}/{goals.length} complete</span>
          <span className="next-goal-panel__title">{nextGoal.label}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stats strip
// ---------------------------------------------------------------------------

const StatStrip: React.FC<{ badges: number; certs: number; projects: number; work: number }> = ({ badges, certs, projects, work }) => (
  <div className="stat-strip">
    {[
      { value: badges, label: "Badges" },
      { value: certs,    label: "Certs" },
      { value: projects, label: "Projects" },
      { value: work,     label: "Jobs" },
    ].map((s) => (
      <div key={s.label} className="stat-strip__item">
        <span className="stat-strip__val">{s.value}</span>
        <span className="stat-strip__lbl">{s.label}</span>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Collapsible section for secondary info
// ---------------------------------------------------------------------------

const CollapsibleSection: React.FC<{
  title: string;
  icon: string | React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}> = ({ title, icon, count, defaultOpen = false, children, onAdd, addLabel }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-section">
      <button className="collapsible-section__header" onClick={() => setOpen(o => !o)}>
        <span className="collapsible-section__icon">{icon}</span>
        <span className="collapsible-section__title">{title}</span>
        {count !== undefined && <span className="collapsible-section__count">{count}</span>}
        <span className="collapsible-section__chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && (
        <div className="collapsible-section__body">
          {children}
          {onAdd && (
            <button className="prof-empty-cta" onClick={onAdd} style={{ marginTop: "var(--space-3)" }}>+ {addLabel}</button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

const TimelineItem: React.FC<{
  title: string;
  sub: string;
  dates: string;
  desc?: string | null;
  chips?: string | null;
  links?: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ title, sub, dates, desc, chips, links, onEdit, onDelete }) => (
  <div className="timeline-item">
    <div className="timeline-item__dot" />
    <div className="timeline-item__content">
      <div className="timeline-item__header">
        <div className="timeline-item__meta">
          <span className="timeline-item__title">{title}</span>
          <span className="timeline-item__sub">{sub}</span>
          <span className="timeline-item__dates">{dates}</span>
        </div>
        <div className="timeline-item__actions">
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onEdit}><Icon name="edit" size={13} label="Edit" /></button>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onDelete}><Icon name="delete" size={13} label="Delete" /></button>
        </div>
      </div>
      {chips && (
        <div className="prof-tech-chips">
          {chips.split(",").map(t => <span key={t} className="prof-tech-chip">{t.trim()}</span>)}
        </div>
      )}
      {links && <div className="timeline-item__links">{links}</div>}
      {desc && <p className="timeline-item__desc">{desc}</p>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Modal state type
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

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------

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

  const { data: skillsData } = useSkills();

  const [modal, setModal] = useState<ModalState>(null);
  const closeModal = () => { setModal(null); clearSaveStatus(); };

  // ── Error ──────────────────────────────────────────────
  if (error) {
    return (
      <PageLayout pageTitle="Profile">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="error" /></div>
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
        <div className="pg-loading">
          <Skeleton h={200} radius="var(--radius-2xl)" />
          <Skeleton h={80} radius="var(--radius-xl)" />
          <Skeleton h={120} radius="var(--radius-xl)" />
          <Skeleton h={160} radius="var(--radius-xl)" />
        </div>
        <style>{pageStyles}</style>
      </PageLayout>
    );
  }

  // Derived data
  const verifiedSkills = skillsData?.skills.filter(s => s.verification?.currentBadge) ?? [];
  const goldBadges   = verifiedSkills.filter(s => s.verification?.currentBadge === "GOLD");
  const silverBadges = verifiedSkills.filter(s => s.verification?.currentBadge === "SILVER");
  const bronzeBadges = verifiedSkills.filter(s => s.verification?.currentBadge === "BRONZE");
  // Show Gold first, then Silver, then Bronze
  const badgesSorted = [...goldBadges, ...silverBadges, ...bronzeBadges];

  const hasLinks = profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl;

  return (
    <PageLayout pageTitle="Profile">
      <PageHeader {...PAGE_CONFIGS.profile} />
      {saveSuccess && <div className="prof-toast"> <Icon name="complete"/> Saved successfully</div>}

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="pg-hero animate-fade-in">
        {/* Ambient glow behind avatar */}
        <div className="pg-hero__glow" aria-hidden="true" />

        <div className="pg-hero__top">
          {/* Avatar + identity */}
          <div className="pg-hero__identity">
            <div className="pg-hero__avatar-wrap">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={profile.firstName} className="pg-hero__avatar-img" />
              ) : (
                <div className="pg-hero__avatar-initials">{getInitials(profile.firstName, profile.lastName)}</div>
              )}
            </div>
            <div className="pg-hero__name-block">
              <h1 className="pg-hero__name">{profile.firstName} {profile.lastName}</h1>
              {profile.professionalTitle && (
                <span className="pg-hero__title-tag">{profile.professionalTitle}</span>
              )}
              {(profile.city || profile.country) && (
                <span className="pg-hero__location"> <Icon name="location"/> {[profile.city, profile.country].filter(Boolean).join(", ")}</span>
              )}
            </div>
          </div>

          {/* Edit button — secondary, tucked top-right */}
          <button
            className="pg-hero__edit-btn"
            onClick={() => setModal({ type: "edit-profile" })}
            title="Edit profile"
          >
            <Icon name="edit" size={14} label="" />
            <span>Edit</span>
          </button>
        </div>

        {/* XP Display */}
        <XpDisplay xp={profile.xpBalance} />

        {/* Stats strip */}
        <StatStrip
          badges={verifiedSkills.length}
          certs={certifications.length}
          projects={projects.length}
          work={workExperiences.length}
        />
      </div>

      {/* ── NEXT GOAL ─────────────────────────────────────────────── */}
      <NextGoalPanel
        skills={skillsData}
      />

      {/* ── BADGES ────────────────────────────────────────────────── */}
      <section className="badges-section animate-fade-in" style={{ animationDelay: "80ms" }}>
        <div className="badges-section__header">
          <h2 className="badges-section__title">
            <span className="badges-section__title-icon"><Icon name="badge" /></span>
            Earned Badges
            {verifiedSkills.length > 0 && <span className="badges-section__count">{verifiedSkills.length}</span>}
          </h2>
          <button className="badges-section__cta" onClick={() => navigate("/skills")}>
            Verify more skills →
          </button>
        </div>

        {badgesSorted.length === 0 ? (
          <div className="badges-empty">
            <div className="badges-empty__icon"><Icon name="lock" /></div>
            <p className="badges-empty__text">No badges yet. Pass a skill quiz to earn your first!</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/skills")}>Start Verifying Skills</button>
          </div>
        ) : (
          <div className="badges-grid">
            {badgesSorted.map((skill) => (
              <BadgePip
                key={skill.id}
                level={skill.verification!.currentBadge!}
                skillName={skill.name}
                category={skill.category}
              />
            ))}
          </div>
        )}

        {/* Tier breakdown if any badges */}
        {verifiedSkills.length > 0 && (
          <div className="badge-tier-summary" style={{ paddingTop: "1rem" }}>
            {goldBadges.length > 0 && (
              <span className="badge-tier-pill badge-tier-pill--gold">
                <Icon name="medal" className="badge-icon badge-icon--gold" />
                {goldBadges.length} Gold
              </span>
            )}

            {silverBadges.length > 0 && (
              <span className="badge-tier-pill badge-tier-pill--silver">
                <Icon name="medal" className="badge-icon badge-icon--silver" />
                {silverBadges.length} Silver
              </span>
            )}

            {bronzeBadges.length > 0 && (
              <span className="badge-tier-pill badge-tier-pill--bronze">
                <Icon name="medal" className="badge-icon badge-icon--bronze" />
                {bronzeBadges.length} Bronze
              </span>
            )}

          </div>
        )}
      </section>

      {/* ── ABOUT + LINKS ─────────────────────────────────────────── */}
      {(profile.aboutMe || hasLinks) && (
        <div className="pg-about-row animate-fade-in" style={{ animationDelay: "120ms" }}>
          {profile.aboutMe && (
            <div className="pg-about">
              <p className="pg-about__text">{profile.aboutMe}</p>
            </div>
          )}
          {hasLinks && (
            <div className="pg-links">
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="pg-link-pill">
                  <span className="pg-link-pill__icon">in</span>LinkedIn
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="pg-link-pill">
                  <span className="pg-link-pill__icon">gh</span>GitHub
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="pg-link-pill">
                  <span className="pg-link-pill__icon"><Icon name="portfolio" /></span>Portfolio
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EXPERIENCE & HISTORY ──────────────────────────────────── */}
      <div className="pg-history animate-fade-in" style={{ animationDelay: "160ms" }}>

        <CollapsibleSection title="Work Experience" icon={<Icon name="briefcase" />} count={workExperiences.length}
          defaultOpen={workExperiences.length > 0}
          onAdd={() => setModal({ type: "add-work" })} addLabel="Add Experience">
          {workExperiences.length === 0 ? (
            <p className="pg-empty-hint">No work experience added yet.</p>
          ) : (
            <div className="timeline">
              {workExperiences.map((w) => (
                <TimelineItem key={w.id}
                  title={w.jobTitle} sub={w.companyName}
                  dates={`${fmtDate(w.startDate)} — ${w.endDate ? fmtDate(w.endDate) : "Present"}`}
                  desc={w.description}
                  onEdit={() => setModal({ type: "edit-work", item: w })}
                  onDelete={() => setModal({ type: "del-work", item: w })}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Education" icon={<Icon name="education" />} count={educations.length}
          defaultOpen={educations.length > 0}
          onAdd={() => setModal({ type: "add-edu" })} addLabel="Add Education">
          {educations.length === 0 ? (
            <p className="pg-empty-hint">No education entries yet.</p>
          ) : (
            <div className="timeline">
              {educations.map((e) => (
                <TimelineItem key={e.id}
                  title={e.degree} sub={`${e.institutionName} · ${e.fieldOfStudy}`}
                  dates={`${fmtDate(e.startDate)} — ${e.endDate ? fmtDate(e.endDate) : "Present"}`}
                  desc={e.description}
                  onEdit={() => setModal({ type: "edit-edu", item: e })}
                  onDelete={() => setModal({ type: "del-edu", item: e })}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Certifications" icon={<Icon name="certificate" />} count={certifications.length}
          defaultOpen={certifications.length > 0}
          onAdd={() => setModal({ type: "add-cert" })} addLabel="Add Certification">
          {certifications.length === 0 ? (
            <p className="pg-empty-hint">No certifications added yet.</p>
          ) : (
            <div className="timeline">
              {certifications.map((c) => (
                <TimelineItem key={c.id}
                  title={c.name} sub={c.issuingOrganization}
                  dates={`Issued ${fmtDate(c.issueDate)}${c.expirationDate ? ` · Expires ${fmtDate(c.expirationDate)}` : ""}`}
                  onEdit={() => setModal({ type: "edit-cert", item: c })}
                  onDelete={() => setModal({ type: "del-cert", item: c })}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Projects" icon={<Icon name="rocket" />} count={projects.length}
          defaultOpen={projects.length > 0}
          onAdd={() => setModal({ type: "add-proj" })} addLabel="Add Project">
          {projects.length === 0 ? (
            <p className="pg-empty-hint">No projects added yet.</p>
          ) : (
            <div className="timeline">
              {projects.map((p) => (
                <TimelineItem key={p.id}
                  title={p.title} sub=""
                  dates={p.startDate ? `${fmtDate(p.startDate)}${p.endDate ? ` — ${fmtDate(p.endDate)}` : ""}` : ""}
                  desc={p.description}
                  chips={p.technologiesUsed}
                  links={
                    (p.projectUrl || p.githubUrl) ? (
                      <>
                        {p.projectUrl && <a href={p.projectUrl} target="_blank" rel="noopener noreferrer" className="prof-proj-link"> <Icon name="portfolio" /> Live</a>}
                        {p.githubUrl  && <a href={p.githubUrl}  target="_blank" rel="noopener noreferrer" className="prof-proj-link"> <Icon name="github" /> Code</a>}
                      </>
                    ) : undefined
                  }
                  onEdit={() => setModal({ type: "edit-proj", item: p })}
                  onDelete={() => setModal({ type: "del-proj", item: p })}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

      </div>

      {/* ── MODALS ────────────────────────────────────────────────── */}
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
      {modal?.type === "add-edu"  && <EducationModal isSaving={isSaving} saveError={saveError} onSave={addEducation} onClose={closeModal} />}
      {modal?.type === "edit-edu" && (
        <EducationModal
          initial={{ institutionName: modal.item.institutionName, degree: modal.item.degree, fieldOfStudy: modal.item.fieldOfStudy, startDate: modal.item.startDate, endDate: modal.item.endDate, description: modal.item.description }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateEducation(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-edu" && (
        <ConfirmDelete label={modal.item.institutionName}
          onConfirm={async () => { await deleteEducation(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}
      {modal?.type === "add-work"  && <WorkModal isSaving={isSaving} saveError={saveError} onSave={addWorkExperience} onClose={closeModal} />}
      {modal?.type === "edit-work" && (
        <WorkModal
          initial={{ jobTitle: modal.item.jobTitle, companyName: modal.item.companyName, location: modal.item.location, startDate: modal.item.startDate, endDate: modal.item.endDate, description: modal.item.description }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateWorkExperience(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-work" && (
        <ConfirmDelete label={`${modal.item.jobTitle} at ${modal.item.companyName}`}
          onConfirm={async () => { await deleteWorkExperience(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}
      {modal?.type === "add-cert"  && <CertModal isSaving={isSaving} saveError={saveError} onSave={addCertification} onClose={closeModal} />}
      {modal?.type === "edit-cert" && (
        <CertModal
          initial={{ name: modal.item.name, issuingOrganization: modal.item.issuingOrganization, issueDate: modal.item.issueDate, expirationDate: modal.item.expirationDate }}
          isSaving={isSaving} saveError={saveError}
          onSave={(p) => updateCertification(modal.item.id, p)} onClose={closeModal}
        />
      )}
      {modal?.type === "del-cert" && (
        <ConfirmDelete label={modal.item.name}
          onConfirm={async () => { await deleteCertification(modal.item.id); closeModal(); }}
          onCancel={closeModal} />
      )}
      {modal?.type === "add-proj"  && <ProjectModal isSaving={isSaving} saveError={saveError} onSave={addProject} onClose={closeModal} />}
      {modal?.type === "edit-proj" && (
        <ProjectModal
          initial={{ title: modal.item.title, description: modal.item.description, technologiesUsed: modal.item.technologiesUsed, projectUrl: modal.item.projectUrl, githubUrl: modal.item.githubUrl, startDate: modal.item.startDate, endDate: modal.item.endDate }}
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
  /* Loading skeleton */
  .pg-loading { display:flex;flex-direction:column;gap:var(--space-4);padding:var(--space-2) 0; }

  /* ── HERO ── */
  .pg-hero {
    position: relative;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    overflow: hidden;
    margin-bottom: var(--space-4);
  }
  .pg-hero__glow {
    position: absolute;
    top: -60px; left: 50%; transform: translateX(-50%);
    width: 300px; height: 200px;
    background: var(--gradient-premium, radial-gradient(ellipse, var(--color-primary-500) 0%, transparent 70%));
    opacity: 0.07;
    pointer-events: none;
    filter: blur(30px);
  }
  .pg-hero__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: var(--space-5);
    position: relative;
    z-index: 1;
  }
  .pg-hero__identity {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  /* Avatar */
  .pg-hero__avatar-wrap { position: relative; flex-shrink: 0; }
  .pg-hero__avatar-img,
  .pg-hero__avatar-initials {
    width: 72px; height: 72px;
    border-radius: var(--radius-full);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold);
    color: #fff; object-fit: cover;
    border: 2px solid var(--color-border-strong);
  }
  .pg-hero__avatar-initials { background: var(--gradient-premium, var(--gradient-primary)); }
  /* Name block */
  .pg-hero__name-block { display: flex; flex-direction: column; gap: 3px; }
  .pg-hero__name {
    font-family: var(--font-display);
    font-size: var(--text-xl); font-weight: var(--weight-bold);
    color: var(--color-text-primary); line-height: 1.2;
  }
  .pg-hero__title-tag {
    display: inline-block;
    font-size: var(--text-xs); font-weight: var(--weight-medium);
    color: var(--color-premium, var(--color-primary-400));
    background: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary-500) 25%, transparent);
    border-radius: var(--radius-full);
    padding: 2px 10px;
    width: fit-content;
  }
  .pg-hero__location {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Edit button — deliberately small / secondary */
  .pg-hero__edit-btn {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-family: var(--font-body); font-size: var(--text-xs);
    cursor: pointer; flex-shrink: 0;
    transition: all var(--duration-fast);
  }
  .pg-hero__edit-btn:hover {
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }

  /* XP Display */
  .xp-display {
    display: flex; align-items: center; gap: var(--space-2);
    position: relative; z-index: 1;
    margin-bottom: var(--space-4);
  }
  .xp-display__icon {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    background: var(--gradient-premium, var(--gradient-primary));
    border-radius: var(--radius-md);
    flex-shrink: 0;
    font-size: 14px;
    color: #fff;
  }
  .xp-display__value {
    font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold);
    color: var(--color-text-primary); line-height: 1;
  }
  .xp-display__unit {
    font-size: var(--text-sm); font-weight: var(--weight-medium);
    color: var(--color-premium, var(--color-primary-400));
  }

  /* Stat strip */
  .stat-strip {
    display: flex;
    gap: 0;
    border-top: 1px solid var(--color-border-subtle);
    padding-top: var(--space-4);
    position: relative; z-index: 1;
  }
  .stat-strip__item {
    flex: 1;
    display: flex; flex-direction: column; align-items: center;
    padding: var(--space-1) 0;
    border-right: 1px solid var(--color-border-subtle);
  }
  .stat-strip__item:last-child { border-right: none; }
  .stat-strip__val {
    font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold);
    color: var(--color-text-primary); line-height: 1.2;
  }
  .stat-strip__lbl { font-size: var(--text-xs); color: var(--color-text-muted); }

  /* ── NEXT GOAL ── */
  .next-goal-panel {
    position: relative;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    overflow: hidden;
    margin-bottom: var(--space-4);
  }
  .next-goal-panel--complete {
    display: flex; align-items: center; gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-color: color-mix(in srgb, #ffd700 35%, transparent);
    background: color-mix(in srgb, #ffd700 5%, var(--color-bg-elevated));
  }
  .next-goal-panel__track {
    height: 3px;
    background: var(--color-bg-overlay);
  }
  .next-goal-panel__track-fill {
    height: 100%;
    background: var(--gradient-premium, var(--gradient-primary));
    transition: width 0.6s ease;
  }
  .next-goal-panel__body {
    display: flex; align-items: center; gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
  }
  .next-goal-panel__icon { font-size: var(--text-xl); flex-shrink: 0; }
  .next-goal-panel__text { display: flex; flex-direction: column; gap: 2px; }
  .next-goal-panel__eyebrow { font-size: var(--text-xs); color: var(--color-text-muted); }
  .next-goal-panel__title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
  .next-goal-panel__sub { font-size: var(--text-sm); color: var(--color-text-secondary); }

  /* ── BADGES ── */
  .badges-section {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-5);
    margin-bottom: var(--space-4);
  }
  .badges-section__header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: var(--space-4);
  }
  .badges-section__title {
    display: flex; align-items: center; gap: var(--space-2);
    font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
  }
  .badges-section__title-icon { font-size: var(--text-lg); }
  .badges-section__count {
    font-size: var(--text-xs); font-weight: var(--weight-semibold);
    background: var(--gradient-premium, var(--color-primary-500));
    color: #fff;
    border-radius: var(--radius-full);
    padding: 1px 8px;
    min-width: 20px;
    text-align: center;
  }
  .badges-section__cta {
    font-size: var(--text-xs);
    color: var(--color-premium, var(--color-primary-400));
    background: none; border: none; cursor: pointer; padding: 0;
    font-family: var(--font-body);
  }
  .badges-section__cta:hover { text-decoration: underline; }

  /* Badge grid */
  .badges-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .badge-pip {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
    border: 1px solid color-mix(in srgb, var(--badge-color, #888) 30%, transparent);
    border-radius: var(--radius-lg);
    box-shadow: 0 0 10px var(--badge-glow, transparent);
    transition: transform var(--duration-fast), box-shadow var(--duration-fast);
    cursor: default;
  }
  .badge-pip:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px var(--badge-glow, transparent);
  }
  .badge-pip__icon { font-size: 18px; flex-shrink: 0; }
  .badge-pip__info { display: flex; flex-direction: column; gap: 1px; }
  .badge-pip__name {
    font-size: var(--text-xs); font-weight: var(--weight-semibold);
    color: var(--color-text-primary); line-height: 1.2;
  }
  .badge-pip__cat { font-size: 10px; color: var(--color-text-disabled); }

  /* Badge tier summary */
  .badge-tier-summary {
    display: flex; gap: var(--space-2); flex-wrap: wrap;
  }
  .badge-tier-pill {
    font-size: var(--text-xs); font-weight: var(--weight-medium);
    padding: 3px 10px;
    border-radius: var(--radius-full);
    border: 1px solid;
  }
  .badge-tier-pill--gold   { color: #b8860b; background: rgba(255,215,0,0.1);  border-color: rgba(255,215,0,0.35); }
  .badge-tier-pill--silver { color: #888;    background: rgba(192,192,192,0.1); border-color: rgba(192,192,192,0.35); }
  .badge-tier-pill--bronze { color: #8b5e3c; background: rgba(205,127,50,0.1); border-color: rgba(205,127,50,0.35); }

  /* Badges empty */
  .badges-empty {
    display: flex; flex-direction: column; align-items: center;
    padding: var(--space-8) var(--space-4);
    gap: var(--space-3); text-align: center;
  }
  .badges-empty__icon { font-size: 40px; }
  .badges-empty__text { font-size: var(--text-sm); color: var(--color-text-muted); }

  /* ── ABOUT ROW ── */
  .pg-about-row {
    display: flex; gap: var(--space-4); flex-wrap: wrap;
    margin-bottom: var(--space-4);
  }
  .pg-about {
    flex: 1; min-width: 200px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-5);
  }
  .pg-about__text {
    font-size: var(--text-sm); color: var(--color-text-secondary);
    line-height: var(--leading-relaxed); margin: 0;
  }
  .pg-links {
    display: flex; flex-direction: column; gap: var(--space-2); min-width: 150px;
  }
  .pg-link-pill {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    text-decoration: none;
    font-size: var(--text-sm); color: var(--color-text-secondary);
    transition: all var(--duration-fast);
  }
  .pg-link-pill:hover {
    border-color: var(--color-premium, var(--color-primary-500));
    color: var(--color-premium, var(--color-primary-400));
    text-decoration: none;
  }
  .pg-link-pill__icon {
    width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg-overlay);
    border-radius: var(--radius-sm);
    font-size: 11px; font-weight: var(--weight-bold);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  /* ── HISTORY SECTIONS ── */
  .pg-history {
    display: flex; flex-direction: column; gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .pg-empty-hint {
    font-size: var(--text-sm); color: var(--color-text-disabled);
    padding: var(--space-2) 0; margin: 0;
  }

  /* Collapsible section */
  .collapsible-section {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }
  .collapsible-section__header {
    display: flex; align-items: center; gap: var(--space-3);
    width: 100%; padding: var(--space-4) var(--space-5);
    background: none; border: none; cursor: pointer; text-align: left;
    font-family: var(--font-body);
    transition: background var(--duration-fast);
  }
  .collapsible-section__header:hover { background: var(--color-bg-hover); }
  .collapsible-section__icon { font-size: var(--text-base); }
  .collapsible-section__title {
    flex: 1;
    font-family: var(--font-display); font-size: var(--text-sm); font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
  }
  .collapsible-section__count {
    font-size: var(--text-xs); font-weight: var(--weight-semibold);
    color: var(--color-text-muted);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);
    padding: 1px 8px;
  }
  .collapsible-section__chevron {
    font-size: var(--text-sm); color: var(--color-text-disabled);
    transition: transform var(--duration-fast);
  }
  .collapsible-section__body {
    padding: 0 var(--space-5) var(--space-5);
    border-top: 1px solid var(--color-border-subtle);
    padding-top: var(--space-4);
  }

  /* Timeline */
  .timeline { display: flex; flex-direction: column; gap: 0; }
  .timeline-item {
    display: flex; gap: var(--space-3);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border-subtle);
    position: relative;
  }
  .timeline-item:last-child { border-bottom: none; padding-bottom: 0; }
  .timeline-item__dot {
    width: 8px; height: 8px;
    border-radius: var(--radius-full);
    background: var(--color-border-strong);
    margin-top: 6px; flex-shrink: 0;
  }
  .timeline-item__content { flex: 1; min-width: 0; }
  .timeline-item__header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2);
  }
  .timeline-item__meta { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .timeline-item__title {
    font-weight: var(--weight-semibold); font-size: var(--text-sm);
    color: var(--color-text-primary);
  }
  .timeline-item__sub { font-size: var(--text-sm); color: var(--color-text-secondary); }
  .timeline-item__dates {
    font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted);
  }
  .timeline-item__actions { display: flex; gap: var(--space-1); flex-shrink: 0; }
  .timeline-item__desc {
    font-size: var(--text-sm); color: var(--color-text-muted); margin: var(--space-2) 0 0;
    line-height: var(--leading-relaxed);
  }
  .timeline-item__links { display: flex; gap: var(--space-3); margin-top: var(--space-1); }

  /* Tech chips */
  .prof-tech-chips { display:flex;flex-wrap:wrap;gap:var(--space-1);margin-top:var(--space-1); }
  .prof-tech-chip { font-family:var(--font-mono);font-size:10px;padding:1px 8px;background:var(--color-bg-overlay);border:1px solid var(--color-border-default);border-radius:var(--radius-full);color:var(--color-text-muted); }

  /* Project links */
  .prof-proj-link { font-size:var(--text-xs);color:var(--color-premium,var(--color-primary-400));text-decoration:none; }
  .prof-proj-link:hover { text-decoration:underline; }

  /* Empty CTA */
  .prof-empty-cta { background:none;border:1px dashed var(--color-border-default);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);color:var(--color-text-muted);font-size:var(--text-sm);font-family:var(--font-body);cursor:pointer;width:100%;text-align:center;transition:all var(--duration-fast); }
  .prof-empty-cta:hover { border-color:var(--color-premium,var(--color-primary-400));color:var(--color-premium,var(--color-primary-400)); }

  /* Field errors */
  .prof-field-error { display:block;color:var(--color-danger);font-size:var(--text-xs);margin-top:3px; }
  .input-error { border-color:var(--color-danger) !important;outline-color:var(--color-danger); }
  .input-error:focus { box-shadow:0 0 0 2px color-mix(in srgb, var(--color-danger) 20%, transparent); }

  /* Modal */
  .prof-modal-grid { display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4); }
  .prof-modal-full { grid-column:1/-1; }
  .prof-textarea { resize:vertical;min-height:80px;font-family:var(--font-body); }
  .prof-modal-error { color:var(--color-danger);font-size:var(--text-sm); }
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-xl);
    width: 100%; max-width: 560px; max-height: 100%;
    overflow-y: auto;
    animation: modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1);
    margin: auto;
  }
  @keyframes modal-in { from{opacity:0;transform:scale(0.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
  .modal-header {
    display:flex;align-items:center;justify-content:space-between;
    padding:var(--space-5) var(--space-6);
    border-bottom:1px solid var(--color-border-subtle);
    position:sticky;top:0;
    background:var(--color-bg-elevated);
    z-index:1;
    border-radius:var(--radius-2xl) var(--radius-2xl) 0 0;
  }
  .modal-body { padding:var(--space-5) var(--space-6); }
  .modal-footer {
    display:flex;align-items:center;justify-content:flex-end;gap:var(--space-3);
    padding:var(--space-4) var(--space-6);
    border-top:1px solid var(--color-border-subtle);
    position:sticky;bottom:0;
    background:var(--color-bg-elevated);
    z-index:1;
    border-radius:0 0 var(--radius-2xl) var(--radius-2xl);
  }

  /* Toast */
  .prof-toast { position:fixed;bottom:calc(72px + var(--space-4));right:var(--space-6);background:var(--color-bg-elevated);border:1px solid var(--color-success-border);border-left:3px solid var(--color-success);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-5);color:var(--color-success);font-size:var(--text-sm);box-shadow:var(--shadow-xl);z-index:var(--z-toast);animation:fadeIn 0.3s ease; }

  @media (max-width: 600px) {
    .pg-about-row { flex-direction: column; }
    .prof-modal-grid { grid-template-columns: 1fr; }
    .badges-grid { gap: var(--space-2); }
  }
`;

export default ProfilePage;