/* ============================================================
   AdminSkillsPage.tsx
   Create, update, activate/deactivate skills and questions.
   Route: /admin/skills
   Endpoints: GET/POST/PUT /admin/skills
              PATCH /admin/skills/{id}/activate|deactivate
              POST /admin/questions  DELETE /admin/questions/{id}
   ============================================================ */

import { useEffect, useState, useCallback } from "react";
import AdminPageLayout from "../../components/admin/adminPageLayout";
import {
  adminGetAllSkills,
  adminCreateSkill,
  adminUpdateSkill,
  adminActivateSkill,
  adminDeactivateSkill,
  adminCreateQuestion,
  adminDeleteQuestion,
  type SkillResponse,
  type CreateSkillPayload,
  type CreateQuestionPayload,
} from "../../api/Adminapi";

const DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"];
const CORRECT_ANSWERS   = ["A", "B", "C", "D"];

const emptySkillForm = (): CreateSkillPayload => ({ name: "", category: "" });

const emptyQuestionForm = (skillId = 0): CreateQuestionPayload => ({
  skillId,
  difficultyLevel: "MEDIUM",
  questionText:    "",
  optionA:         "",
  optionB:         "",
  optionC:         "",
  optionD:         "",
  correctAnswer:   "A",
  points:          10,
});

const AdminSkillsPage = () => {
  const [skills,        setSkills]        = useState<SkillResponse[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill,  setEditingSkill]  = useState<SkillResponse | null>(null);
  const [skillForm,     setSkillForm]     = useState<CreateSkillPayload>(emptySkillForm());
  const [showQForm,     setShowQForm]     = useState(false);
  const [qSkill,        setQSkill]        = useState<SkillResponse | null>(null);
  const [qForm,         setQForm]         = useState<CreateQuestionPayload>(emptyQuestionForm());
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeFilter,  setActiveFilter]  = useState<"all"|"active"|"inactive">("all");

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllSkills()
      .then(setSkills)
      .catch(() => showToast("Failed to load skills", false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreateSkill = () => {
    setEditingSkill(null);
    setSkillForm(emptySkillForm());
    setShowSkillForm(true);
  };

  const openEditSkill = (s: SkillResponse) => {
    setEditingSkill(s);
    setSkillForm({ name: s.name, category: s.category });
    setShowSkillForm(true);
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim() || !skillForm.category.trim()) {
      showToast("Name and category are required.", false);
      return;
    }
    setSaving(true);
    try {
      if (editingSkill) {
        await adminUpdateSkill(editingSkill.id, skillForm);
        showToast("Skill updated.");
      } else {
        await adminCreateSkill(skillForm);
        showToast("Skill created.");
      }
      setShowSkillForm(false);
      load();
    } catch { showToast("Save failed.", false); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (s: SkillResponse) => {
    setSaving(true);
    try {
      if (s.isActive) {
        await adminDeactivateSkill(s.id);
        showToast(`${s.name} deactivated.`);
      } else {
        await adminActivateSkill(s.id);
        showToast(`${s.name} activated.`);
      }
      load();
    } catch { showToast("Toggle failed.", false); }
    finally { setSaving(false); }
  };

  const openAddQuestion = (s: SkillResponse) => {
    setQSkill(s);
    setQForm(emptyQuestionForm(s.id));
    setShowQForm(true);
  };

  const handleSaveQuestion = async () => {
    if (!qForm.questionText.trim() || !qForm.optionA.trim()) {
      showToast("Question text and options are required.", false);
      return;
    }
    setSaving(true);
    try {
      await adminCreateQuestion(qForm);
      showToast("Question added.");
      setShowQForm(false);
    } catch { showToast("Save failed.", false); }
    finally { setSaving(false); }
  };

  const filtered = skills.filter(s => {
    const text = `${s.name} ${s.category}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "all"      ? true :
      activeFilter === "active"   ? s.isActive :
      !s.isActive;
    return matchSearch && matchFilter;
  });

  const activeCount = skills.filter(s => s.isActive).length;

  return (
    <AdminPageLayout pageTitle="Manage Skills">
      <div className="admin-page">

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title"><span className="admin-title-icon">📡</span>Manage Skills</h1>
            <p className="admin-page-subtitle">{skills.length} skills · {activeCount} active</p>
          </div>
          <button className="btn btn-primary" onClick={openCreateSkill}>
            + New Skill
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search-wrap">
            <span className="admin-search-icon">🔍</span>
            <input
              className="admin-search-input"
              placeholder="Search by name or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filter-tabs">
            {(["all","active","inactive"] as const).map(f => (
              <button key={f} className={`admin-filter-tab${activeFilter === f ? " active" : ""}`} onClick={() => setActiveFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><span>Loading…</span></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4}><div className="admin-empty-state"><span>📡</span><p>No skills found</p></div></td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="skill-name-cell">
                        <div className="skill-dot" style={{ background: s.isActive ? "var(--color-success)" : "var(--color-text-muted)" }} />
                        <span className="admin-table-name">{s.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="skill-category-badge">{s.category}</span>
                    </td>
                    <td>
                      {s.isActive
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge" style={{ background: "var(--color-bg-overlay)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-default)" }}>Inactive</span>}
                    </td>
                    <td>
                      <div className="admin-action-row">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditSkill(s)}>✏ Edit</button>
                        <button
                          className={`btn btn-sm ${s.isActive ? "btn-warning" : "btn-success"}`}
                          onClick={() => handleToggleActive(s)}
                          disabled={saving}
                        >
                          {s.isActive ? "⏸ Deactivate" : "▶ Activate"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openAddQuestion(s)}>
                          + Question
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Skill Form Modal */}
      {showSkillForm && (
        <div className="admin-modal-overlay" onClick={() => setShowSkillForm(false)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">{editingSkill ? "Edit Skill" : "New Skill"}</h3>
            <div className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Skill Name *</label>
                <input className="admin-form-input" value={skillForm.name} onChange={e => setSkillForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. React, Python, SQL" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Category *</label>
                <input className="admin-form-input" value={skillForm.category} onChange={e => setSkillForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Frontend, Backend, Data Science" />
              </div>
            </div>
            <div className="admin-modal-actions" style={{ marginTop: "var(--space-6)" }}>
              <button className="btn btn-ghost" onClick={() => setShowSkillForm(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSkill} disabled={saving}>
                {saving ? "Saving…" : editingSkill ? "Save Changes" : "Create Skill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showQForm && qSkill && (
        <div className="admin-modal-overlay" onClick={() => setShowQForm(false)}>
          <div className="admin-modal admin-modal--xl" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">Add Question — {qSkill.name}</h3>
            <div className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Question Text *</label>
                <textarea className="admin-form-input admin-form-textarea" value={qForm.questionText} onChange={e => setQForm(f => ({ ...f, questionText: e.target.value }))} rows={3} placeholder="Enter the question…" />
              </div>
              <div className="admin-form-row-4">
                {(["A","B","C","D"] as const).map(opt => (
                  <div className="admin-form-group" key={opt}>
                    <label className="admin-form-label">Option {opt} {opt === "A" ? "*" : ""}</label>
                    <input
                      className="admin-form-input"
                      value={qForm[`option${opt}` as keyof CreateQuestionPayload] as string}
                      onChange={e => setQForm(f => ({ ...f, [`option${opt}`]: e.target.value }))}
                      placeholder={`Option ${opt}`}
                    />
                  </div>
                ))}
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Correct Answer</label>
                  <select className="admin-form-input admin-form-select" value={qForm.correctAnswer} onChange={e => setQForm(f => ({ ...f, correctAnswer: e.target.value }))}>
                    {CORRECT_ANSWERS.map(a => <option key={a} value={a}>Option {a}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Difficulty</label>
                  <select className="admin-form-input admin-form-select" value={qForm.difficultyLevel} onChange={e => setQForm(f => ({ ...f, difficultyLevel: e.target.value }))}>
                    {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Points</label>
                  <input className="admin-form-input" type="number" min={1} value={qForm.points} onChange={e => setQForm(f => ({ ...f, points: +e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="admin-modal-actions" style={{ marginTop: "var(--space-6)" }}>
              <button className="btn btn-ghost" onClick={() => setShowQForm(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveQuestion} disabled={saving}>
                {saving ? "Saving…" : "Add Question"}
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

  .admin-toolbar { display:flex; gap: var(--space-4); align-items:center; margin-bottom: var(--space-5); flex-wrap:wrap; }
  .admin-search-wrap { flex:1; min-width:200px; position:relative; }
  .admin-search-icon { position:absolute; left: var(--space-3); top:50%; transform:translateY(-50%); font-size:14px; }
  .admin-search-input { width:100%; background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; transition: border-color var(--duration-fast); box-sizing:border-box; }
  .admin-search-input:focus { border-color: var(--color-border-focus); }
  .admin-filter-tabs { display:flex; gap: var(--space-1); background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: 3px; }
  .admin-filter-tab { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); background:none; border:none; font-size: var(--text-sm); color: var(--color-text-muted); cursor:pointer; transition: all var(--duration-fast); }
  .admin-filter-tab.active { background: var(--color-bg-active); color: var(--color-text-primary); }

  .admin-table-wrap { background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-xl); overflow:hidden; }
  .admin-table { width:100%; border-collapse:collapse; }
  .admin-table thead { background: var(--color-bg-elevated); }
  .admin-table th { padding: var(--space-3) var(--space-4); text-align:left; font-family: var(--font-mono); font-size: 10px; font-weight: var(--weight-semibold); letter-spacing:0.1em; text-transform:uppercase; color: var(--color-text-muted); border-bottom:1px solid var(--color-border-subtle); }
  .admin-table td { padding: var(--space-3) var(--space-4); border-bottom:1px solid var(--color-border-subtle); vertical-align:middle; }
  .admin-table tr:last-child td { border-bottom:none; }
  .admin-table tr:hover td { background: var(--color-bg-hover); }

  .skill-name-cell { display:flex; align-items:center; gap: var(--space-3); }
  .skill-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .admin-table-name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
  .skill-category-badge { font-family: var(--font-mono); font-size: 10px; letter-spacing:0.08em; text-transform:uppercase; color: var(--color-cyan-400); background: var(--color-cyan-glow); border:1px solid rgba(34,211,238,0.2); border-radius: var(--radius-full); padding: 2px 8px; }
  .admin-action-row { display:flex; gap: var(--space-2); flex-wrap:wrap; }

  .btn-sm { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-md); border:1px solid transparent; cursor:pointer; transition: all var(--duration-fast); font-family: var(--font-body); }
  .btn-sm:disabled { opacity:0.4; cursor:not-allowed; }
  .btn-success { background: var(--color-success-bg); border-color: var(--color-success-border) !important; color: var(--color-success); }
  .btn-success:hover:not(:disabled) { background: rgba(52,211,153,0.2); }
  .btn-warning { background: var(--color-warning-bg); border-color: var(--color-warning-border) !important; color: var(--color-warning); }
  .btn-warning:hover:not(:disabled) { background: rgba(245,158,11,0.2); }

  .admin-form { display:flex; flex-direction:column; gap: var(--space-4); text-align:left; }
  .admin-form-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap: var(--space-4); }
  .admin-form-row-4 { display:grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
  .admin-form-group { display:flex; flex-direction:column; gap: var(--space-2); }
  .admin-form-label { font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing:0.06em; text-transform:uppercase; color: var(--color-text-muted); }
  .admin-form-input { background: var(--color-bg-base); border:1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; font-family: var(--font-body); transition: border-color var(--duration-fast); }
  .admin-form-input:focus { border-color: var(--color-border-focus); }
  .admin-form-textarea { resize:vertical; }
  .admin-form-select { cursor:pointer; }

  .admin-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding: var(--space-4); }
  .admin-modal { background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-2xl); padding: var(--space-8); width:100%; max-width:380px; text-align:center; animation: fadeIn 0.2s ease; }
  .admin-modal--wide { max-width:480px; }
  .admin-modal--xl { max-width:680px; }
  .admin-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-4) 0; }
  .admin-modal-actions { display:flex; gap: var(--space-3); justify-content:flex-end; }

  .admin-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-4); padding: var(--space-16); color: var(--color-text-muted); }
  .admin-spinner { width:32px; height:32px; border:2px solid var(--color-border-default); border-top-color: var(--color-primary-400); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .admin-empty-state { display:flex; flex-direction:column; align-items:center; gap: var(--space-2); padding: var(--space-8); color: var(--color-text-muted); font-size: var(--text-sm); }

  .admin-toast { position:fixed; bottom: var(--space-24); left:50%; transform:translateX(-50%); background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-full); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); color: var(--color-text-primary); z-index:2000; box-shadow: var(--shadow-lg); animation: fadeIn 0.2s ease; white-space:nowrap; }
  .admin-toast--ok { border-color: var(--color-success-border); }
  .admin-toast--err { border-color: var(--color-danger-border); }

  @media(max-width:768px) { .admin-page { padding: var(--space-4); } .admin-form-row { grid-template-columns:1fr; } .admin-form-row-4 { grid-template-columns:1fr 1fr; } }
`;

export default AdminSkillsPage;