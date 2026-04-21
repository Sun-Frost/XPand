/* ============================================================
   CompanyNavbar.tsx
   Top navbar for authenticated company users.
   Same visual pattern as user Navbar but company-specific:
   - "Company" branding accent in avatar
   - Menu links go to /company/* routes
   - No XP balance (companies don't earn XP)
   - Shows company name and approval status
   ============================================================ */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { NavbarPageTitle } from "../ui/PageHeader";

interface CompanyNavbarProps {
  companyName: string | null;
  isApproved:  boolean;
  onToggleTheme: () => void;
  isDarkMode:    boolean;
}

const CompanyNavbar: React.FC<CompanyNavbarProps> = ({
  companyName,
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

  const initials = companyName
    ? companyName.slice(0, 2).toUpperCase()
    : "CO";

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Company navigation">

        {/* Left — brand */}
        <div className="navbar__left">
          <button className="navbar-brand" onClick={() => go("/company/dashboard")} aria-label="XPand home">
            <div className="navbar-brand-mark">
              <div className="navbar__logo-inner">
                <span className="navbar__logo-text">XP</span>
              </div>
            </div>
            <span className="logo-wordmark navbar__brand-name">XPand</span>
          </button>
        </div>

        {/* Centre — scrolled-in page title (same mechanism as user Navbar) */}
        <div className="navbar__centre">
          <NavbarPageTitle />
        </div>

        {/* Right — theme + menu */}
        <div className="navbar__right">

          {/* Theme toggle */}
          <button className="btn btn-ghost btn-icon navbar__icon-btn"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
            {isDarkMode ? <Icon name="sun" size={14} label="" /> : <Icon name="moon" size={14} label="" />}
          </button>

          {/* Company menu */}
          <div className="navbar__dropdown-anchor" ref={menuRef}>
            <button
              className="navbar__avatar-btn"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="Company menu"
              aria-expanded={isMenuOpen}
            >
              <div className="cn-avatar">{initials}</div>
              <ChevronIcon open={isMenuOpen} />
            </button>

            {isMenuOpen && (
              <div className="navbar__dropdown navbar__user-menu" role="menu">
                <div className="navbar__user-info">
                  <p className="navbar__user-name">{companyName ?? "Company"}</p>
                  <p className="navbar__user-email">Company Account</p>
                  
                </div>
                <div className="divider" style={{ margin: 0 }} />
                <ul className="navbar__menu-list">
                  {[
                    { label: "Dashboard",     path: "/company/dashboard", icon: <Icon name="market-intel" size={14} label="" /> },
                    { label: "Manage Jobs",   path: "/company/jobs",      icon: <Icon name="briefcase" size={14} label="" /> },
                    { label: "Post New Job",  path: "/company/jobs/new",  icon: <Icon name="add-job" size={14} label="" /> },
                    { label: "Market Insights", path: "/company/insights", icon: <Icon name="filter-growing" size={14} label="" /> },
                    { label: "Company Profile", path: "/company/profile",  icon: <Icon name="profile" size={14} label="" /> },
                  ].map((item) => (
                    <li key={item.path} role="menuitem">
                      <button className="navbar__menu-item" onClick={() => go(item.path)}>
                        <span className="navbar__menu-icon">{item.icon}</span>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="divider" style={{ margin: 0 }} />
                <div className="navbar__menu-footer">
                  <button className="navbar__menu-item navbar__menu-item--danger" onClick={handleSignOut}>
                    <span className="navbar__menu-icon"><Icon name="logout" size={14} label="" /></span>
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
  .cn-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--color-premium, #8B5CF6), var(--color-verified, #34D399));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: var(--weight-bold);
    color: #fff;
    flex-shrink: 0;
  }
  /* Reuse user navbar base styles that already exist in theme */
  .navbar__centre { flex:1;display:flex;justify-content:center;padding:0 var(--space-6);max-width:520px;margin:0 auto; }align-items:center;gap:var(--space-3);flex-shrink:0; }
  .navbar-brand { display:flex;align-items:center;gap:var(--space-3);background:none;border:none;cursor:pointer;text-decoration:none;font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);letter-spacing:var(--tracking-wide);color:var(--color-text-primary); }
  .navbar__logo-inner { width:100%;height:100%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md); }
  .navbar__logo-text { font-family:var(--font-display);font-size:11px;font-weight:var(--weight-bold);color:#fff;letter-spacing:0.05em; }
  .navbar__brand-name { font-size:var(--text-xl); }
  .navbar__right { display:flex;align-items:center;gap:var(--space-2);flex-shrink:0; }
  .navbar__icon-btn { color:var(--color-text-muted);position:relative; }
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
  .navbar__menu-icon { font-size:var(--text-base);width:20px;text-align:center; }
  .navbar__menu-footer { padding:var(--space-2) 0; }
  .badge-warning { background:var(--color-warning-bg);border-color:var(--color-warning-border);color:var(--color-warning); }
  @media(max-width:768px) { .cn-centre,.navbar__brand-name { display:none; } }
`;

export default CompanyNavbar;