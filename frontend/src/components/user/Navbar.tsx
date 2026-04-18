import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../../types";
import { Icon } from "../ui/Icon";
import { NavbarPageTitle } from "../ui/PageHeader";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavbarProps {
  user: User | null;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

const Navbar: React.FC<NavbarProps> = ({
  user,
  onToggleSidebar,
  isSidebarCollapsed,
  onToggleTheme,
  isDarkMode,
}) => {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setIsUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (path: string) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    navigate("/login", { replace: true });
  };

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "?";


  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        {/* Left */}
        <div className="navbar__left">
          <button className="navbar-brand" onClick={() => go("/dashboard")} aria-label="XPand home">
            <div className="navbar-brand-mark">
              <div className="navbar__logo-inner">
                <span className="navbar__logo-text">XP</span>
              </div>
            </div>
            <span className="logo-wordmark navbar__brand-name">XPand</span>
          </button>
        </div>

       <div className="navbar__centre">
        <NavbarPageTitle />
      </div>
 

        {/* Right */}
        <div className="navbar__right">
          {user && (
            <div className="xp-pill navbar__xp" title="Your XP balance">
              <span>⚡</span>
              <span>{user.xpBalance.toLocaleString()} XP</span>
            </div>
          )}

          

          {/* Theme toggle */}
          <button className="btn btn-ghost btn-icon navbar__icon-btn"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
            {isDarkMode ? <Icon name="sun" size={14} label="" /> : <Icon name="moon" size={14} label="" />}
          </button>

          {/* User menu */}
          <div className="navbar__dropdown-anchor" ref={userMenuRef}>
            <button className="navbar__avatar-btn"
              onClick={() => { setIsUserMenuOpen((v) => !v); setIsNotifOpen(false); }}
              aria-label="User menu" aria-expanded={isUserMenuOpen}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`}
                  className="avatar avatar-sm navbar__avatar-img" />
              ) : (
                <div className="avatar avatar-sm navbar__avatar-initials">{initials}</div>
              )}
              <ChevronIcon open={isUserMenuOpen} />
            </button>
            {isUserMenuOpen && (
              <div className="navbar__dropdown navbar__user-menu" role="menu">
                {user && (
                  <div className="navbar__user-info">
                    <p className="navbar__user-name">{user.firstName} {user.lastName}</p>
                    <p className="navbar__user-email">{user.email}</p>
                    {user.professionalTitle && (
                      <span className="badge badge-primary navbar__user-title">
                        {user.professionalTitle}
                      </span>
                    )}
                  </div>
                )}
                <div className="divider" style={{ margin: 0 }} />
                <ul className="navbar__menu-list">
                  {[
                    { label: "My Profile", path: "/profile", icon: <Icon name="profile" size={14} label="" /> },
                    { label: "My Skills", path: "/skills", icon: <Icon name="skills" size={14} label="" /> },
                    { label: "Challenges", path: "/challenges", icon: <Icon name="challenges" size={14} label="" /> },
                    { label: "XP Store", path: "/store", icon: <Icon name="store" size={14} label="" /> },
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
                  <button className="navbar__menu-item navbar__menu-item--danger"
                    onClick={handleSignOut}>
                    <span className="navbar__menu-icon"><Icon name="logout" size={14} label="" /></span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style>{navbarStyles}</style>
    </>
  );
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const HamburgerIcon: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="4" width="14" height="1.5" rx="0.75" fill="currentColor" />
    <rect x="2" y="8.25" width={collapsed ? "10" : "14"} height="1.5" rx="0.75"
      fill="currentColor" style={{ transition: "width 0.25s ease" }} />
    <rect x="2" y="12.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <line x1="10" y1="10" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const BellIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 2a5 5 0 0 0-5 5v3l-1.5 2h13L14 10V7a5 5 0 0 0-5-5Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M7.5 14.5a1.5 1.5 0 0 0 3 0"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const navbarStyles = `
  .navbar__left { display:flex;align-items:center;gap:var(--space-3);flex-shrink:0; }
  .navbar__hamburger { color:var(--color-text-muted); }
  .navbar__hamburger:hover { color:var(--color-text-primary); }
  .navbar-brand {
    display:flex;align-items:center;gap:var(--space-3);
    background:none;border:none;cursor:pointer;text-decoration:none;
    font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);
    letter-spacing:var(--tracking-wide);color:var(--color-text-primary);
  }
  .navbar__logo-inner {
    width:100%;height:100%;background:var(--gradient-primary);
    display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md);
  }
  .navbar__logo-text { font-family:var(--font-display);font-size:11px;font-weight:var(--weight-bold);color:#fff;letter-spacing:0.05em; }
  .navbar__brand-name { font-size:var(--text-xl); }
  .navbar__centre { flex:1;display:flex;justify-content:center;padding:0 var(--space-6);max-width:520px;margin:0 auto; }
  .navbar__search {
    display:flex;align-items:center;gap:var(--space-2);width:100%;
    background:var(--color-bg-elevated);border:1px solid var(--color-border-default);
    border-radius:var(--radius-full);padding:0.4rem var(--space-4);
    color:var(--color-text-muted);transition:border-color var(--duration-base),box-shadow var(--duration-base);
  }
  .navbar__search:focus-within { border-color:var(--color-border-focus);box-shadow:0 0 0 3px var(--color-primary-glow); }
  .navbar__search-input { flex:1;background:none;border:none;outline:none;font-family:var(--font-body);font-size:var(--text-sm);color:var(--color-text-primary); }
  .navbar__search-input::placeholder { color:var(--color-text-disabled); }
  .navbar__search-kbd { font-family:var(--font-mono);font-size:10px;color:var(--color-text-disabled);background:var(--color-bg-overlay);border:1px solid var(--color-border-subtle);border-radius:var(--radius-xs);padding:1px 5px; }
  .navbar__right { display:flex;align-items:center;gap:var(--space-2);flex-shrink:0; }
  .navbar__xp { font-size:var(--text-xs); }
  .navbar__icon-btn { color:var(--color-text-muted);position:relative; }
  .navbar__icon-btn:hover { color:var(--color-text-primary); }
  .navbar__notif-dot { position:absolute;top:4px;right:4px;min-width:16px;height:16px;border-radius:var(--radius-full);background:var(--color-danger);color:#fff;font-family:var(--font-mono);font-size:9px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--color-bg-base); }
  .navbar__avatar-btn { display:flex;align-items:center;gap:var(--space-2);background:none;border:1px solid var(--color-border-default);border-radius:var(--radius-full);padding:3px var(--space-2) 3px 3px;cursor:pointer;color:var(--color-text-muted);transition:border-color var(--duration-base),background var(--duration-base); }
  .navbar__avatar-btn:hover { border-color:var(--color-border-strong);background:var(--color-bg-hover);color:var(--color-text-primary); }
  .navbar__avatar-initials { background:var(--gradient-primary);color:#fff;font-family:var(--font-display);font-weight:var(--weight-bold);font-size:var(--text-xs);border:none; }
  .navbar__dropdown-anchor { position:relative; }
  .navbar__dropdown { position:absolute;top:calc(100% + var(--space-2));right:0;background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);z-index:var(--z-dropdown);animation:fadeIn 0.18s var(--ease-smooth);overflow:hidden; }
  .navbar__notif-panel { width:320px; }
  .navbar__dropdown-header { display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--color-border-subtle); }
  .navbar__dropdown-action { background:none;border:none;font-size:var(--text-xs);color:var(--color-primary-400);cursor:pointer;font-family:var(--font-body);padding:0; }
  .navbar__dropdown-footer { padding:var(--space-3) var(--space-5);border-top:1px solid var(--color-border-subtle);text-align:center; }
  .navbar__notif-list { list-style:none; }
  .navbar__notif-item { display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-subtle);cursor:pointer;transition:background var(--duration-fast); }
  .navbar__notif-item:hover { background:var(--color-bg-hover); }
  .navbar__notif-item--unread { background:var(--color-info-bg); }
  .navbar__notif-dot-inline { flex-shrink:0;width:7px;height:7px;border-radius:50%;background:var(--color-primary-500);margin-top:5px;opacity:0; }
  .navbar__notif-item--unread .navbar__notif-dot-inline { opacity:1; }
  .navbar__notif-content { flex:1; }
  .navbar__notif-text { font-size:var(--text-sm);color:var(--color-text-secondary);line-height:var(--leading-snug);margin:0; }
  .navbar__notif-time { font-family:var(--font-mono);font-size:10px;color:var(--color-text-disabled);display:block;margin-top:2px; }
  .navbar__user-menu { width:240px; }
  .navbar__user-info { padding:var(--space-4) var(--space-5);display:flex;flex-direction:column;gap:var(--space-1); }
  .navbar__user-name { font-family:var(--font-display);font-size:var(--text-md);font-weight:var(--weight-semibold);color:var(--color-text-primary);margin:0; }
  .navbar__user-email { font-size:var(--text-xs);color:var(--color-text-muted);margin:0; }
  .navbar__user-title { margin-top:var(--space-1); }
  .navbar__menu-list { list-style:none;padding:var(--space-2) 0; }
  .navbar__menu-item { display:flex;align-items:center;gap:var(--space-3);width:100%;padding:var(--space-2) var(--space-5);background:none;border:none;text-align:left;font-family:var(--font-body);font-size:var(--text-sm);color:var(--color-text-secondary);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast); }
  .navbar__menu-item:hover { background:var(--color-bg-hover);color:var(--color-text-primary); }
  .navbar__menu-item--danger { color:var(--color-danger); }
  .navbar__menu-item--danger:hover { background:var(--color-danger-bg);color:var(--color-danger); }
  .navbar__menu-icon { font-size:var(--text-base);width:20px;text-align:center; }
  .navbar__menu-footer { padding:var(--space-2) 0; }
  @media (max-width:768px) { .navbar__centre,.navbar__xp,.navbar__brand-name { display:none; } }
  @media (max-width:480px) { .navbar__notif-panel { width:290px;right:-60px; } }
`;

export default Navbar;