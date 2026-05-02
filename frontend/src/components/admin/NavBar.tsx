/* ============================================================
   AdminNavbar.tsx
   Top navbar for authenticated admin users.
   Authority accent: danger-red shield branding.
   No XP balance — admins manage, not earn.
   ============================================================ */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";

interface AdminNavbarProps {
  adminName:     string | null;
  onToggleTheme: () => void;
  isDarkMode:    boolean;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({
  adminName,
  onToggleTheme,
  isDarkMode,
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  const initials = adminName
    ? adminName.slice(0, 2).toUpperCase()
    : "AD";

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Admin navigation">

        {/* Left — brand */}
        <div className="navbar__left">
          <button className="navbar-brand" onClick={() => go("/admin/overview")} aria-label="XPand Admin home">
            <div className="navbar-brand-mark">
              <div className="navbar__logo-inner admin-logo-inner">
                <span className="navbar__logo-text">XP</span>
              </div>
            </div>
            <span className="logo-wordmark navbar__brand-name">
              XPand <span className="admin-wordmark-tag">ADMIN</span>
            </span>
          </button>
        </div>

        {/* Centre — admin badge */}
        <div className="an-centre">
          <div className="an-badge">
            <span className="an-shield"><Icon name="account" size={12} /></span>
            <span className="an-badge-text">System Administrator</span>
          </div>
        </div>

        {/* Right — theme + menu */}
        <div className="navbar__right">
          <button
            className="btn btn-ghost btn-icon navbar__icon-btn"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={isDarkMode ? "sun" : "moon"} size={16} />
          </button>

          <div className="navbar__dropdown-anchor" ref={menuRef}>
            <button
              className="navbar__avatar-btn"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="Admin menu"
              aria-expanded={isMenuOpen}
            >
              <div className="an-avatar">{initials}</div>
              <ChevronIcon open={isMenuOpen} />
            </button>

            {isMenuOpen && (
              <div className="navbar__dropdown navbar__user-menu" role="menu">
                <div className="navbar__user-info">
                  <p className="navbar__user-name">{adminName ?? "Administrator"}</p>
                  <p className="navbar__user-email">Admin Account</p>
                </div>
                <div className="divider" style={{ margin: 0 }} />
                <ul className="navbar__menu-list">
                  {[
                    { label: "Overview",   path: "/admin/overview",   icon: "activity"   as const },
                    { label: "Users",      path: "/admin/users",      icon: "profile"    as const },
                    { label: "Companies",  path: "/admin/companies",  icon: "work"       as const },
                    { label: "Challenges", path: "/admin/challenges", icon: "trophy"     as const },
                    { label: "XP Store",  path: "/admin/store",      icon: "store"      as const },
                    { label: "Skills",     path: "/admin/skills",     icon: "skills"     as const },
                  ].map((item) => (
                    <li key={item.path} role="menuitem">
                      <button className="navbar__menu-item" onClick={() => go(item.path)}>
                        <span className="navbar__menu-icon"><Icon name={item.icon} size={16} /></span>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="divider" style={{ margin: 0 }} />
                <div className="navbar__menu-footer">
                  <button className="navbar__menu-item navbar__menu-item--danger" onClick={handleSignOut}>
                    <span className="navbar__menu-icon"><Icon name="logout" size={16} /></span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style>{styles}</style>
    </>
  );
};

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const styles = `
  .admin-logo-inner {
    background: linear-gradient(135deg, #7F1D1D, #F87171) !important;
  }
  .admin-wordmark-tag {
    font-size: 9px;
    font-family: var(--font-mono);
    letter-spacing: 0.12em;
    color: var(--color-danger);
    border: 1px solid var(--color-danger-border);
    background: var(--color-danger-bg);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    vertical-align: middle;
    margin-left: 4px;
  }
  .an-centre {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 0 var(--space-6);
  }
  .an-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-full);
    padding: 4px 12px;
  }
  .an-shield {
    display: flex;
    align-items: center;
    color: var(--color-danger);
  }
  .an-badge-text {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: var(--weight-semibold);
    letter-spacing: 0.08em;
    color: var(--color-danger);
    text-transform: uppercase;
  }
  .an-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, #7F1D1D, #F87171);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: var(--weight-bold);
    color: #fff;
    flex-shrink: 0;
  }
  .navbar__left { display:flex;align-items:center;gap:var(--space-3);flex-shrink:0; }
  .navbar-brand { display:flex;align-items:center;gap:var(--space-3);background:none;border:none;cursor:pointer;text-decoration:none;font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);letter-spacing:var(--tracking-wide);color:var(--color-text-primary); }
  .navbar__logo-inner { width:100%;height:100%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md); }
  .navbar__logo-text { font-family:var(--font-display);font-size:11px;font-weight:var(--weight-bold);color:#fff;letter-spacing:0.05em; }
  .navbar__brand-name { font-size:var(--text-xl); }
  .navbar__right { display:flex;align-items:center;gap:var(--space-2);flex-shrink:0; }
  .navbar__icon-btn { color:var(--color-text-muted);position:relative;display:flex;align-items:center;justify-content:center; }
  .navbar__icon-btn:hover { color:var(--color-text-primary); }
  .navbar__avatar-btn { display:flex;align-items:center;gap:var(--space-2);background:none;border:1px solid var(--color-border-default);border-radius:var(--radius-full);padding:3px var(--space-2) 3px 3px;cursor:pointer;color:var(--color-text-muted);transition:border-color var(--duration-base),background var(--duration-base); }
  .navbar__avatar-btn:hover { border-color:var(--color-border-strong);background:var(--color-bg-hover);color:var(--color-text-primary); }
  .navbar__dropdown-anchor { position:relative; }
  .navbar__dropdown { position:absolute;top:calc(100% + var(--space-2));right:0;background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);z-index:var(--z-dropdown);animation:fadeIn 0.18s ease;overflow:hidden; }
  .navbar__user-menu { width:240px; }
  .navbar__user-info { padding:var(--space-4) var(--space-5);display:flex;flex-direction:column;gap:var(--space-2); }
  .navbar__user-name { font-family:var(--font-display);font-size:var(--text-md);font-weight:var(--weight-semibold);color:var(--color-text-primary);margin:0; }
  .navbar__user-email { font-size:var(--text-xs);color:var(--color-text-muted);margin:0; }
  .navbar__menu-list { list-style:none;padding:var(--space-2) 0; }
  .navbar__menu-item { display:flex;align-items:center;gap:var(--space-3);width:100%;padding:var(--space-2) var(--space-5);background:none;border:none;text-align:left;font-family:var(--font-body);font-size:var(--text-sm);color:var(--color-text-secondary);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast); }
  .navbar__menu-item:hover { background:var(--color-bg-hover);color:var(--color-text-primary); }
  .navbar__menu-item--danger { color:var(--color-danger); }
  .navbar__menu-item--danger:hover { background:var(--color-danger-bg);color:var(--color-danger); }
  .navbar__menu-icon { display:flex;align-items:center;justify-content:center;width:20px; }
  .navbar__menu-footer { padding:var(--space-2) 0; }
  @media(max-width:768px) { .an-centre { display:none; } .navbar__brand-name { display:none; } }
`;

export default AdminNavbar;