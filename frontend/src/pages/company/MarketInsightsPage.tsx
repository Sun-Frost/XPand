import React, { useState, useCallback } from "react";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useMarketInsights } from "../../hooks/company/useCompany";
import { exportMarketInsightsPdf } from "../../utils/pdfExport";
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
          <div className="mi-bar-fill mi-bar-fill--major" style={{ width: `${width * (majorPct / 100)}%` }} />
          <div className="mi-bar-fill mi-bar-fill--minor" style={{ width: `${width * ((100 - majorPct) / 100)}%`, marginLeft: `${width * (majorPct / 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Breakdown item
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

const StatTile: React.FC<{ icon: IconName; value: string | number; label: string; color?: string; sub?: string }> = ({
  icon, value, label, color = "var(--color-verified)", sub
}) => (
  <div className="mi-stat" style={{ "--mc": color } as React.CSSProperties}>
    <div className="mi-stat__icon"><Icon name={icon} size={22} label="" /></div>
    <div className="mi-stat__value">{value}</div>
    <div className="mi-stat__label">{label}</div>
    {sub && <div className="mi-stat__sub">{sub}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Mini metric row — used inside detail cards
// ---------------------------------------------------------------------------

const MetricRow: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div className="mi-metric-row">
    <span className="mi-metric-row__label">{label}</span>
    <span className="mi-metric-row__value" style={color ? { color } : {}}>{value}</span>
  </div>
);

// ---------------------------------------------------------------------------
// MarketInsightsPage
// ---------------------------------------------------------------------------

const MarketInsightsPage: React.FC = () => {
  const { insights, isLoading, error, refetch } = useMarketInsights();
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!insights) return;
    setIsExporting(true);
    try {
      await exportMarketInsightsPdf({
        totalActiveJobs: insights.totalActiveJobs,
        skillDemand: insights.skillDemand,
        topSkills: insights.topSkills,
        jobTypeBreakdown: insights.jobTypeBreakdown,
        locationBreakdown: insights.locationBreakdown,
      });
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setIsExporting(false);
    }
  }, [insights]);

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
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Failed to load insights</h3>
          <p>{error ?? "No data available."}</p>
          <button className="btn btn-ghost btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </CompanyPageLayout>
    );
  }

  // ── Derived metrics ──────────────────────────────────────────────────────

  const visibleSkills    = showAllSkills ? insights.skillDemand : insights.skillDemand.slice(0, 10);
  const maxJobCount      = insights.skillDemand[0]?.jobCount ?? 1;
  const totalJobsForType = Object.values(insights.jobTypeBreakdown).reduce((a, b) => a + b, 0);
  const topLocations     = Object.entries(insights.locationBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const uniqueSkills     = insights.skillDemand.length;
  const majorSkillsCount = insights.skillDemand.filter((s) => s.majorCount > 0).length;
  const minorOnlySkills  = uniqueSkills - majorSkillsCount;
  const jobTypesCount    = Object.keys(insights.jobTypeBreakdown).length;
  const locationsCount   = Object.keys(insights.locationBreakdown).length;

  // Top job type
  const topJobType = Object.entries(insights.jobTypeBreakdown).sort((a, b) => b[1] - a[1])[0];
  const topLocation = topLocations[0];

  // Avg jobs per skill
  const avgJobsPerSkill = uniqueSkills > 0
    ? (insights.skillDemand.reduce((sum, s) => sum + s.jobCount, 0) / uniqueSkills).toFixed(1)
    : "—";

  // Demand concentration: % of jobs covered by top 5 skills
  const top5JobCount = insights.topSkills.slice(0, 5).reduce((sum, s) => sum + s.jobCount, 0);
  const top5Concentration = insights.totalActiveJobs > 0
    ? Math.round((top5JobCount / insights.totalActiveJobs) * 100)
    : 0;

  return (
    <CompanyPageLayout pageTitle="Market Insights">

      {/* ── Header ── */}
      <div className="mi-header">
        <div>
          <h1 className="mi-page-title">Market Insights</h1>
          <p className="mi-page-sub">Real-time data from active job postings on XPand.</p>
        </div>
        <div className="mi-header__actions">
          <button className="btn btn-ghost btn-sm" onClick={refetch}>↻ Refresh</button>
          {/* ── Export to PDF ── */}
          <button
            className="mi-export-btn"
            onClick={handleExportPdf}
            disabled={isExporting}
            title="Download market insights as PDF"
          >
            {isExporting
              ? <><span className="mi-export-btn__spinner" /> Exporting…</>
              : <>⬇ Export PDF</>}
          </button>
        </div>
      </div>

      {/* ── Primary stats overview ── */}
      <div className="mi-stats">
        <StatTile icon="work" value={insights.totalActiveJobs} label="Active Jobs"
          color="var(--color-verified)" sub={`${jobTypesCount} types`} />
        <StatTile icon="cat-default" value={uniqueSkills} label="Skills in Demand"
          color="var(--color-premium,#8B5CF6)" sub={`avg ${avgJobsPerSkill} jobs/skill`} />
        <StatTile icon="badge" value={majorSkillsCount} label="Major Requirement"
          color="var(--color-xp,#F59E0B)" sub={`${minorOnlySkills} minor-only`} />
        <StatTile icon="location" value={locationsCount} label="Hiring Locations"
          color="var(--color-info,#60A5FA)" sub={topLocation ? topLocation[0] : undefined} />
      </div>

      {/* ── Extended stats row ── */}
      <div className="mi-extended-stats">
        {/* Demand concentration */}
        <div className="mi-ext-card">
          <div className="mi-ext-card__icon"><Icon name="challenge-streak" size={24} label="" /></div>
          <div className="mi-ext-card__body">
            <div className="mi-ext-card__value" style={{ color: "#F59E0B" }}>{top5Concentration}%</div>
            <div className="mi-ext-card__label">Demand concentration</div>
            <div className="mi-ext-card__sub">Top 5 skills cover {top5Concentration}% of all job requirements</div>
          </div>
        </div>

        {/* Top job type */}
        {topJobType && (
          <div className="mi-ext-card">
            <div className="mi-ext-card__icon"><Icon name="clipboard" size={24} label="" /></div>
            <div className="mi-ext-card__body">
              <div className="mi-ext-card__value" style={{ color: JOB_TYPE_COLORS[topJobType[0]] ?? "#A78BFA" }}>
                {topJobType[0].replace(/_/g, " ")}
              </div>
              <div className="mi-ext-card__label">Most posted type</div>
              <div className="mi-ext-card__sub">{topJobType[1]} jobs · {pct(topJobType[1], totalJobsForType)}% of total</div>
            </div>
          </div>
        )}

        {/* Top location */}
        {topLocation && (
          <div className="mi-ext-card">
            <div className="mi-ext-card__icon"><Icon name="location" size={24} label="" /></div>
            <div className="mi-ext-card__body">
              <div className="mi-ext-card__value" style={{ color: "#22D3EE" }}>{topLocation[0]}</div>
              <div className="mi-ext-card__label">Top hiring location</div>
              <div className="mi-ext-card__sub">{topLocation[1]} jobs · {pct(topLocation[1], insights.totalActiveJobs)}% of total</div>
            </div>
          </div>
        )}

        {/* Top skill */}
        {insights.topSkills.length > 0 && (
          <div className="mi-ext-card">
            <div className="mi-ext-card__icon"><Icon name="trophy" size={24} label="" /></div>
            <div className="mi-ext-card__body">
              <div className="mi-ext-card__value" style={{ color: "#A78BFA" }}>{insights.topSkills[0].skillName}</div>
              <div className="mi-ext-card__label">#1 most in-demand skill</div>
              <div className="mi-ext-card__sub">{insights.topSkills[0].jobCount} active job listings</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div className="mi-body">

        {/* LEFT: Skill demand */}
        <div className="mi-col mi-col--wide">
          <div className="mi-panel">
            <div className="mi-panel__head">
              <h2 className="mi-panel__title"><Icon name="cat-default" size={16} label="" /> Skill Demand</h2>
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

          {/* Skill metrics deep-dive */}
          {insights.skillDemand.length > 0 && (
            <div className="mi-panel">
              <div className="mi-panel__head">
                <h2 className="mi-panel__title"><Icon name="filter-growing" size={16} label="" /> Skill Metrics</h2>
                <span className="mi-panel__hint">Distribution analysis</span>
              </div>
              <div className="mi-panel__body">
                <MetricRow label="Total unique skills" value={uniqueSkills} />
                <MetricRow label="Skills required as major" value={majorSkillsCount} color="#F59E0B" />
                <MetricRow label="Minor-only skills" value={minorOnlySkills} color="#A78BFA" />
                <MetricRow label="Avg jobs per skill" value={avgJobsPerSkill} color="#22D3EE" />
                <MetricRow label="Top 5 demand share" value={`${top5Concentration}%`} color="#34D399" />
                <MetricRow label="Most wanted skill" value={insights.topSkills[0]?.skillName ?? "—"} color="#F472B6" />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Breakdowns */}
        <div className="mi-col">

          {/* Job type breakdown */}
          <div className="mi-panel">
            <div className="mi-panel__head">
              <h2 className="mi-panel__title"><Icon name="clipboard" size={16} label="" /> Job Types</h2>
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
                <h2 className="mi-panel__title"><Icon name="location" size={16} label="" /> Top Locations</h2>
                <span className="mi-panel__hint">{locationsCount} total</span>
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

          {/* Hot Skills */}
          {insights.topSkills.length > 0 && (
            <div className="mi-panel">
              <div className="mi-panel__head">
                <h2 className="mi-panel__title"><Icon name="challenge-streak" size={16} label="" /> Hot Skills</h2>
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
                      {i < 3 && <span className="mi-hot-skill__medal"><Icon name={i === 0 ? "badge-gold" : i === 1 ? "badge-silver" : "badge-bronze"} size={14} label="" /></span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Job type + location summary */}
          <div className="mi-panel">
            <div className="mi-panel__head">
              <h2 className="mi-panel__title"><Icon name="cat-data" size={16} label="" /> Market Summary</h2>
            </div>
            <div className="mi-panel__body">
              <MetricRow label="Total active jobs" value={insights.totalActiveJobs} color="#34D399" />
              <MetricRow label="Job type variety" value={`${jobTypesCount} types`} color="#A78BFA" />
              <MetricRow label="Geographic spread" value={`${locationsCount} locations`} color="#22D3EE" />
              {topJobType && <MetricRow label="Dominant contract type" value={topJobType[0].replace(/_/g, " ")} color={JOB_TYPE_COLORS[topJobType[0]] ?? "#64748B"} />}
              {topLocation && <MetricRow label="Top hiring city/region" value={topLocation[0]} color="#60A5FA" />}
            </div>
          </div>
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
  .mi-header__actions { display: flex; align-items: center; gap: var(--space-3); }
  .mi-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .mi-page-sub { color: var(--color-text-muted); font-size: var(--text-sm); margin-top: 3px; }

  /* ── Export PDF button ── */
  .mi-export-btn { display:inline-flex; align-items:center; gap:7px; padding:8px 16px; border-radius:var(--radius-lg,10px); border:1px solid rgba(139,92,246,.35); background:rgba(139,92,246,.08); color:#A78BFA; font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:.05em; cursor:pointer; transition:all 130ms; white-space:nowrap; }
  .mi-export-btn:hover:not(:disabled) { background:rgba(139,92,246,.14); border-color:rgba(139,92,246,.6); box-shadow:0 0 12px rgba(139,92,246,.18); }
  .mi-export-btn:disabled { opacity:.5; cursor:not-allowed; }
  .mi-export-btn__spinner { display:inline-block; width:12px; height:12px; border:2px solid rgba(167,139,250,.3); border-top-color:#A78BFA; border-radius:50%; animation:mi-spin .7s linear infinite; flex-shrink:0; }
  @keyframes mi-spin { to { transform:rotate(360deg); } }

  /* Stats */
  .mi-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-5); }
  .mi-stat { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-5); text-align: center; transition: all 160ms ease; }
  .mi-stat:hover { border-color: color-mix(in srgb, var(--mc) 30%, transparent); }
  .mi-stat__icon { font-size: 1.75rem; margin-bottom: var(--space-2); }
  .mi-stat__value { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--mc); line-height: 1; }
  .mi-stat__label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-text-muted); margin-top: 4px; }
  .mi-stat__sub { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-disabled); margin-top: 3px; }

  /* Extended stats row */
  .mi-extended-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-8); }
  .mi-ext-card { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-4) var(--space-5); display: flex; align-items: flex-start; gap: var(--space-3); }
  .mi-ext-card__icon { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px; }
  .mi-ext-card__body { flex: 1; min-width: 0; }
  .mi-ext-card__value { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-bold); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mi-ext-card__label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--color-text-muted); margin-top: 3px; }
  .mi-ext-card__sub { font-size: 11px; color: var(--color-text-disabled); margin-top: 4px; line-height: 1.4; }

  /* Metric row */
  .mi-metric-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-subtle); }
  .mi-metric-row:last-child { border-bottom: none; }
  .mi-metric-row__label { font-size: var(--text-sm); color: var(--color-text-secondary); }
  .mi-metric-row__value { font-family: var(--font-mono); font-size: 12px; font-weight: var(--weight-bold); color: var(--color-text-primary); }

  /* Layout */
  .mi-body { display: grid; grid-template-columns: 1fr 360px; gap: var(--space-6); align-items: start; }
  .mi-col { display: flex; flex-direction: column; gap: var(--space-6); }
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
  @media(max-width:1280px){ .mi-extended-stats { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:1024px){ .mi-stats { grid-template-columns: repeat(2,1fr); } .mi-body { grid-template-columns: 1fr; } .mi-extended-stats { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:640px){ .mi-stats { grid-template-columns: 1fr 1fr; } .mi-extended-stats { grid-template-columns: 1fr; } .mi-header { flex-direction:column; align-items:flex-start; } }
`;

export default MarketInsightsPage;