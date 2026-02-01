
import React, { useState, useMemo } from 'react';
import {
   FileSpreadsheet, Calendar, ChevronDown, Download, CheckCircle2,
   AlertCircle, Table, IndianRupee, PieChart, ArrowDownToLine, Info,
   TrendingUp, TrendingDown, Users, Package, ShoppingCart, Wallet
} from 'lucide-react';
import { SalesDocument, ExpenseData, LineItem } from '../types';

interface Props {
   sales: SalesDocument[];
   expenses: ExpenseData[];
}

type ReportTab = 'gst' | 'sales' | 'expenses';

const Reports: React.FC<Props> = ({ sales, expenses }) => {
   const [activeTab, setActiveTab] = useState<ReportTab>('sales');
   const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

   const monthSales = useMemo(() => {
      return sales.filter(s => s.date.startsWith(selectedMonth) && s.status === 'issued');
   }, [sales, selectedMonth]);

   const monthExpenses = useMemo(() => {
      return expenses.filter(e => e.date.startsWith(selectedMonth));
   }, [expenses, selectedMonth]);

   const stats = useMemo(() => {
      const b2b = monthSales.filter(s => s.customerGst && s.type === 'sales_invoice');
      const b2c = monthSales.filter(s => !s.customerGst && s.type === 'sales_invoice');
      const cdnr = monthSales.filter(s => s.type === 'credit_note');

      const taxableValue = monthSales.reduce((acc, s) => acc + (s.totalAmount - s.taxAmount), 0);
      const taxValue = monthSales.reduce((acc, s) => acc + s.taxAmount, 0);

      const totalSales = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
      const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.totalAmount, 0);

      return { b2b, b2c, cdnr, taxableValue, taxValue, totalSales, totalExpenses };
   }, [monthSales, monthExpenses]);

   const hsnSummary = useMemo(() => {
      const summary: Record<string, { desc: string, qty: number, taxable: number, tax: number }> = {};

      monthSales.forEach(s => {
         s.lineItems.forEach(item => {
            const code = item.hsnCode || 'N/A';
            if (!summary[code]) {
               summary[code] = { desc: item.description, qty: 0, taxable: 0, tax: 0 };
            }
            const itemTaxable = (item.amount || 0);
            const itemTax = itemTaxable * ((item.gstPercentage || 18) / 100);

            summary[code].qty += (item.quantity || 1);
            summary[code].taxable += itemTaxable;
            summary[code].tax += itemTax;
         });
      });

      return Object.entries(summary).map(([code, data]) => ({ hsn: code, ...data }));
   }, [monthSales]);

   const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
         style: 'currency',
         currency: 'INR',
      }).format(amount);
   };

   const exportCSV = (data: any[], filename: string) => {
      if (data.length === 0) return;
      const headers = Object.keys(data[0]);
      const csvContent = [
         headers.join(","),
         ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
   };

   const exportGSTR1 = () => {
      if (monthSales.length === 0) return;

      const b2bHeaders = ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date", "Invoice Value", "Place Of Supply", "Reverse Charge", "Applicable % of Tax Rate", "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"];
      const b2bRows = stats.b2b.flatMap(s => s.lineItems.map(item => [
         s.customerGst,
         `"${s.customerName.replace(/"/g, '""')}"`,
         s.docNumber,
         new Date(s.date).toLocaleDateString('en-GB'),
         s.totalAmount,
         "00-Other State",
         "N",
         "",
         "Regular",
         "",
         item.gstPercentage,
         item.amount,
         "0"
      ]));

      const hsnHeaders = ["HSN", "Description", "UQC", "Total Quantity", "Total Value", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"];
      const hsnRows = hsnSummary.map(h => [
         h.hsn,
         `"${h.desc.replace(/"/g, '""')}"`,
         "NOS-NUMBERS",
         h.qty,
         (h.taxable + h.tax).toFixed(2),
         h.taxable.toFixed(2),
         h.tax.toFixed(2),
         0,
         0,
         0
      ]);

      const csvContent = [
         "B2B DATA",
         b2bHeaders.join(","),
         ...b2bRows.map(row => row.join(",")),
         "",
         "HSN SUMMARY DATA",
         hsnHeaders.join(","),
         ...hsnRows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GSTR1_Report_${selectedMonth}.csv`;
      link.click();
      URL.revokeObjectURL(url);
   };

   const exportSalesReport = () => {
      const data = monthSales.map(s => ({
         Date: s.date,
         Number: s.docNumber,
         Customer: s.customerName,
         GSTIN: s.customerGst || 'B2C',
         Type: s.type,
         Status: s.status,
         Taxable: (s.totalAmount - s.taxAmount).toFixed(2),
         Tax: s.taxAmount.toFixed(2),
         Total: s.totalAmount.toFixed(2)
      }));
      exportCSV(data, `Sales_Report_${selectedMonth}.csv`);
   };

   const exportExpenseReport = () => {
      const data = monthExpenses.map(e => ({
         Date: e.date,
         Vendor: e.vendorName,
         Category: e.type,
         Amount: e.totalAmount,
         CreatedBy: e.createdBy
      }));
      exportCSV(data, `Expense_Report_${selectedMonth}.csv`);
   };

   return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Intelligence & Reports</h2>
               <p className="text-blue-400 text-[10px] font-black mt-2 uppercase tracking-[0.4em]">Neural Audit: Financial Insights Engine</p>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-slate-900/50 p-3 rounded-3xl border border-white/5 backdrop-blur-xl">
               <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                  <Calendar size={18} className="text-blue-400" />
                  <input
                     type="month"
                     value={selectedMonth}
                     onChange={e => setSelectedMonth(e.target.value)}
                     className="bg-transparent text-xs font-black uppercase tracking-widest text-white outline-none"
                  />
               </div>

               <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button
                     onClick={() => setActiveTab('sales')}
                     className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                     Sales
                  </button>
                  <button
                     onClick={() => setActiveTab('expenses')}
                     className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'expenses' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                     Expenses
                  </button>
                  <button
                     onClick={() => setActiveTab('gst')}
                     className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'gst' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                     GST
                  </button>
               </div>

               {activeTab === 'gst' && (
                  <button
                     onClick={exportGSTR1}
                     disabled={monthSales.length === 0}
                     className="bg-red-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-3"
                  >
                     <Download size={16} /> GSTR-1
                  </button>
               )}
               {activeTab === 'sales' && (
                  <button
                     onClick={exportSalesReport}
                     disabled={monthSales.length === 0}
                     className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-3"
                  >
                     <Download size={16} /> Sales CSV
                  </button>
               )}
               {activeTab === 'expenses' && (
                  <button
                     onClick={exportExpenseReport}
                     disabled={monthExpenses.length === 0}
                     className="bg-orange-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center gap-3"
                  >
                     <Download size={16} /> Expense CSV
                  </button>
               )}
            </div>
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-container p-8 rounded-[3rem] space-y-4">
               <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <TrendingUp size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoiced Revenue</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(stats.totalSales)}</p>
                  <p className="text-[9px] font-bold text-blue-400 mt-1 uppercase tracking-widest">{monthSales.length} Documents</p>
               </div>
            </div>
            <div className="glass-container p-8 rounded-[3rem] space-y-4">
               <div className="bg-orange-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <TrendingDown size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Outflow</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(stats.totalExpenses)}</p>
                  <p className="text-[9px] font-bold text-orange-400 mt-1 uppercase tracking-widest">{monthExpenses.length} Records</p>
               </div>
            </div>
            <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl shadow-blue-600/20 space-y-4 text-white">
               <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                  <IndianRupee size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Monthly Taxable</p>
                  <p className="text-3xl font-black tracking-tighter">{formatCurrency(stats.taxableValue)}</p>
                  <p className="text-[9px] font-bold text-blue-100 mt-1 uppercase tracking-widest">Net Value before Tax</p>
               </div>
            </div>
            <div className="glass-container p-8 rounded-[3rem] space-y-4">
               <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Provision</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(stats.taxValue)}</p>
                  <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase tracking-widest">Estimated Liability</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Listing Section */}
            <div className="glass-container rounded-[3rem] overflow-hidden flex flex-col min-h-[500px]">
               <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                     {activeTab === 'gst' && <><FileSpreadsheet size={16} className="text-blue-400" /> HSN Summary (Table 12)</>}
                     {activeTab === 'sales' && <><Users size={16} className="text-emerald-400" /> Monthly Sales Registry</>}
                     {activeTab === 'expenses' && <><Wallet size={16} className="text-orange-400" /> Procurement & Opex</>}
                  </h3>
                  <span className="text-[9px] font-black bg-white/10 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest">
                     {activeTab === 'gst' ? `${hsnSummary.length} Codes` :
                        activeTab === 'sales' ? `${monthSales.length} Entries` : `${monthExpenses.length} Records`}
                  </span>
               </div>
               <div className="flex-1 overflow-x-auto no-scrollbar">
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
                                    <p className="text-xs font-black text-white uppercase tracking-tight">{h.hsn}</p>
                                    <p className="text-[9px] font-bold text-slate-500 truncate max-w-[200px] uppercase">{h.desc}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs font-black text-slate-400">{h.qty}</td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{formatCurrency(h.taxable)}</td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-blue-400">{formatCurrency(h.tax)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

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
                                    <p className="text-xs font-black text-white uppercase tracking-tight">{s.customerName}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.docNumber} • {s.type.replace('_', ' ')}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs font-black text-slate-400">
                                    {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                 </td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{formatCurrency(s.totalAmount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

                  {activeTab === 'expenses' && (
                     <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                           <tr>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                              <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {monthExpenses.map(e => (
                              <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                 <td className="px-8 py-6">
                                    <p className="text-xs font-black text-white uppercase tracking-tight">{e.vendorName}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(e.date).toLocaleDateString()}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    <span className="text-[8px] font-black bg-white/5 px-2 py-1 rounded text-slate-400 uppercase tracking-widest border border-white/5">
                                       {e.type}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6 text-right text-xs font-black text-white">{formatCurrency(e.totalAmount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}

                  {((activeTab === 'gst' && hsnSummary.length === 0) ||
                     (activeTab === 'sales' && monthSales.length === 0) ||
                     (activeTab === 'expenses' && monthExpenses.length === 0)) && (
                        <div className="py-32 text-center">
                           <Info size={48} className="mx-auto text-white/10 mb-6" />
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Vault Idle: No Entries Found</p>
                        </div>
                     )}
               </div>
            </div>

            {/* Compliance and Audit Insights */}
            <div className="space-y-6">
               <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[3rem] flex items-start gap-6 backdrop-blur-xl">
                  <div className="bg-blue-600/20 p-4 rounded-2xl text-blue-400">
                     <PieChart size={24} />
                  </div>
                  <div>
                     <h4 className="text-sm font-black text-white uppercase tracking-tight">Intelligence Feed</h4>
                     <p className="text-[11px] font-medium text-slate-400 mt-2 leading-relaxed">
                        Analyzing outward flow: B2B transactions represent {(stats.b2b.length / (stats.b2b.length + stats.b2c.length + 0.1) * 100).toFixed(0)}% of your volume this month.
                        Total tax provision is calculated based on indexed HSN codes found in your neural ledger.
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
                           <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">B2B Registered</span>
                        </div>
                        <span className="text-xs font-black text-white">{stats.b2b.length}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">B2C Consumers</span>
                        </div>
                        <span className="text-xs font-black text-white">{stats.b2c.length}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                           <span className="text-xs font-black text-slate-400 uppercase tracking-tight">Total Documents</span>
                        </div>
                        <span className="text-xs font-black text-white">{monthSales.length + monthExpenses.length}</span>
                     </div>
                     <div className="h-px bg-white/5 my-2"></div>
                     <div className="flex justify-between items-center pt-2">
                        <span className="text-xs font-black text-white uppercase tracking-widest">Net Revenue</span>
                        <span className="text-lg font-black text-blue-400">{formatCurrency(stats.totalSales)}</span>
                     </div>
                  </div>
                  <div className="mt-8">
                     {activeTab === 'gst' && (
                        <button onClick={exportGSTR1} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
                           <Download size={16} /> Export GSTR-1 Ledger
                        </button>
                     )}
                     {activeTab === 'sales' && (
                        <button onClick={exportSalesReport} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                           <ArrowDownToLine size={16} /> Download Sales Log
                        </button>
                     )}
                     {activeTab === 'expenses' && (
                        <button onClick={exportExpenseReport} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3">
                           <ArrowDownToLine size={16} /> Download Expense Log
                        </button>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Reports;
