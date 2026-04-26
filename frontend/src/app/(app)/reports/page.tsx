'use client';

import { Download, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { http } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import type { ReportStatement } from '@/lib/types';

function kindLabel(kind: string) {
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
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const rows = statement?.rows ?? [];
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const topBandHeight = 22;
    const rowGap = 2.5;
    const summaryRows = [
      ['Income', money(statement?.totals.income ?? 0)],
      ['Expense', money(statement?.totals.expense ?? 0)],
      ['Borrowed', money(statement?.totals.loanBorrowed ?? 0)],
      ['Given', money(statement?.totals.loanLent ?? 0)],
      ['Transfers', money(statement?.totals.transferAmount ?? 0)],
      ['Transfer Fee', money(statement?.totals.transferFee ?? 0)],
    ] as const;

    const columns = [
      { label: 'Date', width: 18 },
      { label: 'Type', width: 24 },
      { label: 'Description', width: 53 },
      { label: 'Category / Person', width: 38 },
      { label: 'Account', width: 24 },
      { label: 'Amount', width: 25 },
    ] as const;

    const drawHeader = (pageNumber: number) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, topBandHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Expense Tracker Report', margin, 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - margin, 9, { align: 'right' });
      doc.text(`Page ${pageNumber}`, pageWidth - margin, 15, { align: 'right' });
      doc.setTextColor(16, 32, 51);
    };

    const drawSummaryCards = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(98, 116, 139);
      doc.text(`Period: ${period.toUpperCase()}`, margin, 30);
      doc.text(`Type: ${type.toUpperCase()}`, margin + 42, 30);
      if (statement?.range) {
        doc.text(`Range: ${shortDate(statement.range.from)} - ${shortDate(statement.range.to)}`, margin + 82, 30);
      }

      const cardWidth = (contentWidth - 8) / 3;
      const cardHeight = 20;
      let x = margin;
      let y = 36;

      summaryRows.forEach(([label, value], index) => {
        doc.setDrawColor(216, 225, 238);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(98, 116, 139);
        doc.text(label, x + 4, y + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(16, 32, 51);
        doc.text(value, x + 4, y + 14);

        if ((index + 1) % 3 === 0) {
          x = margin;
          y += cardHeight + 4;
        } else {
          x += cardWidth + 4;
        }
      });

      return y + cardHeight + 6;
    };

    const drawTableHeader = (y: number) => {
      let x = margin;
      doc.setFillColor(29, 78, 216);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      columns.forEach((column) => {
        doc.text(column.label, x + 2, y + 6);
        x += column.width;
      });
      doc.setTextColor(16, 32, 51);
      return y + 9;
    };

    drawHeader(1);
    let y = drawSummaryCards();
    y = drawTableHeader(y);

    rows.forEach((row, index) => {
      const values = [
        shortDate(row.date),
        kindLabel(row.kind),
        row.description,
        row.category,
        row.account,
        money(row.amount),
      ];

      const lines = values.map((value, valueIndex) =>
        doc.splitTextToSize(String(value), columns[valueIndex].width - (valueIndex === columns.length - 1 ? 4 : 6)),
      );
      const lineCount = Math.max(...lines.map((value) => value.length));
      const rowHeight = Math.max(8, lineCount * 4.4 + 3.4);

      if (y + rowHeight > pageHeight - 12) {
        doc.addPage();
        drawHeader(doc.getNumberOfPages());
        y = drawTableHeader(24);
      }

      let x = margin;
      doc.setFillColor(index % 2 === 0 ? 255 : 247, index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, rowHeight, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.3);

      lines.forEach((value, valueIndex) => {
        const align = valueIndex === columns.length - 1 ? 'right' : 'left';
        const textX = align === 'right' ? x + columns[valueIndex].width - 2 : x + 2;
        doc.text(value, textX, y + 5.2, { align });
        x += columns[valueIndex].width;
      });

      y += rowHeight;
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

  function clearFilters() {
    setPeriod('monthly');
    setType('all');
    setFrom('');
    setTo('');
  }

  return (
    <>
      <div className="toolbarBar">
        <div className="toolbar toolbarMain">
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
              <option value="transfer">Transfer</option>
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
          <button className="ghostButton" type="button" onClick={clearFilters} disabled={period === 'monthly' && type === 'all' && !from && !to}>
            Clear
          </button>
        </div>
        <div className="toolbarActions">
          <button className="ghostButton" type="button" onClick={downloadPdf}>
            <Download size={17} />
            Download PDF
          </button>
          <button className="button" type="button" onClick={sharePdf}>
            <Share2 size={17} />
            Share
          </button>
        </div>
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
          <span>Borrowed</span>
          <strong>{money(statement?.totals.loanBorrowed ?? 0)}</strong>
        </article>
        <article className="metricCard">
          <span>Lent</span>
          <strong>{money(statement?.totals.loanLent ?? 0)}</strong>
        </article>
        <article className="metricCard">
          <span>Transfers</span>
          <strong>{money(statement?.totals.transferAmount ?? 0)}</strong>
        </article>
        <article className="metricCard">
          <span>Transfer Fee</span>
          <strong className="amountExpense">{money(statement?.totals.transferFee ?? 0)}</strong>
        </article>
      </section>

      <DataTable
        rows={statement?.rows ?? []}
        columns={['Date', 'Type', 'Description', 'Category / Person', 'Account', 'Amount']}
        colSpan={6}
        emptyMessage="No report rows found."
        renderRow={(row) => (
          <tr key={row.id}>
            <td>{shortDate(row.date)}</td>
            <td>
              <span className="badge">{kindLabel(row.kind)}</span>
            </td>
            <td>{row.description}</td>
            <td>{row.category}</td>
            <td>{row.account}</td>
            <td
              className={
                row.kind === 'expense' || row.kind === 'loan-lent' || row.kind === 'transfer-fee'
                  ? 'amountExpense'
                  : row.kind === 'income' || row.kind === 'loan-borrowed'
                    ? 'amountIncome'
                    : ''
              }
            >
              {money(row.amount)}
            </td>
          </tr>
        )}
      />
    </>
  );
}
