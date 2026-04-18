/* ============================================================
   pdfExport.ts — XPand PDF Export Utility  v3.0
   Uses jsPDF for clean text-based PDF generation.
   No DOM screenshots — no layout issues.
   ============================================================ */

export interface PdfOptions {
  filename: string;
  title?: string;
  subtitle?: string;
}

// ── jsPDF loader ────────────────────────────────────────────

async function loadJsPdf(): Promise<any> {
  const win = window as any;
  if (win.jspdf?.jsPDF) return win.jspdf.jsPDF;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve((window as any).jspdf.jsPDF);
    script.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(script);
  });
}

// ── Core text writer ────────────────────────────────────────

const PAGE_W = 210;       // A4 mm
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface DocState {
  doc: any;
  y: number;
}

function addPage(state: DocState) {
  state.doc.addPage();
  state.y = MARGIN + 6;
}

function ensureSpace(state: DocState, needed: number) {
  if (state.y + needed > PAGE_H - MARGIN) addPage(state);
}

/** Wraps text to fit within maxWidth (mm) and returns lines. */
function wrapText(doc: any, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

/** Write a block of wrapped text. Returns new y. */
function writeText(
  state: DocState,
  text: string,
  opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; lineGap?: number }
) {
  const { size = 10, bold = false, color = [40, 40, 40], indent = 0, lineGap = 1.4 } = opts;
  state.doc.setFontSize(size);
  state.doc.setFont("helvetica", bold ? "bold" : "normal");
  state.doc.setTextColor(...color);
  const lines = wrapText(state.doc, text, CONTENT_W - indent);
  const lineH = size * 0.3528 * lineGap; // pt → mm approx
  ensureSpace(state, lines.length * lineH + 2);
  state.doc.text(lines, MARGIN + indent, state.y);
  state.y += lines.length * lineH + 2;
}

function writeDivider(state: DocState, light = false) {
  ensureSpace(state, 4);
  state.doc.setDrawColor(light ? 210 : 180, light ? 210 : 180, light ? 210 : 180);
  state.doc.setLineWidth(0.3);
  state.doc.line(MARGIN, state.y, PAGE_W - MARGIN, state.y);
  state.y += 3;
}

function writeHeader(state: DocState, title: string, subtitle?: string, generatedAt?: string) {
  // Top bar
  state.doc.setFillColor(245, 245, 250);
  state.doc.rect(0, 0, PAGE_W, 28, "F");

  state.doc.setFontSize(16);
  state.doc.setFont("helvetica", "bold");
  state.doc.setTextColor(30, 30, 60);
  state.doc.text("XPAND", MARGIN, 14);

  state.doc.setFontSize(8);
  state.doc.setFont("helvetica", "normal");
  state.doc.setTextColor(120, 120, 140);
  state.doc.text("Level Up Your Skill Set", MARGIN, 19);

  if (generatedAt) {
    state.doc.setFontSize(8);
    state.doc.setTextColor(140, 140, 160);
    state.doc.text(generatedAt, PAGE_W - MARGIN, 16, { align: "right" });
  }

  state.y = 34;

  // Document title
  writeText(state, title, { size: 18, bold: true, color: [30, 27, 75] });
  if (subtitle) {
    writeText(state, subtitle, { size: 9, color: [100, 116, 139] });
  }
  state.y += 3;
  writeDivider(state);
}

function writeFooter(doc: any, pageNum: number) {
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 180);
  doc.text(`XPand · Confidential`, MARGIN, PAGE_H - 8);
  doc.text(`xpand.app  ·  Page ${pageNum}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
}

function writeSectionTitle(state: DocState, title: string) {
  state.y += 3;
  ensureSpace(state, 10);
  writeText(state, title.toUpperCase(), { size: 8, bold: true, color: [100, 80, 160] });
  writeDivider(state, true);
}

/** Parse and write Gemini/AI markdown prose into the doc. */
function writeProse(state: DocState, text: string) {
  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { state.y += 2; continue; }

    // Heading ## or ###
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) {
      const lvl = hm[1].length;
      const content = hm[2].replace(/\*\*/g, "");
      state.y += lvl <= 2 ? 3 : 1;
      writeText(state, content, {
        size: lvl === 1 ? 13 : lvl === 2 ? 11 : 10,
        bold: true,
        color: lvl <= 2 ? [60, 40, 120] : [50, 65, 85],
      });
      if (lvl <= 2) writeDivider(state, true);
      continue;
    }

    // Bold-only line
    const bm = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (bm) {
      state.y += 2;
      writeText(state, bm[1], { size: 10, bold: true, color: [60, 40, 120] });
      continue;
    }

    // Numbered list
    const nm = line.match(/^(\d+)\.\s+(.+)$/);
    if (nm) {
      const content = nm[2].replace(/\*\*/g, "");
      writeText(state, `${nm[1]}.  ${content}`, { size: 10, indent: 4, color: [50, 65, 85] });
      continue;
    }

    // Bullet list
    const bl = line.match(/^[-•*]\s+(.+)$/);
    if (bl) {
      const content = bl[1].replace(/\*\*/g, "");
      writeText(state, `•  ${content}`, { size: 10, indent: 4, color: [50, 65, 85] });
      continue;
    }

    // Score line
    if (/score[:\s]+\d+/i.test(line)) {
      state.y += 1;
      writeText(state, line.replace(/\*\*/g, ""), { size: 10, bold: true, color: [37, 99, 235] });
      state.y += 1;
      continue;
    }

    // Paragraph — strip bold markers
    const plain = line.replace(/\*\*([^*]+)\*\*/g, "$1");
    writeText(state, plain, { size: 10, color: [60, 75, 95] });
  }
}

// ── Core export ─────────────────────────────────────────────

export async function exportToPdf(
  _innerHtml: string,  // kept for signature compat but not used
  options: PdfOptions & { _proseText?: string; _structuredSections?: Array<{ title: string; text: string }> }
): Promise<void> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const state: DocState = { doc, y: MARGIN };
  const dateStr = `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

  writeHeader(state, options.title ?? options.filename, options.subtitle, dateStr);

  if (options._structuredSections) {
    for (const section of options._structuredSections) {
      writeSectionTitle(state, section.title);
      writeProse(state, section.text);
    }
  } else if (options._proseText) {
    writeProse(state, options._proseText);
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    writeFooter(doc, i);
  }

  doc.save(`${options.filename}.pdf`);
}

// ── Readiness Report ────────────────────────────────────────

export async function exportReadinessReportPdf(opts: {
  reportContent: string;
  generatedAt: string;
  score: number | null;
  itemName: string;
}): Promise<void> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const state: DocState = { doc, y: MARGIN };
  const dateStr = `Generated ${new Date(opts.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

  writeHeader(state, opts.itemName ?? "Career Readiness Report", "AI-powered analysis of your verified skills, market fit, and career trajectory.", dateStr);

  // Score line
  if (opts.score !== null) {
    const scoreLabel = opts.score >= 80 ? "Job Ready" : opts.score >= 60 ? "Nearly There" : opts.score >= 40 ? "In Progress" : "Early Stage";
    writeText(state, `Readiness Score:  ${opts.score} / 100  —  ${scoreLabel}`, { size: 13, bold: true, color: [30, 80, 160] });
    state.y += 4;
    writeDivider(state, true);
  }

  writeSectionTitle(state, "Report Analysis");
  writeProse(state, opts.reportContent);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    writeFooter(doc, i);
  }

  doc.save(`xpand-readiness-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Mock Interview ───────────────────────────────────────────

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
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const state: DocState = { doc, y: MARGIN };
  const dateStr = `Session completed ${new Date(opts.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

  writeHeader(state, opts.itemName ?? "AI Mock Interview Feedback", "Personalised interview performance analysis.", dateStr);

  // Session summary
  if (opts.sessionSummary) {
    writeSectionTitle(state, "Adaptive Performance Summary");
    writeProse(state, opts.sessionSummary);
  }

  // AI Feedback
  writeSectionTitle(state, "AI Feedback");
  writeProse(state, opts.aiFeedbackText);

  // Q&A records
  if (opts.answerRecords && opts.answerRecords.length > 0) {
    writeSectionTitle(state, "Questions & Answers");
    for (let i = 0; i < opts.answerRecords.length; i++) {
      const rec = opts.answerRecords[i];
      state.y += 2;
      ensureSpace(state, 20);
      writeText(state, `Q${i + 1}  [${rec.questionType}  ·  ${rec.answerQuality} answer  ·  ${rec.sentiment.label}]`, { size: 8, bold: true, color: [100, 80, 160] });
      writeText(state, rec.question, { size: 10, bold: true, color: [30, 40, 60], indent: 2 });
      writeText(state, rec.answer, { size: 10, color: [70, 85, 105], indent: 4 });
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    writeFooter(doc, i);
  }

  doc.save(`xpand-mock-interview-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Unused helpers kept for backward compat ─────────────────
// (pdfSection, pdfTable, etc. are no longer used but kept so
//  any existing import doesn't break at compile time)

export function pdfSection(_title: string, _content: string): string { return ""; }
export function pdfTable(_headers: string[], _rows: string[][]): string { return ""; }
export function pdfBadge(text: string): string { return text; }
export function pdfStatBox(_items: { label: string; value: string | number; color?: string }[]): string { return ""; }
export function pdfProseBlock(text: string): string { return text; }

// ── CV & Market Insights exports (unchanged signatures) ──────
// These are less frequently used; they now also go through jsPDF text.

export async function exportApplicantCvPdf(opts: {
  app: { userFullName: string; jobTitle: string; appliedAt: string; status: string; prioritySlotRank: number | null };
  profile: { professionalTitle?: string; aboutMe?: string; email?: string; phoneNumber?: string; city?: string; country?: string; xpBalance: number; linkedinUrl?: string; githubUrl?: string; portfolioUrl?: string; } | null;
  workExperience: Array<{ jobTitle: string; companyName: string; location?: string; startDate: string; endDate?: string; description?: string }>;
  education: Array<{ degree: string; fieldOfStudy: string; institutionName: string; startDate: string; endDate?: string }>;
  certifications: Array<{ name: string; issuingOrganization: string; issueDate: string; expirationDate?: string }>;
  projects: Array<{ title: string; description?: string; technologiesUsed?: string }>;
}): Promise<void> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const state: DocState = { doc, y: MARGIN };
  const fmtMY = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const fmtY = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d).getFullYear().toString();
  const p = opts.profile;

  writeHeader(state, `CV — ${opts.app.userFullName}`, `Applied for: ${opts.app.jobTitle}  ·  Status: ${opts.app.status}`,
    `Applied ${new Date(opts.app.appliedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`);

  if (p?.professionalTitle) writeText(state, p.professionalTitle, { size: 11, bold: true, color: [60, 60, 100] });
  if (p?.aboutMe) { state.y += 2; writeText(state, p.aboutMe, { size: 10, color: [70, 85, 105] }); }

  const contacts = [p?.email, p?.phoneNumber, [p?.city, p?.country].filter(Boolean).join(", ")].filter(Boolean) as string[];
  if (contacts.length) { state.y += 2; writeText(state, contacts.join("   "), { size: 9, color: [100, 116, 139] }); }

  if (opts.workExperience.length) {
    writeSectionTitle(state, "Work Experience");
    for (const w of opts.workExperience) {
      state.y += 1;
      writeText(state, `${w.jobTitle}  ·  ${w.companyName}${w.location ? ` — ${w.location}` : ""}`, { size: 10, bold: true, color: [30, 40, 60] });
      writeText(state, `${fmtMY(w.startDate)} — ${w.endDate ? fmtMY(w.endDate) : "Present"}`, { size: 9, color: [100, 116, 139] });
      if (w.description) writeText(state, w.description, { size: 10, indent: 4, color: [70, 85, 105] });
    }
  }

  if (opts.education.length) {
    writeSectionTitle(state, "Education");
    for (const e of opts.education) {
      state.y += 1;
      writeText(state, `${e.degree} in ${e.fieldOfStudy}  ·  ${e.institutionName}`, { size: 10, bold: true, color: [30, 40, 60] });
      writeText(state, `${fmtY(e.startDate)} — ${e.endDate ? fmtY(e.endDate) : "Present"}`, { size: 9, color: [100, 116, 139] });
    }
  }

  if (opts.certifications.length) {
    writeSectionTitle(state, "Certifications");
    for (const c of opts.certifications) {
      writeText(state, `${c.name}  ·  ${c.issuingOrganization}  ·  ${fmtMY(c.issueDate)}`, { size: 10, color: [50, 65, 85] });
    }
  }

  if (opts.projects.length) {
    writeSectionTitle(state, "Projects");
    for (const proj of opts.projects) {
      state.y += 1;
      writeText(state, proj.title, { size: 10, bold: true, color: [30, 40, 60] });
      if (proj.description) writeText(state, proj.description, { size: 10, indent: 4, color: [70, 85, 105] });
      if (proj.technologiesUsed) writeText(state, `Tech: ${proj.technologiesUsed}`, { size: 9, indent: 4, color: [100, 116, 139] });
    }
  }

  const links = [p?.linkedinUrl && `LinkedIn: ${p.linkedinUrl}`, p?.githubUrl && `GitHub: ${p.githubUrl}`, p?.portfolioUrl && `Portfolio: ${p.portfolioUrl}`].filter(Boolean) as string[];
  if (links.length) { writeSectionTitle(state, "Links"); for (const l of links) writeText(state, l, { size: 10, color: [60, 80, 180] }); }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); writeFooter(doc, i); }
  doc.save(`xpand-cv-${opts.app.userFullName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportMarketInsightsPdf(opts: {
  totalActiveJobs: number;
  skillDemand: Array<{ skillId: number; skillName: string; jobCount: number; majorCount: number }>;
  topSkills: Array<{ skillId: number; skillName: string; jobCount: number }>;
  jobTypeBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}): Promise<void> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const state: DocState = { doc, y: MARGIN };
  const dateStr = `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
  const pct = (v: number, t: number) => t > 0 ? `${Math.round((v / t) * 100)}%` : "0%";

  writeHeader(state, "Market Insights Report", `Real-time talent market data from ${opts.totalActiveJobs} active job postings.`, dateStr);
  writeText(state, `Active Jobs: ${opts.totalActiveJobs}  ·  Skills tracked: ${opts.skillDemand.length}`, { size: 11, bold: true, color: [30, 40, 60] });
  state.y += 3;

  if (opts.topSkills.length) {
    writeSectionTitle(state, "Top Skills in Demand");
    opts.topSkills.slice(0, 10).forEach((s, i) => writeText(state, `#${i + 1}  ${s.skillName}  —  ${s.jobCount} jobs`, { size: 10, color: [50, 65, 85] }));
  }

  if (opts.skillDemand.length) {
    writeSectionTitle(state, "Full Skill Demand (top 20)");
    opts.skillDemand.slice(0, 20).forEach((s, i) => writeText(state, `#${i + 1}  ${s.skillName}  —  ${s.jobCount} jobs  (${s.majorCount} major req, ${pct(s.majorCount, s.jobCount)} major)`, { size: 9, color: [60, 75, 95] }));
  }

  const jobTypes = Object.entries(opts.jobTypeBreakdown).sort((a, b) => b[1] - a[1]);
  if (jobTypes.length) {
    writeSectionTitle(state, "Job Type Breakdown");
    const total = jobTypes.reduce((a, b) => a + b[1], 0);
    jobTypes.forEach(([type, count]) => writeText(state, `${type.replace(/_/g, " ")}  —  ${count}  (${pct(count, total)})`, { size: 10, color: [50, 65, 85] }));
  }

  const topLocations = Object.entries(opts.locationBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topLocations.length) {
    writeSectionTitle(state, "Top Locations");
    topLocations.forEach(([loc, count]) => writeText(state, `${loc}  —  ${count} jobs  (${pct(count, opts.totalActiveJobs)})`, { size: 10, color: [50, 65, 85] }));
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); writeFooter(doc, i); }
  doc.save(`xpand-market-insights-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// TypeScript global declaration (html2pdf no longer needed but kept to avoid breaking old imports)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html2pdf: any;
  }
}