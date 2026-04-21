import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useStore } from "../../hooks/user/useStore";
import { get } from "../../api/axios";
import type { StoreItemWithMeta, UserPurchaseResponse } from "../../hooks/user/useStore";
import type { ApplicationResponse } from "../../hooks/user/useApplications";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";

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
  POPULAR: { label: "POPULAR", bg: "var(--color-primary-glow)",  border: "rgba(155,124,255,0.35)", text: "var(--color-primary-300)" },
  NEW:     { label: "NEW",     bg: "var(--color-success-bg)",     border: "var(--color-success-border)", text: "var(--color-success)"  },
  LIMITED: { label: "LIMITED", bg: "var(--color-warning-bg)",     border: "var(--color-warning-border)", text: "var(--color-warning)"  },
};

const CATEGORY_ACCENT: Record<string, { color: string; glow: string; gradient: string; darkGrad: string; heroLine: string }> = {
  REPORT:     { color: "var(--color-primary-400)", glow: "var(--color-primary-glow)", gradient: "linear-gradient(135deg,#2D1C68,#1A1430)", darkGrad: "linear-gradient(160deg,#1a1030 0%,#0d0f17 100%)", heroLine: "Know exactly where you stand."    },
  INTERVIEW:  { color: "var(--color-primary-400)", glow: "var(--color-primary-glow)", gradient: "linear-gradient(135deg,#2D1C68,#1A1430)", darkGrad: "linear-gradient(160deg,#1a1030 0%,#0d0f17 100%)", heroLine: "Practice until perfect."           },
  VISIBILITY: { color: "var(--color-primary-400)", glow: "var(--color-primary-glow)", gradient: "linear-gradient(135deg,#2D1C68,#1A1430)", darkGrad: "linear-gradient(160deg,#1a1030 0%,#0d0f17 100%)", heroLine: "Get seen first."                   },
};

const PRIORITY_SLOT_RANKS = [
  { rank: 3, label: "3rd Priority", perk: "Top of list before regular applicants", xp: 100, color: "var(--color-bronze-light)", medal: "badge-bronze" as IconName },
  { rank: 2, label: "2nd Priority", perk: "Silver highlight + Must Review nudge",   xp: 120, color: "var(--color-silver-light)", medal: "badge-silver" as IconName },
  { rank: 1, label: "1st Priority", perk: "CV auto-opens when company views job",   xp: 150, color: "var(--color-gold-light)", medal: "badge-gold"   as IconName },
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
// Purchase Modal  (logic unchanged)
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
    <Modal onClose={onClose}>
      <div className="store-modal" onClick={(e) => e.stopPropagation()}>

        <div className="store-modal__header" style={{ background: accent.gradient }}>
          <div className="store-modal__icon"><Icon name={item.icon} size={28} label="" /></div>
          <div className="store-modal__header-info">
            <h3 className="store-modal__title">{item.name}</h3>
            <p className="store-modal__tagline" style={{ color: accent.color }}>{item.tagline}</p>
          </div>
          <button className="store-modal__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} label="Close" />
          </button>
        </div>

        <div className="store-modal__body">
          <p className="store-modal__desc">{item.description}</p>

          <ul className="store-modal__features">
            {item.features.map((f, i) => (
              <li key={i} className="store-modal__feature">
                <span className="store-modal__feature-dot" style={{ background: accent.color }} />
                {f}
              </li>
            ))}
          </ul>

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
                    <span className="store-rank-option__medal"><Icon name={r.medal} size={18} label="" /></span>
                    <div className="store-rank-option__text">
                      <span className="store-rank-option__label" style={selectedRank === r.rank ? { color: r.color } : {}}>
                        {r.label}
                      </span>
                      <span className="store-rank-option__perk" style={selectedRank === r.rank ? { color: r.color, opacity: 0.8 } : {}}>
                        {r.perk}
                      </span>
                    </div>
                    <span className="store-rank-option__cost" style={selectedRank === r.rank ? { color: r.color } : {}}>
                      {r.xp} XP
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsJob && (
            <div className="store-modal__job-section">
              <div className="store-modal__section-label">SELECT JOB FOR INTERVIEW</div>

              {loadingJobs ? (
                <div className="store-modal__job-loading">
                  <span className="store-spinner-sm" style={{ borderTopColor: "var(--color-primary-400)" }} />
                  <span>Loading your applications…</span>
                </div>
              ) : userApplications.length === 0 ? (
                <div className="store-modal__job-empty">
                  <Icon name="clipboard" size={16} label="" />
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
                    const statusColor = app.status === "SHORTLISTED" ? "var(--color-success)"
                                      : app.status === "PENDING"     ? "var(--color-warning)"
                                      : "var(--color-text-muted)";
                    const statusIcon  = app.status === "SHORTLISTED" ? "⭐ Shortlisted"
                                      : app.status === "PENDING"     ? "⏳ Pending"
                                      : app.status;
                    return (
                      <button
                        key={app.jobId}
                        className={`store-job-option ${isSelected ? "store-job-option--selected" : ""}`}
                        style={isSelected ? { borderColor: "rgba(155,124,255,0.40)", background: "var(--color-primary-glow)" } : {}}
                        onClick={() => setSelectedJobId(String(app.jobId))}
                      >
                        <span className="store-job-option__icon"><Icon name="work" size={16} label="" /></span>
                        <div className="store-job-option__info">
                          <span className="store-job-option__title">{app.jobTitle}</span>
                          <span className="store-job-option__status" style={{ color: statusColor }}>
                            {statusIcon}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="store-job-option__check" style={{ color: "var(--color-primary-400)" }}>
                            <Icon name="check" size={14} label="" />
                          </span>
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
              <Icon name="warning" size={16} label="" />
              <p>You need {(effectiveCost - xpBalance).toLocaleString()} more XP. Complete challenges to earn more.</p>
            </div>
          )}
        </div>

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
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Store Item Card  — redesigned
// ─────────────────────────────────────────────────────────────────────────────

const StoreCard: React.FC<{
  item: StoreItemWithMeta;
  xpBalance: number;
  ownedPurchases: UserPurchaseResponse[];
  onBuy: (item: StoreItemWithMeta) => void;
  onOpen: (item: StoreItemWithMeta, purchase: UserPurchaseResponse) => void;
  index: number;
}> = ({ item, xpBalance, ownedPurchases, onBuy, onOpen, index }) => {
  const accent    = CATEGORY_ACCENT[item.category] ?? CATEGORY_ACCENT.REPORT;
  const canAfford = xpBalance >= item.costXp;
  const badgeCfg  = item.badge ? BADGE_CONFIG[item.badge] : null;

  const unusedPurchase = ownedPurchases.find(
    (p) => p.itemType === item.itemType && !p.isUsed
  );
  const isOwned    = !!unusedPurchase;
  const isPriority = item.itemType === "PRIORITY_SLOT";
  const showOpen   = isOwned && !isPriority;

  const priceDisplay = isPriority ? "100+" : item.costXp.toLocaleString();

  return (
    <div
      className={`sc ${!canAfford && !isOwned ? "sc--dim" : ""} ${isOwned && !isPriority ? "sc--owned" : ""}`}
      style={{
        "--c":     accent.color,
        "--g":     accent.glow,
        "--delay": `${index * 80}ms`,
      } as React.CSSProperties}
    >
      <div className="sc__border-glow" />

      {/* ── Top panel ───────────────────────────── */}
      <div className="sc__top" style={{ background: accent.darkGrad }}>
        <div className="sc__noise" />
        <div className="sc__orb" />

        {badgeCfg && (
          <div
            className="sc__badge"
            style={{ background: badgeCfg.bg, border: `1px solid ${badgeCfg.border}`, color: badgeCfg.text }}
          >
            {badgeCfg.label}
          </div>
        )}
        {isOwned && !isPriority && (
          <div className="sc__badge sc__badge--owned">✓ OWNED</div>
        )}

        <div
          className="sc__icon-ring"
          style={{ borderColor: `${accent.color}30`, background: `${accent.color}0c` }}
        >
          <div className="sc__icon-inner" style={{ background: accent.gradient }}>
            <Icon name={item.icon} size={26} label="" />
          </div>
        </div>

        <p className="sc__hero-line" style={{ color: accent.color }}>
          {accent.heroLine}
        </p>
      </div>

      {/* ── Body ───────────────────────────────── */}
      <div className="sc__body">
        <div className="sc__info">
          <h3 className="sc__name">{item.name}</h3>
          <p className="sc__desc">{item.description}</p>
        </div>

        <div className="sc__divider">
          <span className="sc__divider-line" />
          <span className="sc__divider-label">What you get</span>
          <span className="sc__divider-line" />
        </div>

        <ul className="sc__features">
          {item.features.slice(0, 3).map((f, i) => (
            <li key={i} className="sc__feature">
              <span className="sc__feature-dot" style={{ background: accent.color }} />
              <span className="sc__feature-text">{f}</span>
            </li>
          ))}
          {item.features.length > 3 && (
            <li className="sc__feature sc__feature--more">
              <span className="sc__feature-text">+{item.features.length - 3} more included</span>
            </li>
          )}
        </ul>

        <div className="sc__footer">
          <div className="sc__price-block">
            {isOwned && !isPriority ? (
              <span className="sc__owned-label">
                <Icon name="check" size={11} label="" /> In collection
              </span>
            ) : (
              <>
                <span className="sc__price" style={{ color: canAfford ? accent.color : "#F87171" }}>
                  {priceDisplay}
                </span>
                <span className="sc__price-xp">XP</span>
              </>
            )}
          </div>

          {showOpen ? (
            <button
              className="sc__cta sc__cta--open"
              style={{
                color: accent.color,
                borderColor: `${accent.color}40`,
                background: `${accent.color}0e`,
              }}
              onClick={() => onOpen(item, unusedPurchase!)}
            >
              Open →
            </button>
          ) : (
            <button
              className={`sc__cta ${canAfford ? "sc__cta--buy-ready" : "sc__cta--buy-disabled"}`}
              style={canAfford ? {
                background: accent.gradient,
                boxShadow: `0 4px 20px ${accent.glow}`,
                color: "#fff",
                border: "none",
              } : {}}
              onClick={() => onBuy(item)}
              disabled={!canAfford}
            >
              {canAfford
                ? isPriority ? "Get Slot" : `Spend ${item.costXp} XP`
                : "Not enough XP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="sc sc--skeleton">
    <div className="sc__top" style={{ background: "var(--color-bg-base)" }}>
      <div className="skeleton" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px" }} />
      <div className="skeleton" style={{ width: "65%", height: 11, borderRadius: 6, margin: "0 auto" }} />
    </div>
    <div className="sc__body">
      <div className="skeleton" style={{ width: "50%", height: 19, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: "92%", height: 13, borderRadius: 4, marginBottom: 5 }} />
      <div className="skeleton" style={{ width: "80%", height: 13, borderRadius: 4, marginBottom: 18 }} />
      {[78, 68, 58].map((w, i) => (
        <div key={i} className="skeleton" style={{ width: `${w}%`, height: 11, borderRadius: 4, marginBottom: 7 }} />
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
        <div className="skeleton" style={{ width: 58, height: 24, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 116, height: 36, borderRadius: 10 }} />
      </div>
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

     <PageHeader
  {...PAGE_CONFIGS.store}
  right={
    <div className="sph__balance">
      <div className="sph__balance-inner">
        <div className="sph__balance-orb" />
        <span className="sph__balance-label">BALANCE</span>
        <span className="sph__balance-amount">
          {isLoading ? "—" : xpBalance.toLocaleString()}
        </span>
        <span className="sph__balance-unit">XP</span>
        <button className="sph__earn-btn" onClick={() => navigate("/challenges")}>
          + Earn more XP →
        </button>
      </div>
    </div>
  }
/>

      {/* ── Errors ──────────────────────────────────── */}
      {(error || purchaseError) && (
        <div className="sph__error">
          <Icon name="warning" size={16} label="" />
          <span>{error || purchaseError}</span>
          <button onClick={() => setPurchaseError(null)} className="sph__error-dismiss">
            <Icon name="close" size={14} label="Dismiss" />
          </button>
        </div>
      )}

      {/* ── Collection strip ────────────────────────── */}
      {!isLoading && purchases.length > 0 && (
        <div className="sph__collection-strip">
          <span><Icon name="collection" size={15} label="" /></span>
          <span className="sph__collection-text">
            {purchases.length} item{purchases.length !== 1 ? "s" : ""} in your collection
            {unusedPurchases.length > 0 && (
              <span className="sph__collection-unused"> · {unusedPurchases.length} unused</span>
            )}
          </span>
          <button className="sph__collection-link" onClick={() => navigate("/store/purchases")}>
            View all →
          </button>
        </div>
      )}

      {/* ── How it works ────────────────────────────── */}
      <div className="how-strip">
        <div className="how-strip__step">
          <span className="how-strip__num">01</span>
          <span className="how-strip__text">Complete challenges &amp; earn XP</span>
        </div>
        <span className="how-strip__arrow">→</span>
        <div className="how-strip__step">
          <span className="how-strip__num">02</span>
          <span className="how-strip__text">Spend XP on career tools below</span>
        </div>
        <span className="how-strip__arrow">→</span>
        <div className="how-strip__step">
          <span className="how-strip__num">03</span>
          <span className="how-strip__text">Stand out &amp; land the job</span>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
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

      {/* ── Grid ────────────────────────────────────── */}
      <div className="store-grid">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map((item, i) => (
            <StoreCard
              key={item.id}
              item={item}
              index={i}
              xpBalance={xpBalance}
              ownedPurchases={unusedPurchases}
              onBuy={handleBuy}
              onOpen={handleOpen}
            />
          ))
        }
      </div>

      {/* ── Purchase modal ──────────────────────────── */}
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

  /* ── Page header ─────────────────────────── */
 
  .sph__balance { flex-shrink:0; }
  .sph__balance-inner { position:relative; padding:20px 28px; background:linear-gradient(150deg,#2a1900,#150e00); border:1px solid #FCD34D28; border-radius:20px; display:flex; flex-direction:column; align-items:center; min-width:160px; overflow:hidden; }
  .sph__balance-orb { position:absolute; top:-50px; right:-50px; width:130px; height:130px; border-radius:50%; background:radial-gradient(circle,#FCD34D18,transparent 70%); pointer-events:none; }
  .sph__balance-label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.22em; color:#FCD34D44; margin-bottom:4px; }
  .sph__balance-amount { font-family:var(--font-mono); font-size:2.6rem; font-weight:700; color:#FCD34D; line-height:1; text-shadow:0 0 28px #FCD34D44; }
  .sph__balance-unit { font-family:var(--font-mono); font-size:11px; color:#FCD34D66; letter-spacing:.15em; margin-top:2px; }
  .sph__earn-btn { background:none; border:none; font-family:var(--font-mono); font-size:10px; color:#FCD34D44; cursor:pointer; margin-top:8px; transition:color .15s; letter-spacing:.05em; padding:0; }
  .sph__earn-btn:hover { color:#FCD34D; }

  .sph__error { display:flex; align-items:center; gap:10px; padding:12px 16px; background:#450a0a55; border:1px solid #7f1d1d55; border-radius:12px; color:#FCA5A5; font-size:13px; margin-bottom:18px; }
  .sph__error-dismiss { margin-left:auto; background:none; border:none; color:#FCA5A5; cursor:pointer; opacity:.7; }
  .sph__error-dismiss:hover { opacity:1; }

  .sph__collection-strip { display:flex; align-items:center; gap:10px; padding:10px 16px; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:12px; margin-bottom:18px; width:fit-content; }
  .sph__collection-text { font-size:13px; color:var(--color-text-muted); }
  .sph__collection-unused { color:var(--color-primary-300); }
  .sph__collection-link { background:none; border:none; font-family:var(--font-mono); font-size:11px; color:var(--color-primary-400); cursor:pointer; letter-spacing:.05em; padding:0; transition:opacity .15s; }
  .sph__collection-link:hover { opacity:.7; }

  /* ── How it works ─────────────────────────── */
  .how-strip { display:flex; align-items:center; gap:10px; padding:13px 20px; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:14px; margin-bottom:24px; flex-wrap:wrap; }
  .how-strip__step { display:flex; align-items:center; gap:9px; flex:1; min-width:150px; }
  .how-strip__num { font-family:var(--font-mono); font-size:10px; font-weight:700; color:var(--color-primary-400); opacity:.65; letter-spacing:.1em; }
  .how-strip__text { font-size:12px; color:var(--color-text-muted); line-height:1.4; }
  .how-strip__arrow { font-size:15px; color:var(--color-text-disabled); flex-shrink:0; }

  /* ── Filters ──────────────────────────────── */
  .store-filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
  .store-filter-pill { font-family:var(--font-mono); font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; padding:7px 16px; border-radius:999px; border:1px solid var(--color-border-default); background:var(--color-bg-elevated); color:var(--color-text-muted); cursor:pointer; transition:all .15s; }
  .store-filter-pill:hover { border-color:var(--color-border-strong); color:var(--color-text-secondary); }
  .store-filter-pill--active { background:var(--color-primary-glow); border-color:rgba(155,124,255,0.35); color:var(--color-primary-400); box-shadow:0 0 16px var(--color-primary-glow); }

  /* ── Grid ─────────────────────────────────── */
  .store-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; align-items:stretch; }

  /* ═══════════════════════════════════════════
     STORE CARD
  ═══════════════════════════════════════════ */
  .sc {
    position:relative; display:flex; flex-direction:column;
    background:var(--color-bg-elevated); border:1px solid var(--color-border-default);
    border-radius:20px; overflow:hidden; height:100%; box-sizing:border-box;
    transition:transform .22s cubic-bezier(.34,1.56,.64,1), border-color .2s, box-shadow .2s;
    animation:sc-in .35s var(--delay,0ms) both cubic-bezier(.22,1,.36,1);
  }
  @keyframes sc-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .sc:hover { transform:translateY(-5px); border-color:var(--c,var(--color-border-strong)); box-shadow:0 16px 48px #00000055,0 0 0 1px var(--c,transparent),0 0 60px var(--g,transparent); }
  .sc--dim { opacity:.58; }
  .sc--owned { border-color:#34D39922; }

  /* Border glow */
  .sc__border-glow { position:absolute; inset:-1px; border-radius:21px; pointer-events:none; z-index:0; background:conic-gradient(from 0deg,transparent 60%,var(--c,transparent) 80%,transparent 100%); opacity:0; transition:opacity .3s; }
  .sc:hover .sc__border-glow { opacity:.3; }

  /* Top panel */
  .sc__top { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px 20px 22px; overflow:hidden; flex-shrink:0; min-height:166px; z-index:1; }
  .sc__noise { position:absolute; inset:0; pointer-events:none; z-index:0; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); opacity:.7; }
  .sc__orb { position:absolute; top:-40px; right:-40px; width:110px; height:110px; border-radius:50%; background:radial-gradient(circle,var(--c,#ffffff18) 0%,transparent 70%); pointer-events:none; opacity:.45; }

  /* Badge */
  .sc__badge { position:absolute; top:12px; right:12px; z-index:3; font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.14em; padding:3px 9px; border-radius:999px; }
  .sc__badge--owned { background:#34D39915; border:1px solid #34D39944 !important; color:#34D399; }

  /* Icon ring */
  .sc__icon-ring { position:relative; z-index:2; width:70px; height:70px; border-radius:50%; border:1.5px solid; display:flex; align-items:center; justify-content:center; margin-bottom:13px; flex-shrink:0; }
  .sc__icon-inner { width:54px; height:54px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; }

  /* Hero tagline */
  .sc__hero-line { position:relative; z-index:2; font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.06em; text-align:center; margin:0; line-height:1.5; opacity:.85; }

  /* Body */
  .sc__body { position:relative; z-index:1; display:flex; flex-direction:column; padding:20px; gap:13px; flex:1; background:var(--color-bg-elevated); }
  .sc__info { display:flex; flex-direction:column; gap:6px; }
  .sc__name { font-family:var(--font-display); font-size:18px; font-weight:700; color:var(--color-text-primary); margin:0; letter-spacing:-.02em; }
  .sc__desc { font-size:13px; color:var(--color-text-muted); line-height:1.65; margin:0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }

  /* Divider */
  .sc__divider { display:flex; align-items:center; gap:8px; }
  .sc__divider-line { flex:1; height:1px; background:var(--color-border-subtle); }
  .sc__divider-label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.14em; color:var(--color-text-disabled); white-space:nowrap; }

  /* Features */
  .sc__features { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:7px; }
  .sc__feature { display:flex; align-items:flex-start; gap:9px; }
  .sc__feature-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:5px; }
  .sc__feature-text { font-size:12px; color:var(--color-text-muted); line-height:1.5; }
  .sc__feature--more .sc__feature-text { color:var(--color-text-disabled); font-style:italic; }

  /* Footer */
  .sc__footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:13px; border-top:1px solid var(--color-border-subtle); margin-top:auto; }
  .sc__price-block { display:flex; align-items:baseline; gap:4px; }
  .sc__price { font-family:var(--font-mono); font-size:22px; font-weight:700; line-height:1; }
  .sc__price-xp { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); letter-spacing:.1em; }
  .sc__owned-label { display:flex; align-items:center; gap:5px; font-family:var(--font-mono); font-size:11px; font-weight:700; color:#34D399; letter-spacing:.04em; }

  /* CTAs */
  .sc__cta { padding:9px 18px; border-radius:10px; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; white-space:nowrap; border:1px solid transparent; }
  .sc__cta--buy-ready:hover { filter:brightness(1.12); transform:translateY(-1px); }
  .sc__cta--buy-disabled { background:var(--color-bg-overlay); border-color:var(--color-border-default); color:var(--color-text-disabled); opacity:.5; cursor:not-allowed; }
  .sc__cta--open:hover { filter:brightness(1.2); transform:translateY(-1px); }

  /* ═══ PURCHASE MODAL ════════════════════════════════════════ */
  @keyframes sm-fade { from{opacity:0} to{opacity:1} }
  .store-modal { position:relative; width:100%; max-width:540px; max-height:100%; display:flex; flex-direction:column; background:var(--color-bg-surface); border:1px solid var(--color-border-strong); border-radius:20px; box-shadow:0 24px 80px #000000cc; animation:sm-slide .2s cubic-bezier(.34,1.56,.64,1); overflow:hidden; }
  @keyframes sm-slide { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
  .store-modal__header { display:flex; align-items:center; gap:14px; padding:20px 22px 16px; flex-shrink:0; position:sticky; top:0; z-index:2; border-radius:20px 20px 0 0; }
  .store-modal__icon { font-size:2rem; flex-shrink:0; }
  .store-modal__header-info { flex:1; }
  .store-modal__title { font-family:var(--font-display); font-size:var(--text-xl); font-weight:700; color:var(--color-text-primary); margin:0 0 2px; }
  .store-modal__tagline { font-family:var(--font-mono); font-size:11px; letter-spacing:.06em; margin:0; }
  .store-modal__close { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.8); cursor:pointer; padding:6px 10px; border-radius:var(--radius-md); transition:all .15s; flex-shrink:0; }
  .store-modal__close:hover { background:rgba(255,255,255,.2); color:#fff; }
  .store-modal__body { flex:1; overflow-y:auto; padding:16px 22px; display:flex; flex-direction:column; gap:18px; scrollbar-width:thin; scrollbar-color:var(--color-border-strong) transparent; }
  .store-modal__body::-webkit-scrollbar { width:4px; }
  .store-modal__body::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }
  .store-modal__desc { font-size:13px; color:var(--color-text-secondary); line-height:1.75; margin:0; }
  .store-modal__features { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
  .store-modal__feature { display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--color-text-muted); }
  .store-modal__feature-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:5px; }
  .store-modal__section-label { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.15em; color:var(--color-text-muted); margin-bottom:6px; }
  .store-modal__rank-section { display:flex; flex-direction:column; gap:8px; }
  .store-modal__rank-options { display:flex; flex-direction:column; gap:8px; }
  .store-rank-option { width:100%; display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; border:1px solid var(--color-border-default); background:var(--color-bg-overlay); cursor:pointer; transition:all .15s; text-align:left; }
  .store-rank-option:hover { border-color:var(--color-border-strong); background:var(--color-bg-elevated); }
  .store-rank-option__medal { font-size:1.2rem; flex-shrink:0; }
  .store-rank-option__text { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
  .store-rank-option__label { font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--color-text-secondary); }
  .store-rank-option__perk { font-size:10px; color:var(--color-text-muted); line-height:1.4; }
  .store-rank-option__cost { font-family:var(--font-mono); font-size:14px; font-weight:700; color:var(--color-text-secondary); flex-shrink:0; }
  .store-modal__job-section { display:flex; flex-direction:column; gap:10px; }
  .store-modal__job-hint { font-size:11px; color:var(--color-text-muted); margin:0; line-height:1.55; }
  .store-modal__job-loading { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--color-bg-overlay); border-radius:10px; font-size:13px; color:var(--color-text-muted); }
  .store-spinner-sm { display:inline-block; width:14px; height:14px; flex-shrink:0; border:2px solid var(--color-border-default); border-radius:50%; animation:spin .6s linear infinite; }
  .store-modal__job-empty { display:flex; align-items:flex-start; gap:12px; padding:14px; background:var(--color-primary-glow); border:1px solid rgba(155,124,255,0.18); border-radius:10px; }
  .store-modal__job-empty-title { font-size:13px; font-weight:600; color:var(--color-text-secondary); margin:0 0 4px; }
  .store-modal__job-empty-sub { font-size:11px; color:var(--color-text-muted); margin:0; line-height:1.55; }
  .store-modal__job-list { display:flex; flex-direction:column; gap:6px; max-height:190px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--color-border-strong) transparent; padding-right:2px; }
  .store-modal__job-list::-webkit-scrollbar { width:3px; }
  .store-modal__job-list::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }
  .store-job-option { width:100%; display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; border:1px solid var(--color-border-default); background:var(--color-bg-overlay); cursor:pointer; transition:all .15s; text-align:left; }
  .store-job-option:hover { border-color:var(--color-border-strong); background:var(--color-bg-elevated); }
  .store-job-option__icon { font-size:1rem; flex-shrink:0; }
  .store-job-option__info { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
  .store-job-option__title { font-size:13px; font-weight:600; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .store-job-option__status { font-family:var(--font-mono); font-size:10px; font-weight:600; letter-spacing:.04em; }
  .store-job-option__check { font-size:14px; font-weight:700; flex-shrink:0; }
  .store-modal__cost-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; background:var(--color-bg-overlay); border:1px solid var(--color-border-subtle); border-radius:12px; }
  .store-modal__arrow { color:var(--color-text-disabled); font-size:18px; }
  .store-modal__balance-info,.store-modal__after-info { display:flex; flex-direction:column; gap:2px; }
  .store-modal__balance-label { font-family:var(--font-mono); font-size:10px; letter-spacing:.1em; color:var(--color-text-muted); }
  .store-modal__balance-value { font-family:var(--font-mono); font-size:17px; font-weight:700; color:var(--color-text-primary); }
  .store-modal__insufficient { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; background:#450a0a55; border:1px solid #7f1d1d55; border-radius:10px; font-size:13px; color:#FCA5A5; }
  .store-modal__insufficient p { margin:0; }
  .store-modal__footer { display:flex; gap:10px; justify-content:flex-end; padding:14px 22px 18px; border-top:1px solid var(--color-border-subtle); flex-shrink:0; background:var(--color-bg-surface); border-radius:0 0 20px 20px; }
  .store-btn-secondary { padding:9px 20px; border-radius:10px; font-family:var(--font-mono); font-size:13px; font-weight:600; background:none; border:1px solid var(--color-border-default); color:var(--color-text-muted); cursor:pointer; transition:all .15s; }
  .store-btn-secondary:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .store-btn-purchase { padding:10px 24px; border-radius:10px; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.05em; border:none; cursor:pointer; color:white; min-width:160px; transition:all .15s; background:var(--color-bg-overlay); }
  .store-btn-purchase:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.1); }
  .store-btn-purchase:disabled { cursor:not-allowed; }
  .store-purchasing-indicator { display:flex; align-items:center; gap:8px; justify-content:center; }
  .store-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:spin .6s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }

  /* XP Drain */
  .xp-drain-overlay { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:9999; pointer-events:none; animation:drain-anim 1.2s ease-out forwards; }
  @keyframes drain-anim { 0%{transform:translate(-50%,-50%) scale(.8);opacity:0} 20%{transform:translate(-50%,-60%) scale(1.2);opacity:1} 80%{transform:translate(-50%,-90%) scale(1);opacity:1} 100%{transform:translate(-50%,-110%) scale(.9);opacity:0} }
  .xp-drain-text { font-family:var(--font-display); font-size:2.5rem; font-weight:700; color:#FCD34D; text-shadow:0 0 30px #FCD34D88; }

  /* ── Responsive ───────────────────────────── */
  @media (max-width:1100px) {
    .store-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:900px) {
    .sph { flex-direction:column; gap:20px; }
    .store-grid { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:640px) {
    .store-grid { grid-template-columns:1fr; }
    .how-strip { gap:6px; }
    .how-strip__arrow { transform:rotate(90deg); }
  }
`;

export default StorePage;