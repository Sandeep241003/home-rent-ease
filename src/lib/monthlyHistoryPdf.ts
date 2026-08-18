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
} from './monthlyHistoryData';

const FONT = 'DejaVuSans';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLS = [25, 24, 24, 40, 48, 25];
const HEADERS = [
  'Pending / Extra Before',
  'Rent Added',
  'Electricity Added',
  'Concession / Extra',
  'Amount Received',
  'Pending / Extra After',
];

const LINE_H = 3.3;
const ROW_PAD = 2.4;
const HEAD_H = 8;
const CARD_GAP = 5;

const RED: [number, number, number] = [176, 42, 42];
const GREEN: [number, number, number] = [21, 115, 71];
const DARK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [110, 110, 110];
const RULE: [number, number, number] = [214, 214, 214];
const SOFT: [number, number, number] = [246, 246, 246];

function inr(value: number) {
  return `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

interface Cell {
  lines: string[];
  color: [number, number, number];
  boldFirst?: boolean;
}

const EMPTY: Cell = { lines: ['—'], color: GREY };

function balanceCell(balance: number): Cell {
  if (balance > 0) return { lines: [inr(balance)], color: RED, boldFirst: true };
  if (balance < 0) return { lines: [`+${inr(balance)}`], color: GREEN, boldFirst: true };
  return { lines: ['₹0'], color: DARK, boldFirst: true };
}

function eventCells(doc: jsPDF, event: FinancialEvent): Cell[] {
  const rent: Cell =
    event.kind === 'RENT'
      ? { lines: [inr(event.amount), shortDate(event.date)], color: RED, boldFirst: true }
      : EMPTY;

  const elec: Cell =
    event.kind === 'ELECTRICITY'
      ? { lines: [inr(event.amount), shortDate(event.date)], color: RED, boldFirst: true }
      : EMPTY;

  let adjust: Cell = EMPTY;
  if (event.kind === 'CONCESSION' || event.kind === 'EXTRA') {
    const isConcession = event.kind === 'CONCESSION';
    const head = `${isConcession ? '−' : '+'}${inr(event.amount)}`;
    const reasonLines = event.reason
      ? (() => {
          const wrapped = doc.splitTextToSize(event.reason, COLS[3] - 4) as string[];
          const shown = wrapped.slice(0, 2);
          if (wrapped.length > 2) shown[1] = `${shown[1].trimEnd()}...`;
          return shown;
        })()
      : [];
    adjust = {
      lines: [head, ...reasonLines, shortDate(event.date)],
      color: isConcession ? GREEN : RED,
      boldFirst: true,
    };
  }

  let received: Cell = EMPTY;
  if (event.kind === 'PAYMENT') {
    const tag = (event.paymentReason || 'Payment').toUpperCase();
    const lines = [`${inr(event.amount)} · ${tag}`];
    if (event.paidBy) lines.push(event.paidBy);
    lines.push(`${shortDate(event.date)} · ${event.paymentMode ?? '—'}`);
    received = { lines, color: GREEN, boldFirst: true };
  }

  return [rent, elec, adjust, received];
}

interface PreparedRow {
  cells: Cell[];
  height: number;
}

function prepareRows(doc: jsPDF, history: TenantMonthHistory): PreparedRow[] {
  return history.rows.map(({ before, after, event }) => {
    const cells = [
      balanceCell(before),
      ...eventCells(doc, event),
      balanceCell(after),
    ];
    const maxLines = Math.max(...cells.map((c) => c.lines.length));
    return { cells, height: maxLines * LINE_H + ROW_PAD * 2 };
  });
}

function cardHeight(rows: PreparedRow[]) {
  const body = rows.length
    ? rows.reduce((sum, r) => sum + r.height, 0)
    : 8;
  return 9 + HEAD_H + body + 8 + CARD_GAP;
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

function drawCard(doc: jsPDF, history: TenantMonthHistory, rows: PreparedRow[], top: number) {
  const height = cardHeight(rows) - CARD_GAP; // border excludes the gap below the card
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, top, CONTENT_W, height, 1.2, 1.2, 'S');

  let y = top + 5.6;
  drawText(doc, history.tenant.name, MARGIN + 3, y, true, 10, DARK);
  drawText(
    doc,
    `Room: ${history.tenant.room}`,
    MARGIN + 3 + doc.getTextWidth(history.tenant.name) + 4,
    y,
    false,
    8,
    GREY,
  );

  // Table header
  const headTop = top + 9;
  doc.setFillColor(...SOFT);
  doc.rect(MARGIN, headTop, CONTENT_W, HEAD_H, 'F');
  doc.setDrawColor(...RULE);
  doc.line(MARGIN, headTop, MARGIN + CONTENT_W, headTop);

  let x = MARGIN;
  HEADERS.forEach((label, i) => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(...GREY);
    const wrapped = doc.splitTextToSize(label, COLS[i] - 3) as string[];
    wrapped.slice(0, 2).forEach((line, li) => {
      doc.text(line, x + 2, headTop + 3.4 + li * 2.9);
    });
    x += COLS[i];
  });

  y = headTop + HEAD_H;
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);

  if (rows.length === 0) {
    drawText(doc, 'No financial activity this month', MARGIN + 3, y + 5.2, false, 7.5, GREY);
    y += 8;
  } else {
    rows.forEach((row) => {
      let cx = MARGIN;
      row.cells.forEach((cell, i) => {
        cell.lines.forEach((line, li) => {
          drawText(
            doc,
            line,
            cx + 2,
            y + ROW_PAD + 2.4 + li * LINE_H,
            !!cell.boldFirst && li === 0,
            li === 0 ? 7.4 : 6.4,
            li === 0 ? cell.color : GREY,
          );
        });
        cx += COLS[i];
      });
      y += row.height;
      doc.setDrawColor(...RULE);
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    });
  }

  // Footer status
  const pending = history.closing > 0;
  const statusValue = history.closing === 0
    ? '₹0 Pending'
    : pending
      ? `${inr(history.closing)} Pending`
      : `+${inr(history.closing)} Advance`;
  drawText(doc, 'Final Status:', MARGIN + 3, y + 5.2, false, 7.6, GREY);
  drawText(
    doc,
    statusValue,
    MARGIN + 3 + doc.getTextWidth('Final Status:') + 2.5,
    y + 5.2,
    true,
    7.8,
    history.closing < 0 ? GREEN : pending ? RED : DARK,
  );
}

function drawReportHeader(doc: jsPDF, label: string) {
  drawText(doc, 'RENTEASE', MARGIN, MARGIN + 5, true, 16, DARK);
  drawText(doc, `Monthly History Report — ${label}`, MARGIN, MARGIN + 11, false, 9.5, GREY);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, MARGIN + 14, PAGE_W - MARGIN, MARGIN + 14);
  return MARGIN + 19;
}

function drawSummary(doc: jsPDF, summary: MonthSummary, top: number) {
  const items: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Total Received', value: inr(summary.received), color: GREEN },
    { label: 'Total Pending', value: inr(summary.pending), color: RED },
    { label: 'Total Rent Added', value: inr(summary.rent), color: RED },
    { label: 'Total Electricity Added', value: inr(summary.electricity), color: RED },
    { label: 'Total Concession', value: inr(summary.concession), color: GREEN },
    { label: 'Total Extra Amount', value: inr(summary.extra), color: RED },
  ];

  const gap = 2.5;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 12;

  items.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * (cardW + gap);
    const y = top + row * (cardH + gap);
    doc.setFillColor(...SOFT);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, cardH, 1.2, 1.2, 'FD');
    drawText(doc, item.label, x + 3, y + 4.6, false, 6.8, GREY);
    drawText(doc, item.value, x + 3, y + 9.6, true, 10, item.color);
  });

  return top + 2 * cardH + gap + 6;
}

function drawPageFooter(doc: jsPDF, page: number, total: number, label: string) {
  drawText(doc, `RentEase — ${label}`, MARGIN, PAGE_H - 7, false, 6.6, GREY);
  const text = `Page ${page} of ${total}`;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(6.6);
  doc.text(text, PAGE_W - MARGIN - doc.getTextWidth(text), PAGE_H - 7);
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
    drawText(doc, 'No financial activity recorded for this month.', MARGIN, y + 6, false, 9, GREY);
  }

  const bottomLimit = PAGE_H - MARGIN - 6;

  histories.forEach((history) => {
    const rows = prepareRows(doc, history);
    const height = cardHeight(rows);
    if (y + height > bottomLimit) {
      doc.addPage();
      y = MARGIN;
    }
    drawCard(doc, history, rows, y);
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
