import { useEffect, useRef, useState, type JSX } from "react";
import "../assets/css/LandingPage.css";

/* ─────────────────────────────────────────────
   Panel definitions — sourced from real app pages
───────────────────────────────────────────── */
const panels = [
  {
    letter: "X",
    word: "eXpose",
    tagline: "Real Skills",
    hook: "Stop listing skills.\nStart proving them.",
    body: "Your abilities are visible, not buried in a resume. Verified badges in React, TypeScript, Node.js — earned through structured tests, shared directly with employers.",
    userValue: ["Gold, Silver & Bronze badges per skill", "Badges shared directly with companies"],
    companyValue: ["Instantly see verified competency levels", "No resume keyword guessing"],
    accent: "violet",
    previewType: "badges",
  },
  {
    letter: "P",
    word: "Prove",
    tagline: "Your Ability",
    hook: "Anyone can say it.\nFew can prove it.",
    body: "15 questions. 15 minutes. Your result determines your badge level. 3 attempts per month — every attempt counts. Your score speaks before you do.",
    userValue: ["Timed skill tests across Frontend, Backend, Data & Cloud", "3 monthly attempts — results are permanent"],
    companyValue: ["Trust candidates based on verified test results", "Filter by badge tier: Bronze → Silver → Gold"],
    accent: "cyan",
    previewType: "test",
  },
  {
    letter: "A",
    word: "Access",
    tagline: "Opportunities",
    hook: "No more blind\napplications.",
    body: "Jobs unlock based on your badge level. Earn XP through challenges and spend it in the XP Store — priority applications, salary insights, skill gap reports.",
    userValue: ["Apply only when your badges meet the job requirements", "Spend XP on Priority Apply, Salary Insights & Reports"],
    companyValue: ["Receive only badge-verified, qualified applicants", "Match score calculated from real skill data — not keywords"],
    accent: "gold",
    previewType: "access",
  },
  {
    letter: "N",
    word: "Navigate",
    tagline: "Your Growth",
    hook: "No guessing.\nJust direction.",
    body: "Daily, Weekly, Streak, and Milestone challenges keep you moving. Mission tracks show exactly where you are and what to do next. XP is your fuel.",
    userValue: ["Daily Ops, Skill Path & Weekly Push mission tracks", "See your market coverage gaps instantly"],
    companyValue: ["Identify candidates with active growth momentum", "Track trajectory, not just current badge level"],
    accent: "green",
    previewType: "progress",
  },
  {
    letter: "D",
    word: "Differentiate",
    tagline: "Yourself",
    hook: "Be seen for\nwhat you've done.",
    body: "Mock interviews with live sentiment analysis. AI interviewers in Good Cop or Bad Cop mode. Every completed challenge adds XP. Your profile is built entirely from proof.",
    userValue: ["Live AI mock interviews with real-time sentiment tracking", "XP Store: priority access, reports & career perks"],
    companyValue: ["Discover top-tier, self-improving candidates fast", "Every profile is backed by test data, not claims"],
    accent: "purple",
    previewType: "interview",
  },
];

/* ─────────────────────────────────────────────
   X — Skills Library (badge tiers from real app)
───────────────────────────────────────────── */
function BadgesPreview() {
  const skills = [
    { name: "React",      tier: "gold",   category: "Frontend" },
    { name: "TypeScript", tier: "silver", category: "Frontend" },
    { name: "Node.js",    tier: "bronze", category: "Backend"  },
    { name: "PostgreSQL", tier: null,     category: "Data"     },
  ];
  const cfg: Record<string, { color: string; bg: string; border: string }> = {
    gold:   { color: "var(--color-gold-light)",   bg: "var(--color-gold-bg)",   border: "var(--color-gold-border)"   },
    silver: { color: "var(--color-silver-light)", bg: "var(--color-silver-bg)", border: "var(--color-silver-border)" },
    bronze: { color: "var(--color-bronze-light)", bg: "var(--color-bronze-bg)", border: "var(--color-bronze-border)" },
  };

  return (
    <div className="preview-skills">
      <div className="prev-skills__header">
        <span className="prev-skills__title">Skills Library</span>
        <span className="prev-skills__coverage">Market Coverage · 75%</span>
      </div>
      <div className="prev-skills__track">
        <div className="prev-skills__fill" style={{ width: "75%" }} />
      </div>
      <div className="prev-skills__list">
        {skills.map((s) => (
          <div key={s.name} className={`prev-skill-row${!s.tier ? " unverified" : ""}`}>
            <div className="prev-skill-row__left">
              <div
                className="prev-skill-orb"
                style={s.tier ? {
                  background: cfg[s.tier].bg,
                  borderColor: cfg[s.tier].border,
                  color: cfg[s.tier].color,
                } : undefined}
              >
                {s.tier ? "✓" : "·"}
              </div>
              <div>
                <div className="prev-skill-row__name">{s.name}</div>
                <div className="prev-skill-row__cat">{s.category}</div>
              </div>
            </div>
            {s.tier ? (
              <span className="prev-tier-pill" style={{ color: cfg[s.tier].color, background: cfg[s.tier].bg, borderColor: cfg[s.tier].border }}>
                {s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}
              </span>
            ) : (
              <button className="prev-verify-btn">Verify →</button>
            )}
          </div>
        ))}
      </div>
      <div className="prev-skills__stats">
        <span style={{ color: "var(--color-gold-light)" }}>2 Gold</span>
        <span style={{ color: "var(--color-silver-light)" }}>1 Silver</span>
        <span style={{ color: "var(--color-bronze-light)" }}>1 Bronze</span>
        <span style={{ color: "var(--color-text-muted)" }}>1 Unverified</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   P — Skill Test page (15q / 15min, 3 attempts)
───────────────────────────────────────────── */
function TestPreview() {
  return (
    <div className="preview-test">
      <div className="prev-test__header">
        <div>
          <div className="prev-test__skill">TypeScript · Advanced</div>
          <span className="prev-test__cat-badge">Frontend</span>
        </div>
        <div className="prev-test__timer-box">
          <div className="prev-test__timer">12:44</div>
          <div className="prev-test__timer-label">remaining</div>
        </div>
      </div>

      <div className="prev-test__progress-row">
        <div className="prev-test__track">
          <div className="prev-test__fill" style={{ width: "33%" }} />
        </div>
        <span className="prev-test__q-count">Q5 / 15</span>
      </div>

      <div className="prev-test__question">
        Which utility type makes all properties of <code>T</code> optional?
      </div>

      {[
        { label: "A", text: "Partial<T>",   selected: true  },
        { label: "B", text: "Required<T>",  selected: false },
        { label: "C", text: "Readonly<T>",  selected: false },
        { label: "D", text: "Pick<T, K>",   selected: false },
      ].map((opt) => (
        <div key={opt.label} className={`prev-test__option${opt.selected ? " selected" : ""}`}>
          <span className="prev-test__opt-label">{opt.label}</span>
          <code>{opt.text}</code>
        </div>
      ))}

      <div className="prev-test__attempts-row">
        <div className="prev-attempt__dots">
          <span className="prev-attempt__dot used" />
          <span className="prev-attempt__dot used" />
          <span className="prev-attempt__dot" />
        </div>
        <span className="prev-test__attempt-label">2 of 3 monthly attempts used</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   A — Job Details (skill requirements + XP Store)
───────────────────────────────────────────── */
function AccessPreview() {
  return (
    <div className="preview-access">
      <div className="prev-job">
        <div className="prev-job__top">
          <div>
            <div className="prev-job__role">Senior Frontend Engineer</div>
            <div className="prev-job__company">Vercel · Remote · Full-time</div>
          </div>
          {/* Match ring */}
          <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
            <svg viewBox="0 0 44 44" width="44" height="44" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(45,212,160,0.12)" strokeWidth="3.5" />
              <circle cx="22" cy="22" r="18" fill="none"
                stroke="var(--color-green-400)" strokeWidth="3.5"
                strokeDasharray={`${0.88 * 113} 113`}
                strokeLinecap="round" />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-green-400)", fontFamily: "var(--font-mono)" }}>88%</span>
          </div>
        </div>

        <div className="prev-jd-skills-title">
          <span className="prev-jd-star">★</span> Skill Requirements
          <span className="prev-jd-req-count">2 / 3 verified</span>
        </div>

        {[
          { name: "React",      badge: "gold",   required: true },
          { name: "TypeScript", badge: "silver", required: true },
          { name: "Node.js",    badge: null,     required: true },
        ].map((s) => (
          <div key={s.name} className={`prev-jd-skill${!s.badge && s.required ? " missing" : ""}`}>
            <span className={`prev-jd-orb${s.badge ? " ok" : " warn"}`}>{s.badge ? "✓" : "!"}</span>
            <span className="prev-jd-name">{s.name}</span>
            {s.badge ? (
              <span className={`prev-jd-tier prev-jd-tier--${s.badge}`}>{s.badge.charAt(0).toUpperCase() + s.badge.slice(1)}</span>
            ) : (
              <span className="prev-jd-verify">Verify now →</span>
            )}
          </div>
        ))}

        <div className="prev-apply-locked">
          Verify Node.js to unlock your application
        </div>
      </div>

      <div className="prev-xp-store">
        <span className="prev-store__label">⚡ XP Store</span>
        <div className="prev-store__items">
          <div className="prev-store__item">Priority Apply        <span>200 XP</span></div>
          <div className="prev-store__item">Salary Insights       <span>400 XP</span></div>
          <div className="prev-store__item">Skill Gap Report      <span>150 XP</span></div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   N — Challenges (Mission Control: rank, tracks, featured mission)
───────────────────────────────────────────── */
function ProgressPreview() {
  return (
    <div className="preview-challenges">
      {/* Mission Command strip */}
      <div className="prev-mission-cmd">
        <div className="prev-rank-orb">IV</div>
        <div className="prev-rank-info">
          <div className="prev-rank-label">Expert</div>
          <div className="prev-rank-xp">4,820 XP total</div>
        </div>
        <div className="prev-rank-stats">
          <div className="prev-stat-pill green">
            <div className="prev-stat-val">12</div>
            <div className="prev-stat-lbl">DONE</div>
          </div>
          <div className="prev-stat-pill primary">
            <div className="prev-stat-val">3</div>
            <div className="prev-stat-lbl">ACTIVE</div>
          </div>
        </div>
      </div>

      <div className="prev-xp-bar-row">
        <div className="prev-xp-track"><div className="prev-xp-fill" style={{ width: "68%" }} /></div>
        <span className="prev-xp-label">680 XP to Master</span>
      </div>

      {/* Mission tracks */}
      <div className="prev-tracks">
        {[
          { label: "Daily Ops",   dots: ["done","done","active","active","locked","locked"], resetLabel: "resets daily" },
          { label: "Skill Path",  dots: ["done","active","locked","locked"],                resetLabel: "ongoing"      },
          { label: "Weekly Push", dots: ["done","done","done","active","locked"],            resetLabel: "resets weekly"},
        ].map((track) => (
          <div key={track.label} className="prev-track">
            <div className="prev-track__top">
              <span className="prev-track__label">{track.label}</span>
              <span className="prev-track__reset">{track.resetLabel}</span>
            </div>
            <div className="prev-track__dots">
              {track.dots.map((state, i) => (
                <div key={i} className={`prev-dot prev-dot--${state}`}>
                  {state === "done" ? "✓" : state === "active" ? String(i + 1) : "·"}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Featured mission */}
      <div className="prev-featured-mission">
        <div className="prev-fm__top">
          <span className="prev-fm__cat">DAILY</span>
          <span className="prev-fm__xp">+150 XP</span>
          <span className="prev-fm__timer">⏱ 4h 20m</span>
        </div>
        <div className="prev-fm__title">Complete 3 skill verifications today</div>
        <div className="prev-fm__bar"><div className="prev-fm__fill" style={{ width: "66%" }} /></div>
        <span className="prev-fm__progress">2 / 3 · 66%</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   D — Mock Interview (sentiment + Good/Bad cop mode)
───────────────────────────────────────────── */
function InterviewPreview() {
  return (
    <div className="preview-interview">
      <div className="prev-mi__header">
        <span className="prev-mi__title">Mock Interview</span>
        <div className="prev-mi__modes">
          <div className="prev-mi__mode good">😊 Good Cop</div>
          <div className="prev-mi__mode bad active">😤 Bad Cop</div>
        </div>
      </div>

      {/* Camera box with scanline + sentiment */}
      <div className="prev-mi__cam">
        <div className="prev-mi__scanline" />
        <div className="prev-mi__sentiment-chip">
          <span className="prev-mi__sent-dot confident" />
          Confident
        </div>
        <div className="prev-mi__cam-label">Live Camera · Sentiment Active</div>
      </div>

      {/* Current question */}
      <div className="prev-mi__q-block">
        <div className="prev-mi__q-meta">
          <span className="prev-mi__q-type technical">TECHNICAL</span>
          <span className="prev-mi__q-num">Q3 / 8</span>
        </div>
        <div className="prev-mi__q-text">
          Explain the event loop in Node.js and how it handles async operations.
        </div>
      </div>

      {/* Answer status */}
      <div className="prev-mi__answer-bar">
        <div className="prev-mi__rec-dot" />
        <span className="prev-mi__rec-label">Recording · 1:24</span>
        <button className="prev-mi__next-btn">Next →</button>
      </div>
    </div>
  );
}

const Previews: Record<string, () => JSX.Element> = {
  badges:    BadgesPreview,
  test:      TestPreview,
  access:    AccessPreview,
  progress:  ProgressPreview,
  interview: InterviewPreview,
};

function frameSurface(accent: string) {
  if (accent === "violet" || accent === "purple") return "surface-glow-primary";
  if (accent === "cyan")  return "surface-glow-cyan";
  if (accent === "gold")  return "surface-glow-gold";
  if (accent === "green") return "surface-glow-green";
  return "surface-glow-primary";
}

/* ─────────────────────────────────────────────
   Root component
───────────────────────────────────────────── */
export default function LandingPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setScrollProgress(scrollTop / (scrollHeight - clientHeight));
      panelRefs.current.forEach((panel, i) => {
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const panelCenter = rect.top - containerRect.top + rect.height / 2;
        if (Math.abs(panelCenter - clientHeight / 2) < rect.height * 0.5) setActiveIndex(i);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--card-mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    card.style.setProperty("--card-mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <div className="landing-root" data-theme="dark">
      <div className="ambient-canvas" aria-hidden="true" />

      <nav className="lp-nav">
        <div className="lp-nav__logo">
          <span className="lp-nav__x">X</span>
          <span className="lp-nav__pand">Pand</span>
        </div>
        <div className="lp-nav__pills">
          {panels.map((p, i) => (
            <button
              key={p.letter}
              className={`lp-nav__pill${i === activeIndex ? " active" : ""}`}
              onClick={() => panelRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              {p.letter}
            </button>
          ))}
        </div>
        <a href="#" className="btn btn-primary lp-nav__cta">Get Started</a>
      </nav>

      <div className="lp-progress-track" aria-hidden="true">
        <div className="lp-progress-fill" style={{ height: `${scrollProgress * 100}%` }} />
      </div>

      <div className="lp-scroll-container" ref={containerRef}>

        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero__eyebrow">The Career OS for Verified Talent</div>
          <h1 className="lp-hero__title">
            {"XPAND".split("").map((char, i) => (
              <span key={i} className="lp-hero__char" style={{ animationDelay: `${i * 80}ms` }}>{char}</span>
            ))}
          </h1>
          <p className="lp-hero__sub">From invisible candidate to verified, visible, and hireable talent.</p>
          <div className="lp-hero__scroll-hint" aria-hidden="true">
            <span>Scroll to unfold</span>
            <div className="lp-hero__scroll-arrow">↓</div>
          </div>
        </section>

        {/* ── Panels ── */}
        {panels.map((panel, i) => {
          const isActive = activeIndex === i;
          const PreviewComp = Previews[panel.previewType];
          return (
            <section
              key={panel.letter}
              ref={(el) => { panelRefs.current[i] = el; }}
              className={`lp-panel lp-panel--${panel.accent}${isActive ? " is-active" : ""}${i < activeIndex ? " is-past" : ""}`}
            >
              <div className="lp-panel__bg-letter" aria-hidden="true">{panel.letter}</div>

              <div className="lp-panel__inner">
                <div className="lp-panel__content">
                  <div className="lp-panel__letter-badge"><span>{panel.letter}</span></div>

                  <div className="lp-panel__word-group">
                    <span className={`lp-panel__word lp-panel__word--${panel.accent}`}>{panel.word}</span>
                    <span className="lp-panel__tagline"> {panel.tagline}</span>
                  </div>

                  <h2 className="lp-panel__hook">
                    {panel.hook.split("\n").map((line, li) => (
                      <span key={li} className="lp-panel__hook-line">{line}</span>
                    ))}
                  </h2>

                  <p className="lp-panel__body">{panel.body}</p>

                  <div className="lp-panel__dual">
                    <div className="lp-panel__value-card card-interactive surface-glass" onMouseMove={handleCardMouseMove}>
                      <span className="lp-panel__value-label">For Talent</span>
                      <ul className="lp-panel__value-list">
                        {panel.userValue.map((v) => (
                          <li key={v}><span className="lp-panel__check">✓</span>{v}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="lp-panel__value-card card-interactive surface-glass" onMouseMove={handleCardMouseMove}>
                      <span className="lp-panel__value-label">For Companies</span>
                      <ul className="lp-panel__value-list">
                        {panel.companyValue.map((v) => (
                          <li key={v}><span className="lp-panel__check">✓</span>{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="lp-panel__preview">
                  <div className={`lp-panel__preview-frame ${frameSurface(panel.accent)}`}>
                    <PreviewComp />
                  </div>
                </div>
              </div>

              {i < panels.length - 1 && (
                <div className="lp-panel__connector" aria-hidden="true">
                  <div className="lp-panel__connector-line" />
                  <div className="lp-panel__connector-dot" />
                </div>
              )}
            </section>
          );
        })}

        {/* ── Finale ── */}
        <section className="lp-finale">
          <div className="lp-finale__word">
            {"XPAND".split("").map((c, i) => (
              <span key={i} className="lp-finale__char" style={{ animationDelay: `${i * 60}ms` }}>{c}</span>
            ))}
          </div>
          <p className="lp-finale__sub">
            Not a job platform. A system that verifies skills,<br />
            guides growth, unlocks opportunities, and makes talent visible.
          </p>
          <div className="lp-finale__actions">
            <a href="#" className="btn btn-primary btn-lg">Start Your Journey</a>
            <a href="#" className="btn btn-ghost btn-lg">For Employers →</a>
          </div>
        </section>

      </div>
    </div>
  );
}