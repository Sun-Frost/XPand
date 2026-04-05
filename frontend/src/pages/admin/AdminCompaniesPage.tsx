/* ============================================================
   AdminCompaniesPage.tsx
   Approve, suspend, and delete company accounts.
   Route: /admin/companies
   Endpoints: GET /admin/companies  GET /admin/companies/pending
              PATCH /admin/companies/{id}/approve
              PATCH /admin/companies/{id}/suspend
              DELETE /admin/companies/{id}
   ============================================================ */

import { useEffect, useState, useCallback } from "react";
import AdminPageLayout from "../../components/admin/adminPageLayout";
import {
  adminGetAllCompanies,
  adminApproveCompany,
  adminSuspendCompany,
  type CompanyProfileResponse,
} from "../../api/Adminapi";

type FilterState = "all" | "approved" | "pending";

type ConfirmAction = {
  type: "approve" | "suspend" | "delete";
  company: CompanyProfileResponse;
};

const AdminCompaniesPage = () => {
  const [companies, setCompanies] = useState<CompanyProfileResponse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<FilterState>("all");
  const [confirm,   setConfirm]   = useState<ConfirmAction | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllCompanies()
      .then(setCompanies)
      .catch(() => showToast("Failed to load companies", false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.type === "approve") {
        await adminApproveCompany(confirm.company.id);
        showToast(`${confirm.company.companyName} approved.`);
      } else if (confirm.type === "suspend") {
        await adminSuspendCompany(confirm.company.id);
        showToast(`${confirm.company.companyName} suspended.`);
      }
      load();
    } catch { showToast("Action failed.", false); }
    finally { setBusy(false); setConfirm(null); }
  };

  const pending  = companies.filter(c => !c.isApproved);
  const approved = companies.filter(c => c.isApproved);

  const filtered = companies.filter(c => {
    const text = `${c.companyName} ${c.email} ${c.industry ?? ""} ${c.location ?? ""}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchFilter =
      filter === "all"      ? true :
      filter === "approved" ? c.isApproved :
      !c.isApproved;
    return matchSearch && matchFilter;
  });

  return (
    <AdminPageLayout pageTitle="Manage Companies">
      <div className="admin-page">

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title"><span className="admin-title-icon">🏢</span>Manage Companies</h1>
            <p className="admin-page-subtitle">
              {companies.length} total · {approved.length} approved · {" "}
              <span style={{ color: "var(--color-warning)" }}>{pending.length} pending</span>
            </p>
          </div>
        </div>

        {/* Pending alert */}
        {pending.length > 0 && (
          <div className="admin-alert admin-alert--warning" style={{ marginBottom: "var(--space-5)" }}>
            <span>⚠️</span>
            <div style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
              <strong>{pending.length} company registration{pending.length > 1 ? "s" : ""}</strong> awaiting approval.
            </div>
            <button className="btn-tag btn-tag--warning" onClick={() => setFilter("pending")}>
              Filter Pending →
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search-wrap">
            <span className="admin-search-icon">🔍</span>
            <input
              className="admin-search-input"
              placeholder="Search by name, email, industry…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filter-tabs">
            {(["all","approved","pending"] as FilterState[]).map(f => (
              <button
                key={f}
                className={`admin-filter-tab${filter === f ? " active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pending.length > 0 && (
                  <span className="admin-filter-count">{pending.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /><span>Loading…</span></div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty-state"><span>🏢</span><p>No companies found</p></div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="admin-table-user">
                        <div className="admin-table-avatar admin-table-avatar--company">
                          {c.companyName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="admin-table-name">{c.companyName}</div>
                          <div className="admin-table-meta">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="admin-table-meta">{c.industry ?? "—"}</td>
                    <td className="admin-table-meta">{c.location ?? "—"}</td>
                    <td className="admin-table-meta">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {c.isApproved
                        ? <span className="badge badge-success">Approved</span>
                        : <span className="badge badge-warning">Pending</span>}
                    </td>
                    <td>
                      <div className="admin-action-row">
                        {!c.isApproved && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => setConfirm({ type: "approve", company: c })}
                          >
                            ✓ Approve
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => setConfirm({ type: "suspend", company: c })}
                        >
                          ⏸ Suspend
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setConfirm({ type: "delete", company: c })}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="admin-modal-overlay" onClick={() => setConfirm(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-icon">
              {confirm.type === "approve" ? "✅" : confirm.type === "suspend" ? "⏸" : "🗑"}
            </div>
            <h3 className="admin-modal-title">
              {confirm.type === "approve" ? "Approve Company?" :
               confirm.type === "suspend" ? "Suspend Company?" : "Delete Company?"}
            </h3>
            <p className="admin-modal-body">
              {confirm.type === "approve"
                ? `Grant full platform access to ${confirm.company.companyName}?`
                : confirm.type === "suspend"
                ? `Suspend ${confirm.company.companyName}? They will lose access immediately.`
                : `Permanently delete ${confirm.company.companyName}? This cannot be undone.`}
            </p>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button
                className={`btn ${
                  confirm.type === "approve" ? "btn-success-solid" :
                  confirm.type === "delete"  ? "btn-danger-solid"  : "btn-warning-solid"
                }`}
                onClick={handleConfirm}
                disabled={busy}
              >
                {busy ? "Processing…" :
                  confirm.type === "approve" ? "Approve" :
                  confirm.type === "suspend" ? "Suspend" : "Delete"}
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

  .admin-alert { display:flex; align-items:center; gap: var(--space-4); background: var(--color-warning-bg); border:1px solid var(--color-warning-border); border-radius: var(--radius-xl); padding: var(--space-4) var(--space-5); }
  .btn-tag { background:none; border:1px solid currentColor; border-radius: var(--radius-full); padding: 4px 12px; font-size: var(--text-xs); cursor:pointer; white-space:nowrap; }
  .btn-tag--warning { color: var(--color-warning); }

  .admin-toolbar { display:flex; gap: var(--space-4); align-items:center; margin-bottom: var(--space-5); flex-wrap:wrap; }
  .admin-search-wrap { flex:1; min-width:200px; position:relative; }
  .admin-search-icon { position:absolute; left: var(--space-3); top:50%; transform:translateY(-50%); font-size:14px; }
  .admin-search-input { width:100%; background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; transition: border-color var(--duration-fast); box-sizing:border-box; }
  .admin-search-input:focus { border-color: var(--color-border-focus); }
  .admin-filter-tabs { display:flex; gap: var(--space-1); background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: 3px; }
  .admin-filter-tab { position:relative; padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); background:none; border:none; font-size: var(--text-sm); color: var(--color-text-muted); cursor:pointer; transition: all var(--duration-fast); display:flex; align-items:center; gap: var(--space-2); }
  .admin-filter-tab.active { background: var(--color-bg-active); color: var(--color-text-primary); }
  .admin-filter-count { background: var(--color-warning); color: #000; border-radius: var(--radius-full); font-size: 10px; font-weight: var(--weight-bold); padding: 1px 6px; line-height:1.4; }

  .admin-table-wrap { background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-xl); overflow:hidden; }
  .admin-table { width:100%; border-collapse:collapse; }
  .admin-table thead { background: var(--color-bg-elevated); }
  .admin-table th { padding: var(--space-3) var(--space-4); text-align:left; font-family: var(--font-mono); font-size: 10px; font-weight: var(--weight-semibold); letter-spacing:0.1em; text-transform:uppercase; color: var(--color-text-muted); border-bottom:1px solid var(--color-border-subtle); }
  .admin-table td { padding: var(--space-3) var(--space-4); border-bottom:1px solid var(--color-border-subtle); vertical-align:middle; }
  .admin-table tr:last-child td { border-bottom:none; }
  .admin-table tr:hover td { background: var(--color-bg-hover); }

  .admin-table-user { display:flex; align-items:center; gap: var(--space-3); }
  .admin-table-avatar { width:32px; height:32px; border-radius: var(--radius-md); background: var(--gradient-cyan); display:flex; align-items:center; justify-content:center; font-family: var(--font-mono); font-size:11px; font-weight: var(--weight-bold); color:#fff; flex-shrink:0; }
  .admin-table-avatar--company { background: var(--gradient-green); }
  .admin-table-name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
  .admin-table-meta { font-size: var(--text-xs); color: var(--color-text-muted); }
  .admin-action-row { display:flex; gap: var(--space-2); flex-wrap:wrap; }

  .btn-sm { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-md); border:1px solid transparent; cursor:pointer; transition: all var(--duration-fast); font-family: var(--font-body); }
  .btn-sm:disabled { opacity:0.4; cursor:not-allowed; }
  .btn-success { background: var(--color-success-bg); border-color: var(--color-success-border) !important; color: var(--color-success); }
  .btn-success:hover:not(:disabled) { background: rgba(52,211,153,0.2); }
  .btn-warning { background: var(--color-warning-bg); border-color: var(--color-warning-border) !important; color: var(--color-warning); }
  .btn-warning:hover:not(:disabled) { background: rgba(245,158,11,0.2); }
  .btn-danger { background: var(--color-danger-bg); border-color: var(--color-danger-border) !important; color: var(--color-danger); }
  .btn-danger:hover:not(:disabled) { background: rgba(248,113,113,0.2); }
  .btn-success-solid { background: var(--color-success); color:#000; border:none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor:pointer; font-weight: var(--weight-semibold); }
  .btn-danger-solid { background: var(--color-danger); color:#fff; border:none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor:pointer; font-weight: var(--weight-semibold); }
  .btn-warning-solid { background: var(--color-warning); color:#000; border:none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor:pointer; font-weight: var(--weight-semibold); }

  .admin-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-4); padding: var(--space-16); color: var(--color-text-muted); }
  .admin-spinner { width:32px; height:32px; border:2px solid var(--color-border-default); border-top-color: var(--color-primary-400); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .admin-empty-state { display:flex; flex-direction:column; align-items:center; gap: var(--space-2); padding: var(--space-8); color: var(--color-text-muted); font-size: var(--text-sm); }

  .admin-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
  .admin-modal { background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-2xl); padding: var(--space-8); width:100%; max-width:380px; text-align:center; animation: fadeIn 0.2s ease; }
  .admin-modal-icon { font-size:40px; margin-bottom: var(--space-4); }
  .admin-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-3) 0; }
  .admin-modal-body { font-size: var(--text-sm); color: var(--color-text-secondary); margin:0 0 var(--space-6) 0; }
  .admin-modal-actions { display:flex; gap: var(--space-3); justify-content:center; }

  .admin-toast { position:fixed; bottom: var(--space-24); left:50%; transform:translateX(-50%); background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-full); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); color: var(--color-text-primary); z-index:2000; box-shadow: var(--shadow-lg); animation: fadeIn 0.2s ease; white-space:nowrap; }
  .admin-toast--ok { border-color: var(--color-success-border); }
  .admin-toast--err { border-color: var(--color-danger-border); }

  @media(max-width:768px) { .admin-page { padding: var(--space-4); } }
`;

export default AdminCompaniesPage;