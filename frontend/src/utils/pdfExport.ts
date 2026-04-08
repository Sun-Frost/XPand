/* ============================================================
   pdfExport.ts — XPand PDF Export Utility  v2.0
   Uses html2pdf.js for clean, professional PDF generation.
   ============================================================ */

export interface PdfOptions {
  filename: string;
  title?: string;
  subtitle?: string;
}

/** Dynamically loads html2pdf.js if not already present. */
async function loadHtml2Pdf(): Promise<typeof window.html2pdf> {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).html2pdf) {
    return (window as unknown as Record<string, unknown>).html2pdf as typeof window.html2pdf;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve((window as unknown as Record<string, unknown>).html2pdf as typeof window.html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf.js"));
    document.head.appendChild(script);
  });
}

/** Wraps content in a styled PDF shell that matches XPand branding. */
function buildPdfWrapper(innerHtml: string, title: string, subtitle?: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    font-family: 'Inter', 'Segoe UI', sans-serif;
    background: #ffffff;
    color: #1a1a2e;
    padding: 48px;
    max-width: 900px;
    margin: 0 auto;
    box-sizing: border-box;
  `;

  wrapper.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #7B5EA7;margin-bottom:32px;">
      <div>
        <div style="font-family:'Syne','Orbitron',sans-serif;font-size:22px;font-weight:800;color:#7B5EA7;letter-spacing:.05em;text-transform:uppercase;">XPand</div>
        <div style="font-size:11px;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-top:2px;">Level Up Your Skill Set</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#94a3b8;">Generated</div>
        <div style="font-size:12px;color:#475569;font-weight:600;">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
    </div>
    <div style="margin-bottom:28px;">
      <h1 style="font-size:26px;font-weight:800;color:#1e1b4b;margin:0 0 6px;font-family:'Syne',sans-serif;">${title}</h1>
      ${subtitle ? `<p style="font-size:13px;color:#64748b;margin:0;">${subtitle}</p>` : ""}
    </div>
    <div>${innerHtml}</div>
    <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
      <span>XPand · Confidential</span>
      <span>xpand.app</span>
    </div>
  `;

  document.body.appendChild(wrapper);
  return wrapper;
}

/** Core export: renders innerHtml as a styled PDF. */
export async function exportToPdf(innerHtml: string, options: PdfOptions): Promise<void> {
  const html2pdf = await loadHtml2Pdf();
  const wrapper = buildPdfWrapper(innerHtml, options.title ?? options.filename, options.subtitle);
  const pdfOptions = {
    margin: 0,
    filename: `${options.filename}.pdf`,
    image: { type: "jpeg", quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  try {
    await html2pdf().set(pdfOptions).from(wrapper).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

/* ── Formatting helpers ─────────────────────────────────────── */

export function pdfSection(title: string, content: string): string {
  return `
    <div style="margin-bottom:28px;page-break-inside:avoid;">
      <h2 style="font-size:13px;font-weight:700;color:#7B5EA7;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">${title}</h2>
      ${content}
    </div>
  `;
}

export function pdfTable(headers: string[], rows: string[][]): string {
  const thead = `<tr>${headers.map((h) => `<th style="background:#f8f5ff;color:#4c1d95;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:10px 12px;text-align:left;border-bottom:2px solid #7B5EA7;">${h}</th>`).join("")}</tr>`;
  const tbody = rows.map((row, ri) => `
    <tr style="background:${ri % 2 === 0 ? "#fff" : "#fafafa"};">
      ${row.map((cell) => `<td style="font-size:12px;color:#334155;padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;">${cell}</td>`).join("")}
    </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-family:inherit;"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

export function pdfBadge(text: string, color = "#7B5EA7"): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:20px;background:${color}18;color:${color};font-size:10px;font-weight:700;letter-spacing:.04em;border:1px solid ${color}44;margin:1px;">${text}</span>`;
}

export function pdfStatBox(items: { label: string; value: string | number; color?: string }[]): string {
  return `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
      ${items.map((item) => `
        <div style="flex:1;min-width:120px;background:${item.color ? item.color + "12" : "#f8f5ff"};border:1px solid ${item.color ? item.color + "33" : "#e9d8fd"};border-radius:10px;padding:14px 16px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:${item.color ?? "#7B5EA7"};font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:4px;">${item.value}</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;">${item.label}</div>
        </div>`).join("")}
    </div>`;
}

export function pdfProseBlock(text: string): string {
  return `<p style="font-size:13px;color:#334155;line-height:1.8;margin:0 0 12px;white-space:pre-wrap;">${text}</p>`;
}

/* ── NEW: Readiness Report PDF builder ─────────────────────── */

export async function exportReadinessReportPdf(opts: {
  reportContent: string;
  generatedAt: string;
  score: number | null;
  itemName: string;
}): Promise<void> {
  const scoreColor = (n: number) => n >= 80 ? "#16a34a" : n >= 60 ? "#2563eb" : n >= 40 ? "#d97706" : "#dc2626";
  const scoreLabel = (n: number) => n >= 80 ? "Job Ready" : n >= 60 ? "Nearly There" : n >= 40 ? "In Progress" : "Early Stage";

  const scoreHtml = opts.score !== null ? `
    <div style="display:flex;align-items:center;gap:24px;padding:20px 24px;background:#f8f5ff;border:1px solid #e9d8fd;border-radius:14px;margin-bottom:24px;">
      <div style="text-align:center;flex-shrink:0;">
        <div style="font-size:48px;font-weight:800;color:${scoreColor(opts.score)};font-family:'JetBrains Mono',monospace;line-height:1;">${opts.score}</div>
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">/ 100</div>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700;color:${scoreColor(opts.score)};">${scoreLabel(opts.score)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Career Readiness Score</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Generated ${new Date(opts.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
    </div>
  ` : "";

  // Convert prose to clean PDF HTML
  const lines = opts.reportContent.split("\n");
  let contentHtml = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { contentHtml += `<div style="height:8px;"></div>`; continue; }
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) {
      const lvl = hm[1].length;
      const sizes: Record<number, string> = { 1: "20px", 2: "16px", 3: "13px", 4: "12px" };
      contentHtml += `<h3 style="font-size:${sizes[lvl] ?? "13px"};font-weight:700;color:${lvl <= 2 ? "#4c1d95" : "#334155"};margin:16px 0 6px;${lvl === 2 ? "border-bottom:1px solid #e2e8f0;padding-bottom:6px;" : ""}">${hm[2].replace(/\*\*/g, "")}</h3>`;
      continue;
    }
    const bm = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (bm) { contentHtml += `<h3 style="font-size:13px;font-weight:700;color:#4c1d95;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.05em;">${bm[1]}</h3>`; continue; }
    const nm = line.match(/^(\d+)\.\s+(.+)$/);
    if (nm) { contentHtml += `<div style="display:flex;gap:10px;margin:4px 0;"><span style="font-size:12px;font-weight:700;color:#7B5EA7;min-width:20px;">${nm[1]}.</span><p style="font-size:13px;color:#334155;line-height:1.7;margin:0;">${nm[2].replace(/\*\*/g, "")}</p></div>`; continue; }
    const bl = line.match(/^[-•*]\s+(.+)$/);
    if (bl) { contentHtml += `<div style="display:flex;gap:10px;margin:4px 0;"><span style="color:#7B5EA7;font-weight:700;flex-shrink:0;padding-top:1px;">•</span><p style="font-size:13px;color:#334155;line-height:1.7;margin:0;">${bl[1].replace(/\*\*/g, "")}</p></div>`; continue; }
    const sc = line.match(/score[:\s]+(\d+)\s*(?:\/\s*100)?/i);
    if (sc) { contentHtml += `<div style="padding:8px 14px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;margin:8px 0;font-size:13px;font-weight:700;color:#1d4ed8;">📊 ${line.replace(/\*\*/g, "")}</div>`; continue; }
    contentHtml += `<p style="font-size:13px;color:#475569;line-height:1.75;margin:4px 0;">${line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
  }

  const innerHtml = scoreHtml + pdfSection("Report Analysis", contentHtml);
  await exportToPdf(innerHtml, {
    filename: `xpand-readiness-report-${new Date().toISOString().slice(0, 10)}`,
    title: opts.itemName ?? "Career Readiness Report",
    subtitle: "AI-powered analysis of your verified skills, market fit, and career trajectory.",
  });
}

/* ── NEW: Mock Interview PDF builder ───────────────────────── */

export async function exportMockInterviewPdf(opts: {
  aiFeedbackText: string;
  sessionSummary?: string | null;
  questionsText?: string;
  userAnswersText?: string;
  answerRecords?: Array<{
    question: string;
    answer: string;
    questionType: string;
    answerQuality: string;
    mode: string;
    sentiment: { label: string };
  }>;
  createdAt: string;
  itemName: string;
}): Promise<void> {
  let html = "";

  // Session meta banner
  html += `
    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#7c3aed;text-transform:uppercase;margin-bottom:4px;">AI Mock Interview · Session Complete</div>
        <div style="font-size:13px;color:#475569;">Completed ${new Date(opts.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
      <div style="font-size:24px;">🎙️</div>
    </div>`;

  // Answer records journey table
  if (opts.answerRecords && opts.answerRecords.length > 0) {
    const qualityColor = (q: string) => q === "strong" ? "#16a34a" : q === "moderate" ? "#d97706" : "#dc2626";
    const rows = opts.answerRecords.map((rec, i) => [
      `Q${i + 1}`,
      rec.questionType === "technical" ? "⚙️ Technical" : "🙋 Personal",
      rec.mode === "strict" ? "⚡ Bad Cop" : "🤝 Good Cop",
      rec.sentiment.label,
      `<span style="font-weight:700;color:${qualityColor(rec.answerQuality)};">${rec.answerQuality}</span>`,
    ]);
    html += pdfSection("Interview Journey", pdfTable(["Q", "Type", "Mode", "Sentiment", "Quality"], rows));
  }

  // Adaptive summary
  if (opts.sessionSummary) {
    html += pdfSection("🏆 Adaptive Performance Summary (Claude AI)", `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;">${opts.sessionSummary.replace(/\n/g, "<br/>")}</div>`);
  }

  // AI Feedback
  const feedbackLines = opts.aiFeedbackText.split("\n");
  let feedbackHtml = "";
  for (const raw of feedbackLines) {
    const line = raw.trim();
    if (!line) { feedbackHtml += `<div style="height:6px;"></div>`; continue; }
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) { feedbackHtml += `<h3 style="font-size:${hm[1].length <= 2 ? "15px" : "13px"};font-weight:700;color:#4c1d95;margin:12px 0 5px;">${hm[2].replace(/\*\*/g, "")}</h3>`; continue; }
    const bl = line.match(/^[-•*]\s+(.+)$/);
    if (bl) { feedbackHtml += `<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:#7B5EA7;">•</span><p style="font-size:13px;color:#334155;line-height:1.7;margin:0;">${bl[1].replace(/\*\*/g, "")}</p></div>`; continue; }
    feedbackHtml += `<p style="font-size:13px;color:#475569;line-height:1.75;margin:4px 0;">${line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
  }
  html += pdfSection("🤖 AI Feedback (Gemini)", feedbackHtml);

  // Q&A Records
  if (opts.answerRecords && opts.answerRecords.length > 0) {
    const qaHtml = opts.answerRecords.map((rec, i) => `
      <div style="margin-bottom:16px;padding:14px;background:#fafafa;border:1px solid #e2e8f0;border-radius:10px;page-break-inside:avoid;">
        <div style="font-size:10px;font-weight:700;color:#7B5EA7;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">
          Q${i + 1} · ${rec.questionType === "technical" ? "⚙️ Technical" : "🙋 Personal"} · ${rec.answerQuality} answer
        </div>
        <p style="font-size:13px;font-weight:600;color:#1e293b;margin:0 0 8px;font-style:italic;">${rec.question}</p>
        <p style="font-size:12px;color:#475569;line-height:1.65;margin:0;">${rec.answer}</p>
      </div>`).join("");
    html += pdfSection("📋 All Questions & Answers", qaHtml);
  }

  await exportToPdf(html, {
    filename: `xpand-mock-interview-${new Date().toISOString().slice(0, 10)}`,
    title: opts.itemName ?? "AI Mock Interview Feedback",
    subtitle: "Personalised interview performance analysis powered by Gemini AI.",
  });
}

/* ── NEW: Applicant CV PDF builder ─────────────────────────── */

export async function exportApplicantCvPdf(opts: {
  app: {
    userFullName: string;
    jobTitle: string;
    appliedAt: string;
    status: string;
    prioritySlotRank: number | null;
  };
  profile: {
    professionalTitle?: string;
    aboutMe?: string;
    email?: string;
    phoneNumber?: string;
    city?: string;
    country?: string;
    xpBalance: number;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  } | null;
  workExperience: Array<{ jobTitle: string; companyName: string; location?: string; startDate: string; endDate?: string; description?: string }>;
  education: Array<{ degree: string; fieldOfStudy: string; institutionName: string; startDate: string; endDate?: string; description?: string }>;
  certifications: Array<{ name: string; issuingOrganization: string; issueDate: string; expirationDate?: string }>;
  projects: Array<{ title: string; description?: string; technologiesUsed?: string; startDate?: string; endDate?: string; projectUrl?: string; githubUrl?: string }>;
}): Promise<void> {
  const fmtMY = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const fmtY = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d).getFullYear().toString();

  const xpLevel = (xp: number) => xp >= 10000 ? { title: "Elite", color: "#d97706" } : xp >= 5000 ? { title: "Expert", color: "#7c3aed" } : xp >= 2000 ? { title: "Advanced", color: "#0891b2" } : xp >= 500 ? { title: "Intermediate", color: "#16a34a" } : { title: "Beginner", color: "#64748b" };

  let html = "";
  const p = opts.profile;

  // Header card
  const lvl = p ? xpLevel(p.xpBalance) : null;
  html += `
    <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 24px;background:#f8f5ff;border:1px solid #e9d8fd;border-radius:14px;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:#7B5EA7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;font-weight:700;color:#fff;">${opts.app.userFullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
      <div style="flex:1;">
        <div style="font-size:20px;font-weight:800;color:#1e1b4b;">${opts.app.userFullName}</div>
        ${p?.professionalTitle ? `<div style="font-size:14px;color:#475569;margin-top:2px;">${p.professionalTitle}</div>` : ""}
        ${lvl && p ? `<div style="margin-top:6px;display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;color:${lvl.color};border:1px solid ${lvl.color};background:${lvl.color}18;">${lvl.title} · ${p.xpBalance.toLocaleString()} XP</div>` : ""}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:4px;">Applied for</div>
        <div style="font-size:14px;font-weight:600;color:#1e293b;">${opts.app.jobTitle}</div>
        <div style="font-size:11px;color:#64748b;margin-top:3px;">
          ${new Date(opts.app.appliedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          ${opts.app.prioritySlotRank ? ` · ⭐ Priority #${opts.app.prioritySlotRank}` : ""}
        </div>
        <div style="margin-top:6px;display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:#e0e7ff;color:#4338ca;">${opts.app.status}</div>
      </div>
    </div>`;

  // Contact info
  if (p && (p.email || p.phoneNumber || p.city || p.country)) {
    const contacts = [
      p.email ? `✉ ${p.email}` : "",
      p.phoneNumber ? `📞 ${p.phoneNumber}` : "",
      (p.city || p.country) ? `📍 ${[p.city, p.country].filter(Boolean).join(", ")}` : "",
    ].filter(Boolean);
    html += pdfSection("Contact", `<div style="display:flex;flex-wrap:wrap;gap:12px;">${contacts.map((c) => `<span style="font-size:12px;color:#334155;padding:4px 12px;background:#f1f5f9;border-radius:6px;">${c}</span>`).join("")}</div>`);
  }

  // About
  if (p?.aboutMe) {
    html += pdfSection("About", `<p style="font-size:13px;color:#334155;line-height:1.75;">${p.aboutMe}</p>`);
  }

  // Work Experience
  if (opts.workExperience.length > 0) {
    const rows = opts.workExperience.map((w) => [
      `<strong>${w.jobTitle}</strong><br/><span style="color:#64748b;">${w.companyName}${w.location ? ` · ${w.location}` : ""}</span>`,
      `${fmtMY(w.startDate)} — ${w.endDate ? fmtMY(w.endDate) : "Present"}`,
      w.description ?? "—",
    ]);
    html += pdfSection("Work Experience", pdfTable(["Role & Company", "Period", "Description"], rows));
  }

  // Education
  if (opts.education.length > 0) {
    const rows = opts.education.map((e) => [
      `<strong>${e.degree}</strong><br/><span style="color:#64748b;">${e.fieldOfStudy}</span>`,
      e.institutionName,
      `${fmtY(e.startDate)} — ${e.endDate ? fmtY(e.endDate) : "Present"}`,
    ]);
    html += pdfSection("Education", pdfTable(["Degree", "Institution", "Years"], rows));
  }

  // Certifications
  if (opts.certifications.length > 0) {
    const rows = opts.certifications.map((c) => [
      c.name,
      c.issuingOrganization,
      fmtMY(c.issueDate),
      c.expirationDate ? fmtMY(c.expirationDate) : "No expiry",
    ]);
    html += pdfSection("Certifications", pdfTable(["Name", "Issuer", "Issued", "Expires"], rows));
  }

  // Projects
  if (opts.projects.length > 0) {
    const rows = opts.projects.map((proj) => [
      `<strong>${proj.title}</strong>`,
      proj.description ?? "—",
      proj.technologiesUsed ? proj.technologiesUsed.split(",").map((t) => t.trim()).join(", ") : "—",
    ]);
    html += pdfSection("Projects", pdfTable(["Project", "Description", "Technologies"], rows));
  }

  // Links
  if (p && (p.linkedinUrl || p.githubUrl || p.portfolioUrl)) {
    const links = [
      p.linkedinUrl ? `<a href="${p.linkedinUrl}" style="color:#7B5EA7;">LinkedIn ↗</a>` : "",
      p.githubUrl ? `<a href="${p.githubUrl}" style="color:#7B5EA7;">GitHub ↗</a>` : "",
      p.portfolioUrl ? `<a href="${p.portfolioUrl}" style="color:#7B5EA7;">Portfolio ↗</a>` : "",
    ].filter(Boolean);
    html += pdfSection("Links", `<div style="display:flex;gap:16px;font-size:13px;">${links.join("")}</div>`);
  }

  await exportToPdf(html, {
    filename: `xpand-cv-${opts.app.userFullName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`,
    title: `CV — ${opts.app.userFullName}`,
    subtitle: `Applied for: ${opts.app.jobTitle} · Status: ${opts.app.status}`,
  });
}

/* ── NEW: Market Insights PDF builder ──────────────────────── */

export async function exportMarketInsightsPdf(opts: {
  totalActiveJobs: number;
  skillDemand: Array<{ skillId: number; skillName: string; jobCount: number; majorCount: number }>;
  topSkills: Array<{ skillId: number; skillName: string; jobCount: number }>;
  jobTypeBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}): Promise<void> {
  const totalJobsForType = Object.values(opts.jobTypeBreakdown).reduce((a, b) => a + b, 0);
  const pct = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0;
  const topLocations = Object.entries(opts.locationBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const uniqueSkills = opts.skillDemand.length;
  const majorSkills = opts.skillDemand.filter((s) => s.majorCount > 0).length;
  const jobTypes = Object.keys(opts.jobTypeBreakdown).length;

  let html = "";

  // Summary stats
  html += pdfStatBox([
    { label: "Active Jobs", value: opts.totalActiveJobs, color: "#10b981" },
    { label: "Skills in Demand", value: uniqueSkills, color: "#8b5cf6" },
    { label: "Major Skill Req.", value: majorSkills, color: "#f59e0b" },
    { label: "Job Types", value: jobTypes, color: "#3b82f6" },
  ]);

  // Top skills
  if (opts.topSkills.length > 0) {
    const medals = ["🥇", "🥈", "🥉", "", "", ""];
    const rows = opts.topSkills.slice(0, 6).map((s, i) => [`${medals[i] || `#${i + 1}`}`, s.skillName, String(s.jobCount)]);
    html += pdfSection("🔥 Hot Skills — Most In Demand", pdfTable(["Rank", "Skill", "Jobs"], rows));
  }

  // Full skill demand table (top 20)
  if (opts.skillDemand.length > 0) {
    const rows = opts.skillDemand.slice(0, 20).map((s, i) => [
      `#${i + 1}`,
      s.skillName,
      String(s.jobCount),
      String(s.majorCount),
      `${pct(s.majorCount, s.jobCount)}%`,
    ]);
    html += pdfSection("🎯 Skill Demand — Top 20 (from active job postings)", pdfTable(["Rank", "Skill", "Total Jobs", "Major Req.", "Major %"], rows));
  }

  // Job type breakdown
  if (Object.keys(opts.jobTypeBreakdown).length > 0) {
    const rows = Object.entries(opts.jobTypeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => [
      type.replace(/_/g, " "),
      String(count),
      `${pct(count, totalJobsForType)}%`,
    ]);
    html += pdfSection("📋 Job Type Breakdown", pdfTable(["Type", "Count", "Share"], rows));
  }

  // Location breakdown
  if (topLocations.length > 0) {
    const rows = topLocations.map(([loc, count]) => [
      loc,
      String(count),
      `${pct(count, opts.totalActiveJobs)}%`,
    ]);
    html += pdfSection("📍 Top Locations", pdfTable(["Location", "Jobs", "Share"], rows));
  }

  await exportToPdf(html, {
    filename: `xpand-market-insights-${new Date().toISOString().slice(0, 10)}`,
    title: "Market Insights Report",
    subtitle: `Real-time talent market data from ${opts.totalActiveJobs} active job postings on XPand. Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
  });
}

// Declare html2pdf on window for TypeScript
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html2pdf: any;
  }
}