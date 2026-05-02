/* ============================================================
   AdminOverviewPage.tsx
   Admin dashboard — system-wide stats and quick actions.
   Route: /admin/overview
   ============================================================ */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageLayout from "../../components/admin/adminPageLayout";
import { Icon } from "../../components/ui/Icon";
import {
  adminGetAllUsers,
  adminGetAllCompanies,
  adminGetPendingCompanies,
  adminGetAllChallenges,
  adminGetAllStoreItems,
  adminGetAllSkills,
  type UserProfileResponse,
  type CompanyProfileResponse,
  type ChallengeResponse,
  type StoreItemResponse,
  type SkillResponse,
} from "../../api/Adminapi";

interface StatCardProps {
  label:    string;
  value:    number | string;
  icon:     React.ReactNode;
  accent:   string;
  sub?:     string;
  onClick?: () => void;
}

const StatCard = ({ label, value, icon, accent, sub, onClick }: StatCardProps) => (
  <button
    className="admin-stat-card"
    onClick={onClick}
    style={{ "--card-accent": accent } as React.CSSProperties}
    aria-label={`${label}: ${value}`}
  >
    <div className="admin-stat-icon">{icon}</div>
    <div className="admin-stat-info">
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
      {sub && <span className="admin-stat-sub">{sub}</span>}
    </div>
    <div className="admin-stat-glow" />
  </button>
);

const AdminOverviewPage = () => {
  const navigate = useNavigate();

  const [users,      setUsers]      = useState<UserProfileResponse[]>([]);
  const [companies,  setCompanies]  = useState<CompanyProfileResponse[]>([]);
  const [pending,    setPending]    = useState<CompanyProfileResponse[]>([]);
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItemResponse[]>([]);
  const [skills,     setSkills]     = useState<SkillResponse[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      adminGetAllUsers(),
      adminGetAllCompanies(),
      adminGetPendingCompanies(),
      adminGetAllChallenges(),
      adminGetAllStoreItems(),
      adminGetAllSkills(),
    ]).then(([u, c, p, ch, si, sk]) => {
      setUsers(u);
      setCompanies(c);
      setPending(p);
      setChallenges(ch);
      setStoreItems(si);
      setSkills(sk);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const approvedCompanies = companies.filter(c => c.isApproved).length;
  const activeSkills      = skills.filter(s => s.isActive).length;

  return (
    <AdminPageLayout pageTitle="Admin Overview">
      <div className="admin-page">

        {/* Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">
              <span className="admin-title-icon"><Icon name="account" size={22} /></span>
              System Overview
            </h1>
            <p className="admin-page-subtitle">Real-time platform health and key metrics</p>
          </div>
          <div className="admin-header-meta">
            <span className="admin-meta-label">Last refresh</span>
            <span className="admin-meta-value">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <span>Loading system data…</span>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="admin-stats-grid">
              <StatCard
                label="Total Users"
                value={users.length}
                icon={<Icon name="profile" size={28} />}
                accent="var(--color-cyan-400)"
                sub="Registered accounts"
                onClick={() => navigate("/admin/users")}
              />
              <StatCard
                label="Total Companies"
                value={companies.length}
                icon={<Icon name="work" size={28} />}
                accent="var(--color-green-400)"
                sub={`${approvedCompanies} approved`}
                onClick={() => navigate("/admin/companies")}
              />
              <StatCard
                label="Pending Approval"
                value={pending.length}
                icon={<Icon name="pending" size={28} />}
                accent="var(--color-gold-400)"
                sub="Awaiting review"
                onClick={() => navigate("/admin/companies")}
              />
              <StatCard
                label="Active Challenges"
                value={challenges.length}
                icon={<Icon name="trophy" size={28} />}
                accent="var(--color-primary-400)"
                sub="XP-earning challenges"
                onClick={() => navigate("/admin/challenges")}
              />
              <StatCard
                label="Store Items"
                value={storeItems.length}
                icon={<Icon name="store" size={28} />}
                accent="var(--color-purple-400)"
                sub="Purchasable items"
                onClick={() => navigate("/admin/store")}
              />
              <StatCard
                label="Active Skills"
                value={activeSkills}
                icon={<Icon name="skills" size={28} />}
                accent="var(--color-danger)"
                sub={`${skills.length} total`}
                onClick={() => navigate("/admin/skills")}
              />
            </div>

            {/* Pending companies alert */}
            {pending.length > 0 && (
              <div className="admin-alert admin-alert--warning">
                <span className="admin-alert-icon"><Icon name="warning" size={20} /></span>
                <div className="admin-alert-body">
                  <strong>{pending.length} company registration{pending.length > 1 ? "s" : ""} awaiting approval.</strong>
                  <span> Review and approve or reject to maintain platform integrity.</span>
                </div>
                <button className="btn btn-sm btn-warning" onClick={() => navigate("/admin/companies")}>
                  Review Now →
                </button>
              </div>
            )}

            {/* Quick action panels */}
            <div className="admin-panels-grid">

              {/* Recent users */}
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <h2 className="admin-panel-title">Recent Users</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin/users")}>
                    View all →
                  </button>
                </div>
                <div className="admin-panel-body">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="admin-list-row">
                      <div className="admin-list-avatar">
                        {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                      </div>
                      <div className="admin-list-info">
                        <span className="admin-list-name">
                          {u.firstName ? `${u.firstName} ${u.lastName ?? ""}` : u.email}
                        </span>
                        <span className="admin-list-meta">{u.email}</span>
                      </div>
                      {u.isSuspended && (
                        <span className="badge badge-danger">Suspended</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending companies */}
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <h2 className="admin-panel-title">Pending Companies</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin/companies")}>
                    Manage →
                  </button>
                </div>
                <div className="admin-panel-body">
                  {pending.length === 0 ? (
                    <div className="admin-empty-state">
                      <Icon name="success" size={24} />
                      <p>No pending companies</p>
                    </div>
                  ) : (
                    pending.slice(0, 5).map(c => (
                      <div key={c.id} className="admin-list-row">
                        <div className="admin-list-avatar admin-list-avatar--company">
                          {c.companyName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="admin-list-info">
                          <span className="admin-list-name">{c.companyName}</span>
                          <span className="admin-list-meta">{c.industry ?? "—"}</span>
                        </div>
                        <span className="badge badge-warning">Pending</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{pageStyles}</style>
    </AdminPageLayout>
  );
};

const pageStyles = `
  .admin-page { padding: var(--space-8); max-width: 1200px; margin: 0 auto; }
  .admin-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: var(--space-8); }
  .admin-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-1) 0; display:flex; align-items:center; gap: var(--space-3); }
  .admin-title-icon { color: var(--color-danger); display:flex; align-items:center; }
  .admin-page-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); margin:0; }
  .admin-header-meta { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
  .admin-meta-label { font-size: 10px; color: var(--color-text-muted); text-transform:uppercase; letter-spacing:0.08em; }
  .admin-meta-value { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }

  .admin-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-4); padding: var(--space-16); color: var(--color-text-muted); }
  .admin-spinner { width:32px; height:32px; border:2px solid var(--color-border-default); border-top-color: var(--color-primary-400); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .admin-stats-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
  .admin-stat-card { position:relative; overflow:hidden; background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-xl); padding: var(--space-5); display:flex; align-items:center; gap: var(--space-4); cursor:pointer; transition: border-color var(--duration-base), transform var(--duration-fast); text-align:left; width:100%; }
  .admin-stat-card:hover { border-color: var(--card-accent); transform: translateY(-2px); }
  .admin-stat-card:hover .admin-stat-glow { opacity:1; }
  .admin-stat-icon { font-size: 28px; flex-shrink:0; display:flex; align-items:center; color: var(--card-accent); }
  .admin-stat-info { display:flex; flex-direction:column; gap:2px; }
  .admin-stat-value { font-family: var(--font-mono); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--card-accent); line-height:1; }
  .admin-stat-label { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
  .admin-stat-sub { font-size: var(--text-xs); color: var(--color-text-muted); }
  .admin-stat-glow { position:absolute; inset:0; background: radial-gradient(ellipse at 0% 50%, color-mix(in srgb, var(--card-accent) 8%, transparent), transparent 70%); opacity:0; transition: opacity var(--duration-base); pointer-events:none; }

  .admin-alert { display:flex; align-items:center; gap: var(--space-4); background: var(--color-warning-bg); border:1px solid var(--color-warning-border); border-radius: var(--radius-xl); padding: var(--space-4) var(--space-5); margin-bottom: var(--space-6); }
  .admin-alert-icon { display:flex; align-items:center; color: var(--color-warning); flex-shrink:0; }
  .admin-alert-body { flex:1; font-size: var(--text-sm); color: var(--color-text-primary); }

  .admin-panels-grid { display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
  .admin-panel { background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-xl); overflow:hidden; }
  .admin-panel-header { display:flex; align-items:center; justify-content:space-between; padding: var(--space-4) var(--space-5); border-bottom:1px solid var(--color-border-subtle); }
  .admin-panel-title { font-family: var(--font-display); font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); margin:0; }
  .admin-panel-body { padding: var(--space-2) 0; }

  .admin-list-row { display:flex; align-items:center; gap: var(--space-3); padding: var(--space-3) var(--space-5); transition: background var(--duration-fast); }
  .admin-list-row:hover { background: var(--color-bg-hover); }
  .admin-list-avatar { width:32px; height:32px; border-radius: var(--radius-md); background: var(--gradient-cyan); display:flex; align-items:center; justify-content:center; font-family: var(--font-mono); font-size: 11px; font-weight: var(--weight-bold); color:#fff; flex-shrink:0; }
  .admin-list-avatar--company { background: var(--gradient-green); }
  .admin-list-info { flex:1; display:flex; flex-direction:column; gap:1px; min-width:0; }
  .admin-list-name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .admin-list-meta { font-size: var(--text-xs); color: var(--color-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  .admin-empty-state { display:flex; flex-direction:column; align-items:center; gap: var(--space-2); padding: var(--space-8); color: var(--color-text-muted); font-size: var(--text-sm); }

  .btn-warning { background: var(--color-warning-bg); border:1px solid var(--color-warning-border); color: var(--color-warning); font-size: var(--text-xs); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); cursor:pointer; white-space:nowrap; transition: background var(--duration-fast); }
  .btn-warning:hover { background: rgba(245,158,11,0.2); }

  @media(max-width:1024px) { .admin-stats-grid { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:768px) { .admin-stats-grid { grid-template-columns:1fr; } .admin-panels-grid { grid-template-columns:1fr; } .admin-page { padding: var(--space-4); } }
`;

export default AdminOverviewPage;