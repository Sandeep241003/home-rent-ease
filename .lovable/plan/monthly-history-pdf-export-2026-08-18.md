# Monthly History PDF Export

Add a "Download Monthly History" button to the History page that opens a dialog listing every month that has financial data, each with its own Download PDF button producing e.g. `RentEase_History_August_2026.pdf`.

Nothing in the existing rent, payment, electricity, concession, extra-amount, advance, pending-balance, reversal or History logic changes. The export is read-only and reuses the existing tables and hooks.

## What the PDF contains

**Header:** RENTEASE / Monthly History Report — August 2026.

**Summary strip:** compact cards for Total Received, Total Pending, Total Rent Added, Total Electricity Added, Total Concession, Total Extra Amount — all derived from the same month's events.

**One card per tenant** (name, room, event table, closing status). No giant combined table, no month-end summary section.

Each card's table:

```text
Pending/Extra Before | Rent Added | Electricity | Concession/Extra | Amount Received | Pending/Extra After
```

- One row per financial event, in chronological order by actual timestamp.
- Before = balance immediately before that event; After = balance immediately after.
- Balance shown as a single value: `₹2,000` when pending, `+₹1,000` when the tenant is in advance. Never split into "pending 0 + advance".
- Rent / electricity rows show amount + date (`₹10,000` / `05 Aug`).
- Concession shows `−₹500` with its stored reason; extra amount shows `+₹1,000` with its stored reason. Reasons come from the existing activity log text — none invented.
- Every payment is its own row: amount, reason tag (RENT/ELECTRICITY/…), payer, date, mode. Four payments = four rows.
- Empty cells render as `—`.
- Card footer: `Final Status: ₹X Pending` (red) or `Final Status: +₹X Advance` (green).

**Colors:** red for pending/rent/electricity/charges, green for received/concession/advance, otherwise black text on white with light grey rules. No dots, emojis or icons.

**Pagination:** A4 portrait, measured layout. Each card's height is computed before drawing; if it doesn't fit in the remaining space, the whole card moves to the next page. Never split a card, never a blank page, only as many pages as needed.

## Technical approach

- New `src/lib/monthlyHistoryPdf.ts`: pure functions — no React, no data fetching — that take the already-loaded records and emit the PDF via **jsPDF** (already a dependency, vector text, selectable/searchable). Manual layout so keep-together pagination is exact.
- New `src/hooks/useMonthlyHistoryData.ts`: read-only queries over the existing tables to build, per month:
  - events from `monthly_rent_entries`, `electricity_readings`, `payments` (each filtered `is_reversed = false`, matching current app behaviour), plus `CONCESSION_APPLIED` and `EXTRA_CHARGE_ADDED` rows from `activity_log` with the same reversal exclusion the existing History uses.
  - The available-months list is derived from the union of these event dates (dynamic, not hardcoded).
- **Opening balance:** there is no stored monthly snapshot, so it is reconstructed by replaying every non-reversed event from the tenant's start up to the first instant of the selected month, using the exact same arithmetic already used in `usePayments`/`useTenants` (payment first clears pending, remainder becomes advance; charges consume advance before adding to pending). This reuses the existing rules rather than inventing new ones; the closing value of a month equals the opening value of the next.
- New `src/components/MonthlyHistoryPdfDialog.tsx`: month list + per-month download button, styled with existing shadcn dialog/button components.
- History page change is limited to one button plus the dialog mount.

## Verification

Generated PDFs will be rendered to images and inspected for clipping, overlap, broken rows and blank pages, across: previous pending, previous advance, multiple payments and modes, electricity present/absent, concession, extra charge, fully paid, remaining pending, remaining advance, many tenants spilling to page 2, an empty month, and a month containing reversed transactions (which must not appear).
