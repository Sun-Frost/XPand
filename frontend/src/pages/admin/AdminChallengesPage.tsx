/* ============================================================
   AdminChallengesPage.tsx
   Create, update, and delete XP-earning challenges.
   Route: /admin/challenges
   Endpoints: GET/POST/PUT/DELETE /admin/challenges
   ============================================================ */

import { useEffect, useState, useCallback } from "react";
import AdminPageLayout from "../../components/admin/adminPageLayout";
import {
  adminGetAllChallenges,
  adminCreateChallenge,
  adminUpdateChallenge,
  adminDeleteChallenge,
  type ChallengeResponse,
  type CreateChallengePayload,
  type ChallengeType,
} from "../../api/Adminapi";

// Must match the ChallengeType enum in the backend exactly
const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: "COMPLETE_PROFILE",    label: "Complete Profile" },
  { value: "ADD_PROJECT",         label: "Add Project" },
  { value: "ADD_CERTIFICATION",   label: "Add Certification" },
  { value: "VERIFY_SKILL",        label: "Verify Skill" },
  { value: "EARN_BADGE",          label: "Earn Badge" },
  { value: "EARN_GOLD_BADGE",     label: "Earn Gold Badge" },
  { value: "MULTI_SKILL_PROGRESS",label: "Multi Skill Progress" },
  { value: "DAILY_LOGIN",         label: "Daily Login" },
  { value: "WEEKLY_ACTIVITY",     label: "Weekly Activity" },
  { value: "STREAK_DAYS",         label: "Streak Days" },
  { value: "APPLY_JOB",          label: "Apply to Job" },
  { value: "APPLY_WITH_GOLD",    label: "Apply with Gold Badge" },
  { value: "GET_ACCEPTED",       label: "Get Accepted" },
  { value: "USE_XP_STORE",       label: "Use XP Store" },
  { value: "SPEND_XP",           label: "Spend XP" },
  { value: "REACH_XP",           label: "Reach XP" },
  { value: "COMPLETE_CHALLENGE", label: "Complete Challenges" },
];

const emptyForm = (): CreateChallengePayload => ({
  title:          "",
  description:    "",
  type:           "VERIFY_SKILL",   // was challengeType
  conditionValue: 1,                // was targetValue
  xpReward:       50,
  isActive:       true,
  isRepeatable:   false,
  startDate:      undefined,
  endDate:        undefined,
});

const AdminChallengesPage = () => {
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<ChallengeResponse | null>(null);
  const [form,       setForm]       = useState<CreateChallengePayload>(emptyForm());
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<ChallengeResponse | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [search,     setSearch]     = useState("");

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllChallenges()
      .then(setChallenges)
      .catch(() => showToast("Failed to load challenges", false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (c: ChallengeResponse) => {
    setEditing(c);
    setForm({
      title:          c.title,
      description:    c.description,
      type:           c.type,            // was c.challengeType
      conditionValue: c.conditionValue,  // was c.targetValue
      xpReward:       c.xpReward,
      isActive:       c.isActive,
      isRepeatable:   c.isRepeatable,
      startDate:      c.startDate,
      endDate:        c.endDate,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showToast("Title and description are required.", false);
      return;
    }
    if (!form.conditionValue || form.conditionValue < 1) {
      showToast("Condition value must be at least 1.", false);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateChallenge(editing.id, form);
        showToast("Challenge updated.");
      } else {
        await adminCreateChallenge(form);
        showToast("Challenge created.");
      }
      setShowForm(false);
      load();
    } catch { showToast("Save failed.", false); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await adminDeleteChallenge(deleting.id);
      showToast("Challenge deleted.");
      setDeleting(null);
      load();
    } catch { showToast("Delete failed.", false); }
    finally { setSaving(false); }
  };

  const filtered = challenges.filter(c =>
    `${c.title} ${c.type} ${c.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel = (type: ChallengeType) =>
    CHALLENGE_TYPES.find(t => t.value === type)?.label ?? type.replace(/_/g, " ");

  return (
    <AdminPageLayout pageTitle="Manage Challenges">
      <div className="admin-page">

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title"><span className="admin-title-icon">⭐</span>Manage Challenges</h1>
            <p className="admin-page-subtitle">{challenges.length} XP-earning challenges</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + New Challenge
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search-wrap" style={{ maxWidth: 360 }}>
            <span className="admin-search-icon">🔍</span>
            <input
              className="admin-search-input"
              placeholder="Search challenges…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><span>Loading…</span></div>
        ) : (
          <div className="challenge-grid">
            {filtered.length === 0 ? (
              <div className="admin-empty-state" style={{ gridColumn: "1/-1" }}>
                <span>⭐</span><p>No challenges found</p>
              </div>
            ) : filtered.map(c => (
              <div key={c.id} className={`challenge-card ${!c.isActive ? "challenge-card--inactive" : ""}`}>
                <div className="challenge-card-header">
                  <div className="challenge-type-badge">{typeLabel(c.type)}</div>
                  {c.isRepeatable && <div className="challenge-repeatable-badge">↻ Repeatable</div>}
                  {!c.isActive && <div className="challenge-inactive-badge">Inactive</div>}
                </div>
                <h3 className="challenge-title">{c.title}</h3>
                <p className="challenge-desc">{c.description}</p>
                <div className="challenge-meta-row">
                  <div className="challenge-meta-item">
                    <span className="challenge-meta-label">Condition</span>
                    <span className="challenge-meta-value">{c.conditionValue}</span>
                  </div>
                  <div className="challenge-meta-item">
                    <span className="challenge-meta-label">XP Reward</span>
                    <span className="challenge-xp">⚡ {c.xpReward}</span>
                  </div>
                  {c.endDate && (
                    <div className="challenge-meta-item">
                      <span className="challenge-meta-label">Ends</span>
                      <span className="challenge-meta-value">{new Date(c.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="challenge-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏ Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setDeleting(c)}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">{editing ? "Edit Challenge" : "New Challenge"}</h3>

            <div className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Title *</label>
                <input className="admin-form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Challenge title" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Description *</label>
                <textarea className="admin-form-input admin-form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does the user need to do?" rows={3} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Challenge Type</label>
                  <select
                    className="admin-form-input admin-form-select"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as ChallengeType }))}
                  >
                    {CHALLENGE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Condition Value</label>
                  <input
                    className="admin-form-input"
                    type="number"
                    min={1}
                    value={form.conditionValue}
                    onChange={e => setForm(f => ({ ...f, conditionValue: +e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">XP Reward</label>
                  <input className="admin-form-input" type="number" min={1} value={form.xpReward} onChange={e => setForm(f => ({ ...f, xpReward: +e.target.value }))} />
                </div>
                <div className="admin-form-group admin-form-group--center">
                  <label className="admin-checkbox-label">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                    <span>Active</span>
                  </label>
                  <label className="admin-checkbox-label">
                    <input type="checkbox" checked={form.isRepeatable} onChange={e => setForm(f => ({ ...f, isRepeatable: e.target.checked }))} />
                    <span>Repeatable</span>
                  </label>
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Start Date (optional)</label>
                  <input
                    className="admin-form-input"
                    type="datetime-local"
                    value={form.startDate ? form.startDate.slice(0, 16) : ""}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value ? e.target.value + ":00" : undefined }))}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">End Date (optional)</label>
                  <input
                    className="admin-form-input"
                    type="datetime-local"
                    value={form.endDate ? form.endDate.slice(0, 16) : ""}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value ? e.target.value + ":00" : undefined }))}
                  />
                </div>
              </div>
            </div>

            <div className="admin-modal-actions" style={{ marginTop: "var(--space-6)" }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Challenge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="admin-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-icon">🗑</div>
            <h3 className="admin-modal-title">Delete Challenge?</h3>
            <p className="admin-modal-body">Permanently delete "{deleting.title}"? This cannot be undone.</p>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleting(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-danger-solid" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast ${toast.ok ? "admin-toast--ok" : "admin-toast--err"}`}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <style>{pageStyles}</style>
    </AdminPageLayout>
  );
};

const pageStyles = `
  .admin-page { padding: var(--space-8); max-width: 1200px; margin:0 auto; }
  .admin-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: var(--space-5); }
  .admin-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-1) 0; display:flex; align-items:center; gap: var(--space-3); }
  .admin-title-icon { color: var(--color-danger); }
  .admin-page-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); margin:0; }

  .admin-toolbar { margin-bottom: var(--space-5); }
  .admin-search-wrap { position:relative; }
  .admin-search-icon { position:absolute; left: var(--space-3); top:50%; transform:translateY(-50%); font-size:14px; }
  .admin-search-input { width:100%; background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; transition: border-color var(--duration-fast); box-sizing:border-box; }
  .admin-search-input:focus { border-color: var(--color-border-focus); }

  .challenge-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-5); }
  .challenge-card { background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-xl); padding: var(--space-5); display:flex; flex-direction:column; gap: var(--space-3); transition: border-color var(--duration-base), transform var(--duration-fast); }
  .challenge-card:hover { border-color: var(--color-border-strong); transform: translateY(-2px); }
  .challenge-card--inactive { opacity: 0.55; }
  .challenge-card-header { display:flex; gap: var(--space-2); flex-wrap:wrap; }
  .challenge-type-badge { font-family: var(--font-mono); font-size: 9px; letter-spacing:0.08em; text-transform:uppercase; color: var(--color-primary-400); background: var(--color-primary-glow); border:1px solid rgba(167,139,250,0.2); border-radius: var(--radius-full); padding: 2px 8px; }
  .challenge-repeatable-badge { font-size: 9px; letter-spacing:0.06em; color: var(--color-cyan-400); background: var(--color-cyan-glow); border:1px solid rgba(34,211,238,0.2); border-radius: var(--radius-full); padding: 2px 8px; }
  .challenge-inactive-badge { font-size: 9px; letter-spacing:0.06em; color: var(--color-text-muted); background: var(--color-bg-base); border:1px solid var(--color-border-default); border-radius: var(--radius-full); padding: 2px 8px; }
  .challenge-title { font-family: var(--font-display); font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--color-text-primary); margin:0; }
  .challenge-desc { font-size: var(--text-sm); color: var(--color-text-muted); margin:0; flex:1; line-height:1.5; }
  .challenge-meta-row { display:flex; gap: var(--space-4); flex-wrap:wrap; }
  .challenge-meta-item { display:flex; flex-direction:column; gap:2px; }
  .challenge-meta-label { font-size: 10px; text-transform:uppercase; letter-spacing:0.08em; color: var(--color-text-muted); font-family: var(--font-mono); }
  .challenge-meta-value { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-primary); }
  .challenge-xp { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-xp-gold); }
  .challenge-actions { display:flex; gap: var(--space-2); border-top:1px solid var(--color-border-subtle); padding-top: var(--space-3); margin-top: auto; }

  .btn-sm { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-md); cursor:pointer; transition: all var(--duration-fast); font-family: var(--font-body); }
  .btn-danger { background: var(--color-danger-bg); border:1px solid var(--color-danger-border); color: var(--color-danger); }
  .btn-danger:hover { background: rgba(248,113,113,0.2); }
  .btn-danger-solid { background: var(--color-danger); color:#fff; border:none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor:pointer; font-weight: var(--weight-semibold); }

  .admin-form { display:flex; flex-direction:column; gap: var(--space-4); text-align:left; }
  .admin-form-row { display:grid; grid-template-columns:1fr 1fr; gap: var(--space-4); }
  .admin-form-group { display:flex; flex-direction:column; gap: var(--space-2); }
  .admin-form-group--center { justify-content:center; gap: var(--space-3); }
  .admin-form-label { font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing:0.06em; text-transform:uppercase; color: var(--color-text-muted); }
  .admin-form-input { background: var(--color-bg-base); border:1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; font-family: var(--font-body); transition: border-color var(--duration-fast); }
  .admin-form-input:focus { border-color: var(--color-border-focus); }
  .admin-form-textarea { resize:vertical; }
  .admin-form-select { cursor:pointer; }
  .admin-checkbox-label { display:flex; align-items:center; gap: var(--space-2); cursor:pointer; font-size: var(--text-sm); color: var(--color-text-secondary); }

  .admin-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding: var(--space-4); }
  .admin-modal { background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-2xl); padding: var(--space-8); width:100%; max-width:380px; text-align:center; animation: fadeIn 0.2s ease; }
  .admin-modal--wide { max-width:620px; }
  .admin-modal-icon { font-size:40px; margin-bottom: var(--space-4); }
  .admin-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-4) 0; }
  .admin-modal-body { font-size: var(--text-sm); color: var(--color-text-secondary); margin:0 0 var(--space-6) 0; }
  .admin-modal-actions { display:flex; gap: var(--space-3); justify-content:flex-end; }

  .admin-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-4); padding: var(--space-16); color: var(--color-text-muted); }
  .admin-spinner { width:32px; height:32px; border:2px solid var(--color-border-default); border-top-color: var(--color-primary-400); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .admin-empty-state { display:flex; flex-direction:column; align-items:center; gap: var(--space-2); padding: var(--space-8); color: var(--color-text-muted); font-size: var(--text-sm); }

  .admin-toast { position:fixed; bottom: var(--space-24); left:50%; transform:translateX(-50%); background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-full); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); color: var(--color-text-primary); z-index:2000; box-shadow: var(--shadow-lg); animation: fadeIn 0.2s ease; white-space:nowrap; }
  .admin-toast--ok { border-color: var(--color-success-border); }
  .admin-toast--err { border-color: var(--color-danger-border); }

  @media(max-width:768px) { .admin-page { padding: var(--space-4); } .admin-form-row { grid-template-columns:1fr; } }
`;

export default AdminChallengesPage;