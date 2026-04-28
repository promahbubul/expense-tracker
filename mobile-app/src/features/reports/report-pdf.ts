import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { ReportStatement } from '../../types';
import { dateLabel, money } from '../../utils/format';

export function kindLabel(kind: string) {
  return (
    {
      income: 'Income',
      expense: 'Expense',
      'loan-borrowed': 'Borrowed',
      'loan-lent': 'Given',
      transfer: 'Transfer',
      'transfer-fee': 'Transfer Fee',
    } as Record<string, string>
  )[kind] ?? kind;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReportHtml(data: ReportStatement) {
  const summaryRows = [
    ['Income', money(data.totals.income)],
    ['Expense', money(data.totals.expense)],
    ['Borrowed', money(data.totals.loanBorrowed)],
    ['Given', money(data.totals.loanLent)],
    ['Transfers', money(data.totals.transferAmount)],
    ['Transfer Fee', money(data.totals.transferFee)],
  ];

  const rows = data.rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(dateLabel(item.date))}</td>
          <td>${escapeHtml(kindLabel(item.kind))}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.account)}</td>
          <td class="amount">${escapeHtml(money(item.amount))}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #102033; margin: 0; }
          .page { width: 100%; }
          .band {
            background: #0f172a;
            color: #ffffff;
            padding: 16px 18px;
            border-radius: 12px 12px 0 0;
          }
          .title { margin: 0; font-size: 22px; font-weight: 700; }
          .band-meta { margin-top: 6px; font-size: 10px; opacity: 0.9; }
          .meta-row { margin: 14px 0 0; font-size: 10px; color: #64748b; }
          .meta-row span { margin-right: 18px; }
          .summary {
            margin-top: 14px;
            display: table;
            width: 100%;
            border-spacing: 4px;
          }
          .summary-row { display: table-row; }
          .card {
            display: table-cell;
            width: 33.333%;
            border: 1px solid #d8e1ee;
            border-radius: 10px;
            padding: 10px;
            background: #f8fafc;
          }
          .card span {
            display: block;
            font-size: 9px;
            color: #62748b;
            text-transform: uppercase;
            letter-spacing: .06em;
            margin-bottom: 6px;
          }
          .card strong { font-size: 12px; color: #102033; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 14px;
          }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          th {
            background: #1d4ed8;
            color: #ffffff;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: .05em;
            padding: 8px 6px;
            text-align: left;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 6px;
            text-align: left;
            vertical-align: top;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          .amount { text-align: right; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="band">
            <h1 class="title">Expense Tracker Report</h1>
            <div class="band-meta">Generated ${escapeHtml(dateLabel(new Date().toISOString()))}</div>
          </div>
          <div class="meta-row">
            <span>Range: ${escapeHtml(dateLabel(data.range.from))} - ${escapeHtml(dateLabel(data.range.to))}</span>
          </div>
          <div class="summary">
            <div class="summary-row">
              ${summaryRows
                .slice(0, 3)
                .map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
                .join('')}
            </div>
            <div class="summary-row">
              ${summaryRows
                .slice(3)
                .map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
                .join('')}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category / Person</th>
                <th>Account</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

function fileStamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(
    2,
    '0',
  )}${String(now.getMinutes()).padStart(2, '0')}`;
}

export async function createPdfFile(data: ReportStatement) {
  const printed = await Print.printToFileAsync({
    html: buildReportHtml(data),
  });

  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) {
    return printed.uri;
  }

  const destination = `${directory}expense-report-${fileStamp()}.pdf`;
  await FileSystem.copyAsync({ from: printed.uri, to: destination });
  return destination;
}
