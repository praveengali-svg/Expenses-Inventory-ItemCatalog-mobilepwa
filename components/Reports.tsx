import React, { useState, useMemo } from 'react';
import {
   FileSpreadsheet, Calendar, ChevronDown, Download, CheckCircle2,
   AlertCircle, Table, IndianRupee, PieChart, ArrowDownToLine, Info,
   TrendingUp, TrendingDown, Users, Package, ShoppingCart, Wallet, Receipt
} from 'lucide-react';
import { SalesDocument, ExpenseData, LineItem } from '../types';
import { exportSalesInvoicesToExcel, exportExpensesToExcel, exportFullLedgerToExcel } from '../utils/excelExport';

interface Props {
   sales: SalesDocument[];
   expenses: ExpenseData[];
}

type ReportTab = 'gst' | 'sales' | 'invoices' | 'opex';

const Reports: React.FC<Props> = ({ sales, expenses }) => {
   const [activeTab, setActiveTab] = useState<ReportTab>('sales');
   const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

   // ── Filtered data by month ──────────────────────────────────────────────────
   const monthSales = useMemo(() =>
      sales.filter(s => s.date.startsWith(selectedMonth) && s.status === 'issued'),
   [sales, selectedMonth]);

   /** Purchase invoices from vendors (type === 'invoice') */
   const monthInvoices = useMemo(() =>
      expenses.filter(e => e.date.startsWith(selectedMonth) && e.type === 'invoice'),
   [expenses, selectedMonth]);

   /** Operational expenses (type === 'expense') */
   const monthOpex = useMemo(() =>
      expenses.filter(e => e.date.startsWith(selectedMonth) && e.type === 'expense'),
   [expenses, selectedMonth]);

   /** All expense-type records for full-ledger export */
   const monthAllExpenses = useMemo(() =>
      expenses.filter(e => e.date.startsWith(selectedMonth)),
   [expenses, selectedMonth]);

   // ── Stats ──────────────────────────────────────────────────────────────────
   const stats = useMemo(() => {
      const b2b = monthSales.filter(s => s.customerGst && s.type === 'sales_invoice');
      const b2c = monthSales.filter(s => !s.customerGst && s.type === 'sales_invoice');

      const taxableValue = monthSales.reduce((a, s) => a + (s.totalAmount - s.taxAmount), 0);
      const taxValue     = monthSales.reduce((a, s) => a + s.taxAmount, 0);
      const totalSales   = monthSales.reduce((a, s) => a + s.totalAmount, 0);

      const totalInvoices = monthInvoices.reduce((a, e) => a + e.totalAmount, 0);
      const totalOpex     = monthOpex.reduce((a, e) => a + e.totalAmount, 0);

      return { b2b, b2c, taxableValue, taxValue, totalSales, totalInvoices, totalOpex };
   }, [monthSales, monthInvoices, monthOpex]);

   // ── HSN Summary ────────────────────────────────────────────────────────────
   const hsnSummary = useMemo(() => {
      const summary: Record<string, { desc: string; qty: number; taxable: number; tax: number }> = {};
      monthSales.forEach(s => {
         s.lineItems.forEach(item => {
            const code = item.hsnCode || 'N/A';
            if (!summary[code]) summary[code] = { desc: item.description, qty: 0, taxable: 0, tax: 0 };
            const taxable = item.amount || 0;
            const tax     = taxable * ((item.gstPercentage || 18) / 100);
            summary[code].qty     += item.quantity || 1;
            summary[code].taxable += taxable;
            summary[code].tax     += tax;
         });
      });
      return Object.entries(summary).map(([code, d]) => ({ hsn: code, ...d }));
   }, [monthSales]);

   // ── Helpers ────────────────────────────────────────────────────────────────
   const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

   const exportCSV = (data: any[], filename: string) => {
      if (!data.length) return;
      const headers = Object.keys(data[0]);
      const csv = [
         headers.join(','),
         ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
   };

   const exportGSTR1 = () => {
      if (!monthSales.length) return;
      const b2bHeaders = ['GSTIN/UIN of Recipient','Receiver Name','Invoice Number','Invoice date','Invoice Value','Place Of Supply','Reverse Charge','Applicable % of Tax Rate','Invoice Type','E-Commerce GSTIN','Rate','Taxable Value','Cess Amount'];
      const b2bRows = stats.b2b.flatMap(s => s.lineItems.map(item => [
         s.customerGst, `"${s.customerName.replace(/"/g,'""')}"`, s.docNumber,
         new Date(s.date).toLocaleDateString('en-GB'), s.totalAmount,
         '00-Other State','N','','Regular','', item.gstPercentage, item.amount, '0'
      ]));
      const hsnHeaders = ['HSN','Description','UQC','Total Quantity','Total Value','Taxable Value','Integrated Tax Amount','Central Tax Amount','State/UT Tax Amount','Cess Amount'];
      const hsnRows = hsnSummary.map(h => [
         h.hsn, `"${h.desc.replace(/"/g,'""')}"`, 'NOS-NUMBERS', h.qty,
         (h.taxable + h.tax).toFixed(2), h.taxable.toFixed(2), h.tax.toFixed(2), 0, 0, 0
      ]);
      const csv = ['B2B DATA', b2bHeaders.join(','), ...b2bRows.map(r => r.join(',')),
                   '', 'HSN SUMMARY DATA', hsnHeaders.join(','), ...hsnRows.map(r => r.join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = `GSTR1_${selectedMonth}.csv`; a.click();
      URL.revokeObjectURL(url);
   };

   const exportSalesCSV = () => exportCSV(
      monthSales.map(s => ({ Date: s.date, Number: s.docNumber, Customer: s.customerName, GSTIN: s.customerGst || 'B2C', Type: s.type, Status: s.status, Taxable: (s.totalAmount - s.taxAmount).toFixed(2), Tax: s.taxAmount.toFixed(2), Total: s.totalAmount.toFixed(2) })),
      `Sales_${selectedMonth}.csv`
   );

   const exportInvoicesCSV = () => exportCSV(
      monthInvoices.map(e => ({ Date: e.date, DocNo: e.docNumber || '', Vendor: e.vendorName, VendorGST: e.vendorGst || '', Taxable: (e.totalAmount - e.taxAmount).toFixed(2), Tax: e.taxAmount.toFixed(2), Total: e.totalAmount.toFixed(2), Status: e.status || '', CreatedBy: e.createdBy })),
      `Purchase_Invoices_${selectedMonth}.csv`
   );

   const exportOpexCSV = () => exportCSV(
      monthOpex.map(e => ({ Date: e.date, Vendor: e.vendorName, Amount: e.totalAmount.toFixed(2), CreatedBy: e.createdBy })),
      `Opex_${selectedMonth}.csv`
   );

   // ── Active data helpers ────────────────────────────────────────────────────
   const activeIsEmpty =
      (activeTab === 'gst'      && hsnSummary.length === 0) ||
      (activeTab === 'sales'    && monthSales.length === 0)  ||
      (activeTab === 'invoices' && monthInvoices.length === 0) ||
      (activeTab === 'opex'     && monthOpex.length === 0);

   const activeCount =
      activeTab === 'gst'      ? `${hsnSummary.length} Codes`   :
      activeTab === 'sales'    ? `${monthSales.length} Entries`  :
      activeTab === 'invoices' ? `${monthInvoices.length} Records` :
                                  `${monthOpex.length} Records`;

   // ── Stat card values depending on active tab ───────────────────────────────
   const outflowLabel  = activeTab === 'invoices' ? 'Purchase Invoices' : activeTab === 'opex' ? 'Opex Spend' : 'Total Outflow';
   const outflowValue  = activeTab === 'opex' ? stats.totalOpex : stats.totalInvoices;
   const outflowCount  = activeTab === 'opex' ? monthOpex.length : monthInvoices.length;
   const outflowColor  = activeTab === 'opex' ? 'text-purple-400' : 'text-orange-400';

   return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">

         {/* ── Header ── */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Intelligence &amp; Reports</h2>
               <p className="text-blue-400 text-[10px] font-black mt-2 uppercase tracking-[0.4em]">Neural Audit: Financial Insights Engine</p>
            </div>

            <div className="flex flex-wrap gap-3 items-center bg-slate-900/50 p-3 rounded-3xl border border-white/5 backdrop-blur-xl">
               {/* Month picker */}
               <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                  <Calendar size={18} className="text-blue-400" />
                  <input
                     type="month" value={selectedMonth}
                     onChange={e => setSelectedMonth(e.target.value)}
                     className="bg-transparent text-xs font-black uppercase tracking-widest text-white outline-none"
                  />
               </div>

               {/* Tab switcher */}
               <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 flex-wrap gap-1">
                  {([
                     { id: 'sales',    label: 'Sales' },
                     { id: 'invoices', label: 'Invoices' },
                     { id: 'opex',     label: 'Opex' },
                     { id: 'gst',      label: 'GST' },
                  ] as { id: ReportTab; label: string }[]).map(t => (
                     <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                        {t.label}
                     </button>
                  ))}
               </div>

               {/* Export buttons */}
               {activeTab === 'gst' && (<>
                  <button onClick={exportGSTR1} disabled={!monthSales.length}
                     className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2">
                     <Download size={14} /> GSTR-1 CSV
                  </button>
                  <button onClick={() => exportSalesInvoicesToExcel(monthSales, `GSTR1_${selectedMonth}`)} disabled={!monthSales.length}
                     className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
                     <FileSpreadsheet size={14} /> Excel
                  </button>
               </>)}
               {activeTab === 'sales' && (<>
                  <button onClick={exportSalesCSV} disabled={!monthSales.length}
                     className="bg-slate-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center gap-2">
                     <Download size={14} /> CSV
                  </button>
                  <button onClick={() => exportSalesInvoicesToExcel(monthSales, `Sales_${selectedMonth}`)} disabled={!monthSales.length}
                     className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
                     <FileSpreadsheet size={14} /> Excel
                  </button>
               </>)}
               {activeTab === 'invoices' && (<>
                  <button onClick={exportInvoicesCSV} disabled={!monthInvoices.length}
                     className="bg-slate-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center gap-2">
                     <Download size={14} /> CSV
                  </button>
                  <button onClick={() => exportExpensesToExcel(monthInvoices, `Purchase_Invoices_${selectedMonth}`)} disabled={!monthInvoices.length}
                     className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
                     <FileSpreadsheet size={14} /> Excel
                  </button>
               </>)}
               {activeTab === 'opex' && (<>
                  <button onClick={exportOpexCSV} disabled={!monthOpex.length}
                     className="bg-slate-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center gap-2">
                     <Download size={14} /> CSV
                  </button>
                  <button onClick={() => exportExpensesToExcel(monthOpex, `Opex_${selectedMonth}`)} disabled={!monthOpex.length}
                     className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
                     <FileSpreadsheet size={14} /> Excel
                  </button>
               </>)}
            </div>
         </div>

         {/* ── Stats Grid ── */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-container p-8 rounded-[3rem] space-y-4">
               <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <TrendingUp size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoiced Revenue</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{fmt(stats.totalSales)}</p>
                  <p className="text-[9px] font-bold text-blue-400 mt-1 uppercase tracking-widest">{monthSales.length} Docs</p>
               </div>
            </div>
            <div className="glass-container p-8 rounded-[3rem] space-y-4">
               <div className={`bg-orange-500/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-orange-500/20 ${outflowColor}`}>
                  <TrendingDown size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{outflowLabel}</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{fmt(outflowValue)}</p>
                  <p className={`text-[9px] font-bold mt-1 uppercase tracking-widest ${outflowColor}`}>{outflowCount} Records</p>
               </div>
            </div>
            <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl shadow-blue-600/20 space-y-4 text-white">
               <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <IndianRupee size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Monthly Taxable</p>
                  <p className="text-2xl font-black tracking-tighter">{fmt(stats.taxableValue)}</p>
                  <p className="text-[9px] font-bold text-blue-100 mt-1 uppercase tracking-widest">Before Tax</p>
               </div>
            </div>
            <div className="glass-container p-8 rounded-[3rem] space-y-4">
               <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Provision</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{fmt(stats.taxValue)}</p>
                  <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase tracking-widest">GST Liability</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── Main table ── */}
            <div className="glass-container rounded-[3rem] overflow-hidden flex flex-col min-h-[500px]">
               <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                     {activeTab === 'gst'      && <><FileSpreadsheet size={16} className="text-blue-400" />   HSN Summary (Table 12)</>}
                     {activeTab === 'sales'    && <><Users           size={16} className="text-emerald-400" /> Monthly Sales Registry</>}
                     {activeTab === 'invoices' && <><Receipt         size={16} className="text-orange-400" />  Purchase Invoices</>}
                     {activeTab === 'opex'     && <><Wallet          size={16} className="text-purple-400" />  Operational Expenses</>}
                  </h3>
                  <span className="text-[9px] font-black bg-white/10 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest">
                     {activeCount}
                  </span>
               </div>

               <div className="flex-1 overflow-x-auto no-scrollbar">

                  {/* GST / HSN */}
                  {activeTab === 'gst' && (
                     <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                           <tr>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">HSN Code</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Taxable</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tax</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {hsnSummary.map(h => (
                              <tr key={h.hsn} className="hover:bg-white/5 transition-colors">
                                 <td className="px-8 py-6">
                                    <p className="text-xs font-black text-white uppercase">{h.hsn}</p>
                                    <p className="text-[9px] font-bold text-slate-500 truncate max-w-[200px] uppercase">{h.desc}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs font-black text-slate-400">{h.qty}</td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{fmt(h.taxable)}</td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-blue-400">{fmt(h.tax)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

                  {/* Sales */}
                  {activeTab === 'sales' && (
                     <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                           <tr>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer / Doc</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {monthSales.map(s => (
                              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                 <td className="px-8 py-6">
                                    <p className="text-xs font-black text-white uppercase">{s.customerName}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.docNumber} • {s.type.replace('_',' ')}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs font-black text-slate-400">
                                    {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                 </td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{fmt(s.totalAmount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

                  {/* Purchase Invoices */}
                  {activeTab === 'invoices' && (
                     <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                           <tr>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor / Doc</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tax</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {monthInvoices.map(e => (
                              <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                 <td className="px-8 py-6">
                                    <p className="text-xs font-black text-white uppercase">{e.vendorName}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{e.docNumber || '—'} {e.vendorGst ? `• ${e.vendorGst}` : ''}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs font-black text-slate-400">
                                    {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                 </td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-blue-400">{fmt(e.taxAmount)}</td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{fmt(e.totalAmount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

                  {/* Opex */}
                  {activeTab === 'opex' && (
                     <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                           <tr>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {monthOpex.map(e => (
                              <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                 <td className="px-8 py-6">
                                    <p className="text-xs font-black text-white uppercase">{e.vendorName}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{e.createdBy}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs font-black text-slate-400">
                                    {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                 </td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{fmt(e.totalAmount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

                  {activeIsEmpty && (
                     <div className="py-32 text-center">
                        <Info size={48} className="mx-auto text-white/10 mb-6" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Vault Idle: No Entries Found</p>
                     </div>
                  )}
               </div>
            </div>

            {/* ── Audit Analytics sidebar ── */}
            <div className="space-y-6">
               <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[3rem] flex items-start gap-6 backdrop-blur-xl">
                  <div className="bg-blue-600/20 p-4 rounded-2xl text-blue-400 shrink-0">
                     <PieChart size={24} />
                  </div>
                  <div>
                     <h4 className="text-sm font-black text-white uppercase tracking-tight">Intelligence Feed</h4>
                     <p className="text-[11px] font-medium text-slate-400 mt-2 leading-relaxed">
                        B2B transactions represent {(stats.b2b.length / (stats.b2b.length + stats.b2c.length + 0.1) * 100).toFixed(0)}% of outward volume.
                        Purchase invoices: {monthInvoices.length} records · Opex entries: {monthOpex.length} records.
                     </p>
                  </div>
               </div>

               <div className="glass-container p-8 rounded-[3rem] border border-white/5">
                  <div className="flex items-center justify-between mb-8">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Analytics</h4>
                     <span className="bg-blue-600/20 text-blue-400 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-500/30">Verified</span>
                  </div>
                  <div className="space-y-5">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-blue-500" />
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">B2B Registered</span>
                        </div>
                        <span className="text-xs font-black text-white">{stats.b2b.length}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-emerald-500" />
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">B2C Consumers</span>
                        </div>
                        <span className="text-xs font-black text-white">{stats.b2c.length}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-orange-500" />
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">Purchase Invoices</span>
                        </div>
                        <span className="text-xs font-black text-white">{monthInvoices.length}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-purple-500" />
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">Opex Entries</span>
                        </div>
                        <span className="text-xs font-black text-white">{monthOpex.length}</span>
                     </div>
                     <div className="h-px bg-white/5 my-2" />
                     <div className="flex justify-between items-center pt-2">
                        <span className="text-xs font-black text-white uppercase tracking-widest">Net Revenue</span>
                        <span className="text-lg font-black text-blue-400">{fmt(stats.totalSales)}</span>
                     </div>
                  </div>

                  <div className="mt-8 space-y-3">
                     {activeTab === 'gst' && (<>
                        <button onClick={exportGSTR1} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
                           <Download size={16} /> Export GSTR-1 CSV
                        </button>
                        <button onClick={() => exportSalesInvoicesToExcel(monthSales, `GSTR1_${selectedMonth}`)} disabled={!monthSales.length}
                           className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                           <FileSpreadsheet size={16} /> Invoice Excel (3 Sheets)
                        </button>
                     </>)}
                     {activeTab === 'sales' && (<>
                        <button onClick={exportSalesCSV} className="w-full bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-3">
                           <ArrowDownToLine size={16} /> Download Sales CSV
                        </button>
                        <button onClick={() => exportSalesInvoicesToExcel(monthSales, `Sales_${selectedMonth}`)} disabled={!monthSales.length}
                           className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                           <FileSpreadsheet size={16} /> Sales Excel (3 Sheets)
                        </button>
                     </>)}
                     {activeTab === 'invoices' && (<>
                        <button onClick={exportInvoicesCSV} className="w-full bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-3">
                           <ArrowDownToLine size={16} /> Download Invoices CSV
                        </button>
                        <button onClick={() => exportExpensesToExcel(monthInvoices, `Purchase_Invoices_${selectedMonth}`)} disabled={!monthInvoices.length}
                           className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                           <FileSpreadsheet size={16} /> Invoices Excel (2 Sheets)
                        </button>
                     </>)}
                     {activeTab === 'opex' && (<>
                        <button onClick={exportOpexCSV} className="w-full bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-3">
                           <ArrowDownToLine size={16} /> Download Opex CSV
                        </button>
                        <button onClick={() => exportExpensesToExcel(monthOpex, `Opex_${selectedMonth}`)} disabled={!monthOpex.length}
                           className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                           <FileSpreadsheet size={16} /> Opex Excel (2 Sheets)
                        </button>
                     </>)}
                     {/* Full ledger — always visible */}
                     <button onClick={() => exportFullLedgerToExcel(sales, monthAllExpenses, selectedMonth)}
                        disabled={!monthSales.length && !monthAllExpenses.length}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                        <FileSpreadsheet size={16} /> Full Ledger + P&amp;L (Excel)
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Reports;
