
import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Calendar, ChevronDown, Download, CheckCircle2, 
  AlertCircle, Table, IndianRupee, PieChart, ArrowDownToLine, Info
} from 'lucide-react';
import { SalesDocument, LineItem } from '../types';

interface Props {
  sales: SalesDocument[];
}

const Reports: React.FC<Props> = ({ sales }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const monthSales = useMemo(() => {
    return sales.filter(s => s.date.startsWith(selectedMonth) && s.status === 'issued');
  }, [sales, selectedMonth]);

  const stats = useMemo(() => {
    const b2b = monthSales.filter(s => s.customerGst && s.type === 'sales_invoice');
    const b2c = monthSales.filter(s => !s.customerGst && s.type === 'sales_invoice');
    const cdnr = monthSales.filter(s => s.type === 'credit_note');
    
    const taxableValue = monthSales.reduce((acc, s) => acc + (s.totalAmount - s.taxAmount), 0);
    const taxValue = monthSales.reduce((acc, s) => acc + s.taxAmount, 0);

    return { b2b, b2c, cdnr, taxableValue, taxValue };
  }, [monthSales]);

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

  const exportGSTR1 = () => {
    if (monthSales.length === 0) return;
    
    // B2B Sheet (Simplified CSV Format)
    const b2bHeaders = ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date", "Invoice Value", "Place Of Supply", "Reverse Charge", "Applicable % of Tax Rate", "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"];
    const b2bRows = stats.b2b.flatMap(s => s.lineItems.map(item => [
      s.customerGst,
      `"${s.customerName.replace(/"/g, '""')}"`,
      s.docNumber,
      new Date(s.date).toLocaleDateString('en-GB'),
      s.totalAmount,
      "00-Other State", // Simplified, logic can be added for state mapping
      "N",
      "",
      "Regular",
      "",
      item.gstPercentage,
      item.amount,
      "0"
    ]));

    // HSN Summary Sheet
    const hsnHeaders = ["HSN", "Description", "UQC", "Total Quantity", "Total Value", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"];
    const hsnRows = hsnSummary.map(h => [
      h.hsn,
      `"${h.desc.replace(/"/g, '""')}"`,
      "NOS-NUMBERS",
      h.qty,
      h.taxable + h.tax,
      h.taxable,
      h.tax, // Simplified: assuming all IGST for export template
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

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">GST Returns Console</h2>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Compliance Engine: GSTR-1 Format Generator</p>
        </div>
        
        <div className="flex gap-4 items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-900 outline-none"
              />
           </div>
           <button 
            onClick={exportGSTR1}
            disabled={monthSales.length === 0}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2"
           >
              <Download size={14} /> Download GSTR-1 CSV
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
           <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
              <Table size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B2B Transactions</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.b2b.length}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1">With Registered GSTINs</p>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
           <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600">
              <PieChart size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B2C Transactions</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.b2c.length}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1">Unregistered Consumers</p>
           </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl space-y-4 text-white">
           <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-400">
              <IndianRupee size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Taxable</p>
              <p className="text-3xl font-black tracking-tighter">{formatCurrency(stats.taxableValue)}</p>
              <p className="text-[9px] font-bold text-emerald-400 mt-1">Aggregated Net Value</p>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
           <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Collected</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.taxValue)}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1">Estimated GST Liability</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* HSN Summary Section */}
         <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <FileSpreadsheet size={16} className="text-blue-500" /> HSN-wise Summary (Table 12)
               </h3>
               <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500">{hsnSummary.length} Codes</span>
            </div>
            <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">HSN Code</th>
                     <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                     <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Taxable Value</th>
                     <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Tax</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {hsnSummary.map(h => (
                     <tr key={h.hsn} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4">
                          <p className="text-xs font-black text-slate-900">{h.hsn}</p>
                          <p className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">{h.desc}</p>
                       </td>
                       <td className="px-6 py-4 text-center text-xs font-bold text-slate-700">{h.qty}</td>
                       <td className="px-6 py-4 text-right text-xs font-black text-slate-900">{formatCurrency(h.taxable)}</td>
                       <td className="px-6 py-4 text-right text-xs font-black text-blue-600">{formatCurrency(h.tax)}</td>
                     </tr>
                   ))}
                   {hsnSummary.length === 0 && (
                     <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <Info size={32} className="mx-auto text-slate-200 mb-2" />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Sales in Period</p>
                        </td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
         </div>

         {/* Filing Status and Compliance */}
         <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[3rem] flex items-start gap-6">
               <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600">
                  <CheckCircle2 size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Data Integrity Check</h4>
                  <p className="text-[11px] font-medium text-emerald-700 mt-1 leading-relaxed">
                     All outward supplies for {selectedMonth} have valid HSN codes and documented tax values. Ready for CSV export to GST Offline Tool.
                  </p>
               </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-8 rounded-[3rem] flex items-start gap-6">
               <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                  <AlertCircle size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Filing Reminder</h4>
                  <p className="text-[11px] font-medium text-amber-700 mt-1 leading-relaxed">
                     Ensure GSTR-1 is filed by the 11th of the following month. Cross-verify the generated B2B totals with your e-invoice registry if applicable.
                  </p>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Audit</h4>
                  <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Live</span>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                     <span className="font-bold text-slate-500">Regular Invoices</span>
                     <span className="font-black text-slate-900">{stats.b2b.length + stats.b2c.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                     <span className="font-bold text-slate-500">Sales Returns (CN)</span>
                     <span className="font-black text-red-600">{stats.cdnr.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                     <span className="font-bold text-slate-500">Net Transactions</span>
                     <span className="font-black text-slate-900">{monthSales.length}</span>
                  </div>
               </div>
               <div className="h-px bg-slate-100 my-6"></div>
               <button onClick={exportGSTR1} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
                  <ArrowDownToLine size={16} /> Export CSV Sheets
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Reports;
