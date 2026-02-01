
import React, { useMemo, useState, useEffect } from 'react';
import { X, FileText, Calendar, Printer, Maximize2, DownloadCloud, CheckCircle2, ReceiptText, Edit3, Save, RotateCcw, Plus, Trash2, Tag, Box, Link, PlusCircle, AlertTriangle, Truck, Sparkles, RefreshCw, FileDown } from 'lucide-react';
import { ExpenseData, ExpenseCategory, LineItem, CatalogItem } from '../types';
import { storageService } from '../services/storage';

interface Props {
  expense: ExpenseData;
  onClose: () => void;
  onUpdate?: (updated: ExpenseData) => void;
}

const ReceiptViewer: React.FC<Props> = ({ expense, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState<ExpenseData>({ ...expense });
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseData[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState<{ idx: number, name: string } | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);

  const categories: ExpenseCategory[] = ["Parts", "Product", "Raw Materials", "Consumables", "Service", "Other", "Purchase", "Courier", "Transportation", "Porter"];
  const uomOptions = ["PCS", "SET", "PAIR", "KGS", "MTR", "NOS", "BOX", "PKT"];

  useEffect(() => {
    storageService.getCatalog().then(setCatalog);
    storageService.getExpenses().then(setAllExpenses);
  }, []);

  const uniqueVendors = useMemo(() => {
    const map = new Map();
    allExpenses.forEach(e => {
      if (!map.has(e.vendorName)) {
        map.set(e.vendorName, { name: e.vendorName });
      }
    });
    return Array.from(map.values());
  }, [allExpenses]);

  const vendorSuggestions = useMemo(() => {
    if (!vendorSearchQuery || vendorSearchQuery.length < 2) return [];
    return uniqueVendors.filter(v =>
      v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [uniqueVendors, vendorSearchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const isPdf = expense.imageUrl?.includes('application/pdf');

  const blobUrl = useMemo(() => {
    if (!expense.imageUrl) return null;
    try {
      const parts = expense.imageUrl.split(',');
      if (parts.length < 2) return expense.imageUrl;
      const mime = parts[0].match(/:(.*?);/)?.[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      return expense.imageUrl;
    }
  }, [expense.imageUrl]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = expense.fileName || 'finscan_audit_file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsPdf = () => {
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      // Branding Header
      doc.setFontSize(22);
      doc.setTextColor(27, 79, 114); // Voltx Blue
      doc.text("Voltx EV Logistics Vault", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Digital Audit Statement • ${new Date().toLocaleDateString()}`, 14, 28);

      // Divider
      doc.setDrawColor(200);
      doc.line(14, 32, 196, 32);

      // Details Table
      const docTypeLabel = expense.type.replace('_', ' ').toUpperCase();
      const details = [
        ["Document Type", docTypeLabel, "Date", expense.date],
        ["Vendor Name", expense.vendorName, "Currency", "INR"],
        ["Audit ID", expense.id.slice(0, 8), "Scanned By", expense.createdBy || "System"]
      ];

      (doc as any).autoTable({
        startY: 38,
        head: [],
        body: details,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100], cellWidth: 35 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', textColor: [100], cellWidth: 35 },
          3: { cellWidth: 50 }
        }
      });

      // Itemized Table
      const tableData = expense.lineItems.map(item => [
        item.description,
        item.category || 'Other',
        item.hsnCode || '-',
        `${item.quantity || 1} ${item.unitOfMeasure || 'PCS'}`,
        formatCurrency(item.rate || 0),
        formatCurrency(item.amount || 0)
      ]);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Description", "Category", "HSN/SAC", "Qty", "Rate", "Amount"]],
        body: tableData,
        headStyles: { fillColor: [27, 79, 114], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        foot: [[
          { content: "Grand Total", colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: formatCurrency(expense.totalAmount), styles: { fontStyle: 'bold' } }
        ]],
        footStyles: { fillColor: [240, 240, 240] }
      });

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Generated by Antigravity Neural Audit Engine • Proprietary of Voltx EV Private Limited", 14, finalY);

      doc.save(`Voltx_Audit_${expense.vendorName.replace(/\s+/g, '_')}_${expense.date}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to export PDF. Ensure browser scripts are allowed.");
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const newList = [...(editForm.lineItems || [])];
    newList[index] = { ...newList[index], [field]: value };

    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? Number(value) : (newList[index].quantity || 0);
      const r = field === 'rate' ? Number(value) : (newList[index].rate || 0);
      newList[index].amount = q * r;
    }

    const newTotal = newList.reduce((acc, item) => acc + (item.amount || 0), 0);
    setEditForm({ ...editForm, lineItems: newList, totalAmount: newTotal });
  };

  const addLineItem = () => {
    const newItem: LineItem = { description: '', amount: 0, quantity: 1, rate: 0, category: 'Other', unitOfMeasure: 'PCS' };
    const currentItems = editForm.lineItems || [];
    setEditForm({ ...editForm, lineItems: [...currentItems, newItem] });
  };

  const removeLineItem = (index: number) => {
    const newList = (editForm.lineItems || []).filter((_, i) => i !== index);
    const newTotal = newList.reduce((acc, item) => acc + (item.amount || 0), 0);
    setEditForm({ ...editForm, lineItems: newList, totalAmount: newTotal });
  };

  const handleSave = async () => {
    if (onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(editForm);
      } catch (err) {
        console.error("Update failed in viewer", err);
      } finally {
        setIsUpdating(false);
      }
    }
    setIsEditing(false);
  };

  const handleReceiveItems = async () => {
    const updated = { ...expense, status: 'received' as const };
    if (onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(updated);
      } finally {
        setIsUpdating(false);
      }
    }
    onClose();
  };

  const handleQuickAdd = async (idx: number, name: string, sku: string, hsn: string, category: ExpenseCategory) => {
    const newItem: CatalogItem = {
      id: crypto.randomUUID(),
      sku,
      name,
      description: `Auto-generated from expense: ${expense.vendorName}`,
      hsnCode: hsn,
      gstPercentage: 18,
      basePrice: (editForm.lineItems?.[idx]?.rate) || 0,
      sellingPrice: 0,
      unitOfMeasure: (editForm.lineItems?.[idx]?.unitOfMeasure) || 'PCS',
      category,
      type: 'good'
    };

    await storageService.saveCatalogItem(newItem);
    updateLineItem(idx, 'sku', sku);
    const updatedCatalog = await storageService.getCatalog();
    setCatalog(updatedCatalog);
    setShowQuickAdd(null);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
      <div className="bg-white w-full h-full sm:max-w-7xl sm:rounded-[3.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500">

        <div className="flex-[1.2] bg-slate-200/50 flex flex-col relative overflow-hidden border-r border-slate-100">
          <div className="p-5 bg-white flex justify-between items-center z-20 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-2xl ${isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 truncate max-w-[200px]">{expense.fileName || 'Manual Entry'}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{expense.type.replace('_', ' ')} Document</p>
              </div>
            </div>
            <div className="flex gap-2">
              {expense.imageUrl && <button onClick={handleDownload} className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors"><DownloadCloud size={22} /></button>}
              {expense.imageUrl && <button onClick={() => window.open(blobUrl || '', '_blank')} className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors"><Maximize2 size={22} /></button>}
            </div>
          </div>

          <div className="flex-1 relative overflow-auto p-8 flex items-center justify-center">
            {expense.imageUrl ? (
              isPdf ? (
                <iframe src={`${blobUrl}#toolbar=0`} className="w-full h-full rounded-2xl shadow-lg border border-slate-200" title="Audit PDF" />
              ) : (
                <img src={expense.imageUrl} alt="Scan" className="max-w-full h-auto shadow-2xl rounded-2xl border-[12px] border-white" />
              )
            ) : (
              <div className="text-center p-20 border-4 border-dashed border-slate-300 rounded-[3rem]">
                <ReceiptText size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Visual Attachment</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="p-8 flex justify-between items-center border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className={`${expense.type === 'purchase_order' ? 'bg-orange-600' : 'bg-blue-600'} p-3 rounded-2xl text-white shadow-xl`}>
                <ReceiptText size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ledger Entry</h2>
                {expense.status && <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${expense.status === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{expense.status}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={isUpdating} onClick={() => {
                const nextState = !isEditing;
                setIsEditing(nextState);
                if (nextState) setEditForm({ ...expense });
              }} className={`p-3 rounded-2xl transition-all ${isEditing ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
                {isEditing ? <RotateCcw size={22} /> : <Edit3 size={22} />}
              </button>
              <button disabled={isUpdating} onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all">
                <X size={28} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2 relative">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex justify-between">
                  <span>Vendor / Issuer</span>
                  {isEditing && vendorSuggestions.length > 0 && <span className="text-blue-600 animate-pulse flex items-center gap-1"><Sparkles size={10} /> Recognized</span>}
                </p>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editForm.vendorName || vendorSearchQuery}
                      onChange={(e) => {
                        setVendorSearchQuery(e.target.value);
                        setEditForm({ ...editForm, vendorName: e.target.value });
                        setShowVendorSuggestions(true);
                      }}
                      onFocus={() => setShowVendorSuggestions(true)}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {showVendorSuggestions && vendorSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[300] py-2 overflow-hidden">
                        {vendorSuggestions.map(v => (
                          <button
                            key={v.name}
                            onClick={() => {
                              setEditForm({ ...editForm, vendorName: v.name });
                              setShowVendorSuggestions(false);
                              setVendorSearchQuery("");
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-slate-50 font-black text-xs text-slate-900"
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xl font-black text-slate-900 tracking-tight">{expense.vendorName}</p>
                )}
              </div>
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Date</p>
                {isEditing ? (
                  <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="bg-slate-50 px-4 py-3 rounded-xl font-bold text-slate-700 outline-none" />
                ) : (
                  <p className="text-sm font-bold text-slate-700">{new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Breakdown</p>
                {isEditing && (
                  <button onClick={addLineItem} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                    <Plus size={14} /> Add Item
                  </button>
                )}
              </div>
              <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">SKU Link</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty / UOM</th>
                      <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                      {isEditing && <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(isEditing ? (editForm.lineItems || []) : (expense.lineItems || [])).map((item, idx) => (
                      <tr key={idx} className={`group/row ${item.isStocked ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Description"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={item.hsnCode || ''}
                                  onChange={(e) => updateLineItem(idx, 'hsnCode', e.target.value)}
                                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                                  placeholder="HSN/SAC"
                                />
                                <select
                                  value={item.category || 'Other'}
                                  onChange={(e) => updateLineItem(idx, 'category', e.target.value)}
                                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{item.description}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.hsnCode && <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">HSN: {item.hsnCode}</span>}
                                {item.category && <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase">{item.category}</span>}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {(item.category === 'Parts' || item.category === 'Product') ? (
                            <div className="flex flex-col items-center gap-1">
                              {item.sku ? (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                  <Box size={10} /> {item.sku}
                                  {item.isStocked && <CheckCircle2 size={10} className="text-emerald-500" />}
                                </div>
                              ) : isEditing ? (
                                <select
                                  className="text-[9px] font-black uppercase bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none w-24"
                                  value={item.sku || ""}
                                  onChange={(e) => {
                                    if (e.target.value === "NEW") {
                                      setShowQuickAdd({ idx, name: item.description });
                                    } else {
                                      updateLineItem(idx, 'sku', e.target.value);
                                    }
                                  }}
                                >
                                  <option value="">Link SKU...</option>
                                  {catalog.filter(c => c.category === item.category).map(c => (
                                    <option key={c.sku} value={c.sku}>{c.sku} - {c.name}</option>
                                  ))}
                                  <option value="NEW" className="text-blue-600 font-black">+ Create New</option>
                                </select>
                              ) : (
                                <span className="text-[8px] font-black text-amber-500 uppercase">Unlinked</span>
                              )}
                            </div>
                          ) : <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Indirect</span>}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isEditing ? (
                            <div className="space-y-2 flex flex-col items-center">
                              <input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none" />
                              <select
                                value={item.unitOfMeasure || 'PCS'}
                                onChange={e => updateLineItem(idx, 'unitOfMeasure', e.target.value)}
                                className="text-[10px] font-black bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none uppercase"
                              >
                                {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                              <input type="number" value={item.rate} onChange={(e) => updateLineItem(idx, 'rate', Number(e.target.value))} className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-center outline-none" />
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-black text-slate-900">{item.quantity || 1} {item.unitOfMeasure || 'PCS'}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">@{formatCurrency(item.rate || item.amount)}</p>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-black text-xs text-slate-900">{formatCurrency(item.amount)}</span>
                        </td>
                        {isEditing && (
                          <td className="px-5 py-4 text-right">
                            <button onClick={() => removeLineItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <div className="bg-slate-900 p-6 rounded-[2.5rem] flex justify-between items-center shadow-2xl">
                <div>
                  <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest mb-1">Grand Total (INR)</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(editForm.totalAmount)}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 flex gap-4">
            {expense.type === 'purchase_order' && expense.status === 'ordered' && (
              <button disabled={isUpdating} onClick={handleReceiveItems} className="flex-1 bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                {isUpdating ? <RefreshCw className="animate-spin" size={20} /> : <Truck size={20} />}
                Receive Items
              </button>
            )}

            <button
              onClick={exportAsPdf}
              className="flex-1 bg-white border border-slate-200 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
            >
              <FileDown size={20} /> Export PDF
            </button>

            {isEditing ? (
              <button disabled={isUpdating} onClick={handleSave} className="flex-[1.5] bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                {isUpdating ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                Confirm & Update
              </button>
            ) : (
              <button disabled={isUpdating} onClick={() => window.print()} className="flex-1 bg-white border border-slate-200 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3"><Printer size={20} /> Print Log</button>
            )}
          </div>
        </div>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><PlusCircle size={24} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Add to Master</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Foundational Catalog Update</p>
                </div>
              </div>
              <button onClick={() => setShowQuickAdd(null)} className="p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleQuickAdd(showQuickAdd.idx, showQuickAdd.name, formData.get('sku') as string, formData.get('hsn') as string, (editForm.lineItems?.[showQuickAdd.idx]?.category) || 'Other');
            }} className="space-y-6">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Identity</p>
                <p className="text-sm font-black text-slate-900 uppercase italic">{showQuickAdd.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Assign Global SKU</label>
                <input name="sku" autoFocus required placeholder="e.g. VOLTX-BATT-001" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">HSN / SAC Code</label>
                <input name="hsn" required placeholder="8507" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95">
                <Save size={18} /> Provision Item
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptViewer;
