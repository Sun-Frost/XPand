/* ============================================================
   PageHeader.tsx — XPand Design System  v3
   ─────────────────────────────────────────────────────────────
   ROOT CAUSE OF GLOW BUG (v1 + v2):
   The glow blob was position:absolute inside .ph-root, which
   lives inside framer-motion's <motion.main>. Framer Motion
   applies a transform on mount, which creates a new stacking
   context. Any position:absolute child is then clipped to
   that context's painted bounds — producing a visible rect
   instead of a soft bleed.

   FIX:
   The glow is now rendered via ReactDOM.createPortal() into
   document.body, as a position:fixed element. It escapes every
   stacking context in the tree. It anchors to the top-left of
   the viewport (matching where the page header sits) and fades
   out when the header scrolls away via IntersectionObserver.
   The blob is purely decorative and aria-hidden.

   STICKY NAVBAR TITLE: unchanged from v2.
   ============================================================ */

import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PageAccent = "violet" | "cyan" | "gold" | "emerald" | "rose";

export interface PageHeaderConfig {
  eyebrow: string;
  title: string;
  gradientWord?: string;
  subtitle: string;
  accent: PageAccent;
}

interface PageHeaderProps extends PageHeaderConfig {
  right?: ReactNode;
  className?: string;
}

// ── Accent palette ────────────────────────────────────────────────────────────

export const ACCENTS: Record<PageAccent, {
  eyebrow:   string;
  glowDark:  string;
  glowLight: string;
  gradA:     string;
  gradB:     string;
  underline: string;
}> = {
  violet: {
    eyebrow:   "var(--color-primary-400)",
    glowDark:  "rgba(155,124,255,0.22)",
    glowLight: "rgba(115,85,204,0.10)",
    gradA:     "var(--color-primary-300)",
    gradB:     "var(--color-primary-500)",
    underline: "var(--color-primary-400)",
  },
  cyan: {
    eyebrow:   "var(--color-cyan-400)",
    glowDark:  "rgba(34,211,238,0.20)",
    glowLight: "rgba(6,182,212,0.11)",
    gradA:     "var(--color-cyan-300)",
    gradB:     "var(--color-cyan-500)",
    underline: "var(--color-cyan-400)",
  },
  gold: {
    eyebrow:   "var(--color-gold-light)",
    glowDark:  "rgba(212,148,10,0.22)",
    glowLight: "rgba(184,119,8,0.10)",
    gradA:     "#F5D060",
    gradB:     "#C8860A",
    underline: "var(--color-gold-light)",
  },
  emerald: {
    eyebrow:   "var(--color-green-400)",
    glowDark:  "rgba(52,211,153,0.20)",
    glowLight: "rgba(11,158,120,0.11)",
    gradA:     "var(--color-green-300)",
    gradB:     "var(--color-green-500)",
    underline: "var(--color-green-400)",
  },
  rose: {
    eyebrow:   "#FB7185",
    glowDark:  "rgba(244,63,94,0.20)",
    glowLight: "rgba(244,63,94,0.09)",
    gradA:     "#FDA4AF",
    gradB:     "#F43F5E",
    underline: "#FB7185",
  },
};

// ── Page configs ──────────────────────────────────────────────────────────────

export const PAGE_CONFIGS: Record<string, PageHeaderConfig> = {
  dashboard: {
    eyebrow:      "COMMAND CENTER",
    title:        "Your",
    gradientWord: "Arena",
    subtitle:     "Track your XP, active missions, and career momentum — all in one view.",
    accent:       "violet",
  },
  challenges: {
    eyebrow:      "MISSION CONTROL",
    title:        "Active",
    gradientWord: "Challenges",
    subtitle:     "Every completed challenge moves the rank needle. Choose your next move.",
    accent:       "cyan",
  },
  jobs: {
    eyebrow:      "TALENT RADAR",
    title:        "Open",
    gradientWord: "Jobs",
    subtitle:     "Roles matched to your verified skill stack. Your badges speak for you.",
    accent:       "violet",
  },
  skills: {
    eyebrow:      "YOUR LIBRARY",
    title:        "Skill",
    gradientWord: "Vault",
    subtitle:     "Every verified skill is a credential employers can trust. Build the stack.",
    accent:       "emerald",
  },
  store: {
    eyebrow:      "SPEND WISELY",
    title:        "XP",
    gradientWord: "Store",
    subtitle:     "XP earned through performance — redeemed here for real career advantages.",
    accent:       "gold",
  },
  profile: {
    eyebrow:      "PLAYER IDENTITY",
    title:        "Your",
    gradientWord: "Record",
    subtitle:     "The professional story you've proven — not just claimed.",
    accent:       "violet",
  },
  leaderboard: {
    eyebrow:      "RANK BOARD",
    title:        "Top",
    gradientWord: "Performers",
    subtitle:     "The board doesn't lie. XP earned through verified achievement only.",
    accent:       "gold",
  },
};

// ── GlowPortal — rendered into document.body, position:fixed ─────────────────
// Escapes ALL stacking contexts (framer-motion, isolation:isolate, transforms).
// Fades based on `visible` prop driven by IntersectionObserver.

interface GlowPortalProps {
  accent: PageAccent;
  visible: boolean;
}

const GlowPortal: React.FC<GlowPortalProps> = ({ accent, visible }) => {
  const a = ACCENTS[accent];
  const [container] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "width:700px",
      "height:300px",
      "pointer-events:none",
      // High enough to be above page content but below navbar (z-index 200)
      "z-index:1",
      "overflow:hidden",
    ].join(";");
    return el;
  });

  // Mount / unmount the container div in body
  useEffect(() => {
    if (!container) return;
    document.body.appendChild(container);
    return () => { document.body.removeChild(container); };
  }, [container]);

  if (!container) return null;

  return createPortal(
    <>
      {/* Dark mode blob */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 55% 55% at 22% 40%, ${a.glowDark} 0%, transparent 70%)`,
          opacity: visible ? 1 : 0,
          transition: "opacity 1s cubic-bezier(0.4,0,0.2,1)",
          // Only visible in dark mode
        }}
        className="ph-portal-dark"
      />
      {/* Light mode blob */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 55% 55% at 22% 40%, ${a.glowLight} 0%, transparent 70%)`,
          opacity: visible ? 1 : 0,
          transition: "opacity 1s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="ph-portal-light"
      />
      <style>{`
        /* Only show the right blob for the active theme */
        [data-theme="dark"]  .ph-portal-light,
        :root:not([data-theme="light"]) .ph-portal-light { display: none; }
        [data-theme="light"] .ph-portal-dark             { display: none; }
      `}</style>
    </>,
    container
  );
};

// ── PageHeader ────────────────────────────────────────────────────────────────

const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  gradientWord,
  subtitle,
  accent,
  right,
  className = "",
}) => {
  const a = ACCENTS[accent];
  const [mounted,      setMounted]      = useState(false);
  const [glowVisible,  setGlowVisible]  = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Double-rAF: lets browser paint before triggering CSS transitions
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setMounted(true);
        setGlowVisible(true);
      })
    );
    return () => cancelAnimationFrame(id);
  }, []);

  // Sticky navbar title + glow fade-out on scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const fullTitle = gradientWord ? `${title} ${gradientWord}` : title;

    const obs = new IntersectionObserver(
      ([entry]) => {
        const gone = !entry.isIntersecting;
        // Fade glow out when header leaves viewport
        setGlowVisible(!gone);
        // Write page identity for NavbarPageTitle
        const html = document.documentElement;
        html.setAttribute("data-navbar-page-title",   gone ? fullTitle : "");
        html.setAttribute("data-navbar-page-eyebrow", gone ? eyebrow  : "");
        html.setAttribute("data-navbar-accent",       gone ? accent    : "");
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );

    obs.observe(sentinel);
    return () => {
      obs.disconnect();
      const html = document.documentElement;
      html.removeAttribute("data-navbar-page-title");
      html.removeAttribute("data-navbar-page-eyebrow");
      html.removeAttribute("data-navbar-accent");
      setGlowVisible(false);
    };
  }, [title, gradientWord, eyebrow, accent]);

  return (
    <>
      {/* Glow rendered into body via portal — escapes all stacking contexts */}
      <GlowPortal accent={accent} visible={glowVisible} />

      <header
        className={`ph-root${mounted ? " ph-root--visible" : ""}${className ? ` ${className}` : ""}`}
      >
        <div className="ph-body">
          <div className="ph-left">

            {/* Eyebrow */}
            <div className="ph-eyebrow" aria-hidden="true">
              <span className="ph-dash" style={{ background: a.eyebrow }} />
              <span className="ph-eyebrow-text" style={{ color: a.eyebrow }}>
                {eyebrow}
              </span>
            </div>

            {/* Title */}
            <h1
              className="ph-title"
              aria-label={gradientWord ? `${title} ${gradientWord}` : title}
            >
              <span className="ph-title-plain">{title}</span>
              {gradientWord && (
                <>
                  {" "}
                  <span className="ph-title-accent" aria-hidden="true">
                    <span
                      className="ph-title-shine"
                      style={{
                        backgroundImage: `linear-gradient(125deg, ${a.gradA} 0%, ${a.gradB} 55%, ${a.gradA} 100%)`,
                      }}
                    >
                      {gradientWord}
                    </span>
                    <span
                      className="ph-underline"
                      style={{
                        background: `linear-gradient(90deg, ${a.underline} 0%, transparent 100%)`,
                      }}
                    />
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="ph-subtitle">{subtitle}</p>
          </div>

          {/* Right slot */}
          {right && (
            <div className="ph-right" aria-label="Page actions">
              {right}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="ph-sep" aria-hidden="true" />

        {/* Sentinel for IntersectionObserver */}
        <div ref={sentinelRef} className="ph-sentinel" aria-hidden="true" />
      </header>

      <style>{pageHeaderCSS}</style>
    </>
  );
};

export default PageHeader;

export const NavbarPageTitle: React.FC = () => {
  const [state, setState] = useState({
    title:   "",
    eyebrow: "",
    accent:  "violet" as PageAccent,
    visible: false,
  });

  useEffect(() => {
    const sync = () => {
      const html    = document.documentElement;
      const title   = html.getAttribute("data-navbar-page-title")   ?? "";
      const eyebrow = html.getAttribute("data-navbar-page-eyebrow") ?? "";
      const accent  = (html.getAttribute("data-navbar-accent") ?? "violet") as PageAccent;
      setState({ title, eyebrow, accent, visible: !!title });
    };

    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-navbar-page-title",
        "data-navbar-page-eyebrow",
        "data-navbar-accent",
      ],
    });
    sync();
    return () => obs.disconnect();
  }, []);

  const accentColor = ACCENTS[state.accent]?.eyebrow ?? "var(--color-primary-400)";

  return (
    <>
      <div className={`npt-wrap${state.visible ? " npt-wrap--on" : ""}`}>
        <span className="npt-eyebrow" style={{ color: accentColor }}>
          {state.eyebrow}
        </span>
        {state.eyebrow && state.title && (
          <span className="npt-divider" aria-hidden="true" />
        )}
        <span className="npt-title">{state.title}</span>
      </div>
      <style>{navbarTitleCSS}</style>
    </>
  );
};

// ── CSS ───────────────────────────────────────────────────────────────────────

const pageHeaderCSS = `
  .ph-root {
    position: relative;
    padding: var(--space-8) 0 var(--space-6);
    /* No overflow:hidden — glow is in a portal, nothing to clip here */
  }

  /* Body layout */
  .ph-body {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
  }
  .ph-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  /* Right slot */
  .ph-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-shrink: 0;
    padding-bottom: 6px;
    opacity: 0;
    transform: translateX(20px);
    transition: opacity .45s cubic-bezier(.4,0,.2,1) .38s,
                transform .45s cubic-bezier(.4,0,.2,1) .38s;
  }
  .ph-root--visible .ph-right { opacity: 1; transform: translateX(0); }

  /* Eyebrow */
  .ph-eyebrow {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity .35s cubic-bezier(.4,0,.2,1),
                transform .35s cubic-bezier(.4,0,.2,1);
  }
  .ph-root--visible .ph-eyebrow { opacity: 1; transform: translateY(0); }

  .ph-dash {
    display: inline-block;
    width: 20px;
    height: 1.5px;
    border-radius: 999px;
    flex-shrink: 0;
    transform-origin: left center;
    transform: scaleX(0);
    transition: transform .4s cubic-bezier(.4,0,.2,1) .06s;
  }
  .ph-root--visible .ph-dash { transform: scaleX(1); }

  .ph-eyebrow-text {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    line-height: 1;
  }

  /* Title */
  .ph-title {
    font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--color-text-primary);
    margin: 0;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity .4s cubic-bezier(.4,0,.2,1) .08s,
                transform .4s cubic-bezier(.4,0,.2,1) .08s;
  }
  .ph-root--visible .ph-title { opacity: 1; transform: translateY(0); }

  .ph-title-plain { color: var(--color-text-primary); }

  .ph-title-accent {
    position: relative;
    display: inline-block;
    white-space: nowrap;
  }
  .ph-title-shine {
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ph-shimmer 4.5s linear 0.7s infinite;
  }

  .ph-underline {
    position: absolute;
    bottom: -3px;
    left: 0;
    height: 2.5px;
    width: 100%;
    border-radius: 999px;
    transform-origin: left center;
    transform: scaleX(0);
    opacity: 0;
    transition: transform .55s cubic-bezier(.16,1,.3,1) .36s,
                opacity .3s ease .36s;
  }
  .ph-root--visible .ph-underline { transform: scaleX(1); opacity: 1; }

  /* Subtitle */
  .ph-subtitle {
    font-size: var(--text-sm, 0.875rem);
    font-weight: 400;
    line-height: 1.65;
    color: var(--color-text-muted);
    max-width: 52ch;
    margin: 0;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity .38s cubic-bezier(.4,0,.2,1) .28s,
                transform .38s cubic-bezier(.4,0,.2,1) .28s;
  }
  .ph-root--visible .ph-subtitle { opacity: 1; transform: translateY(0); }

  /* Separator */
  .ph-sep {
    position: relative;
    z-index: 1;
    margin-top: var(--space-6);
    height: 1px;
    background: var(--color-border-subtle);
    transform-origin: left center;
    transform: scaleX(0);
    opacity: 0;
    transition: transform .6s cubic-bezier(.16,1,.3,1) .45s,
                opacity .3s ease .45s;
  }
  .ph-root--visible .ph-sep { transform: scaleX(1); opacity: 1; }

  /* Sentinel */
  .ph-sentinel {
    position: absolute;
    bottom: 0; left: 0;
    width: 1px; height: 1px;
    pointer-events: none;
    visibility: hidden;
  }

  @keyframes ph-shimmer {
    0%   { background-position: 150% 0; }
    100% { background-position: -50% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ph-eyebrow, .ph-dash, .ph-title,
    .ph-underline, .ph-subtitle, .ph-sep, .ph-right {
      transition: none !important;
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .ph-title-shine { animation: none !important; }
  }

  @media (max-width: 600px) {
    .ph-root  { padding: var(--space-6) 0 var(--space-4); }
    .ph-right { width: 100%; justify-content: flex-start; }
  }
`;

const navbarTitleCSS = `
  .npt-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    pointer-events: none;
  }
  .npt-eyebrow {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity .22s ease, transform .22s ease;
  }
  .npt-divider {
    display: inline-block;
    width: 1px;
    height: 10px;
    background: var(--color-border-strong);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity .22s ease .04s;
  }
  .npt-title {
    font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
    font-size: var(--text-sm, 0.875rem);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    white-space: nowrap;
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity .22s ease .04s, transform .22s ease .04s;
  }
  .npt-wrap--on .npt-eyebrow,
  .npt-wrap--on .npt-divider,
  .npt-wrap--on .npt-title {
    opacity: 1;
    transform: translateY(0);
  }
  @media (max-width: 640px) {
    .npt-eyebrow, .npt-divider { display: none; }
  }
`;