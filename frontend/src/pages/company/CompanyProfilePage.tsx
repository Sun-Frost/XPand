import React, { useState } from "react";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { Icon } from "../../components/ui/Icon";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";
import { useCompanyProfile } from "../../hooks/company/useCompany";
import type { UpdateCompanyProfilePayload } from "../../hooks/company/useCompany";
import { CITIES } from "../../constants/cities";
import Modal from "../../components/ui/Modal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDateTime = (d: string): string =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

const EditModal: React.FC<{
  initial: UpdateCompanyProfilePayload;
  isSaving: boolean;
  saveError: string | null;
  onSave: (p: UpdateCompanyProfilePayload) => Promise<boolean>;
  onClose: () => void;
}> = ({ initial, isSaving, saveError, onSave, onClose }) => {
  const [form, setForm] = useState<UpdateCompanyProfilePayload>(initial);
  const s = (k: keyof UpdateCompanyProfilePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value || null }));

  return (
    <Modal onClose={onClose}>
      <div className="modal cp-modal">
        <div className="modal-header">
          <h3 className="cp-modal-title">Edit Company Profile</h3>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}><Icon name="close" size={14} label="Close" /></button>
        </div>
        <div className="modal-body cp-modal-grid">
          <div className="input-group cp-full">
            <label className="input-label">Company Name</label>
            <input className="input" value={form.companyName ?? ""} onChange={s("companyName")} />
          </div>
          <div className="input-group">
            <label className="input-label">Industry</label>
            <input className="input" placeholder="e.g. Technology, Finance…" value={form.industry ?? ""} onChange={s("industry")} />
          </div>
          <div className="input-group">
            <label className="input-label">Location</label>
            <select
              className="input"
              value={form.location ?? ""}
              onChange={(e) => setForm(p => ({ ...p, location: e.target.value || null }))}
            >
              <option value="">Select a city…</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Website URL</label>
            <input className="input" placeholder="https://…" value={form.websiteUrl ?? ""} onChange={s("websiteUrl")} />
          </div>
          <div className="input-group cp-full">
            <label className="input-label">Description</label>
            <textarea className="input cp-textarea" rows={5}
              placeholder="Tell candidates about your company, culture, and mission…"
              value={form.description ?? ""} onChange={s("description")} />
          </div>
          {saveError && <p className="cp-modal-err cp-full">{saveError}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => { if (await onSave(form)) onClose(); }} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Info row
// ---------------------------------------------------------------------------

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="cp-info-row">
      <span className="cp-info-label">{label}</span>
      <span className="cp-info-value">{value}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CompanyProfilePage
// ---------------------------------------------------------------------------

const CompanyProfilePage: React.FC = () => {
  const { profile, isLoading, isSaving, error, saveError, saveSuccess, updateProfile, clearSaveStatus } = useCompanyProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading || !profile) {
    return (
      <CompanyPageLayout pageTitle="Company Profile">
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        <div className="skeleton mt-6" style={{ height: 200, borderRadius: 16 }} />
      </CompanyPageLayout>
    );
  }

  if (error) {
    return (
      <CompanyPageLayout pageTitle="Company Profile">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Failed to load profile</h3><p>{error}</p>
        </div>
      </CompanyPageLayout>
    );
  }

  const initials = profile.companyName.slice(0, 2).toUpperCase();

  return (
    <CompanyPageLayout pageTitle="Company Profile">

      <PageHeader
        {...PAGE_CONFIGS["company-profile"]}
        right={
          <span className={`badge ${profile.isApproved ? "badge-verified" : "badge-warning"}`}>
            {profile.isApproved
              ? <><Icon name="check" size={14} label="" /> Approved</>
              : <><Icon name="pending" size={14} label="" /> Pending Approval</>}
          </span>
        }
      />

      {saveSuccess && <div className="cp-toast"><Icon name="success" size={14} label="" /> Profile updated</div>}

      {/* ── Hero ── */}
      <div className="cp-hero card">
        <div className="cp-hero__bg" aria-hidden="true" />

        <div className="cp-hero__inner">
          {/* Logo */}
          <div className="cp-logo">{initials}</div>

          {/* Identity */}
          <div className="cp-hero__id">
            <div className="cp-hero__status-row">
              <span className={`badge ${profile.isApproved ? "badge-verified" : "badge-warning"}`}>
                {profile.isApproved ? <><Icon name="check" size={14} label="" /> Approved</> : <><Icon name="pending" size={14} label="" /> Pending Approval</>}
              </span>
              {profile.industry && <span className="badge badge-muted">{profile.industry}</span>}
            </div>
            <h1 className="cp-hero__name">{profile.companyName}</h1>
            <p className="cp-hero__email">{profile.email}</p>
            {profile.location && <p className="cp-hero__loc"><Icon name="location" size={12} label="" /> {profile.location}</p>}
            {profile.websiteUrl && (
              <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="cp-website-link">
                <Icon name="portfolio" size={14} label="" /> {profile.websiteUrl}
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="cp-hero__actions">
            <button className="btn btn-ghost" onClick={() => setEditing(true)}><Icon name="edit" size={14} label="" /> Edit Profile</button>
          </div>
        </div>

        {/* Strip */}
        <div className="cp-hero__strip">
          <span className="cp-si"><span className="cp-sl">COMPANY ID</span><span className="cp-sv font-mono">#{profile.id}</span></span>
          <span className="cp-ssep">·</span>
          <span className="cp-si"><span className="cp-sl">MEMBER SINCE</span><span className="cp-sv">{fmtDateTime(profile.createdAt)}</span></span>
          <span className="cp-ssep">·</span>
          <span className="cp-si">
            <span className="cp-sl">STATUS</span>
            <span className="cp-sv" style={{ color: profile.isApproved ? "var(--color-verified)" : "var(--color-warning)" }}>
              {profile.isApproved ? "Approved" : "Pending"}
            </span>
          </span>
        </div>
      </div>

      {/* ── Details ── */}
      <div className="cp-grid mt-6">

        {/* About */}
        <div className="cp-card">
          <div className="cp-card__head">
            <Icon name="about" size={16} label="" />
            <h2 className="cp-card__title">About</h2>
          </div>
          <div className="cp-card__body">
            {profile.description ? (
              <p className="cp-about-text">{profile.description}</p>
            ) : (
              <button className="cp-empty-cta" onClick={() => setEditing(true)}>
                + Add company description
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="cp-card">
          <div className="cp-card__head">
            <Icon name="clipboard" size={16} label="" />
            <h2 className="cp-card__title">Details</h2>
          </div>
          <div className="cp-card__body">
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Industry" value={profile.industry} />
            <InfoRow label="Location" value={profile.location} />
            <InfoRow label="Website" value={profile.websiteUrl} />
            {!profile.industry && !profile.location && !profile.websiteUrl && (
              <button className="cp-empty-cta" onClick={() => setEditing(true)}>
                + Add company details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Approval notice */}
      {!profile.isApproved && (
        <div className="cp-approval-notice mt-6">
          <span>⏳</span>
          <div>
            <strong>Your company is pending approval</strong>
            <p>An admin will review your registration. You can prepare job postings in the meantime, but they will only be visible to candidates once your account is approved.</p>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          initial={{
            companyName: profile.companyName,
            description: profile.description,
            websiteUrl: profile.websiteUrl,
            industry: profile.industry,
            location: profile.location,
          }}
          isSaving={isSaving}
          saveError={saveError}
          onSave={updateProfile}
          onClose={() => { setEditing(false); clearSaveStatus(); }}
        />
      )}

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* Hero */
  .cp-hero { position: relative; overflow: hidden; border-radius: var(--radius-2xl); margin-bottom: 0; }
  .cp-hero__bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(139,92,246,.08), rgba(34,211,153,.04)); pointer-events: none; }
  .cp-hero__inner { position: relative; z-index: 1; display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-8); padding: var(--space-8); align-items: start; }
  .cp-logo { width: 80px; height: 80px; border-radius: var(--radius-xl); background: linear-gradient(135deg, var(--color-premium,#8B5CF6), var(--color-verified,#34D399)); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: #fff; flex-shrink: 0; box-shadow: 0 4px 20px rgba(139,92,246,.3); }
  .cp-hero__id {}
  .cp-hero__status-row { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); flex-wrap: wrap; }
  .cp-hero__name { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0 0 var(--space-1); }
  .cp-hero__email { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-2); }
  .cp-hero__loc { font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-2); }
  .cp-website-link { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-premium,#8B5CF6); display: inline-flex; align-items: center; gap: 4px; }
  .cp-website-link:hover { text-decoration: underline; }
  .cp-hero__actions { display: flex; flex-direction: column; gap: var(--space-3); }
  .cp-hero__strip { position: relative; z-index: 1; display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3) var(--space-8); border-top: 1px solid var(--color-border-subtle); background: var(--color-bg-elevated); flex-wrap: wrap; }
  .cp-si { display: flex; align-items: center; gap: var(--space-2); }
  .cp-sl { font-family: var(--font-mono); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--color-text-muted); }
  .cp-sv { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
  .cp-ssep { color: var(--color-border-default); }
  /* Grid */
  .cp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
  .cp-card { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); overflow: hidden; }
  .cp-card__head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border-subtle); background: var(--color-bg-elevated); font-size: 1.1rem; }
  .cp-card__title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .cp-card__body { padding: var(--space-5) var(--space-6); }
  .cp-about-text { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.7; margin: 0; }
  .cp-empty-cta { background: none; border: 1px dashed var(--color-border-default); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); font-size: var(--text-sm); color: var(--color-text-muted); cursor: pointer; width: 100%; text-align: left; transition: all 150ms ease; }
  .cp-empty-cta:hover { border-color: var(--color-premium,#8B5CF6); color: var(--color-premium,#8B5CF6); }
  /* Info rows */
  .cp-info-row { display: flex; align-items: flex-start; gap: var(--space-4); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-subtle); }
  .cp-info-row:last-child { border-bottom: none; }
  .cp-info-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-muted); min-width: 80px; flex-shrink: 0; padding-top: 2px; }
  .cp-info-value { font-size: var(--text-sm); color: var(--color-text-primary); word-break: break-all; }
  /* Approval notice */
  .cp-approval-notice { display: flex; align-items: flex-start; gap: var(--space-4); padding: var(--space-5); background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25); border-radius: var(--radius-xl); font-size: var(--text-sm); color: var(--color-text-secondary); }
  .cp-approval-notice strong { display: block; color: var(--color-warning,#F59E0B); margin-bottom: var(--space-1); }
  .cp-approval-notice p { margin: 0; }
  /* Modal */
  .cp-modal { max-width: 560px; }
  .cp-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .cp-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
  .cp-full { grid-column: 1 / -1; }
  .cp-textarea { resize: vertical; font-family: var(--font-body); min-height: 100px; }
  .cp-modal-err { color: var(--color-danger); font-size: var(--text-sm); }
  /* Toast */
  .cp-toast { position: fixed; bottom: calc(72px + 16px); right: var(--space-6); background: rgba(52,211,153,.1); border: 1px solid rgba(52,211,153,.3); border-left: 3px solid var(--color-verified,#34D399); border-radius: 10px; padding: var(--space-3) var(--space-5); font-size: var(--text-sm); color: var(--color-verified,#34D399); z-index: var(--z-toast); animation: fadeIn .3s ease; backdrop-filter: blur(12px); }
  /* Badge extras */
  .badge-warning { background: var(--color-warning-bg); border-color: var(--color-warning-border); color: var(--color-warning); }
  /* Responsive */
  @media(max-width:900px){ .cp-hero__inner { grid-template-columns: auto 1fr; } .cp-grid { grid-template-columns: 1fr; } }
  @media(max-width:640px){ .cp-hero__inner { grid-template-columns: 1fr; padding: var(--space-5); } .cp-modal-grid { grid-template-columns: 1fr; } .cp-hero__strip { padding: var(--space-3) var(--space-4); } }
`;

export default CompanyProfilePage;