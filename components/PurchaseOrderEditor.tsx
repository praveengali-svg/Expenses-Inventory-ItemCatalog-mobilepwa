
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, Trash2, IndianRupee, Tag, ShoppingBag, Truck, Calendar, User, Box, Sparkles, PlusCircle } from 'lucide-react';
import { ExpenseData, LineItem, CatalogItem, User as AppUser, ExpenseCategory } from '../types';
import { storageService } from '../services/storage';

interface Props {
  catalog: CatalogItem[];
  currentUser: AppUser | null;
  onClose: () => void;
  onSave: () => void;
}

const PurchaseOrderEditor: React.FC<Props> = ({ catalog, currentUser, onClose, onSave }) => {
  const [allExpenses, setAllExpenses] = useState<ExpenseData[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, rate: 0, amount: 0, category: 'Product', sku: '', unitOfMeasure: 'PCS' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState<{ idx: number, name: string } | null>(null);

  const uomOptions = ["PCS", "SET", "PAIR", "KGS", "MTR", "NOS", "BOX", "PKT"];

  useEffect(() => {
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

  const handleUpdateItem = (index: number, field: keyof LineItem, value: any) => {
    const newList = [...lineItems];
    const item = { ...newList[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      item.amount = (item.quantity || 0) * (item.rate || 0);
    }
    newList[index] = item;
    setLineItems(newList);
  };

  const selectCatalogItem = (index: number, catItem: CatalogItem) => {
    const newList = [...lineItems];
    newList[index] = {
      ...newList[index],
      description: catItem.name,
      sku: catItem.sku,
      hsnCode: catItem.hsnCode,
      rate: catItem.basePrice,
      unitOfMeasure: catItem.unitOfMeasure || 'PCS',
      category: catItem.category,
      amount: (newList[index].quantity || 1) * catItem.basePrice
    };
    setLineItems(newList);
    setActiveSearchIdx(null);
    setItemSearchQuery("");
  };

  const handleQuickAdd = async (idx: number, name: string, sku: string, hsn: string) => {
    const newItem: CatalogItem = {
      id: crypto.randomUUID(),
      sku,
      name,
      description: `Auto-generated during PO: ${docNumber}`,
      hsnCode: hsn,
      gstPercentage: 18,
      basePrice: lineItems[idx].rate || 0,
      sellingPrice: 0,
      unitOfMeasure: lineItems[idx].unitOfMeasure || 'PCS',
      category: 'Product',
      type: 'good'
    };

    await storageService.saveCatalogItem(newItem);
    handleUpdateItem(idx, 'sku', sku);
    handleUpdateItem(idx, 'hsnCode', hsn);
    setShowQuickAdd(null);
    setActiveSearchIdx(null);
    setItemSearchQuery("");
  };

  const selectVendor = (v: any) => {
    setVendorName(v.name);
    setShowVendorSuggestions(false);
    setVendorSearchQuery("");
  };

  const filteredItemSuggestions = catalog.filter(c =>
    c.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    c.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())
  ).slice(0, 5);

  const handleSave = async () => {
    if (!vendorName || lineItems.some(i => !i.description)) {
      alert("Please enter vendor and item details.");
      return;
    }
    setIsSaving(true);
    const totalAmount = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
    const newPO: ExpenseData = {
      id: crypto.randomUUID(),
      vendorName,
      date,
      docNumber,
      totalAmount,
      taxAmount: 0,
      currency: 'INR',
      lineItems,
      fileName: `PO_${docNumber}.pdf`,
      createdAt: Date.now(),
      type: 'purchase_order',
      createdBy: currentUser?.name || 'System',
      status: 'ordered'
    };
    await storageService.saveExpense(newPO);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-orange-600 p-3 rounded-2xl text-white shadow-lg"><ShoppingBag size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Create Purchase Order</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Voltx EV Procurement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex justify-between">
                <span>Vendor Name</span>
                {vendorSuggestions.length > 0 && <span className="text-blue-600 animate-pulse flex items-center gap-1"><Sparkles size={10} /> Recognized</span>}
              </label>
              <input
                type="text"
                value={vendorName || vendorSearchQuery}
                onChange={e => {
                  setVendorSearchQuery(e.target.value);
                  setVendorName(e.target.value);
                  setShowVendorSuggestions(true);
                }}
                onFocus={() => setShowVendorSuggestions(true)}
                placeholder="Supplier Name"
                className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-sm outline-none"
              />
              {showVendorSuggestions && vendorSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[300] py-2 overflow-hidden">
                  {vendorSuggestions.map(v => (
                    <button
                      key={v.name}
                      onClick={() => selectVendor(v)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-50 font-black text-xs text-slate-900"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">PO #</label><input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-sm outline-none" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-bold text-sm outline-none" /></div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Items</h3>
              <button onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0, category: 'Product', sku: '', unitOfMeasure: 'PCS' }])} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Plus size={14} /> Add Line</button>
            </div>

            <div className="border border-slate-100 rounded-[2rem] overflow-visible bg-slate-50/30">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4">Item & SKU Suggestion</th>
                    <th className="px-6 py-4 text-center">Qty / UOM</th>
                    <th className="px-6 py-4 text-center">Rate</th>
                    <th className="px-6 py-4 text-right">Subtotal</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="bg-white/40 border-b border-slate-100">
                      <td className="px-6 py-4 relative">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => {
                            handleUpdateItem(idx, 'description', e.target.value);
                            setItemSearchQuery(e.target.value);
                            setActiveSearchIdx(idx);
                          }}
                          onFocus={() => {
                            setItemSearchQuery(item.description);
                            setActiveSearchIdx(idx);
                          }}
                          className="w-full bg-transparent border-none py-1 text-sm font-black text-slate-900 outline-none"
                          placeholder="Type item name..."
                        />
                        {activeSearchIdx === idx && itemSearchQuery && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[300] py-2 overflow-hidden animate-in fade-in slide-in-from-top-1">
                            {filteredItemSuggestions.map(s => (
                              <button
                                key={s.sku}
                                onClick={() => selectCatalogItem(idx, s)}
                                className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                              >
                                <div>
                                  <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">{s.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">{s.sku} • Cost: ₹{s.basePrice} / {s.unitOfMeasure}</p>
                                </div>
                              </button>
                            ))}
                            <button
                              onClick={() => setShowQuickAdd({ idx, name: item.description })}
                              className="w-full text-left px-5 py-4 hover:bg-blue-50 flex items-center gap-3 border-t border-slate-50 group transition-all"
                            >
                              <div className="bg-blue-600 p-2 rounded-lg text-white"><Plus size={14} /></div>
                              <div>
                                <p className="text-xs font-black text-blue-600 uppercase tracking-tight">Add "{item.description || 'New Item'}" to Master</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Create new SKU in digital catalog</p>
                              </div>
                            </button>
                          </div>
                        )}
                        {item.sku && <span className="text-[8px] font-black text-orange-600 uppercase bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">Linked: {item.sku}</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-2 items-center">
                          <input type="number" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))} className="w-12 bg-transparent text-center text-sm font-black text-slate-900 outline-none" />
                          <select
                            value={item.unitOfMeasure || 'PCS'}
                            onChange={e => handleUpdateItem(idx, 'unitOfMeasure', e.target.value)}
                            className="text-[9px] font-black bg-white/50 border border-slate-200 rounded-lg px-2 py-0.5 outline-none uppercase"
                          >
                            {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center"><input type="number" value={item.rate} onChange={e => handleUpdateItem(idx, 'rate', Number(e.target.value))} className="w-20 bg-transparent text-center text-sm font-black text-slate-900 outline-none" /></td>
                      <td className="px-6 py-4 text-right"><span className="text-sm font-black text-slate-900">₹{item.amount.toLocaleString()}</span></td>
                      <td className="px-6 py-4"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-8 py-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total Value</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{lineItems.reduce((acc, item) => acc + (item.amount || 0), 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-white">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-2"><Save size={18} /> Confirm Order</button>
          </div>
        </div>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
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
              handleQuickAdd(showQuickAdd.idx, showQuickAdd.name, formData.get('sku') as string, formData.get('hsn') as string);
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

export default PurchaseOrderEditor;