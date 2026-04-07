import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useStore } from "../../hooks/user/useStore";
import { get } from "../../api/axios";
import type { StoreItemWithMeta, UserPurchaseResponse } from "../../hooks/user/useStore";
import type { ApplicationResponse } from "../../hooks/user/useApplications";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { id: "ALL",        label: "All Items"      },
  { id: "REPORT",     label: "Reports"        },
  { id: "INTERVIEW",  label: "Interviews"     },
  { id: "VISIBILITY", label: "Priority Slots" },
];

const BADGE_CONFIG = {
  POPULAR: { label: "POPULAR", bg: "#7C3AED", border: "#7C3AED66", text: "#EDE9FE" },
  NEW:     { label: "NEW",     bg: "#059669", border: "#05966966", text: "#D1FAE5" },
  LIMITED: { label: "LIMITED", bg: "#B45309", border: "#B4530966", text: "#FEF3C7" },
};

const CATEGORY_ACCENT: Record<string, { color: string; glow: string; gradient: string }> = {
  REPORT:     { color: "#60A5FA", glow: "#60A5FA33", gradient: "linear-gradient(135deg, #1E3A5F, #162132)" },
  INTERVIEW:  { color: "#A78BFA", glow: "#A78BFA33", gradient: "linear-gradient(135deg, #2D1B69, #1A1040)" },
  VISIBILITY: { color: "#FCD34D", glow: "#FCD34D33", gradient: "linear-gradient(135deg, #4A3300, #2A1E00)" },
};

const PRIORITY_SLOT_RANKS = [
  { rank: 3, label: "3rd Priority", xp: 100, color: "#94A3B8", medal: "🥉" },
  { rank: 2, label: "2nd Priority", xp: 120, color: "#60A5FA", medal: "🥈" },
  { rank: 1, label: "1st Priority", xp: 150, color: "#FCD34D", medal: "🥇" },
];

// ─────────────────────────────────────────────────────────────────────────────
// XP Drain animation
// ─────────────────────────────────────────────────────────────────────────────

const XpDrain: React.FC<{ amount: number; onDone: () => void }> = ({ amount, onDone }) => {
  React.useEffect(() => { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="xp-drain-overlay">
      <div className="xp-drain-text">−{amount} XP</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Modal
// ─────────────────────────────────────────────────────────────────────────────

interface PurchaseModalProps {
  item: StoreItemWithMeta;
  xpBalance: number;
  isPurchasing: boolean;
  onConfirm: (associatedJobId: number | null, cost: number, slotRank: number | null) => void;
  onClose: () => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  item, xpBalance, isPurchasing, onConfirm, onClose,
}) => {
  const accent         = CATEGORY_ACCENT[item.category] ?? CATEGORY_ACCENT.REPORT;
  const isPrioritySlot = item.itemType === "PRIORITY_SLOT";
  const needsJob       = item.itemType === "MOCK_INTERVIEW";

  const [selectedJobId,    setSelectedJobId]    = useState<string>("");
  const [selectedRank,     setSelectedRank]     = useState<number>(3);
  const [userApplications, setUserApplications] = useState<ApplicationResponse[]>([]);
  const [loadingJobs,      setLoadingJobs]      = useState(false);

  // Load active (non-rejected, non-withdrawn) applications so user can pick a job
  useEffect(() => {
    if (!needsJob) return;
    setLoadingJobs(true);
    get<ApplicationResponse[]>("/user/applications")
      .then((apps) =>
        setUserApplications(
          apps.filter((a) => a.status !== "REJECTED" && a.status !== "WITHDRAWN")
        )
      )
      .catch(() => setUserApplications([]))
      .finally(() => setLoadingJobs(false));
  }, [needsJob]);

  const effectiveCost = isPrioritySlot
    ? PRIORITY_SLOT_RANKS.find((r) => r.rank === selectedRank)?.xp ?? item.costXp
    : item.costXp;

  const canAfford = xpBalance >= effectiveCost;
  const isReady   = !needsJob || selectedJobId !== "";

  const handleConfirm = () => {
    const jId = needsJob && selectedJobId ? Number(selectedJobId) : null;
    onConfirm(jId, effectiveCost, isPrioritySlot ? selectedRank : null);
  };

  return (
    /*
      Backdrop fills the space BETWEEN the fixed Navbar (top) and BottomDock (bottom).
      PageLayout exposes both as CSS custom properties on the root element.
    */
    <div
      className="store-modal-backdrop"
      onClick={onClose}
    >
      <div className="store-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Sticky header ─────────────────────────── */}
        <div className="store-modal__header" style={{ background: accent.gradient }}>
          <div className="store-modal__icon">{item.icon}</div>
          <div className="store-modal__header-info">
            <h3 className="store-modal__title">{item.name}</h3>
            <p className="store-modal__tagline" style={{ color: accent.color }}>{item.tagline}</p>
          </div>
          <button className="store-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Scrollable body ───────────────────────── */}
        <div className="store-modal__body">
          <p className="store-modal__desc">{item.description}</p>

          {/* Features */}
          <ul className="store-modal__features">
            {item.features.map((f, i) => (
              <li key={i} className="store-modal__feature">
                <span className="store-modal__feature-dot" style={{ background: accent.color }} />
                {f}
              </li>
            ))}
          </ul>

          {/* Priority rank selector */}
          {isPrioritySlot && (
            <div className="store-modal__rank-section">
              <div className="store-modal__section-label">SELECT PRIORITY RANK</div>
              <div className="store-modal__rank-options">
                {PRIORITY_SLOT_RANKS.map((r) => (
                  <button
                    key={r.rank}
                    className={`store-rank-option ${selectedRank === r.rank ? "store-rank-option--selected" : ""}`}
                    style={selectedRank === r.rank ? { borderColor: r.color, background: `${r.color}12` } : {}}
                    onClick={() => setSelectedRank(r.rank)}
                  >
                    <span className="store-rank-option__medal">{r.medal}</span>
                    <span className="store-rank-option__label" style={selectedRank === r.rank ? { color: r.color } : {}}>
                      {r.label}
                    </span>
                    <span className="store-rank-option__cost" style={selectedRank === r.rank ? { color: r.color } : {}}>
                      {r.xp} XP
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Job selector — dropdown of applied (non-rejected) jobs */}
          {needsJob && (
            <div className="store-modal__job-section">
              <div className="store-modal__section-label">SELECT JOB FOR INTERVIEW</div>

              {loadingJobs ? (
                <div className="store-modal__job-loading">
                  <span className="store-spinner-sm" style={{ borderTopColor: "#A78BFA" }} />
                  <span>Loading your applications…</span>
                </div>
              ) : userApplications.length === 0 ? (
                <div className="store-modal__job-empty">
                  <span>📋</span>
                  <div>
                    <p className="store-modal__job-empty-title">No active applications</p>
                    <p className="store-modal__job-empty-sub">
                      Apply to a job first, then purchase a mock interview tailored to that role.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="store-modal__job-list">
                  {userApplications.map((app) => {
                    const isSelected = selectedJobId === String(app.jobId);
                    const statusColor = app.status === "SHORTLISTED" ? "#34D399"
                                      : app.status === "PENDING"     ? "#FCD34D"
                                      : "#94A3B8";
                    const statusIcon  = app.status === "SHORTLISTED" ? "⭐ Shortlisted"
                                      : app.status === "PENDING"     ? "⏳ Pending"
                                      : app.status;
                    return (
                      <button
                        key={app.jobId}
                        className={`store-job-option ${isSelected ? "store-job-option--selected" : ""}`}
                        style={isSelected ? { borderColor: "#A78BFA66", background: "#A78BFA10" } : {}}
                        onClick={() => setSelectedJobId(String(app.jobId))}
                      >
                        <span className="store-job-option__icon">💼</span>
                        <div className="store-job-option__info">
                          <span className="store-job-option__title">{app.jobTitle}</span>
                          <span className="store-job-option__status" style={{ color: statusColor }}>
                            {statusIcon}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="store-job-option__check" style={{ color: "#A78BFA" }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="store-modal__job-hint">
                Interview questions will be tailored to this job's requirements and your skill profile.
              </p>
            </div>
          )}

          {/* Cost row */}
          <div className="store-modal__cost-row">
            <div className="store-modal__balance-info">
              <span className="store-modal__balance-label">Your balance</span>
              <span className="store-modal__balance-value">{xpBalance.toLocaleString()} XP</span>
            </div>
            <div className="store-modal__arrow">→</div>
            <div className="store-modal__after-info">
              <span className="store-modal__balance-label">After purchase</span>
              <span
                className="store-modal__balance-value"
                style={{ color: canAfford ? "#34D399" : "#F87171" }}
              >
                {(xpBalance - effectiveCost).toLocaleString()} XP
              </span>
            </div>
          </div>

          {!canAfford && (
            <div className="store-modal__insufficient">
              <span>⚠️</span>
              <p>You need {(effectiveCost - xpBalance).toLocaleString()} more XP. Complete challenges to earn more.</p>
            </div>
          )}
        </div>

        {/* ── Sticky footer ─────────────────────────── */}
        <div className="store-modal__footer">
          <button className="store-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="store-btn-purchase"
            style={{
              background: canAfford && isReady ? accent.gradient.replace("135deg", "90deg") : undefined,
              opacity: canAfford && isReady ? 1 : 0.4,
            }}
            onClick={handleConfirm}
            disabled={!canAfford || isPurchasing || !isReady}
          >
            {isPurchasing ? (
              <span className="store-purchasing-indicator">
                <span className="store-spinner" />Processing…
              </span>
            ) : (
              <>Spend {effectiveCost.toLocaleString()} XP</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Store Item Card
// ─────────────────────────────────────────────────────────────────────────────

const StoreCard: React.FC<{
  item: StoreItemWithMeta;
  xpBalance: number;
  ownedPurchases: UserPurchaseResponse[];
  onBuy: (item: StoreItemWithMeta) => void;
  onOpen: (item: StoreItemWithMeta, purchase: UserPurchaseResponse) => void;
}> = ({ item, xpBalance, ownedPurchases, onBuy, onOpen }) => {
  const accent    = CATEGORY_ACCENT[item.category] ?? CATEGORY_ACCENT.REPORT;
  const canAfford = xpBalance >= item.costXp;
  const badgeCfg  = item.badge ? BADGE_CONFIG[item.badge] : null;

  const unusedPurchase = ownedPurchases.find(
    (p) => p.itemType === item.itemType && !p.isUsed
  );
  const isOwned    = !!unusedPurchase;
  const isPriority = item.itemType === "PRIORITY_SLOT";
  const showOpen   = isOwned && !isPriority;

  return (
    <div
      className={`store-card ${isOwned && !isPriority ? "store-card--owned" : ""} ${!canAfford && !isOwned ? "store-card--unaffordable" : ""}`}
      style={{ "--accent": accent.color, "--glow": accent.glow } as React.CSSProperties}
    >
      {badgeCfg && (
        <div
          className="store-card__badge"
          style={{ background: badgeCfg.bg, border: `1px solid ${badgeCfg.border}`, color: badgeCfg.text }}
        >
          {badgeCfg.label}
        </div>
      )}

      <div className="store-card__glow-bg" aria-hidden="true" />

      <div className="store-card__content">
        <div className="store-card__icon-wrap" style={{ background: accent.gradient }}>
          <span className="store-card__icon">{item.icon}</span>
        </div>

        <div className="store-card__info">
          <h3 className="store-card__name">{item.name}</h3>
          <p className="store-card__tagline" style={{ color: accent.color }}>{item.tagline}</p>
          <p className="store-card__desc">{item.description}</p>
        </div>

        <ul className="store-card__features">
          {item.features.slice(0, 3).map((f, i) => (
            <li key={i} className="store-card__feature">
              <span className="store-card__feature-check" style={{ color: accent.color }}>✓</span>
              {f}
            </li>
          ))}
          {item.features.length > 3 && (
            <li className="store-card__feature store-card__feature--more">
              +{item.features.length - 3} more included
            </li>
          )}
        </ul>
      </div>

      <div className="store-card__footer">
        <div className="store-card__price-block">
          {isOwned && !isPriority ? (
            <span className="store-card__owned-label">✓ Owned</span>
          ) : isPriority ? (
            <>
              <span className="store-card__price" style={{ color: canAfford ? accent.color : "#F87171" }}>100+</span>
              <span className="store-card__price-unit">XP</span>
            </>
          ) : (
            <>
              <span className="store-card__price" style={{ color: canAfford ? accent.color : "#F87171" }}>
                {item.costXp.toLocaleString()}
              </span>
              <span className="store-card__price-unit">XP</span>
            </>
          )}
        </div>

        {showOpen ? (
          <button
            className="store-card__cta store-card__cta--open"
            style={{ "--accent": accent.color } as React.CSSProperties}
            onClick={() => onOpen(item, unusedPurchase!)}
          >
            Open →
          </button>
        ) : (
          <button
            className="store-card__cta store-card__cta--buy"
            style={{ "--accent": accent.color, "--glow": accent.glow } as React.CSSProperties}
            onClick={() => onBuy(item)}
            disabled={!canAfford}
          >
            {canAfford
              ? isPriority ? "Get Slot" : `Spend ${item.costXp.toLocaleString()} XP`
              : "Not enough XP"}
          </button>
        )}
      </div>
    </div>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="store-card">
    <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 16 }} />
    <div className="skeleton" style={{ width: "60%", height: 20, marginBottom: 8, borderRadius: 6 }} />
    <div className="skeleton" style={{ width: "45%", height: 14, marginBottom: 16, borderRadius: 6 }} />
    <div className="skeleton" style={{ width: "90%", height: 48, marginBottom: 16, borderRadius: 6 }} />
    {[80, 75, 65].map((w, i) => (
      <div key={i} className="skeleton" style={{ width: `${w}%`, height: 12, marginBottom: 8, borderRadius: 4 }} />
    ))}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
      <div className="skeleton" style={{ width: 64, height: 24, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: 120, height: 38, borderRadius: 10 }} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// StorePage
// ─────────────────────────────────────────────────────────────────────────────

const StorePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items, purchases, unusedPurchases, xpBalance,
    isLoading, isPurchasing, error, purchaseItem,
  } = useStore();

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedItem,   setSelectedItem]   = useState<StoreItemWithMeta | null>(null);
  const [showDrain,      setShowDrain]       = useState(false);
  const [drainAmount,    setDrainAmount]     = useState(0);
  const [purchaseError,  setPurchaseError]   = useState<string | null>(null);

  const filtered = categoryFilter === "ALL"
    ? items
    : items.filter((i) => i.category === categoryFilter);

  const handleBuy = (item: StoreItemWithMeta) => {
    setPurchaseError(null);
    setSelectedItem(item);
  };

  const handleConfirmPurchase = async (
    associatedJobId: number | null,
    cost: number,
    slotRank: number | null,
  ) => {
    if (!selectedItem) return;
    setDrainAmount(cost);
    const result = await purchaseItem(selectedItem.id, associatedJobId, slotRank ?? undefined);
    if (result.success) {
      setShowDrain(true);
      setSelectedItem(null);
    } else {
      setPurchaseError(result.error ?? "Purchase failed.");
    }
  };

  const handleOpen = (item: StoreItemWithMeta, purchase: UserPurchaseResponse) => {
    if (item.itemType === "READINESS_REPORT") navigate(`/store/readiness-report/${purchase.id}`);
    else if (item.itemType === "MOCK_INTERVIEW") navigate(`/store/mock-interview/${purchase.id}`);
  };

  return (
    <PageLayout pageTitle="Store">

      {showDrain && <XpDrain amount={drainAmount} onDone={() => setShowDrain(false)} />}

      {/* ── Header ─────────────────────────────────────── */}
      <header className="store-header">
        <div className="store-header__left">
          <div className="store-header__eyebrow">
            <span className="store-eyebrow__gem" aria-hidden="true">◆</span>
            <span className="store-eyebrow__text">XP STORE</span>
            <span className="store-eyebrow__gem" aria-hidden="true">◆</span>
          </div>
          <h1 className="store-header__title">Spend Your XP</h1>
          <p className="store-header__sub">
            Exchange earned XP for real career advantages. Every item here is unlocked through skill.
          </p>
        </div>

        <div className="store-balance-card">
          <div className="store-balance-card__inner">
            <div className="store-balance-card__decoration" aria-hidden="true" />
            <span className="store-balance-card__label">BALANCE</span>
            <span className="store-balance-card__amount">
              {isLoading ? "—" : xpBalance.toLocaleString()}
            </span>
            <span className="store-balance-card__unit">XP</span>
            <button className="store-balance-card__earn-link" onClick={() => navigate("/challenges")}>
              + Earn more XP →
            </button>
          </div>
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────── */}
      {(error || purchaseError) && (
        <div className="store-error-banner">
          <span>⚠️</span>
          <span>{error || purchaseError}</span>
          <button onClick={() => setPurchaseError(null)} className="store-error-banner__dismiss">✕</button>
        </div>
      )}

      {/* ── Purchases banner ───────────────────────────── */}
      {!isLoading && purchases.length > 0 && (
        <div className="store-purchases-banner">
          <span className="store-purchases-banner__icon">🧳</span>
          <span className="store-purchases-banner__text">
            {purchases.length} item{purchases.length !== 1 ? "s" : ""} in your collection
            {unusedPurchases.length > 0 && (
              <span className="store-purchases-banner__unused"> · {unusedPurchases.length} unused</span>
            )}
          </span>
          <button className="store-purchases-banner__link" onClick={() => navigate("/store/purchases")}>
            View all →
          </button>
        </div>
      )}



















      {/* ── Category filter ────────────────────────────── */}
      <div className="store-filters">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`store-filter-pill ${categoryFilter === f.id ? "store-filter-pill--active" : ""}`}
            onClick={() => setCategoryFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Grid ──────────────────────────────────────── */}
      <div className="store-grid">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map((item) => (
            <StoreCard
              key={item.id}
              item={item}

              xpBalance={xpBalance}
              ownedPurchases={unusedPurchases}
              onBuy={handleBuy}
              onOpen={handleOpen}
            />
          ))
        }
      </div>

      {/* ── Purchase modal ─────────────────────────────── */}
      {selectedItem && (
        <PurchaseModal
          item={selectedItem}
          xpBalance={xpBalance}
          isPurchasing={isPurchasing}
          onConfirm={handleConfirmPurchase}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = `
  /* ── Header ───────────────────────────────────────── */
  .store-header { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-8); flex-wrap:wrap; margin-bottom:var(--space-7); }
  .store-header__eyebrow { display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-2); }
  .store-eyebrow__gem { font-size:8px; color:#FCD34D; text-shadow:0 0 8px #FCD34D; }
  .store-eyebrow__text { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.22em; color:#FCD34D; text-shadow:0 0 14px #FCD34D66; }
  .store-header__title { font-family:var(--font-display); font-size:clamp(var(--text-3xl),4vw,2.75rem); font-weight:700; color:var(--color-text-primary); letter-spacing:-.03em; margin:0 0 var(--space-2); line-height:1; }
  .store-header__sub { font-size:var(--text-sm); color:var(--color-text-muted); margin:0; max-width:420px; line-height:var(--leading-relaxed); }

  /* Balance card */
  .store-balance-card { position:relative; flex-shrink:0; }
  .store-balance-card__inner { position:relative; padding:var(--space-5) var(--space-6); background:linear-gradient(135deg,#2a1900,#1a1200); border:1px solid #FCD34D33; border-radius:var(--radius-2xl); display:flex; flex-direction:column; align-items:center; min-width:160px; overflow:hidden; }
  .store-balance-card__decoration { position:absolute; top:-40px; right:-40px; width:120px; height:120px; border-radius:50%; background:radial-gradient(circle,#FCD34D22,transparent 70%); pointer-events:none; }
  .store-balance-card__label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.22em; color:#FCD34D55; margin-bottom:var(--space-1); }
  .store-balance-card__amount { font-family:var(--font-mono); font-size:clamp(2rem,4vw,2.75rem); font-weight:700; color:#FCD34D; line-height:1; text-shadow:0 0 24px #FCD34D55; }
  .store-balance-card__unit { font-family:var(--font-mono); font-size:var(--text-xs); color:#FCD34D88; letter-spacing:.15em; margin-top:2px; }
  .store-balance-card__earn-link { background:none; border:none; font-family:var(--font-mono); font-size:10px; color:#FCD34D55; cursor:pointer; margin-top:var(--space-2); transition:color var(--duration-fast); letter-spacing:.05em; }
  .store-balance-card__earn-link:hover { color:#FCD34D; }

  /* Banners */
  .store-error-banner { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-4); background:#450a0a55; border:1px solid #7f1d1d55; border-radius:var(--radius-lg); color:#FCA5A5; font-size:var(--text-sm); margin-bottom:var(--space-5); }
  .store-error-banner__dismiss { margin-left:auto; background:none; border:none; color:#FCA5A5; cursor:pointer; font-size:var(--text-xs); opacity:.7; }
  .store-error-banner__dismiss:hover { opacity:1; }
  .store-purchases-banner { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-5); background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-xl); margin-bottom:var(--space-5); width:fit-content; }
  .store-purchases-banner__icon { font-size:1rem; }
  .store-purchases-banner__text { font-size:var(--text-sm); color:var(--color-text-muted); }
  .store-purchases-banner__unused { color:#A78BFA; }
  .store-purchases-banner__link { background:none; border:none; font-family:var(--font-mono); font-size:var(--text-xs); color:var(--color-primary-400); cursor:pointer; letter-spacing:.05em; padding:0; transition:opacity var(--duration-fast); }
  .store-purchases-banner__link:hover { opacity:.7; }

  /* Filters */
  .store-filters { display:flex; gap:var(--space-2); flex-wrap:wrap; margin-bottom:var(--space-7); }
  .store-filter-pill { font-family:var(--font-mono); font-size:var(--text-xs); font-weight:600; letter-spacing:.08em; text-transform:uppercase; padding:var(--space-2) var(--space-4); border-radius:var(--radius-full); border:1px solid var(--color-border-default); background:var(--color-bg-elevated); color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); }
  .store-filter-pill:hover { border-color:var(--color-border-strong); color:var(--color-text-secondary); }
  .store-filter-pill--active { background:linear-gradient(135deg,#3b2a00,#2a1e00); border-color:#FCD34D44; color:#FCD34D; box-shadow:0 0 16px #FCD34D1a; }

  /* Grid */
  .store-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:var(--space-5); }

  /* ── Store card ───────────────────────────────── */
  .store-card { position:relative; display:flex; flex-direction:column; gap:var(--space-5); padding:var(--space-6); background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-2xl); overflow:hidden; transition:transform var(--duration-base) var(--ease-spring),border-color var(--duration-base),box-shadow var(--duration-base); }
  .store-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent,#ffffff33),transparent); opacity:.6; }
  .store-card:hover { transform:translateY(-4px); border-color:var(--accent,var(--color-border-strong)); box-shadow:0 12px 40px #00000055,0 0 0 1px var(--accent,transparent),0 0 60px var(--glow,transparent); }
  .store-card--owned { border-color:var(--color-verified-border,#34D39933); background:linear-gradient(160deg,var(--color-bg-elevated),#0d261866); }
  .store-card--unaffordable { opacity:.65; }
  .store-card__glow-bg { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 0%,var(--glow,transparent),transparent 60%); opacity:0; transition:opacity var(--duration-base); pointer-events:none; }
  .store-card:hover .store-card__glow-bg { opacity:1; }
  .store-card__badge { position:absolute; top:14px; right:14px; font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.15em; padding:3px 8px; border-radius:var(--radius-full); z-index:2; }
  .store-card__content { display:flex; flex-direction:column; gap:var(--space-4); flex:1; }
  .store-card__icon-wrap { width:56px; height:56px; border-radius:var(--radius-xl); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.08); flex-shrink:0; }
  .store-card__icon { font-size:1.75rem; }
  .store-card__info { display:flex; flex-direction:column; gap:var(--space-2); }
  .store-card__name { font-family:var(--font-display); font-size:var(--text-xl); font-weight:700; color:var(--color-text-primary); margin:0; letter-spacing:-.02em; }
  .store-card__tagline { font-family:var(--font-mono); font-size:var(--text-xs); font-weight:600; letter-spacing:.06em; margin:0; }
  .store-card__desc { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin:0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .store-card__features { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:var(--space-2); }
  .store-card__feature { display:flex; align-items:flex-start; gap:var(--space-2); font-size:var(--text-xs); color:var(--color-text-muted); line-height:1.4; }
  .store-card__feature-check { flex-shrink:0; font-weight:700; }
  .store-card__feature--more { color:var(--color-text-disabled); }
  .store-card__footer { display:flex; align-items:center; justify-content:space-between; gap:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--color-border-subtle); margin-top:auto; }
  .store-card__price-block { display:flex; align-items:baseline; gap:4px; }
  .store-card__price { font-family:var(--font-mono); font-size:var(--text-2xl); font-weight:700; line-height:1; }
  .store-card__price-unit { font-family:var(--font-mono); font-size:var(--text-xs); color:var(--color-text-muted); letter-spacing:.1em; }
  .store-card__owned-label { font-family:var(--font-mono); font-size:var(--text-sm); font-weight:600; color:#34D399; letter-spacing:.05em; }
  .store-card__cta { padding:var(--space-2) var(--space-5); border-radius:var(--radius-lg); font-family:var(--font-mono); font-size:var(--text-xs); font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all var(--duration-fast); white-space:nowrap; border:none; }
  .store-card__cta--buy { background:linear-gradient(135deg,#1a1200,#2a1e00); border:1px solid var(--accent,#FCD34D33); color:var(--accent,#FCD34D); }
  .store-card__cta--buy:hover:not(:disabled) { background:var(--accent,#FCD34D); color:#0a0c10; box-shadow:0 0 20px var(--glow,transparent); transform:translateY(-1px); }
  .store-card__cta--buy:disabled { opacity:.4; cursor:not-allowed; }
  .store-card__cta--open { background:#0d261855; border:1px solid #34D39933; color:#34D399; }
  .store-card__cta--open:hover { background:#34D399; color:#fff; transform:translateY(-1px); }

  /* ═══ PURCHASE MODAL ════════════════════════════════════════════
     Backdrop sits between the fixed Navbar (top) and BottomDock (bottom).
     Both heights are exposed by PageLayout as CSS custom properties.
  ══════════════════════════════════════════════════════════════ */
  .store-modal-backdrop {
    position: fixed;
    top:    var(--layout-navbar-height, 60px);
    bottom: var(--layout-bottom-height, 64px);
    left: 0; right: 0;
    background: rgba(0,0,0,0.80);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    /* z-index below navbar/dock (both ~200) but above page (z-index 1) */
    z-index: 150;
    padding: 16px;
    overflow-y: auto;
    animation: sm-fade .15s ease-out;
  }
  @keyframes sm-fade { from{opacity:0} to{opacity:1} }

  .store-modal {
    position: relative;
    width: 100%;
    max-width: 540px;
    /* caps height so it never exceeds the backdrop; inner scrolls */
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-2xl);
    box-shadow: 0 24px 80px #000000cc;
    animation: sm-slide .2s cubic-bezier(.34,1.56,.64,1);
    overflow: hidden;   /* clip children; body scrolls independently */
  }
  @keyframes sm-slide { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }

  /* Sticky header */
  .store-modal__header {
    display:flex; align-items:center; gap:var(--space-4);
    padding: var(--space-5) var(--space-6) var(--space-4);
    flex-shrink: 0;
    position: sticky; top: 0; z-index: 2;
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  }
  .store-modal__icon { font-size:2rem; flex-shrink:0; }
  .store-modal__header-info { flex:1; }
  .store-modal__title { font-family:var(--font-display); font-size:var(--text-xl); font-weight:700; color:var(--color-text-primary); margin:0 0 2px; }
  .store-modal__tagline { font-family:var(--font-mono); font-size:var(--text-xs); letter-spacing:.06em; margin:0; }
  .store-modal__close { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.8); cursor:pointer; font-size:var(--text-sm); padding:6px 10px; border-radius:var(--radius-md); transition:all var(--duration-fast); flex-shrink:0; }
  .store-modal__close:hover { background:rgba(255,255,255,.2); color:#fff; }

  /* Scrollable body */
  .store-modal__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    scrollbar-width: thin;
    scrollbar-color: var(--color-border-strong) transparent;
  }
  .store-modal__body::-webkit-scrollbar { width:4px; }
  .store-modal__body::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }

  .store-modal__desc { font-size:var(--text-sm); color:var(--color-text-secondary); line-height:var(--leading-relaxed); margin:0; }
  .store-modal__features { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:var(--space-2); }
  .store-modal__feature { display:flex; align-items:flex-start; gap:var(--space-3); font-size:var(--text-sm); color:var(--color-text-muted); }
  .store-modal__feature-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:6px; }
  .store-modal__section-label { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.15em; color:var(--color-text-muted); margin-bottom:var(--space-1); }

  /* Priority rank selector */
  .store-modal__rank-section { display:flex; flex-direction:column; gap:var(--space-3); }
  .store-modal__rank-options { display:flex; gap:var(--space-3); }
  .store-rank-option { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:var(--space-3) var(--space-2); border-radius:var(--radius-lg); border:1px solid var(--color-border-default); background:var(--color-bg-overlay); cursor:pointer; transition:all var(--duration-fast); }
  .store-rank-option:hover { border-color:var(--color-border-strong); background:var(--color-bg-elevated); }
  .store-rank-option--selected { }
  .store-rank-option__medal { font-size:1.3rem; }
  .store-rank-option__label { font-family:var(--font-mono); font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); }
  .store-rank-option__cost { font-family:var(--font-mono); font-size:var(--text-base); font-weight:700; color:var(--color-text-secondary); }

  /* Job selector */
  .store-modal__job-section { display:flex; flex-direction:column; gap:var(--space-3); }
  .store-modal__job-hint { font-size:var(--text-xs); color:var(--color-text-muted); margin:0; line-height:1.55; }

  .store-modal__job-loading {
    display:flex; align-items:center; gap:10px;
    padding:var(--space-3) var(--space-4);
    background:var(--color-bg-overlay);
    border-radius:var(--radius-lg);
    font-size:var(--text-sm); color:var(--color-text-muted);
  }
  .store-spinner-sm {
    display:inline-block; width:14px; height:14px; flex-shrink:0;
    border:2px solid var(--color-border-default);
    border-radius:50%;
    animation:spin .6s linear infinite;
  }

  .store-modal__job-empty {
    display:flex; align-items:flex-start; gap:var(--space-3);
    padding:var(--space-4); background:#2D1B6914;
    border:1px solid #A78BFA22; border-radius:var(--radius-lg);
  }
  .store-modal__job-empty-title { font-size:var(--text-sm); font-weight:600; color:var(--color-text-secondary); margin:0 0 4px; }
  .store-modal__job-empty-sub { font-size:var(--text-xs); color:var(--color-text-muted); margin:0; line-height:1.55; }

  .store-modal__job-list {
    display:flex; flex-direction:column; gap:8px;
    max-height:190px; overflow-y:auto;
    scrollbar-width:thin; scrollbar-color:var(--color-border-strong) transparent;
    padding-right:2px;
  }
  .store-modal__job-list::-webkit-scrollbar { width:3px; }
  .store-modal__job-list::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }

  .store-job-option {
    width:100%; display:flex; align-items:center; gap:var(--space-3);
    padding:var(--space-3) var(--space-4);
    border-radius:var(--radius-lg); border:1px solid var(--color-border-default);
    background:var(--color-bg-overlay); cursor:pointer;
    transition:all var(--duration-fast); text-align:left;
  }
  .store-job-option:hover { border-color:var(--color-border-strong); background:var(--color-bg-elevated); }
  .store-job-option__icon { font-size:1.1rem; flex-shrink:0; }
  .store-job-option__info { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
  .store-job-option__title { font-size:var(--text-sm); font-weight:600; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .store-job-option__status { font-family:var(--font-mono); font-size:10px; font-weight:600; letter-spacing:.04em; }
  .store-job-option__check { font-size:var(--text-base); font-weight:700; flex-shrink:0; }

  /* Cost row */
  .store-modal__cost-row { display:flex; align-items:center; justify-content:space-between; gap:var(--space-4); padding:var(--space-4); background:var(--color-bg-overlay); border:1px solid var(--color-border-subtle); border-radius:var(--radius-xl); }
  .store-modal__arrow { color:var(--color-text-disabled); font-size:var(--text-lg); }
  .store-modal__balance-info,.store-modal__after-info { display:flex; flex-direction:column; gap:2px; }
  .store-modal__balance-label { font-family:var(--font-mono); font-size:10px; letter-spacing:.1em; color:var(--color-text-muted); }
  .store-modal__balance-value { font-family:var(--font-mono); font-size:var(--text-lg); font-weight:700; color:var(--color-text-primary); }

  .store-modal__insufficient { display:flex; align-items:flex-start; gap:var(--space-3); padding:var(--space-3) var(--space-4); background:#450a0a55; border:1px solid #7f1d1d55; border-radius:var(--radius-lg); font-size:var(--text-sm); color:#FCA5A5; }
  .store-modal__insufficient p { margin:0; }

  /* Sticky footer */
  .store-modal__footer {
    display:flex; gap:var(--space-3); justify-content:flex-end;
    padding:var(--space-4) var(--space-6) var(--space-5);
    border-top:1px solid var(--color-border-subtle);
    flex-shrink: 0;
    background: var(--color-bg-surface);
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
  }

  .store-btn-secondary { padding:var(--space-2) var(--space-5); border-radius:var(--radius-lg); font-family:var(--font-mono); font-size:var(--text-sm); font-weight:600; background:none; border:1px solid var(--color-border-default); color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); }
  .store-btn-secondary:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .store-btn-purchase { padding:var(--space-3) var(--space-6); border-radius:var(--radius-lg); font-family:var(--font-mono); font-size:var(--text-sm); font-weight:700; letter-spacing:.05em; border:none; cursor:pointer; color:white; min-width:160px; transition:all var(--duration-fast); }
  .store-btn-purchase:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.1); }
  .store-btn-purchase:disabled { cursor:not-allowed; }

  .store-purchasing-indicator { display:flex; align-items:center; gap:var(--space-2); justify-content:center; }
  .store-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:spin .6s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }

  /* XP Drain */
  .xp-drain-overlay { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:9999; pointer-events:none; animation:drain-anim 1.2s ease-out forwards; }
  @keyframes drain-anim { 0%{transform:translate(-50%,-50%) scale(.8);opacity:0} 20%{transform:translate(-50%,-60%) scale(1.2);opacity:1} 80%{transform:translate(-50%,-90%) scale(1);opacity:1} 100%{transform:translate(-50%,-110%) scale(.9);opacity:0} }
  .xp-drain-text { font-family:var(--font-display); font-size:2.5rem; font-weight:700; color:#FCD34D; text-shadow:0 0 30px #FCD34D88; }

  /* Responsive */
  @media (max-width:900px) {
    .store-header { flex-direction:column; gap:var(--space-5); }
    .store-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:640px) {
    .store-grid { grid-template-columns:1fr; }
    .store-modal-backdrop { padding:8px; }
    .store-modal__rank-options { flex-direction:column; }
  }
`;

export default StorePage;