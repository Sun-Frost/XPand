import React, { useState } from "react";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { useMarketInsights } from "../../hooks/company/useCompany";
import type { SkillDemand } from "../../hooks/company/useCompany";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pct = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0;

// ---------------------------------------------------------------------------
// Skill demand bar row
// ---------------------------------------------------------------------------

const DemandBar: React.FC<{ skill: SkillDemand; max: number; rank: number }> = ({ skill, max, rank }) => {
  const width = max > 0 ? (skill.jobCount / max) * 100 : 0;
  const majorPct = skill.jobCount > 0 ? Math.round((skill.majorCount / skill.jobCount) * 100) : 0;

  return (
    <div className="mi-bar-row">
      <div className="mi-bar-row__rank">{rank}</div>
      <div className="mi-bar-row__body">
        <div className="mi-bar-row__top">
          <span className="mi-bar-row__name">{skill.skillName}</span>
          <div className="mi-bar-row__nums">
            <span className="mi-bar-row__count">{skill.jobCount} job{skill.jobCount !== 1 ? "s" : ""}</span>
            {skill.majorCount > 0 && (
              <span className="mi-bar-row__major badge badge-premium">{skill.majorCount} major</span>
            )}
          </div>
        </div>
        <div className="mi-bar-track">
          {/* Major portion */}
          <div className="mi-bar-fill mi-bar-fill--major" style={{ width: `${width * (majorPct / 100)}%` }} />
          {/* Minor portion */}
          <div className="mi-bar-fill mi-bar-fill--minor" style={{ width: `${width * ((100 - majorPct) / 100)}%`, marginLeft: `${width * (majorPct / 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Donut-style breakdown
// ---------------------------------------------------------------------------

const BreakdownItem: React.FC<{ label: string; count: number; total: number; color: string }> = ({
  label, count, total, color
}) => {
  const p = pct(count, total);
  return (
    <div className="mi-bd-item">
      <div className="mi-bd-item__header">
        <div className="mi-bd-item__dot" style={{ background: color }} />
        <span className="mi-bd-item__label">{label.replace(/_/g, " ")}</span>
        <span className="mi-bd-item__count">{count}</span>
      </div>
      <div className="mi-bd-bar-track">
        <div className="mi-bd-bar-fill" style={{ width: `${p}%`, background: color }} />
      </div>
      <div className="mi-bd-item__pct">{p}%</div>
    </div>
  );
};

// Colors for breakdown charts
const JOB_TYPE_COLORS: Record<string, string> = {
  FULL_TIME: "#34D399", PART_TIME: "#A78BFA", CONTRACT: "#F59E0B",
  INTERNSHIP: "#60A5FA", FREELANCE: "#F472B6", UNSPECIFIED: "#64748B",
};

const LOC_COLORS = ["#A78BFA", "#34D399", "#F59E0B", "#60A5FA", "#F472B6", "#22D3EE", "#FB923C", "#94A3B8"];

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

const StatTile: React.FC<{ icon: string; value: string | number; label: string; color?: string }> = ({
  icon, value, label, color = "var(--color-verified)"
}) => (
  <div className="mi-stat" style={{ "--mc": color } as React.CSSProperties}>
    <div className="mi-stat__icon">{icon}</div>
    <div className="mi-stat__value">{value}</div>
    <div className="mi-stat__label">{label}</div>
  </div>
);

// ---------------------------------------------------------------------------
// MarketInsightsPage
// ---------------------------------------------------------------------------

const MarketInsightsPage: React.FC = () => {
  const { insights, isLoading, error, refetch } = useMarketInsights();
  const [showAllSkills, setShowAllSkills] = useState(false);

  if (isLoading) {
    return (
      <CompanyPageLayout pageTitle="Market Insights">
        <div className="mi-skeleton-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
        <div className="skeleton mt-6" style={{ height: 400 }} />
      </CompanyPageLayout>
    );
  }

  if (error || !insights) {
    return (
      <CompanyPageLayout pageTitle="Market Insights">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load insights</h3>
          <p>{error ?? "No data available."}</p>
          <button className="btn btn-ghost btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </CompanyPageLayout>
    );
  }

  const visibleSkills = showAllSkills ? insights.skillDemand : insights.skillDemand.slice(0, 10);
  const maxJobCount = insights.skillDemand[0]?.jobCount ?? 1;
  const totalJobsForType = Object.values(insights.jobTypeBreakdown).reduce((a, b) => a + b, 0);
  const topLocations = Object.entries(insights.locationBreakdown)
    .sort((a, b) => b[1] - a[1]).slice(0, 8);

  const uniqueSkills = insights.skillDemand.length;
  const uniqueCompanies = new Set<string>(); // We can't get company count directly from jobs endpoint, skip

  return (
    <CompanyPageLayout pageTitle="Market Insights">

      {/* ── Header ── */}
      <div className="mi-header">
        <div>
          <h1 className="mi-page-title">Market Insights</h1>
          <p className="mi-page-sub">Real-time data from active job postings on XPand.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refetch}>↻ Refresh</button>
      </div>

      {/* ── Stats overview ── */}
      <div className="mi-stats">
        <StatTile icon="💼" value={insights.totalActiveJobs} label="Active Jobs" color="var(--color-verified)" />
        <StatTile icon="🎯" value={uniqueSkills} label="Skills in Demand" color="var(--color-premium,#8B5CF6)" />
        <StatTile icon="⭐" value={insights.skillDemand.filter(s => s.majorCount > 0).length} label="Skills Sought as Major" color="var(--color-xp,#F59E0B)" />
        <StatTile icon="📊" value={Object.keys(insights.jobTypeBreakdown).length} label="Job Types Posted" color="var(--color-info,#60A5FA)" />
      </div>

      {/* ── Two-column layout ── */}
      <div className="mi-body">

        {/* LEFT: Skill demand */}
        <div className="mi-col mi-col--wide">
          <div className="mi-panel">
            <div className="mi-panel__head">
              <h2 className="mi-panel__title">🎯 Skill Demand</h2>
              <span className="mi-panel__hint">Based on active job postings</span>
            </div>
            <div className="mi-panel__body">
              {insights.skillDemand.length === 0 ? (
                <p className="mi-empty">No skill requirements found in active jobs.</p>
              ) : (
                <>
                  <div className="mi-legend">
                    <span className="mi-legend-dot mi-legend-dot--major" />Major requirement
                    <span className="mi-legend-dot mi-legend-dot--minor" style={{ marginLeft: "var(--space-4)" }} />Minor requirement
                  </div>
                  <div className="mi-bars">
                    {visibleSkills.map((skill, i) => (
                      <DemandBar key={skill.skillId} skill={skill} max={maxJobCount} rank={i + 1} />
                    ))}
                  </div>
                  {insights.skillDemand.length > 10 && (
                    <button className="btn btn-ghost btn-sm mt-4 w-full"
                      onClick={() => setShowAllSkills(!showAllSkills)}>
                      {showAllSkills ? "Show Less" : `Show All ${insights.skillDemand.length} Skills`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Breakdowns */}
        <div className="mi-col">

          {/* Job type breakdown */}
          <div className="mi-panel">
            <div className="mi-panel__head">
              <h2 className="mi-panel__title">📋 Job Types</h2>
            </div>
            <div className="mi-panel__body">
              {Object.entries(insights.jobTypeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <BreakdownItem key={type}
                  label={type.replace(/_/g, " ")}
                  count={count}
                  total={totalJobsForType}
                  color={JOB_TYPE_COLORS[type] ?? "#64748B"} />
              ))}
            </div>
          </div>

          {/* Location breakdown */}
          {topLocations.length > 0 && (
            <div className="mi-panel">
              <div className="mi-panel__head">
                <h2 className="mi-panel__title">📍 Top Locations</h2>
              </div>
              <div className="mi-panel__body">
                {topLocations.map(([loc, count], i) => (
                  <BreakdownItem key={loc}
                    label={loc}
                    count={count}
                    total={insights.totalActiveJobs}
                    color={LOC_COLORS[i % LOC_COLORS.length]} />
                ))}
              </div>
            </div>
          )}

          {/* Top 5 most demanded skills — card pills */}
          {insights.topSkills.length > 0 && (
            <div className="mi-panel">
              <div className="mi-panel__head">
                <h2 className="mi-panel__title">🔥 Hot Skills</h2>
                <span className="mi-panel__hint">Most in-demand right now</span>
              </div>
              <div className="mi-panel__body">
                <div className="mi-hot-skills">
                  {insights.topSkills.slice(0, 5).map((s, i) => (
                    <div key={s.skillId} className={`mi-hot-skill mi-hot-skill--${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "default"}`}>
                      <span className="mi-hot-skill__rank">{i + 1}</span>
                      <div className="mi-hot-skill__body">
                        <span className="mi-hot-skill__name">{s.skillName}</span>
                        <span className="mi-hot-skill__count">{s.jobCount} job{s.jobCount !== 1 ? "s" : ""}</span>
                      </div>
                      {i < 3 && <span className="mi-hot-skill__medal">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  .mi-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-8); flex-wrap: wrap; }
  .mi-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .mi-page-sub { color: var(--color-text-muted); font-size: var(--text-sm); margin-top: 3px; }
  /* Stats */
  .mi-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-8); }
  .mi-stat { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-5); text-align: center; transition: all 160ms ease; }
  .mi-stat:hover { border-color: color-mix(in srgb, var(--mc) 30%, transparent); }
  .mi-stat__icon { font-size: 1.75rem; margin-bottom: var(--space-2); }
  .mi-stat__value { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--mc); line-height: 1; }
  .mi-stat__label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-text-muted); margin-top: 4px; }
  /* Layout */
  .mi-body { display: grid; grid-template-columns: 1fr 360px; gap: var(--space-6); align-items: start; }
  .mi-col { display: flex; flex-direction: column; gap: var(--space-6); }
  .mi-col--wide {}
  /* Panel */
  .mi-panel { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); overflow: hidden; }
  .mi-panel__head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border-subtle); }
  .mi-panel__title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .mi-panel__hint { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); }
  .mi-panel__body { padding: var(--space-5) var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); }
  .mi-empty { color: var(--color-text-muted); font-size: var(--text-sm); text-align: center; padding: var(--space-6) 0; }
  /* Legend */
  .mi-legend { display: flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); margin-bottom: var(--space-2); }
  .mi-legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .mi-legend-dot--major { background: var(--color-premium,#8B5CF6); }
  .mi-legend-dot--minor { background: rgba(139,92,246,.3); }
  /* Demand bars */
  .mi-bars { display: flex; flex-direction: column; gap: var(--space-4); }
  .mi-bar-row { display: flex; align-items: center; gap: var(--space-4); }
  .mi-bar-row__rank { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-muted); min-width: 20px; text-align: right; }
  .mi-bar-row__body { flex: 1; }
  .mi-bar-row__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
  .mi-bar-row__name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
  .mi-bar-row__nums { display: flex; align-items: center; gap: var(--space-2); }
  .mi-bar-row__count { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-muted); }
  .mi-bar-row__major { font-size: 9px !important; padding: 1px 6px !important; }
  .mi-bar-track { height: 8px; background: var(--color-bg-overlay); border-radius: var(--radius-full); overflow: hidden; position: relative; }
  .mi-bar-fill { position: absolute; height: 100%; top: 0; border-radius: var(--radius-full); transition: width .8s var(--ease-out,ease); }
  .mi-bar-fill--major { background: var(--color-premium,#8B5CF6); }
  .mi-bar-fill--minor { background: rgba(139,92,246,.35); }
  /* Breakdown */
  .mi-bd-item { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .mi-bd-item__header { display: flex; align-items: center; gap: var(--space-2); width: 100%; }
  .mi-bd-item__dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .mi-bd-item__label { flex: 1; font-size: var(--text-sm); color: var(--color-text-secondary); text-transform: capitalize; }
  .mi-bd-item__count { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-muted); }
  .mi-bd-bar-track { flex: 1; height: 5px; background: var(--color-bg-overlay); border-radius: var(--radius-full); overflow: hidden; }
  .mi-bd-bar-fill { height: 100%; border-radius: var(--radius-full); transition: width .6s ease; }
  .mi-bd-item__pct { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); min-width: 32px; text-align: right; }
  /* Hot skills */
  .mi-hot-skills { display: flex; flex-direction: column; gap: var(--space-3); }
  .mi-hot-skill { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle); background: var(--color-bg-elevated); }
  .mi-hot-skill--gold { border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.05); }
  .mi-hot-skill--silver { border-color: rgba(148,163,184,.3); background: rgba(148,163,184,.05); }
  .mi-hot-skill--bronze { border-color: rgba(205,127,50,.3); background: rgba(205,127,50,.05); }
  .mi-hot-skill__rank { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-muted); min-width: 16px; }
  .mi-hot-skill__body { flex: 1; }
  .mi-hot-skill__name { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); display: block; }
  .mi-hot-skill__count { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); }
  .mi-hot-skill__medal { font-size: 1.1rem; }
  /* Badges */
  .badge-premium { background: rgba(139,92,246,.1); border-color: rgba(139,92,246,.28); color: #A78BFA; }
  /* Skeleton */
  .mi-skeleton-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--space-4); }
  /* Responsive */
  @media(max-width:1024px){ .mi-stats { grid-template-columns: repeat(2,1fr); } .mi-body { grid-template-columns: 1fr; } }
  @media(max-width:640px){ .mi-stats { grid-template-columns: 1fr 1fr; } }
`;

export default MarketInsightsPage;
