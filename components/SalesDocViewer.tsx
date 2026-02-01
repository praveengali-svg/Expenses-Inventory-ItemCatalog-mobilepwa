
import React from 'react';
import { X, Printer, DownloadCloud, FileText, IndianRupee, ShieldCheck, Tag, Calendar, MapPin, Truck, Landmark, Edit3 } from 'lucide-react';
import { SalesDocument, SalesDocType } from '../types';

interface Props {
   doc: SalesDocument;
   onClose: () => void;
   onEdit?: (doc: SalesDocument) => void;
}

const SalesDocViewer: React.FC<Props> = ({ doc, onClose, onEdit }) => {
   const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
         style: 'currency',
         currency: 'INR',
      }).format(amount);
   };

   const docLabels: Record<SalesDocType, string> = {
      sales_invoice: 'Tax Invoice',
      credit_note: 'Credit Note',
      quotation: 'Quotation',
      proforma: 'Proforma Invoice',
      delivery_challan: 'Delivery Challan'
   };

   const isIntrastate = doc.customerState === "Karnataka";
   const cgstAmount = doc.taxAmount / 2;
   const sgstAmount = doc.taxAmount / 2;
   const igstAmount = doc.taxAmount;

   return (
      <div className="fixed inset-0 z-[250] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-8 overflow-hidden">
         <div className="bg-white w-full h-full max-w-5xl md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500">

            {/* Toolbar */}
            <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
               <div className="flex items-center gap-4">
                  <div className="bg-[#1B4F72] p-2 rounded-xl text-white">
                     <FileText size={18} />
                  </div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">{docLabels[doc.type]} Viewer</h2>
               </div>
               <div className="flex items-center gap-3">
                  {onEdit && (
                     <button
                        onClick={() => onEdit(doc)}
                        className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-orange-600 transition-all flex items-center gap-2 font-black text-[9px] uppercase tracking-widest shadow-sm"
                     >
                        <Edit3 size={14} /> Edit Data
                     </button>
                  )}
                  <button onClick={() => window.print()} className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2 font-black text-[9px] uppercase tracking-widest shadow-sm">
                     <Printer size={14} /> Print Document
                  </button>
                  <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400 transition-all"><X size={18} /></button>
               </div>
            </div>

            {/* Paper Interface */}
            <div className="flex-1 overflow-y-auto p-2 md:p-6 custom-scrollbar bg-slate-100/30 print:bg-white print:p-0">
               <div className="bg-white shadow-2xl mx-auto w-full max-w-[850px] p-6 md:p-10 print:shadow-none print:max-w-none min-h-[1100px] flex flex-col relative border border-slate-100 print:border-none">

                  {/* Aesthetic Accents */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1B4F72] via-[#E67E22] to-[#1B4F72]"></div>

                  {/* Document Header - Repositioned Title */}
                  <div className="text-center mb-6 mt-2">
                     <h1 className="text-base font-black text-[#1B4F72] tracking-[0.2em] uppercase">{docLabels[doc.type]}</h1>
                  </div>

                  <div className="flex justify-between items-start mb-6">
                     <div className="flex gap-4">
                        <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-50 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                           <img src="https://lh3.googleusercontent.com/d/1snOc6lVZIwKa-bnUR39Nxr6DelKUjRmQ" alt="Voltx Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                           <h4 className="font-black text-[#1B4F72] text-lg leading-tight">Voltx EV Private Limited</h4>
                           <p className="text-[9px] font-bold text-slate-600 leading-tight uppercase">
                              88/2 Seegahalli Village, Ashram Road,<br />
                              Kadugodi Post, Bengaluru 560067<br />
                              Email: mkt@voltxev.com | www.voltxev.com
                           </p>
                           <span className="text-[9px] font-black text-[#1B4F72] bg-blue-100/50 px-2 py-0.5 rounded inline-block w-fit mt-1">GSTIN: 29AAICV1554B1ZE</span>
                        </div>
                     </div>
                     <div className="text-right flex flex-col gap-2">
                        <div className="bg-[#1B4F72] text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest inline-block">
                           Doc # {doc.docNumber}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Invoice Date:</span>
                           <span className="font-black text-[#1B4F72] text-[10px]">{new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                        {doc.poNumber && (
                           <div className="pt-1 mt-1 border-t border-slate-50 space-y-1">
                              <div className="flex items-center justify-end gap-2">
                                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PO Number:</span>
                                 <span className="text-[10px] font-black text-[#1B4F72] uppercase tracking-tight">{doc.poNumber}</span>
                              </div>
                              {doc.poDate && (
                                 <div className="flex items-center justify-end gap-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PO Date:</span>
                                    <span className="text-[10px] font-black text-slate-700">{new Date(doc.poDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Addresses side by side */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                     <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 pb-1 border-b border-blue-100 flex items-center gap-2">
                           <MapPin size={8} /> Bill To (Billing Address)
                        </p>
                        <div className="space-y-1">
                           <h4 className="font-black text-slate-900 text-xs leading-tight">{doc.customerName}</h4>
                           <p className="text-[9px] font-medium text-slate-500 leading-tight uppercase">
                              {doc.customerAddress || 'Address not provided'}<br />
                              {doc.customerState && <span className="font-black text-slate-700">State: {doc.customerState}</span>}
                           </p>
                           {doc.customerGst && (
                              <div className="pt-1">
                                 <span className="text-[9px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded uppercase border border-slate-200 shadow-sm">GSTIN: {doc.customerGst}</span>
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 pb-1 border-b border-blue-100 flex items-center gap-2">
                           <Truck size={8} /> Ship To (Shipping Address)
                        </p>
                        <div className="space-y-1">
                           <h4 className="font-black text-slate-900 text-xs leading-tight">{doc.customerName}</h4>
                           <p className="text-[9px] font-medium text-slate-500 leading-tight uppercase whitespace-pre-wrap">
                              {doc.shippingAddress || doc.customerAddress || 'Same as Billing Address'}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Line Items */}
                  <div className="flex-1">
                     <table className="w-full text-left mb-6">
                        <thead className="bg-[#1B4F72] text-white">
                           <tr>
                              <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-tl-xl">Description</th>
                              <th className="py-2 text-[8px] font-black uppercase tracking-widest text-center">HSN/SAC</th>
                              <th className="py-2 text-[8px] font-black uppercase tracking-widest text-center">Qty</th>
                              <th className="py-2 text-[8px] font-black uppercase tracking-widest text-right">Rate</th>
                              <th className="py-2 text-[8px] font-black uppercase tracking-widest text-center">GST %</th>
                              <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-right rounded-tr-xl">Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100">
                           {doc.lineItems.map((item, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                 <td className="px-4 py-3">
                                    <p className="font-black text-[#1B4F72] text-xs uppercase tracking-tight">{item.description}</p>
                                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                                 </td>
                                 <td className="py-3 text-center text-[9px] font-black text-slate-500">{item.hsnCode || '-'}</td>
                                 <td className="py-3 text-center text-xs font-black text-slate-900">
                                    {item.quantity} <span className="text-[8px] text-slate-400 font-bold ml-0.5">{item.unitOfMeasure || 'PCS'}</span>
                                 </td>
                                 <td className="py-3 text-right text-xs font-bold text-slate-700">{formatCurrency(item.rate || 0)}</td>
                                 <td className="py-3 text-center text-[10px] font-black text-slate-600">{item.gstPercentage ? `${item.gstPercentage}%` : '-'}</td>
                                 <td className="px-4 py-3 text-right font-black text-[#1B4F72] text-xs">{formatCurrency(item.amount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Footer Summary & Terms */}
                  <div className="mt-auto pt-6 border-t border-blue-900/10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div>
                              <p className="text-[8px] font-black text-[#1B4F72] uppercase tracking-widest mb-2 flex items-center gap-2">
                                 <Landmark size={12} className="text-[#E67E22]" /> Payment Details
                              </p>
                              <div className="text-[9px] font-medium text-slate-600 leading-tight bg-slate-50 p-4 rounded-2xl border border-slate-100 border-l-2 border-l-[#E67E22] shadow-sm">
                                 <p className="font-black text-[#1B4F72] mb-1">Voltx EV Private Limited</p>
                                 <p className="mb-0.5"><span className="text-slate-400 uppercase text-[7px] font-black inline-block w-16">Bank:</span> IDFC FIRST Bank</p>
                                 <p className="mb-0.5"><span className="text-slate-400 uppercase text-[7px] font-black inline-block w-16">A/C No:</span> 10126133853</p>
                                 <p className="mb-0.5"><span className="text-slate-400 uppercase text-[7px] font-black inline-block w-16">IFSC:</span> IDFB0080176</p>
                                 <p><span className="text-slate-400 uppercase text-[7px] font-black inline-block w-16">Branch:</span> Cunningham Road</p>
                                 <div className="mt-2 pt-2 border-t border-slate-100 text-[7px] italic text-slate-400">
                                    50% Advance and 50% before dispatch.
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="bg-slate-50 p-4 rounded-3xl space-y-2 shadow-inner">
                              <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest">
                                 <span>Taxable Value</span>
                                 <span className="text-slate-900">{formatCurrency(doc.totalAmount - doc.taxAmount)}</span>
                              </div>

                              {isIntrastate ? (
                                 <>
                                    <div className="flex justify-between text-[8px] font-black uppercase text-[#E67E22] tracking-widest">
                                       <span>CGST (Agg.)</span>
                                       <span className="font-black">{formatCurrency(cgstAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-[8px] font-black uppercase text-[#E67E22] tracking-widest">
                                       <span>SGST (Agg.)</span>
                                       <span className="font-black">{formatCurrency(sgstAmount)}</span>
                                    </div>
                                 </>
                              ) : (
                                 <div className="flex justify-between text-[8px] font-black uppercase text-[#E67E22] tracking-widest">
                                    <span>IGST (Agg.)</span>
                                    <span className="font-black">{formatCurrency(igstAmount)}</span>
                                 </div>
                              )}

                              <div className="pt-2 mt-1 border-t border-slate-200 flex flex-col gap-2">
                                 <div className="flex justify-between items-center">
                                    <div>
                                       <p className="text-[8px] font-black text-[#1B4F72] uppercase tracking-[0.2em] mb-0.5">Invoice Total</p>
                                       <p className="text-xl font-black text-[#1B4F72] tracking-tighter leading-none">{formatCurrency(doc.totalAmount)}</p>
                                    </div>
                                    <div className="bg-[#1B4F72] p-2.5 rounded-2xl text-white shadow-lg">
                                       <IndianRupee size={18} />
                                    </div>
                                 </div>

                                 <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Amount Received</p>
                                    <p className="text-xs font-black text-emerald-700">{formatCurrency(doc.amountPaid || 0)}</p>
                                 </div>

                                 <div className="flex justify-between items-center pt-1">
                                    <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Balance Due</p>
                                    <p className="text-xs font-black text-orange-700">{formatCurrency(doc.balanceAmount || (doc.totalAmount - (doc.amountPaid || 0)))}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right px-4">
                              <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest tracking-[0.4em]">FOR VOLTX EV PRIVATE LIMITED</p>
                              <div className="h-8 flex items-center justify-end">
                                 <span className="text-[8px] font-serif italic text-blue-200 uppercase font-bold tracking-widest">Digital Signature Secure</span>
                              </div>
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">AUTHORISED SIGNATORY</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-50 text-center">
                     <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest tracking-[0.6em]">VOLTX EV • MSME UDYAM-KR-03-0191672 • BENGALURU, INDIA</p>
                  </div>
               </div>
            </div>
         </div>
         <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:max-w-none { max-width: none !important; }
          .custom-scrollbar { overflow: visible !important; }
        }
      `}</style>
      </div>
   );
};

export default SalesDocViewer;
