'use client';

import { Download, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import type { ReportStatement } from '@/lib/types';

export default function ReportsPage() {
  const [period, setPeriod] = useState('monthly');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statement, setStatement] = useState<ReportStatement | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ period, type });
    if (period === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    setStatement(await http.get<ReportStatement>(`/reports/statement?${params}`));
  }, [from, period, to, type]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function buildPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const rows = statement?.rows ?? [];
    doc.setFontSize(16);
    doc.text('Expense Tracker Statement', 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${period} | Type: ${type}`, 14, 26);
    doc.text(`Income: ${money(statement?.totals.income ?? 0)}  Expense: ${money(statement?.totals.expense ?? 0)}`, 14, 34);

    let y = 46;
    doc.setFontSize(9);
    rows.forEach((row, index) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(
        `${index + 1}. ${shortDate(row.date)} | ${row.kind} | ${row.account} | ${row.category} | ${money(row.amount)} | ${row.description}`,
        14,
        y,
        { maxWidth: 182 },
      );
      y += 9;
    });
    return doc;
  }

  async function downloadPdf() {
    const doc = await buildPdf();
    doc.save('expense-statement.pdf');
  }

  async function sharePdf() {
    const doc = await buildPdf();
    const blob = doc.output('blob');
    const file = new File([blob], 'expense-statement.pdf', { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Expense Statement', files: [file] });
    } else if (navigator.share) {
      await navigator.share?.({ title: 'Expense Statement', text: 'Expense statement PDF is ready.' });
    } else {
      doc.save('expense-statement.pdf');
    }
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Reports</h1>
          <p>Weekly, monthly, yearly, and custom statements.</p>
        </div>
        <div className="actions">
          <button className="ghostButton" type="button" onClick={downloadPdf}>
            <Download size={17} />
            PDF
          </button>
          <button className="button" type="button" onClick={sharePdf}>
            <Share2 size={17} />
            Share
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>Period</label>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="loan">Loan</option>
          </select>
        </div>
        {period === 'custom' ? (
          <>
            <div className="field">
              <label>From</label>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="field">
              <label>To</label>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          </>
        ) : null}
        <button className="ghostButton" type="button" onClick={() => load().catch(console.error)}>
          Generate
        </button>
      </div>

      <section className="metricGrid">
        <article className="metricCard">
          <span>Income</span>
          <strong className="amountIncome">{money(statement?.totals.income ?? 0)}</strong>
        </article>
        <article className="metricCard">
          <span>Expense</span>
          <strong className="amountExpense">{money(statement?.totals.expense ?? 0)}</strong>
        </article>
        <article className="metricCard">
          <span>Loan Borrowed</span>
          <strong>{money(statement?.totals.loanBorrowed ?? 0)}</strong>
        </article>
        <article className="metricCard">
          <span>Loan Lent</span>
          <strong>{money(statement?.totals.loanLent ?? 0)}</strong>
        </article>
      </section>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Category / Person</th>
              <th>Account</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(statement?.rows ?? []).map((row) => (
              <tr key={row.id}>
                <td>{shortDate(row.date)}</td>
                <td>
                  <span className="badge">{row.kind}</span>
                </td>
                <td>{row.description}</td>
                <td>{row.category}</td>
                <td>{row.account}</td>
                <td className={row.kind.includes('expense') || row.kind.includes('lent') ? 'amountExpense' : 'amountIncome'}>
                  {money(row.amount)}
                </td>
              </tr>
            ))}
            {!statement?.rows.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No report rows found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
