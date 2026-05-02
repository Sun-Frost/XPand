/* ============================================================
   AdminUsersPage.tsx
   Monitor, suspend, and delete user accounts.
   Route: /admin/users
   ============================================================ */

import { useEffect, useState, useCallback } from "react";
import AdminPageLayout from "../../components/admin/adminPageLayout";
import { Icon } from "../../components/ui/Icon";
import {
  adminGetAllUsers,
  adminSuspendUser,
  adminDeleteUser,
  type UserProfileResponse,
} from "../../api/Adminapi";

type FilterState = "all" | "active" | "suspended";

const AdminUsersPage = () => {
  const [users,   setUsers]   = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<FilterState>("all");
  const [confirm, setConfirm] = useState<{ type: "suspend" | "delete"; user: UserProfileResponse } | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllUsers()
      .then(setUsers)
      .catch(() => showToast("Failed to load users", false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSuspend = async () => {
    if (!confirm || confirm.type !== "suspend") return;
    setBusy(true);
    try {
      await adminSuspendUser(confirm.user.id);
      showToast(`${confirm.user.firstName ?? confirm.user.email} suspended.`);
      load();
    } catch { showToast("Suspend failed.", false); }
    finally { setBusy(false); setConfirm(null); }
  };

  const handleDelete = async () => {
    if (!confirm || confirm.type !== "delete") return;
    setBusy(true);
    try {
      await adminDeleteUser(confirm.user.id);
      showToast(`User deleted.`);
      load();
    } catch { showToast("Delete failed.", false); }
    finally { setBusy(false); setConfirm(null); }
  };

  const filtered = users.filter(u => {
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter =
      filter === "all"       ? true :
      filter === "suspended" ? !!u.isSuspended :
      !u.isSuspended;
    return matchSearch && matchFilter;
  });

  return (
    <AdminPageLayout pageTitle="Manage Users">
      <div className="admin-page">

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">
              <span className="admin-title-icon"><Icon name="profile" size={22} /></span>
              Manage Users
            </h1>
            <p className="admin-page-subtitle">{users.length} registered accounts</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search-wrap">
            <span className="admin-search-icon"><Icon name="search" size={14} /></span>
            <input
              className="admin-search-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filter-tabs">
            {(["all","active","suspended"] as FilterState[]).map(f => (
              <button
                key={f}
                className={`admin-filter-tab${filter === f ? " active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /><span>Loading…</span></div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty-state"><Icon name="profile" size={24} /><p>No users found</p></div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Location</th>
                  <th>XP Balance</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-table-user">
                        <div className="admin-table-avatar">
                          {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="admin-table-name">
                            {u.firstName ? `${u.firstName} ${u.lastName ?? ""}` : "—"}
                          </div>
                          <div className="admin-table-meta">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="admin-table-meta">
                      {u.city && u.country ? `${u.city}, ${u.country}` : u.country ?? "—"}
                    </td>
                    <td>
                      <span className="admin-xp-badge">
                        <Icon name="xp" size={12} /> {u.xpBalance ?? 0}
                      </span>
                    </td>
                    <td className="admin-table-meta">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {u.isSuspended
                        ? <span className="badge badge-danger">Suspended</span>
                        : <span className="badge badge-success">Active</span>}
                    </td>
                    <td>
                      <div className="admin-action-row">
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => setConfirm({ type: "suspend", user: u })}
                          disabled={!!u.isSuspended}
                          title="Suspend user"
                        >
                          <Icon name="pending" size={12} /> Suspend
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setConfirm({ type: "delete", user: u })}
                          title="Delete user"
                        >
                          <Icon name="delete" size={12} /> Delete
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
              {confirm.type === "suspend"
                ? <Icon name="pending" size={40} />
                : <Icon name="delete" size={40} />}
            </div>
            <h3 className="admin-modal-title">
              {confirm.type === "suspend" ? "Suspend User?" : "Delete User?"}
            </h3>
            <p className="admin-modal-body">
              {confirm.type === "suspend"
                ? `Suspend ${confirm.user.firstName ?? confirm.user.email}? They will lose access immediately.`
                : `Permanently delete ${confirm.user.firstName ?? confirm.user.email}? This cannot be undone.`}
            </p>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button
                className={`btn ${confirm.type === "delete" ? "btn-danger" : "btn-warning"}`}
                onClick={confirm.type === "suspend" ? handleSuspend : handleDelete}
                disabled={busy}
              >
                {busy ? "Processing…" : confirm.type === "suspend" ? "Suspend" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.ok ? "admin-toast--ok" : "admin-toast--err"}`}>
          {toast.ok
            ? <Icon name="success" size={14} />
            : <Icon name="error" size={14} />}
          {" "}{toast.msg}
        </div>
      )}

      <style>{pageStyles}</style>
    </AdminPageLayout>
  );
};

const pageStyles = `
  .admin-page { padding: var(--space-8); max-width: 1200px; margin:0 auto; }
  .admin-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: var(--space-6); }
  .admin-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-1) 0; display:flex; align-items:center; gap: var(--space-3); }
  .admin-title-icon { color: var(--color-danger); display:flex; align-items:center; }
  .admin-page-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); margin:0; }

  .admin-toolbar { display:flex; gap: var(--space-4); align-items:center; margin-bottom: var(--space-5); flex-wrap:wrap; }
  .admin-search-wrap { flex:1; min-width:200px; position:relative; display:flex; align-items:center; }
  .admin-search-icon { position:absolute; left: var(--space-3); top:50%; transform:translateY(-50%); display:flex; align-items:center; color: var(--color-text-muted); }
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

  .admin-table-user { display:flex; align-items:center; gap: var(--space-3); }
  .admin-table-avatar { width:32px; height:32px; border-radius: var(--radius-md); background: var(--gradient-cyan); display:flex; align-items:center; justify-content:center; font-family: var(--font-mono); font-size:11px; font-weight: var(--weight-bold); color:#fff; flex-shrink:0; }
  .admin-table-name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
  .admin-table-meta { font-size: var(--text-xs); color: var(--color-text-muted); }
  .admin-xp-badge { display:inline-flex; align-items:center; gap:4px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-xp-gold); background: var(--color-xp-gold-glow); border:1px solid var(--color-gold-border); border-radius: var(--radius-full); padding: 2px 8px; }
  .admin-action-row { display:flex; gap: var(--space-2); }

  .btn-sm { display:inline-flex; align-items:center; gap:4px; padding: var(--space-1) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-md); border:none; cursor:pointer; transition: all var(--duration-fast); font-family: var(--font-body); }
  .btn-sm:disabled { opacity:0.4; cursor:not-allowed; }
  .btn-warning { background: var(--color-warning-bg); border:1px solid var(--color-warning-border) !important; color: var(--color-warning); }
  .btn-warning:hover:not(:disabled) { background: rgba(245,158,11,0.2); }
  .btn-danger { background: var(--color-danger-bg); border:1px solid var(--color-danger-border) !important; color: var(--color-danger); }
  .btn-danger:hover:not(:disabled) { background: rgba(248,113,113,0.2); }

  .admin-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-4); padding: var(--space-16); color: var(--color-text-muted); }
  .admin-spinner { width:32px; height:32px; border:2px solid var(--color-border-default); border-top-color: var(--color-primary-400); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .admin-empty-state { display:flex; flex-direction:column; align-items:center; gap: var(--space-2); padding: var(--space-8); color: var(--color-text-muted); font-size: var(--text-sm); }

  .admin-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
  .admin-modal { background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-2xl); padding: var(--space-8); width:100%; max-width:380px; text-align:center; animation: fadeIn 0.2s ease; }
  .admin-modal-icon { display:flex; justify-content:center; margin-bottom: var(--space-4); color: var(--color-text-muted); }
  .admin-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-3) 0; }
  .admin-modal-body { font-size: var(--text-sm); color: var(--color-text-secondary); margin:0 0 var(--space-6) 0; }
  .admin-modal-actions { display:flex; gap: var(--space-3); justify-content:center; }

  .admin-toast { position:fixed; bottom: var(--space-24); left:50%; transform:translateX(-50%); background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-full); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); color: var(--color-text-primary); z-index:2000; box-shadow: var(--shadow-lg); animation: fadeIn 0.2s ease; white-space:nowrap; display:flex; align-items:center; gap: var(--space-2); }
  .admin-toast--ok { border-color: var(--color-success-border); }
  .admin-toast--err { border-color: var(--color-danger-border); }

  @media(max-width:768px) { .admin-page { padding: var(--space-4); } .admin-table { font-size: var(--text-xs); } }
`;

export default AdminUsersPage;