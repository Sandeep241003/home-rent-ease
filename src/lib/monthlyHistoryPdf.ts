import { jsPDF } from 'jspdf';
import { DEJAVU_BOLD_B64, DEJAVU_REGULAR_B64 } from './pdfFont';
import {
  FinancialEvent,
  MonthSummary,
  TenantInfo,
  TenantMonthHistory,
  buildMonthSummary,
  buildTenantMonthHistory,
  monthLabel,
  MONTH_NAMES,
} from './monthlyHistoryData';

const FONT = 'DejaVuSans';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Date | Description | Amount | Balance
const COLS = [18, 112, 30, 30];
const HEADERS = ['Date', 'Description', 'Amount', 'Balance'];

const ROW_H = 4.6;
const HEAD_H = 5.2;
const TITLE_H = 5.6;
const CARD_GAP = 3.2;

const RED: [number, number, number] = [176, 42, 42];
const GREEN: [number, number, number] = [21, 115, 71];
const DARK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [110, 110, 110];
const RULE: [number, number, number] = [214, 214, 214];
const SOFT: [number, number, number] = [246, 246, 246];

function inr(value: number) {
  return `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
}

/** Balance display: pending -> ₹X, advance -> +₹X */
function balanceText(balance: number) {
  if (balance < 0) return `+${inr(balance)}`;
  return inr(balance);
}

function balanceColor(balance: number): [number, number, number] {
  if (balance < 0) return GREEN;
  if (balance > 0) return RED;
  return DARK;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function titleCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

interface Line {
  date: string;
  description: string;
  amount: string;
  amountColor: [number, number, number];
  balance: number;
}

function describe(event: FinancialEvent, tenant: TenantInfo): Line {
  const base = { date: shortDate(event.date), balance: 0 };

  switch (event.kind) {
    case 'RENT':
      return {
        ...base,
        description: 'Rent added',
        amount: `+${inr(event.amount)}`,
        amountColor: RED,
      };
    case 'ELECTRICITY': {
      const hasReadings =
        event.previousReading !== undefined && event.currentReading !== undefined;
      return {
        ...base,
        description: hasReadings
          ? `Electricity (${event.previousReading} → ${event.currentReading})`
          : 'Electricity',
        amount: `+${inr(event.amount)}`,
        amountColor: RED,
      };
    }
    case 'CONCESSION':
      return {
        ...base,
        description: event.reason ? `Concession · ${event.reason}` : 'Concession',
        amount: `−${inr(event.amount)}`,
        amountColor: GREEN,
      };
    case 'EXTRA':
      return {
        ...base,
        description: event.reason ? `Extra · ${event.reason}` : 'Extra charge',
        amount: `+${inr(event.amount)}`,
        amountColor: RED,
      };
    case 'PAYMENT':
    default: {
      const tag = event.paymentReason ? titleCase(event.paymentReason) : 'Payment';
      const parts = [`${tag} received`];
      if ((tenant.memberCount ?? 1) > 1 && event.paidBy) parts.push(event.paidBy);
      if (event.paymentMode) parts.push(event.paymentMode);
      return {
        ...base,
        description: parts.join(' · '),
        amount: `−${inr(event.amount)}`,
        amountColor: GREEN,
      };
    }
  }
}

function buildLines(history: TenantMonthHistory): Line[] {
  return history.rows.map(({ after, event }) => ({
    ...describe(event, history.tenant),
    balance: after,
  }));
}

function cardHeight(lines: Line[]) {
  const body = lines.length ? lines.length * ROW_H : ROW_H;
  return TITLE_H + HEAD_H + body + 1.5 + CARD_GAP;
}

function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  bold: boolean,
  size: number,
  color: [number, number, number],
) {
  doc.setFont(FONT, bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(text, x, y);
}

function drawRight(
  doc: jsPDF,
  text: string,
  right: number,
  y: number,
  bold: boolean,
  size: number,
  color: [number, number, number],
) {
  doc.setFont(FONT, bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(text, right - doc.getTextWidth(text), y);
}

/** Draws the shared Date | Description | Amount | Balance table. Returns bottom Y. */
function drawTable(doc: jsPDF, lines: Line[], headTop: number, emptyText: string) {
  doc.setFillColor(...SOFT);
  doc.rect(MARGIN, headTop, CONTENT_W, HEAD_H, 'F');
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, headTop, CONTENT_W, HEAD_H, 'S');

  let x = MARGIN;
  HEADERS.forEach((label, i) => {
    const baseline = headTop + 3.6;
    if (i >= 2) {
      drawRight(doc, label, x + COLS[i] - 2, baseline, true, 6.6, GREY);
    } else {
      drawText(doc, label, x + 2, baseline, true, 6.6, GREY);
    }
    x += COLS[i];
  });

  let y = headTop + HEAD_H;

  if (lines.length === 0) {
    drawText(doc, emptyText, MARGIN + 2, y + 3.2, false, 7, GREY);
    return y + ROW_H;
  }

  lines.forEach((line) => {
    const baseline = y + 3.2;
    drawText(doc, line.date, MARGIN + 2, baseline, false, 7.2, DARK);

    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.2);
    let desc = line.description;
    const maxW = COLS[1] - 4;
    if (doc.getTextWidth(desc) > maxW) {
      while (desc.length > 4 && doc.getTextWidth(`${desc}...`) > maxW) {
        desc = desc.slice(0, -1);
      }
      desc = `${desc.trimEnd()}...`;
    }
    drawText(doc, desc, MARGIN + COLS[0] + 2, baseline, false, 7.2, DARK);

    const amountRight = MARGIN + COLS[0] + COLS[1] + COLS[2] - 2;
    drawRight(doc, line.amount, amountRight, baseline, false, 7.2, line.amountColor);

    drawRight(
      doc,
      balanceText(line.balance),
      PAGE_W - MARGIN - 2,
      baseline,
      true,
      7.2,
      balanceColor(line.balance),
    );

    y += ROW_H;
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  });

  return y;
}

function drawCard(doc: jsPDF, history: TenantMonthHistory, lines: Line[], top: number) {
  // Card heading: "Name · Room 001" left, "Previous: ₹294" right
  const headingY = top + 3.8;
  const name = history.tenant.name;
  drawText(doc, name, MARGIN, headingY, true, 9, DARK);
  drawText(
    doc,
    `· Room ${history.tenant.room}`,
    MARGIN + doc.getTextWidth(name) + 2,
    headingY,
    false,
    7.6,
    GREY,
  );

  const prevText = balanceText(history.opening);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7.6);
  const prevW = doc.getTextWidth(prevText);
  drawRight(
    doc,
    prevText,
    PAGE_W - MARGIN,
    headingY,
    true,
    7.6,
    balanceColor(history.opening),
  );
  drawRight(
    doc,
    'Previous:',
    PAGE_W - MARGIN - prevW - 1.5,
    headingY,
    false,
    7.2,
    GREY,
  );

  drawTable(doc, lines, top + TITLE_H, 'No financial activity this month');
}


function drawReportHeader(doc: jsPDF, label: string) {
  drawText(doc, 'RENTEASE', MARGIN, MARGIN + 4, true, 13, DARK);
  drawRight(
    doc,
    `Monthly History Report — ${label}`,
    PAGE_W - MARGIN,
    MARGIN + 4,
    false,
    8.5,
    GREY,
  );
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, MARGIN + 6, PAGE_W - MARGIN, MARGIN + 6);
  return MARGIN + 9;
}

function drawSummary(doc: jsPDF, summary: MonthSummary, top: number) {
  const items: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Received', value: inr(summary.received), color: GREEN },
    { label: 'Pending', value: inr(summary.pending), color: RED },
    { label: 'Rent', value: inr(summary.rent), color: DARK },
    { label: 'Electricity', value: inr(summary.electricity), color: DARK },
    { label: 'Concession', value: inr(summary.concession), color: GREEN },
    { label: 'Extra', value: inr(summary.extra), color: RED },
  ];

  const boxH = 7.4;
  doc.setFillColor(...SOFT);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, top, CONTENT_W, boxH, 1, 1, 'FD');

  const cellW = CONTENT_W / items.length;
  items.forEach((item, i) => {
    const cx = MARGIN + i * cellW + 3;
    const baseline = top + 4.9;
    drawText(doc, item.label, cx, baseline, false, 7, GREY);
    const labelW = doc.getTextWidth(item.label);
    drawText(doc, item.value, cx + labelW + 1.8, baseline, true, 7.6, item.color);
    if (i > 0) {
      doc.setDrawColor(...RULE);
      doc.line(MARGIN + i * cellW, top + 1, MARGIN + i * cellW, top + boxH - 1);
    }
  });

  return top + boxH + 4;
}

function drawPageFooter(doc: jsPDF, page: number, total: number, label: string) {
  drawText(doc, `RentEase — ${label}`, MARGIN, PAGE_H - 6, false, 6.4, GREY);
  drawRight(doc, `Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - 6, false, 6.4, GREY);
}

export interface MonthlyHistoryPdfInput {
  tenants: TenantInfo[];
  events: FinancialEvent[];
  month: number;
  year: number;
}

export function buildMonthlyHistoryPdf({
  tenants,
  events,
  month,
  year,
}: MonthlyHistoryPdfInput): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_REGULAR_B64);
  doc.addFont('DejaVuSans.ttf', FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_BOLD_B64);
  doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');

  const label = monthLabel(month, year);

  const histories = tenants
    .map((t) => buildTenantMonthHistory(t, events, month, year))
    .filter((h) => h.rows.length > 0 || h.opening !== 0)
    .sort((a, b) => a.tenant.room.localeCompare(b.tenant.room, undefined, { numeric: true }));

  const summary = buildMonthSummary(histories);

  let y = drawReportHeader(doc, label);
  y = drawSummary(doc, summary, y);

  if (histories.length === 0) {
    drawText(doc, 'No financial activity recorded for this month.', MARGIN, y + 5, false, 9, GREY);
  }

  const bottomLimit = PAGE_H - MARGIN - 5;

  histories.forEach((history) => {
    const lines = buildLines(history);
    const height = cardHeight(lines);
    if (y + height > bottomLimit) {
      doc.addPage();
      y = MARGIN;
    }
    drawCard(doc, history, lines, y);
    y += height;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages, label);
  }

  const fileName = `RentEase_History_${label.replace(' ', '_')}.pdf`;
  return { doc, fileName };
}

export function downloadMonthlyHistoryPdf(input: MonthlyHistoryPdfInput) {
  const { doc, fileName } = buildMonthlyHistoryPdf(input);
  doc.save(fileName);
  return fileName;
}

/* ------------------------------------------------------------------ *
 * Tenant-specific history report (range of months)                   *
 * Reuses the exact same table, typography, colors and calculations.  *
 * ------------------------------------------------------------------ */

export interface TenantHistoryPdfInput {
  tenant: TenantInfo;
  /** Events already scoped to this tenant */
  events: FinancialEvent[];
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
}

function monthRange(
  fromMonth: number,
  fromYear: number,
  toMonth: number,
  toYear: number,
): { month: number; year: number }[] {
  const out: { month: number; year: number }[] = [];
  let m = fromMonth;
  let y = fromYear;
  let guard = 0;
  while ((y < toYear || (y === toYear && m <= toMonth)) && guard < 600) {
    out.push({ month: m, year: y });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }
  return out;
}

function sanitize(name: string) {
  return (
    name
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'Tenant'
  );
}

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

function initPdfDoc() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_REGULAR_B64);
  doc.addFont('DejaVuSans.ttf', FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_BOLD_B64);
  doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
  return doc;
}

export function buildTenantHistoryPdf({
  tenant,
  events,
  fromMonth,
  fromYear,
  toMonth,
  toYear,
}: TenantHistoryPdfInput): { doc: jsPDF; fileName: string } {
  const doc = initPdfDoc();
  const tenantEvents = events.filter((e) => e.tenantId === tenant.id);
  const months = monthRange(fromMonth, fromYear, toMonth, toYear);

  const rangeLabel = `${monthLabel(fromMonth, fromYear)} — ${monthLabel(toMonth, toYear)}`;

  // Header (same branding / rule as the monthly report)
  drawText(doc, 'RENTEASE', MARGIN, MARGIN + 4, true, 13, DARK);
  drawRight(doc, 'Tenant History Report', PAGE_W - MARGIN, MARGIN + 4, false, 8.5, GREY);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, MARGIN + 6, PAGE_W - MARGIN, MARGIN + 6);

  let y = MARGIN + 11;
  drawText(doc, tenant.name, MARGIN, y, true, 10, DARK);
  drawText(
    doc,
    `· Room ${tenant.room}`,
    MARGIN + doc.getTextWidth(tenant.name) + 2,
    y,
    false,
    8,
    GREY,
  );
  drawRight(doc, rangeLabel, PAGE_W - MARGIN, y, false, 7.6, GREY);
  y += 4;

  const bottomLimit = PAGE_H - MARGIN - 5;

  months.forEach(({ month, year }) => {
    const history = buildTenantMonthHistory(tenant, tenantEvents, month, year);
    const lines = buildLines(history);
    const label = monthLabel(month, year);

    let index = 0;
    let first = true;

    do {
      const headerBlock = TITLE_H + HEAD_H;
      let available = bottomLimit - y;
      // Need at least the heading, table head and one row.
      if (available < headerBlock + ROW_H + 1.5) {
        doc.addPage();
        y = MARGIN;
        available = bottomLimit - y;
      }

      const capacity = Math.max(1, Math.floor((available - headerBlock - 1.5) / ROW_H));
      const chunk = lines.slice(index, index + capacity);
      index += chunk.length;

      const headingY = y + 3.8;
      const heading = first ? label : `${label} (continued)`;
      drawText(doc, heading, MARGIN, headingY, true, 9, DARK);
      if (first) {
        const openText = balanceText(history.opening);
        doc.setFont(FONT, 'bold');
        doc.setFontSize(7.6);
        const openW = doc.getTextWidth(openText);
        drawRight(
          doc,
          openText,
          PAGE_W - MARGIN,
          headingY,
          true,
          7.6,
          balanceColor(history.opening),
        );
        drawRight(doc, 'Pending:', PAGE_W - MARGIN - openW - 1.5, headingY, false, 7.2, GREY);
      }

      const bottom = drawTable(
        doc,
        chunk,
        y + TITLE_H,
        'No transactions recorded for this month.',
      );
      y = bottom + 1.5 + CARD_GAP;
      first = false;
    } while (index < lines.length);
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages, `${tenant.name} · Room ${tenant.room}`);
  }

  const fileName = `${sanitize(tenant.name)}-History-${SHORT_MONTHS[fromMonth - 1]}-${fromYear}-to-${SHORT_MONTHS[toMonth - 1]}-${toYear}.pdf`;
  return { doc, fileName };
}

export function downloadTenantHistoryPdf(input: TenantHistoryPdfInput) {
  const { doc, fileName } = buildTenantHistoryPdf(input);
  doc.save(fileName);
  return fileName;
}
