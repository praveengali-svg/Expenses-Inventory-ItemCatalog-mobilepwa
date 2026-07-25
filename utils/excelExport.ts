/**
 * excelExport.ts
 * Utility functions to export app data into formatted Excel (.xlsx) workbooks.
 * Uses the 'xlsx' (SheetJS) library which is already a project dependency.
 */

import * as XLSX from 'xlsx';
import { SalesDocument, ExpenseData, LineItem } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const inr = (n: number) => Number(n.toFixed(2));

/** Download a workbook object as an .xlsx file */
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

/** Apply column widths to a worksheet */
function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ─── Sales Invoices ───────────────────────────────────────────────────────────

/**
 * Export one or many sales invoices to a multi-sheet Excel workbook.
 *
 * Sheet 1 – "Invoice Register"  : summary row per document
 * Sheet 2 – "Line Items Detail" : one row per line item across all invoices
 * Sheet 3 – "HSN Summary"       : HSN-level aggregation (GST filing helper)
 */
export function exportSalesInvoicesToExcel(
  sales: SalesDocument[],
  label: string = 'Sales'
) {
  if (sales.length === 0) return;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Invoice Register ──────────────────────────────────────────────
  const registerHeaders = [
    'Invoice No', 'Date', 'Type', 'Status',
    'Customer Name', 'GSTIN', 'State',
    'PO Number', 'PO Date',
    'Taxable (₹)', 'Tax (₹)', 'Grand Total (₹)',
    'Paid (₹)', 'Balance (₹)',
    'Created By'
  ];

  const registerRows = sales.map(s => [
    s.docNumber,
    s.date,
    s.type.replace(/_/g, ' ').toUpperCase(),
    s.status.toUpperCase(),
    s.customerName,
    s.customerGst || 'B2C',
    s.customerState || '',
    s.poNumber || '',
    s.poDate || '',
    inr(s.totalAmount - s.taxAmount),
    inr(s.taxAmount),
    inr(s.totalAmount),
    inr(s.amountPaid ?? 0),
    inr(s.balanceAmount ?? (s.totalAmount - (s.amountPaid ?? 0))),
    s.createdBy
  ]);

  const wsRegister = XLSX.utils.aoa_to_sheet([registerHeaders, ...registerRows]);
  setColWidths(wsRegister, [18, 12, 20, 10, 30, 18, 16, 14, 12, 14, 12, 14, 12, 12, 16]);
  XLSX.utils.book_append_sheet(wb, wsRegister, 'Invoice Register');

  // ── Sheet 2: Line Items Detail ─────────────────────────────────────────────
  const lineHeaders = [
    'Invoice No', 'Date', 'Customer',
    'SKU', 'Description', 'HSN Code', 'Category',
    'Qty', 'UOM', 'Rate (₹)', 'Taxable (₹)', 'GST %', 'Tax (₹)', 'Line Total (₹)'
  ];

  const lineRows: (string | number)[][] = [];
  sales.forEach(s => {
    s.lineItems.forEach((item: LineItem) => {
      const taxable = item.amount || 0;
      const gstPct = item.gstPercentage || 18;
      const tax = taxable * (gstPct / 100);
      lineRows.push([
        s.docNumber,
        s.date,
        s.customerName,
        item.sku || '',
        item.description,
        item.hsnCode || '',
        item.category || '',
        item.quantity ?? 1,
        item.unitOfMeasure || 'PCS',
        inr(item.rate || 0),
        inr(taxable),
        gstPct,
        inr(tax),
        inr(taxable + tax)
      ]);
    });
  });

  const wsLines = XLSX.utils.aoa_to_sheet([lineHeaders, ...lineRows]);
  setColWidths(wsLines, [18, 12, 26, 12, 32, 12, 14, 6, 6, 10, 12, 8, 10, 12]);
  XLSX.utils.book_append_sheet(wb, wsLines, 'Line Items Detail');

  // ── Sheet 3: HSN Summary ───────────────────────────────────────────────────
  const hsnMap: Record<string, { desc: string; qty: number; taxable: number; tax: number }> = {};
  sales.forEach(s => {
    s.lineItems.forEach(item => {
      const code = item.hsnCode || 'N/A';
      if (!hsnMap[code]) hsnMap[code] = { desc: item.description, qty: 0, taxable: 0, tax: 0 };
      const taxable = item.amount || 0;
      const gstPct = item.gstPercentage || 18;
      hsnMap[code].qty += item.quantity ?? 1;
      hsnMap[code].taxable += taxable;
      hsnMap[code].tax += taxable * (gstPct / 100);
    });
  });

  const hsnHeaders = [
    'HSN Code', 'Description', 'Total Qty', 'Total Taxable (₹)',
    'Total Tax (₹)', 'Grand Total (₹)'
  ];
  const hsnRows = Object.entries(hsnMap).map(([code, d]) => [
    code, d.desc, d.qty,
    inr(d.taxable), inr(d.tax), inr(d.taxable + d.tax)
  ]);

  const wsHsn = XLSX.utils.aoa_to_sheet([hsnHeaders, ...hsnRows]);
  setColWidths(wsHsn, [14, 36, 10, 18, 14, 16]);
  XLSX.utils.book_append_sheet(wb, wsHsn, 'HSN Summary');

  downloadWorkbook(wb, `${label}_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Expenses / Purchase Invoices ─────────────────────────────────────────────

/**
 * Export expense / purchase invoice records to a two-sheet Excel workbook.
 *
 * Sheet 1 – "Expense Register" : summary row per expense
 * Sheet 2 – "Line Items Detail": one row per line item across all expenses
 */
export function exportExpensesToExcel(
  expenses: ExpenseData[],
  label: string = 'Expenses'
) {
  if (expenses.length === 0) return;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Expense Register ──────────────────────────────────────────────
  const expHeaders = [
    'Doc Number', 'Date', 'Type', 'Status',
    'Vendor Name', 'Vendor GST', 'Vendor Address',
    'Taxable (₹)', 'Tax (₹)', 'Grand Total (₹)',
    'TDS (₹)', 'TDS %',
    'ESIC (₹)', 'ESIC %',
    'PF (₹)', 'PF %',
    'PT (₹)',
    'Created By', 'File Name'
  ];

  const expRows = expenses.map(e => [
    e.docNumber || '',
    e.date,
    e.type,
    e.status || '',
    e.vendorName,
    e.vendorGst || '',
    e.vendorAddress || '',
    inr(e.totalAmount - e.taxAmount),
    inr(e.taxAmount),
    inr(e.totalAmount),
    inr(e.tdsAmount ?? 0),
    e.tdsPercentage ?? '',
    inr(e.esicAmount ?? 0),
    e.esicPercentage ?? '',
    inr(e.pfAmount ?? 0),
    e.pfPercentage ?? '',
    inr(e.ptAmount ?? 0),
    e.createdBy,
    e.fileName
  ]);

  const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
  setColWidths(wsExp, [16, 12, 14, 10, 28, 18, 28, 14, 10, 14, 10, 8, 10, 8, 10, 8, 10, 16, 24]);
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expense Register');

  // ── Sheet 2: Line Items ────────────────────────────────────────────────────
  const lineHeaders = [
    'Doc Number', 'Date', 'Vendor',
    'SKU', 'Description', 'Category', 'HSN Code',
    'Qty', 'UOM', 'Rate (₹)', 'Amount (₹)', 'GST %', 'Tax (₹)',
    'TDS (₹)', 'ESIC (₹)', 'PF (₹)', 'PT (₹)'
  ];

  const lineRows: (string | number)[][] = [];
  expenses.forEach(e => {
    e.lineItems.forEach((item: LineItem) => {
      const amt = item.amount || 0;
      const gstPct = item.gstPercentage || 0;
      const tax = amt * (gstPct / 100);
      lineRows.push([
        e.docNumber || '',
        e.date,
        e.vendorName,
        item.sku || '',
        item.description,
        item.category || '',
        item.hsnCode || '',
        item.quantity ?? 1,
        item.unitOfMeasure || '',
        inr(item.rate || 0),
        inr(amt),
        gstPct,
        inr(tax),
        inr(item.tdsAmount ?? 0),
        inr(item.esicAmount ?? 0),
        inr(item.pfAmount ?? 0),
        inr(item.ptAmount ?? 0)
      ]);
    });
  });

  const wsLines = XLSX.utils.aoa_to_sheet([lineHeaders, ...lineRows]);
  setColWidths(wsLines, [16, 12, 26, 12, 32, 14, 12, 6, 6, 10, 10, 8, 10, 10, 10, 10, 10]);
  XLSX.utils.book_append_sheet(wb, wsLines, 'Line Items Detail');

  downloadWorkbook(wb, `${label}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Combined Ledger (Sales + Expenses in one workbook) ───────────────────────

export function exportFullLedgerToExcel(
  sales: SalesDocument[],
  expenses: ExpenseData[],
  month: string  // 'YYYY-MM'
) {
  const wb = XLSX.utils.book_new();

  // Sales sheet
  const sHeaders = ['Date', 'Doc No', 'Customer', 'GSTIN', 'Type', 'Taxable', 'Tax', 'Total', 'Paid', 'Balance', 'Status'];
  const sRows = sales
    .filter(s => s.date.startsWith(month))
    .map(s => [
      s.date, s.docNumber, s.customerName, s.customerGst || 'B2C',
      s.type.replace(/_/g, ' '),
      inr(s.totalAmount - s.taxAmount), inr(s.taxAmount), inr(s.totalAmount),
      inr(s.amountPaid ?? 0), inr(s.balanceAmount ?? 0), s.status
    ]);
  const wsSales = XLSX.utils.aoa_to_sheet([sHeaders, ...sRows]);
  setColWidths(wsSales, [12, 16, 26, 18, 18, 12, 10, 12, 10, 10, 10]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

  // Expenses sheet
  const eHeaders = ['Date', 'Doc No', 'Vendor', 'Vendor GST', 'Type', 'Taxable', 'Tax', 'Total', 'Status', 'Created By'];
  const eRows = expenses
    .filter(e => e.date.startsWith(month))
    .map(e => [
      e.date, e.docNumber || '', e.vendorName, e.vendorGst || '',
      e.type,
      inr(e.totalAmount - e.taxAmount), inr(e.taxAmount), inr(e.totalAmount),
      e.status || '', e.createdBy
    ]);
  const wsExp = XLSX.utils.aoa_to_sheet([eHeaders, ...eRows]);
  setColWidths(wsExp, [12, 16, 26, 18, 14, 12, 10, 12, 10, 14]);
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

  // P&L Summary sheet
  const totalSales = sRows.reduce((a, r) => a + (r[7] as number), 0);
  const totalExp = eRows.reduce((a, r) => a + (r[7] as number), 0);
  const summaryData = [
    ['FINANCIAL SUMMARY', month],
    [],
    ['Category', 'Amount (₹)'],
    ['Total Sales / Revenue', inr(totalSales)],
    ['Total Purchases / Expenses', inr(totalExp)],
    ['Gross Profit / Loss', inr(totalSales - totalExp)],
    [],
    ['Sales Tax Collected', inr(sRows.reduce((a, r) => a + (r[6] as number), 0))],
    ['Input Tax Credit (ITC)', inr(eRows.reduce((a, r) => a + (r[6] as number), 0))],
    ['Net Tax Payable', inr(
      sRows.reduce((a, r) => a + (r[6] as number), 0) -
      eRows.reduce((a, r) => a + (r[6] as number), 0)
    )],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  setColWidths(wsSummary, [32, 18]);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'P&L Summary');

  downloadWorkbook(wb, `Full_Ledger_${month}.xlsx`);
}
