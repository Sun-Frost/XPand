import { useNavigate } from "react-router-dom";
import "../assets/css/LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();


  return (
    <div className="landing-root">
      {/* ── Background atmosphere ──────────────────────────── */}
      <div className="landing-bg-orb landing-bg-orb-1" />
      <div className="landing-bg-orb landing-bg-orb-2" />
      <div className="landing-bg-grid" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-nav-mark">
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 6 L34 20 L26 20 L26 34 L14 34 L14 20 L6 20 Z"
                fill="url(#nav-grad)"
              />
              <defs>
                <linearGradient id="nav-grad" x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-wordmark" style={{ fontSize: "1.1rem" }}>XPand</span>
        </div>

        <div className="landing-nav-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/register")}
          >
            Get Started
          </button>
        </div>
      </nav>

       {/* ── Hero ───────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">

          {/* Eyebrow badge */}
          <div className="landing-eyebrow animate-fade-in">
            <span className="badge badge-primary">
              <span>✦</span> Skill-First Hiring Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="landing-headline animate-fade-in" style={{ animationDelay: "80ms" }}>
            Prove Your Skills.
            <br />
            <span className="landing-headline-accent">Get Hired.</span>
          </h1>

          {/* Subtext */}
          <p className="landing-subtext animate-fade-in" style={{ animationDelay: "160ms" }}>
            XPand replaces resumes with verified skills, badges, and XP.
            <br />
            Employers see what you can actually do — not just what you claim.
          </p>

          {/* CTAs */}
          <div className="landing-ctas animate-fade-in" style={{ animationDelay: "240ms" }}>
            <button
              className="btn btn-primary btn-lg landing-cta-primary"
              onClick={() => navigate("/register")}
            >
              Create Your Profile
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => navigate("/login")}
            >
              I already have an account
            </button>
          </div>

          {/* Social proof strip */}
          <div className="landing-proof animate-fade-in" style={{ animationDelay: "320ms" }}>
            <div className="landing-proof-avatars">
              {["A", "M", "D", "R"].map((initial, i) => (
                <div key={i} className="landing-proof-avatar" style={{ zIndex: 4 - i }}>
                  {initial}
                </div>
              ))}
            </div>
            <p className="landing-proof-text">
              Join <strong>2,400+</strong> verified professionals
            </p>
          </div>
        </div>

        {/* Hero visual — floating skill cards */}
        <div className="landing-hero-visual animate-fade-in" style={{ animationDelay: "200ms" }}>
          <HeroVisual />
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────── */}
      <section className="landing-features">
        <div className="landing-features-label label">How it works</div>

        <div className="landing-features-grid stagger">

          {/* Card 1 — Skill Verification */}
          <div className="landing-feature-card card card-interactive card-glow-cyan animate-fade-in">
            <div className="landing-feature-icon landing-feature-icon-cyan">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
            </div>
            <div className="landing-feature-step label">Step 01</div>
            <h3 className="landing-feature-title">Skill Verification</h3>
            <p className="landing-feature-desc">
              Take structured skill tests across development, design, and data.
              Pass them and earn a verified badge — bronze, silver, or gold —
              that proves your level.
            </p>
            <div className="landing-feature-footer">
              <span className="badge badge-cyan">Verified Tests</span>
              <span className="badge badge-muted">100+ Skills</span>
            </div>
          </div>

          {/* Card 2 — Earn XP & Badges */}
          <div className="landing-feature-card card card-interactive card-glow-gold animate-fade-in">
            <div className="landing-feature-icon landing-feature-icon-gold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="landing-feature-step label">Step 02</div>
            <h3 className="landing-feature-title">Earn XP &amp; Badges</h3>
            <p className="landing-feature-desc">
              Every test, challenge, and verified skill earns you XP. Build your
              profile like a character sheet — your earned XP and badges tell
              your story without a single line of resume.
            </p>
            <div className="landing-feature-footer">
              <span className="badge badge-gold">XP Currency</span>
              <span className="badge badge-muted">3 Badge Tiers</span>
            </div>
          </div>

          {/* Card 3 — Get Ranked */}
          <div className="landing-feature-card card card-interactive card-glow-primary animate-fade-in">
            <div className="landing-feature-icon landing-feature-icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="landing-feature-step label">Step 03</div>
            <h3 className="landing-feature-title">Get Ranked by Employers</h3>
            <p className="landing-feature-desc">
              Employers post jobs with required skills and badge levels. Your
              verified profile is matched against open roles — no cover letters,
              no guesswork. Pure skill fit.
            </p>
            <div className="landing-feature-footer">
              <span className="badge badge-primary">Skill Matching</span>
              <span className="badge badge-muted">Verified Hiring</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── Bottom CTA band ────────────────────────────────── */}
      <section className="landing-bottom-cta">
        <div className="landing-bottom-cta-inner card card-elevated card-accent-top">
          <div className="card-body landing-bottom-cta-body">
            <div>
              <h2 className="landing-bottom-title">Ready to level up?</h2>
              <p className="landing-bottom-sub">
                Join thousands of job seekers who let their skills speak for them.
              </p>
            </div>
            <button
              className="btn btn-xp btn-lg landing-bottom-btn"
              onClick={() => navigate("/register")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Start for Free
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <span className="logo-wordmark" style={{ fontSize: "0.9rem" }}>XPand</span>
        <span className="landing-footer-sep" />
        <span className="label" style={{ fontSize: "0.65rem" }}>
          Level Up Your Skill Set
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;

/* ── Sub-components ──────────────────────────────────────── */

const features = [
  {
    icon: "◈",
    iconColor: "cyan",
    title: "Skill Verification",
    description:
      "Take structured tests curated by industry experts. Every score is tamper-proof and timestamped — employers can trust what they see.",
    badge: "Bronze · Silver · Gold",
    badgeVariant: "badge-gold",
  },
  {
    icon: "⬡",
    iconColor: "primary",
    title: "Earn XP & Badges",
    description:
      "Every test you pass, challenge you complete, and skill you verify earns XP. Watch your profile rank climb as your skill tree grows.",
    badge: "+50 XP per challenge",
    badgeVariant: "badge-cyan",
  },
  {
    icon: "◎",
    iconColor: "green",
    title: "Get Ranked by Employers",
    description:
      "Companies post jobs with required skills. You're matched and ranked automatically based on verified badges — no cover letter needed.",
    badge: "Verified match",
    badgeVariant: "badge-success",
  },
];

interface FeatureCardProps {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  badge: string;
  badgeVariant: string;
}

const FeatureCard = ({ icon, iconColor, title, description, badge, badgeVariant }: FeatureCardProps) => (
  <div className={`landing-feature-card card card-interactive card-glow-${iconColor === "cyan" ? "cyan" : iconColor === "primary" ? "primary" : "cyan"} animate-fade-in`}>
    <div className="card-body">
      <div className={`landing-feature-icon landing-feature-icon--${iconColor}`}>
        {icon}
      </div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{description}</p>
      <span className={`badge ${badgeVariant} mt-4`}>{badge}</span>
    </div>
  </div>
);

const tiers = [
  {
    name: "Bronze",
    icon: "🥉",
    cls: "bronze",
    xp: "100 XP",
    description: "You know the fundamentals. Employers can see you're not starting from zero.",
  },
  {
    name: "Silver",
    icon: "🥈",
    cls: "silver",
    xp: "250 XP",
    description: "Solid working knowledge. You're ready to contribute from day one.",
  },
  {
    name: "Gold",
    icon: "🏆",
    cls: "gold",
    xp: "500 XP",
    description: "Top-tier verified expertise. You'll stand out from every other applicant.",
  },
];

interface TierCardProps {
  name: string;
  icon: string;
  cls: string;
  xp: string;
  description: string;
}

const TierCard = ({ name, icon, cls, xp, description }: TierCardProps) => (
  <div className="landing-tier-card animate-fade-in">
    <div className={`skill-badge ${cls}`} style={{ width: "100%" }}>
      <span className="skill-badge-icon">{icon}</span>
      <span>{name}</span>
    </div>
    <div className="landing-tier-body">
      <span className="xp-pill">
        <span className="xp-icon">XP</span>
        {xp}
      </span>
      <p className="landing-tier-desc">{description}</p>
    </div>
  </div>
);

/* ── Hero visual — floating XP cards ────────────────────── */
const HeroVisual = () => (
  <div className="hero-visual-wrap">
    {/* Main profile card */}
    <div className="hero-card hero-card-main card card-elevated">
      <div className="hero-card-header">
        <div className="avatar avatar-md" style={{ background: "var(--color-primary-glow)", color: "var(--color-primary-400)" }}>
          AJ
        </div>
        <div>
          <div className="hero-card-name">Alex Johnson</div>
          <div className="label" style={{ fontSize: "10px" }}>Full-Stack Developer</div>
        </div>
        <span className="badge badge-success" style={{ marginLeft: "auto" }}>Verified</span>
      </div>

      <div className="hero-card-xp">
        <div className="xp-display">
          <span className="xp-icon">XP</span>
          <span className="xp-amount">4,820</span>
        </div>
        <div className="label" style={{ fontSize: "10px" }}>Total earned</div>
      </div>

      <div className="hero-card-skills">
        {[
          { name: "React", tier: "gold" },
          { name: "TypeScript", tier: "silver" },
          { name: "Node.js", tier: "gold" },
        ].map((s) => (
          <span key={s.name} className={`badge badge-${s.tier}`}>{s.name}</span>
        ))}
      </div>

      <div className="hero-card-progress">
        <div className="flex justify-between mb-2" style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          <span>Level 12 progress</span>
          <span className="text-xp">+180 XP to next</span>
        </div>
        <div className="progress-track progress-track-lg">
          <div className="progress-fill progress-xp animated" style={{ width: "72%" }} />
        </div>
      </div>
    </div>

    {/* Floating XP gain toast */}
    <div className="hero-float hero-float-xp">
      <div className="xp-display">
        <span className="xp-icon">XP</span>
        <span className="xp-amount-sm text-xp">+500</span>
      </div>
      <span className="badge badge-gold">Gold Earned</span>
    </div>

    {/* Floating match card */}
    <div className="hero-float hero-float-match card">
      <div className="flex items-center gap-3">
        <span style={{ fontSize: "1.25rem" }}>🏢</span>
        <div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-primary)" }}>
            TechCorp
          </div>
          <div className="label" style={{ fontSize: "9px" }}>98% skill match</div>
        </div>
      </div>
    </div>
  </div>
);
