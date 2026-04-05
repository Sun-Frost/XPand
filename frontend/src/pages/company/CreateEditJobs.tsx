import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { useCompanyJobs } from "../../hooks/company/useCompany";
import type { CreateJobPayload, JobSkillRequest, ImportanceLevel } from "../../hooks/company/useCompany";
import { get } from "../../api/axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillOption {
  id: number;
  name: string;
  category?: string;
  isActive: boolean;
}

// Job type from JobType.java — FULL_TIME, PART_TIME, CONTRACT, REMOTE
// (Not INTERNSHIP or FREELANCE — those don't exist in the backend enum)
const JOB_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full-Time", icon: "🏢" },
  { value: "PART_TIME", label: "Part-Time", icon: "⏰" },
  { value: "CONTRACT", label: "Contract", icon: "📋" },
  { value: "REMOTE", label: "Remote", icon: "🌍" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toISOLocal = (d: string): string => {
  // Convert date-only "YYYY-MM-DD" to "YYYY-MM-DDTHH:mm:ss"
  if (!d) return "";
  if (d.includes("T")) return d;
  return `${d}T23:59:00`;
};

const toDateOnly = (d: string | null): string => {
  if (!d) return "";
  return d.split("T")[0];
};

// ---------------------------------------------------------------------------
// Skill selector row
// ---------------------------------------------------------------------------

const SkillRow: React.FC<{
  skill: SkillOption;
  importance: ImportanceLevel | null;
  onAdd: (importance: ImportanceLevel) => void;
  onRemove: () => void;
  isAdded: boolean;
}> = ({ skill, importance, onAdd, onRemove, isAdded }) => (
  <div className={`cj-skill-row ${isAdded ? "cj-skill-row--added" : ""}`}>
    <div className="cj-skill-row__info">
      <span className="cj-skill-row__name">{skill.name}</span>
      {skill.category && <span className="cj-skill-row__cat">{skill.category}</span>}
    </div>
    {isAdded ? (
      <div className="cj-skill-row__actions">
        <div className="cj-importance-toggle">
          <button
            type="button"
            className={`cj-importance-btn ${importance === "MAJOR" ? "cj-importance-btn--active-major" : ""}`}
            onClick={() => onAdd("MAJOR")}
            title="Required — must have badge to apply"
          >
            ★ Required
          </button>
          <button
            type="button"
            className={`cj-importance-btn ${importance === "MINOR" ? "cj-importance-btn--active-minor" : ""}`}
            onClick={() => onAdd("MINOR")}
            title="Nice to have"
          >
            ◇ Optional
          </button>
        </div>
        <button type="button" className="cj-remove-btn" onClick={onRemove} title="Remove skill">✕</button>
      </div>
    ) : (
      <button type="button" className="cj-add-btn" onClick={() => onAdd("MAJOR")}>+ Add</button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// CreateEditJobPage
// ---------------------------------------------------------------------------

const CreateEditJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  const isEdit = !!jobId;
  const jobIdNum = jobId ? Number(jobId) : null;

  const { jobs, createJob, updateJob } = useCompanyJobs();

  // ── Form state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState<string>("");
  const [salaryRange, setSalaryRange] = useState("");
  const [deadline, setDeadline] = useState("");

  // Skills: map from skillId → { importance }
  const [selectedSkills, setSelectedSkills] = useState<Map<number, { skill: SkillOption; importance: ImportanceLevel }>>(new Map());

  // ── Available skills ─────────────────────────────────────────────────────
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillsLoading, setSkillsLoading] = useState(true);

  // ── Submission ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ── Fetch available skills ────────────────────────────────────────────────
  useEffect(() => {
    get<SkillOption[]>("/skills")
      .then((data) => setAllSkills(data.filter((s) => s.isActive)))
      .catch(() => setAllSkills([]))
      .finally(() => setSkillsLoading(false));
  }, []);

  // ── Prefill form when editing ─────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !jobIdNum) return;
    const job = jobs.find((j) => j.id === jobIdNum);
    if (!job) return;

    setTitle(job.title);
    setDescription(job.description ?? "");
    setLocation(job.location ?? "");
    setJobType(job.jobType ?? "");
    setSalaryRange(job.salaryRange ?? "");
    setDeadline(toDateOnly(job.deadline));

    // Pre-populate selected skills
    if (allSkills.length > 0) {
      const map = new Map<number, { skill: SkillOption; importance: ImportanceLevel }>();
      for (const s of job.requiredSkills) {
        const found = allSkills.find((a) => a.id === s.skillId);
        if (found) {
          map.set(s.skillId, { skill: found, importance: s.importance });
        } else {
          // fallback: create a pseudo-skill obj from the response
          map.set(s.skillId, {
            skill: { id: s.skillId, name: s.skillName, isActive: true },
            importance: s.importance,
          });
        }
      }
      setSelectedSkills(map);
    }
  }, [isEdit, jobIdNum, jobs, allSkills]);

  // ── Skill actions ─────────────────────────────────────────────────────────
  const addOrUpdateSkill = useCallback((skill: SkillOption, importance: ImportanceLevel) => {
    setSelectedSkills((prev) => {
      const next = new Map(prev);
      next.set(skill.id, { skill, importance });
      return next;
    });
  }, []);

  const removeSkill = useCallback((skillId: number) => {
    setSelectedSkills((prev) => {
      const next = new Map(prev);
      next.delete(skillId);
      return next;
    });
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Job title is required.";
    if (!deadline) errs.deadline = "Deadline is required.";
    else if (new Date(deadline) < new Date()) errs.deadline = "Deadline must be in the future.";

    const majorCount = Array.from(selectedSkills.values()).filter((s) => s.importance === "MAJOR").length;
    if (majorCount === 0) errs.skills = "At least one Required (MAJOR) skill is needed.";

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const skills: JobSkillRequest[] = Array.from(selectedSkills.values()).map(({ skill, importance }) => ({
      skillId: skill.id,
      importance,
    }));

    const payload: CreateJobPayload = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      jobType: (jobType as any) || null,
      salaryRange: salaryRange.trim() || null,
      deadline: toISOLocal(deadline),
      skills,
    };

    try {
      if (isEdit && jobIdNum) {
        await updateJob(jobIdNum, payload);
        navigate("/company/jobs");
      } else {
        await createJob(payload);
        navigate("/company/jobs");
      }
    } catch (err: unknown) {
      setSubmitError((err as Error).message ?? "Failed to save job. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Filter skills for the search ──────────────────────────────────────────
  const filteredSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
    (s.category ?? "").toLowerCase().includes(skillSearch.toLowerCase())
  );

  const selectedList = Array.from(selectedSkills.values());
  const majorCount = selectedList.filter((s) => s.importance === "MAJOR").length;
  const minorCount = selectedList.filter((s) => s.importance === "MINOR").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <CompanyPageLayout pageTitle={isEdit ? "Edit Job" : "Post New Job"}>

      {/* Header */}
      <div className="cj-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/company/jobs")}>
          ← Back
        </button>
        <div>
          <h1 className="cj-page-title">{isEdit ? "Edit Job Posting" : "Post a New Job"}</h1>
          <p className="cj-page-sub">
            {isEdit
              ? "Update the details of this job posting."
              : "Define the role and required skills. Candidates must hold badges for all Required skills."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="cj-form" noValidate>
        <div className="cj-layout">

          {/* ── Left: Main form ── */}
          <div className="cj-main">

            {/* Title */}
            <div className="cj-section card">
              <div className="card-header">
                <h2 className="cj-section-title">Basic Details</h2>
              </div>
              <div className="card-body cj-fields">

                <div className={`cj-field ${validationErrors.title ? "cj-field--error" : ""}`}>
                  <label className="cj-label">
                    Job Title <span className="cj-required">*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setValidationErrors((p) => ({ ...p, title: "" })); }}
                    maxLength={120}
                  />
                  {validationErrors.title && <span className="cj-field-err">{validationErrors.title}</span>}
                </div>

                <div className="cj-field">
                  <label className="cj-label">Description</label>
                  <textarea
                    className="input cj-textarea"
                    placeholder={"Describe the role, responsibilities, and what makes it exciting.\n\nTip: Use **Bold Heading** for sections and - bullet points for lists."}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    maxLength={4000}
                  />
                  <span className="cj-char-count">{description.length}/4000</span>
                </div>

                {/* Row: Location + Job Type */}
                <div className="cj-row-2">
                  <div className="cj-field">
                    <label className="cj-label">Location</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Beirut, Lebanon"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div className="cj-field">
                    <label className="cj-label">Job Type</label>
                    <div className="cj-type-grid">
                      {JOB_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`cj-type-btn ${jobType === opt.value ? "cj-type-btn--active" : ""}`}
                          onClick={() => setJobType(jobType === opt.value ? "" : opt.value)}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row: Salary + Deadline */}
                <div className="cj-row-2">
                  <div className="cj-field">
                    <label className="cj-label">Salary Range</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. $60k–$80k / year"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                    />
                  </div>

                  <div className={`cj-field ${validationErrors.deadline ? "cj-field--error" : ""}`}>
                    <label className="cj-label">
                      Application Deadline <span className="cj-required">*</span>
                    </label>
                    <input
                      className="input"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={deadline}
                      onChange={(e) => { setDeadline(e.target.value); setValidationErrors((p) => ({ ...p, deadline: "" })); }}
                    />
                    {validationErrors.deadline && <span className="cj-field-err">{validationErrors.deadline}</span>}
                  </div>
                </div>

              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="cj-error">
                <span>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="cj-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate("/company/jobs")}>
                Cancel
              </button>
              <button type="submit" className="btn btn-xp" disabled={isSubmitting}>
                {isSubmitting
                  ? (isEdit ? "Saving…" : "Posting…")
                  : (isEdit ? "💾 Save Changes" : "🚀 Post Job")}
              </button>
            </div>
          </div>

          {/* ── Right: Skills panel ── */}
          <aside className="cj-sidebar">

            {/* Selected skills summary */}
            <div className="card cj-skills-summary">
              <div className="card-header">
                <h2 className="cj-section-title">Required Skills</h2>
                <div className="cj-skills-counts">
                  {majorCount > 0 && (
                    <span className="badge badge-premium">★ {majorCount} Required</span>
                  )}
                  {minorCount > 0 && (
                    <span className="badge badge-muted">◇ {minorCount} Optional</span>
                  )}
                </div>
              </div>
              <div className="card-body">
                {validationErrors.skills && (
                  <div className="cj-skills-err">{validationErrors.skills}</div>
                )}
                <p className="cj-skills-hint">
                  <strong>Required (★)</strong> — candidates must hold a badge.<br />
                  <strong>Optional (◇)</strong> — boosts their match score.
                </p>

                {/* Selected skills list */}
                {selectedList.length > 0 && (
                  <div className="cj-selected-skills">
                    {selectedList.map(({ skill, importance }) => (
                      <div key={skill.id} className="cj-selected-chip">
                        <span className={`cj-selected-chip__imp ${importance === "MAJOR" ? "cj-imp--major" : "cj-imp--minor"}`}>
                          {importance === "MAJOR" ? "★" : "◇"}
                        </span>
                        <span className="cj-selected-chip__name">{skill.name}</span>
                        <button
                          type="button"
                          className="cj-selected-chip__toggle"
                          onClick={() => addOrUpdateSkill(skill, importance === "MAJOR" ? "MINOR" : "MAJOR")}
                          title={importance === "MAJOR" ? "Switch to Optional" : "Switch to Required"}
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          className="cj-selected-chip__remove"
                          onClick={() => removeSkill(skill.id)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedList.length === 0 && (
                  <div className="cj-skills-empty">
                    <span>No skills added yet.</span>
                    <span>Search below and add skills for this role.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Skill search + picker */}
            <div className="card cj-skill-picker">
              <div className="card-header">
                <h3 className="cj-section-title">Add Skills</h3>
              </div>
              <div className="card-body cj-skill-picker__body">
                <div className="cj-skill-search-wrap">
                  <span className="cj-skill-search-icon">🔍</span>
                  <input
                    className="input cj-skill-search"
                    type="text"
                    placeholder="Search skills…"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                  />
                  {skillSearch && (
                    <button type="button" className="cj-skill-search-clear" onClick={() => setSkillSearch("")}>✕</button>
                  )}
                </div>

                <div className="cj-skill-list">
                  {skillsLoading ? (
                    <div className="cj-skill-loading">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
                      ))}
                    </div>
                  ) : filteredSkills.length === 0 ? (
                    <div className="cj-skill-none">No skills match "{skillSearch}"</div>
                  ) : (
                    filteredSkills.map((skill) => {
                      const added = selectedSkills.get(skill.id);
                      return (
                        <SkillRow
                          key={skill.id}
                          skill={skill}
                          importance={added?.importance ?? null}
                          isAdded={!!added}
                          onAdd={(imp) => addOrUpdateSkill(skill, imp)}
                          onRemove={() => removeSkill(skill.id)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </form>

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  .cj-header { margin-bottom: var(--space-6); }
  .cj-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: var(--space-2) 0 0; }
  .cj-page-sub { color: var(--color-text-muted); font-size: var(--text-sm); margin-top: 4px; max-width: 560px; line-height: 1.6; }

  /* Layout */
  .cj-layout { display: grid; grid-template-columns: 1fr 340px; gap: var(--space-6); align-items: start; }
  .cj-main { display: flex; flex-direction: column; gap: var(--space-5); }
  .cj-sidebar { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: calc(var(--layout-navbar-height, 64px) + var(--space-6)); }

  /* Sections */
  .cj-section-title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-primary); margin: 0; }
  .card-header { display: flex; align-items: center; justify-content: space-between; }
  .cj-skills-counts { display: flex; gap: var(--space-2); flex-wrap: wrap; }

  /* Fields */
  .cj-fields { display: flex; flex-direction: column; gap: var(--space-5); }
  .cj-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
  .cj-field { display: flex; flex-direction: column; gap: var(--space-2); }
  .cj-field--error .input { border-color: var(--color-danger) !important; }
  .cj-label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-secondary); }
  .cj-required { color: var(--color-danger); }
  .cj-field-err { font-size: var(--text-xs); color: var(--color-danger); }
  .cj-textarea { resize: vertical; min-height: 160px; font-family: var(--font-body); line-height: 1.7; }
  .cj-char-count { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); text-align: right; margin-top: -4px; }

  /* Job type buttons */
  .cj-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
  .cj-type-btn { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); border: 1px solid var(--color-border-default); background: var(--color-bg-elevated); font-size: var(--text-sm); color: var(--color-text-muted); cursor: pointer; transition: all 130ms ease; text-align: left; }
  .cj-type-btn:hover { border-color: var(--color-border-strong); color: var(--color-text-secondary); }
  .cj-type-btn--active { border-color: var(--color-primary-500, #7C3AED); background: var(--color-primary-glow, rgba(124,58,237,0.08)); color: var(--color-primary-400, #A78BFA); }

  /* Submit error */
  .cj-error { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4); background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-lg); font-size: var(--text-sm); color: var(--color-text-secondary); }

  /* Actions */
  .cj-actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); padding-top: var(--space-2); }

  /* ── Skills panel ── */
  .cj-skills-hint { font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.7; margin-bottom: var(--space-4); }
  .cj-skills-err { font-size: var(--text-xs); color: var(--color-danger); background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); margin-bottom: var(--space-3); }
  .cj-skills-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--space-6) 0; font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; }

  /* Selected chips */
  .cj-selected-skills { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
  .cj-selected-chip { display: flex; align-items: center; gap: var(--space-2); padding: 6px var(--space-3); background: var(--color-bg-overlay); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); }
  .cj-selected-chip__imp { font-size: var(--text-sm); width: 16px; flex-shrink: 0; }
  .cj-imp--major { color: var(--color-premium, #8B5CF6); }
  .cj-imp--minor { color: var(--color-text-muted); }
  .cj-selected-chip__name { flex: 1; font-size: var(--text-sm); color: var(--color-text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cj-selected-chip__toggle { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: var(--text-xs); padding: 2px 4px; border-radius: var(--radius-sm); transition: all 100ms; }
  .cj-selected-chip__toggle:hover { background: var(--color-bg-hover); color: var(--color-text-secondary); }
  .cj-selected-chip__remove { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 10px; padding: 2px 4px; border-radius: var(--radius-sm); transition: all 100ms; }
  .cj-selected-chip__remove:hover { background: var(--color-danger-bg); color: var(--color-danger); }

  /* Skill picker */
  .cj-skill-picker__body { display: flex; flex-direction: column; gap: var(--space-3); }
  .cj-skill-search-wrap { position: relative; }
  .cj-skill-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 13px; }
  .cj-skill-search { padding-left: 2.2rem !important; padding-right: 2rem !important; }
  .cj-skill-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: var(--text-xs); padding: 2px; }

  .cj-skill-list { display: flex; flex-direction: column; gap: var(--space-1); max-height: 320px; overflow-y: auto; padding-right: 2px; }
  .cj-skill-list::-webkit-scrollbar { width: 4px; }
  .cj-skill-list::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 2px; }
  .cj-skill-loading { display: flex; flex-direction: column; gap: var(--space-2); }
  .cj-skill-none { font-size: var(--text-sm); color: var(--color-text-muted); padding: var(--space-4) 0; text-align: center; }

  .cj-skill-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); border: 1px solid transparent; transition: all 120ms ease; }
  .cj-skill-row:hover { background: var(--color-bg-hover); }
  .cj-skill-row--added { background: var(--color-premium-bg, rgba(139,92,246,0.06)); border-color: var(--color-premium-border, rgba(139,92,246,0.2)); }
  .cj-skill-row__info { flex: 1; min-width: 0; }
  .cj-skill-row__name { display: block; font-size: var(--text-sm); color: var(--color-text-primary); font-weight: var(--weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cj-skill-row__cat { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); }
  .cj-skill-row__actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
  .cj-add-btn { font-size: var(--text-xs); padding: 3px 10px; border-radius: var(--radius-full); border: 1px solid var(--color-border-default); background: transparent; color: var(--color-text-muted); cursor: pointer; transition: all 100ms; white-space: nowrap; }
  .cj-add-btn:hover { border-color: var(--color-primary-500); color: var(--color-primary-400); background: var(--color-primary-glow); }
  .cj-remove-btn { font-size: 10px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); border: none; background: none; cursor: pointer; color: var(--color-text-muted); transition: all 100ms; flex-shrink: 0; }
  .cj-remove-btn:hover { background: var(--color-danger-bg); color: var(--color-danger); }

  .cj-importance-toggle { display: flex; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--color-border-default); }
  .cj-importance-btn { font-size: 10px; padding: 3px 8px; border: none; background: transparent; cursor: pointer; color: var(--color-text-muted); transition: all 100ms; white-space: nowrap; }
  .cj-importance-btn--active-major { background: var(--color-premium-bg, rgba(139,92,246,0.12)); color: var(--color-premium, #8B5CF6); }
  .cj-importance-btn--active-minor { background: var(--color-bg-hover); color: var(--color-text-secondary); }

  /* Badge extras */
  .badge-premium { background: var(--color-premium-bg, rgba(139,92,246,.1)); border-color: var(--color-premium-border, rgba(139,92,246,.28)); color: var(--color-premium, #8B5CF6); }

  /* Responsive */
  @media (max-width: 900px) {
    .cj-layout { grid-template-columns: 1fr; }
    .cj-sidebar { position: static; }
  }
  @media (max-width: 640px) {
    .cj-row-2 { grid-template-columns: 1fr; }
    .cj-type-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default CreateEditJobPage;