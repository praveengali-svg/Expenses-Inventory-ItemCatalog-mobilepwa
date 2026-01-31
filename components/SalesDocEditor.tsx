
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Save, Plus, Trash2, IndianRupee, Search, Globe, ExternalLink,
  User, MapPin, Building, Calendar, Hash, Tag, CheckCircle2, ShoppingBag, ShieldCheck, Truck, RefreshCw, Box, ChevronDown, Sparkles, FileText, AlertCircle, CreditCard, Check, BookPlus
} from 'lucide-react';
import { SalesDocument, SalesDocType, InventoryItem, User as AppUser, LineItem, CatalogItem, ExpenseCategory } from '../types';
import { storageService } from '../services/storage';
import { verifyGstNumber, GstVerificationResult } from '../services/gemini';

interface Props {
  type: SalesDocType;
  doc: SalesDocument | null;
  inventory: InventoryItem[];
  catalog: CatalogItem[];
  currentUser: AppUser | null;
  onClose: () => void;
  onSave: () => void;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const CATEGORIES: ExpenseCategory[] = ['Parts', 'Product', 'Raw Materials', 'Consumables', 'Service', 'Other'];

const SalesDocEditor: React.FC<Props> = ({ type, doc, inventory, catalog, currentUser, onClose, onSave }) => {
  const [allSales, setAllSales] = useState<SalesDocument[]>([]);
  const [customerName, setCustomerName] = useState(doc?.customerName || "");
  const [customerGst, setCustomerGst] = useState(doc?.customerGst || "");
  const [customerAddress, setCustomerAddress] = useState(doc?.customerAddress || "");
  const [customerState, setCustomerState] = useState(doc?.customerState || "Karnataka");
  const [shippingAddress, setShippingAddress] = useState(doc?.shippingAddress || "");
  const [poNumber, setPoNumber] = useState(doc?.poNumber || "");
  const [poDate, setPoDate] = useState(doc?.poDate || "");
  const [date, setDate] = useState(doc?.date || new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState(doc?.docNumber || `${type.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`);
  const [lineItems, setLineItems] = useState<LineItem[]>(doc?.lineItems || [{ description: '', quantity: 1, rate: 0, amount: 0, category: 'Product', sku: '', unitOfMeasure: 'PCS' }]);
  const [amountPaid, setAmountPaid] = useState(doc?.amountPaid || 0);
  const [isFullyPaid, setIsFullyPaid] = useState(doc ? doc.amountPaid === doc.totalAmount : false);
  const [notes, setNotes] = useState(doc?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [gstVerifyData, setGstVerifyData] = useState<GstVerificationResult | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(doc ? doc.customerAddress === doc.shippingAddress : true);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  // Quick Create State
  const [isQuickCreatingItem, setIsQuickCreatingItem] = useState(false);
  const [quickCreateIdx, setQuickCreateIdx] = useState<number | null>(null);
  const [quickCreateForm, setQuickCreateForm] = useState({
    sku: '',
    name: '',
    hsnCode: '',
    category: 'Product' as ExpenseCategory,
    sellingPrice: 0
  });

  const uomOptions = ["PCS", "SET", "PAIR", "KGS", "MTR", "NOS", "BOX", "PKT"];

  useEffect(() => {
    storageService.getSales().then(setAllSales);
  }, []);

  // Duplicate Check Logic
  const isDuplicateDocNumber = useMemo(() => {
    return allSales.some(s =>
      s.docNumber.trim().toLowerCase() === docNumber.trim().toLowerCase() &&
      s.id !== doc?.id
    );
  }, [allSales, docNumber, doc]);

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    allSales.forEach(s => {
      if (!map.has(s.customerName)) {
        map.set(s.customerName, {
          name: s.customerName,
          gst: s.customerGst,
          address: s.customerAddress,
          state: s.customerState,
          shipping: s.shippingAddress
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSales]);

  const filteredCustomerSuggestions = useMemo(() => {
    if (!customerName || customerName.length < 1) return uniqueCustomers;
    return uniqueCustomers.filter(c =>
      c.name.toLowerCase().includes(customerName.toLowerCase())
    );
  }, [uniqueCustomers, customerName]);

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
    const taxValue = lineItems.reduce((acc, item) => {
      const gst = item.gstPercentage || 18;
      return acc + ((item.amount || 0) * (gst / 100));
    }, 0);
    return { subtotal, tax: taxValue, total: subtotal + taxValue };
  };

  const { total, tax } = calculateTotals();

  // Sync amountPaid if fully paid toggle is on
  useEffect(() => {
    if (isFullyPaid) {
      setAmountPaid(total);
    }
  }, [total, isFullyPaid]);

  const balance = total - amountPaid;

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
    const defaultRate = catItem.sellingPrice || catItem.basePrice || 0;

    newList[index] = {
      ...newList[index],
      description: catItem.name,
      sku: catItem.sku,
      hsnCode: catItem.hsnCode,
      rate: defaultRate,
      unitOfMeasure: catItem.unitOfMeasure || 'PCS',
      gstPercentage: catItem.gstPercentage,
      category: catItem.category,
      amount: (newList[index].quantity || 1) * defaultRate
    };
    setLineItems(newList);
    setActiveSearchIdx(null);
    setItemSearchQuery("");
  };

  const openQuickCreate = (idx: number, initialName: string) => {
    setQuickCreateIdx(idx);
    setQuickCreateForm({
      ...quickCreateForm,
      name: initialName,
      sku: initialName.substring(0, 4).toUpperCase() + '-' + Date.now().toString().slice(-4),
      sellingPrice: lineItems[idx].rate || 0,
      hsnCode: '',
      category: 'Product'
    });
    setIsQuickCreatingItem(true);
    setActiveSearchIdx(null);
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCreateIdx === null) return;

    const newItem: CatalogItem = {
      id: crypto.randomUUID(),
      sku: quickCreateForm.sku.toUpperCase(),
      name: quickCreateForm.name,
      description: 'Quick added from sales workflow',
      hsnCode: quickCreateForm.hsnCode,
      gstPercentage: 18,
      basePrice: 0,
      sellingPrice: quickCreateForm.sellingPrice,
      unitOfMeasure: 'PCS',
      category: quickCreateForm.category,
      type: 'good'
    };

    await storageService.saveCatalogItem(newItem);

    // Select the new item in the row
    const newList = [...lineItems];
    newList[quickCreateIdx] = {
      ...newList[quickCreateIdx],
      description: newItem.name,
      sku: newItem.sku,
      hsnCode: newItem.hsnCode,
      rate: newItem.sellingPrice,
      category: newItem.category,
      amount: (newList[quickCreateIdx].quantity || 1) * newItem.sellingPrice
    };
    setLineItems(newList);

    setIsQuickCreatingItem(false);
    setQuickCreateIdx(null);
  };

  const selectCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerGst(c.gst || "");
    setCustomerAddress(c.address || "");
    setCustomerState(c.state || "Karnataka");
    setShippingAddress(c.shipping || "");
    setShowCustomerList(false);
  };

  const filteredItemSuggestions = catalog.filter(c =>
    c.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    c.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())
  ).slice(0, 5);

  const handleSave = async (isFinal: boolean) => {
    if (isDuplicateDocNumber) {
      alert("Cannot save: Invoice number already exists.");
      return;
    }
    if (!customerName || lineItems.some(i => !i.description)) {
      alert("Please fill customer name and item descriptions.");
      return;
    }
    setIsSaving(true);
    const finalShipAddress = sameAsBilling ? customerAddress : shippingAddress;

    const newDoc: SalesDocument = {
      id: doc?.id || crypto.randomUUID(),
      docNumber,
      type,
      customerName,
      customerGst: customerGst.toUpperCase(),
      customerAddress,
      customerState,
      shippingAddress: finalShipAddress,
      poNumber,
      poDate,
      date,
      lineItems,
      totalAmount: total,
      taxAmount: tax,
      amountPaid: amountPaid,
      balanceAmount: balance,
      notes,
      createdAt: doc?.createdAt || Date.now(),
      createdBy: currentUser?.name || 'System',
      status: isFinal ? 'issued' : 'draft'
    };

    await storageService.saveSalesDoc(newDoc);
    onSave();
    onClose();
  };

  const handleVerifyGst = async () => {
    if (!customerGst || customerGst.length < 15) {
      alert("Enter a valid 15-digit GSTIN first.");
      return;
    }
    setIsVerifyingGst(true);
    const result = await verifyGstNumber(customerGst);
    setIsVerifyingGst(false);
    if (result) setGstVerifyData(result);
  };

  const applyGstData = () => {
    if (gstVerifyData) {
      if (gstVerifyData.businessName) setCustomerName(gstVerifyData.businessName);
      if (gstVerifyData.address) setCustomerAddress(gstVerifyData.address);
      setGstVerifyData(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6 lg:p-12 overflow-hidden">
      <div className="bg-white w-full h-full max-w-6xl md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-orange-600 p-2.5 md:p-3 rounded-2xl text-white shadow-lg">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight uppercase">{type.replace('_', ' ')}</h2>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">

          {/* Document Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>

            <div className="space-y-2 z-10">
              <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Hash size={12} /> Document Number</span>
                {isDuplicateDocNumber && (
                  <span className="text-red-400 flex items-center gap-1 animate-pulse">
                    <AlertCircle size={10} /> Number Already Exists
                  </span>
                )}
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                placeholder="INV-XXXX"
                className={`w-full bg-white/5 border-2 ${isDuplicateDocNumber ? 'border-red-500/50' : 'border-white/10'} px-6 py-4 rounded-2xl font-black text-lg outline-none focus:bg-white/10 focus:border-orange-500/50 transition-all placeholder:text-white/40`}
              />
            </div>
            <div className="space-y-2 z-10">
              <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] px-2 flex items-center gap-2"><Calendar size={12} /> Invoice Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 px-6 py-4 rounded-2xl font-black text-lg outline-none focus:bg-white/10 focus:border-orange-500/50 transition-all"
              />
            </div>
          </div>

          {/* PO Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><FileText size={12} /> Customer PO Number</label>
              <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="Customer PO #" className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl font-black text-sm outline-none shadow-sm" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><Calendar size={12} /> Customer PO Date</label>
              <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl font-black text-sm outline-none shadow-sm" />
            </div>
          </div>

          {/* Customer Entity Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Customer GSTIN</label>
              <div className="flex gap-2">
                <input type="text" maxLength={15} value={customerGst} onChange={e => setCustomerGst(e.target.value.toUpperCase())} className="flex-1 bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-sm outline-none uppercase tracking-widest focus:ring-2 focus:ring-blue-600/20" placeholder="29XXXXX0000X1Z1" />
                <button onClick={handleVerifyGst} title="Verify with GST Database" className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                  {isVerifyingGst ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex justify-between">
                <span>Customer Name</span>
                <button onClick={() => setShowCustomerList(!showCustomerList)} className="text-blue-600 flex items-center gap-1 hover:underline"><Search size={10} /> Choose Existing</button>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => {
                  setCustomerName(e.target.value);
                  if (!showCustomerList) setShowCustomerList(true);
                }}
                onFocus={() => setShowCustomerList(true)}
                className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                placeholder="Enter customer or business name..."
              />
              {showCustomerList && filteredCustomerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[300] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {filteredCustomerSuggestions.map(c => (
                    <button
                      key={c.name}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none flex flex-col group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</span>
                        <span className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded uppercase">{c.state || 'N/A'}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{c.gst || 'No GSTIN'} • {c.address?.substring(0, 50)}...</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {gstVerifyData && (
            <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 flex justify-between items-center animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white"><CheckCircle2 size={18} /></div>
                <div>
                  <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Verified Trade Name</p>
                  <p className="text-sm font-bold text-blue-700">{gstVerifyData.businessName}</p>
                </div>
              </div>
              <button onClick={applyGstData} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all">Apply to Invoice</button>
            </div>
          )}

          {/* Addresses & State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><MapPin size={12} /> Billing Address</label>
                <textarea
                  rows={4}
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-bold text-slate-700 outline-none resize-none focus:ring-2 focus:ring-blue-600/20 shadow-sm"
                  placeholder="Registered business address..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><Globe size={12} /> Place of Supply (State)</label>
                <select
                  value={customerState}
                  onChange={e => setCustomerState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Truck size={12} /> Shipping Address</label>
                <button
                  onClick={() => setSameAsBilling(!sameAsBilling)}
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border transition-all ${sameAsBilling ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                >
                  {sameAsBilling ? 'Same as Billing' : 'Separate Address'}
                </button>
              </div>
              <textarea
                rows={7}
                disabled={sameAsBilling}
                value={sameAsBilling ? customerAddress : shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                className={`w-full border px-5 py-4 rounded-2xl font-bold text-slate-700 outline-none resize-none transition-all ${sameAsBilling ? 'bg-slate-100 border-slate-100 text-slate-400 opacity-60' : 'bg-slate-50 border-slate-100 shadow-sm'}`}
                placeholder="Consignee shipping destination..."
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Items</h3>
              <button onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0, category: 'Product', sku: '', unitOfMeasure: 'PCS' }])} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"><Plus size={14} /> Add Line</button>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-visible shadow-inner">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Item Name / Suggestions</th>
                    <th className="px-6 py-4 text-center">Qty / UOM</th>
                    <th className="px-6 py-4 text-center">Rate</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="relative">
                      <td className="px-6 py-4 min-w-[300px]">
                        <div className="relative">
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
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none"
                            placeholder="Start typing item name..."
                          />
                          {activeSearchIdx === idx && itemSearchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[300] py-2 overflow-hidden animate-in fade-in slide-in-from-top-1">
                              {filteredItemSuggestions.length > 0 ? (
                                <>
                                  {filteredItemSuggestions.map(s => (
                                    <button
                                      key={s.sku}
                                      onClick={() => selectCatalogItem(idx, s)}
                                      className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                                    >
                                      <div>
                                        <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">{s.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{s.sku} • Selling: ₹{s.sellingPrice || 0} / {s.unitOfMeasure}</p>
                                      </div>
                                      <span className="text-[9px] font-black text-slate-300 uppercase">Select</span>
                                    </button>
                                  ))}
                                  <div className="border-t border-slate-50 my-1"></div>
                                  <button
                                    onClick={() => openQuickCreate(idx, itemSearchQuery)}
                                    className="w-full text-left px-5 py-3 hover:bg-blue-50 flex items-center gap-2 group"
                                  >
                                    <div className="bg-blue-600 text-white p-1 rounded-lg"><Plus size={14} /></div>
                                    <div className="flex-1">
                                      <p className="text-xs font-black text-blue-600 uppercase tracking-tight">Create New Item</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">Add "{itemSearchQuery}" to master catalog</p>
                                    </div>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => openQuickCreate(idx, itemSearchQuery)}
                                  className="w-full text-left px-5 py-4 hover:bg-blue-50 flex items-center gap-3 group"
                                >
                                  <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20"><Plus size={18} /></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-black text-blue-600 uppercase tracking-tight">Create New Item</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">"{itemSearchQuery}" not found in catalog</p>
                                  </div>
                                  <Sparkles className="text-blue-300 mr-2" size={16} />
                                </button>
                              )}
                            </div>
                          )}
                          {item.sku && (
                            <div className="flex gap-2 mt-2">
                              <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase border border-blue-100">SKU: {item.sku}</span>
                              <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase border border-emerald-100">HSN: {item.hsnCode}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-2 items-center">
                          <input type="number" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))} className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm font-black text-center outline-none" />
                          <select
                            value={item.unitOfMeasure || 'PCS'}
                            onChange={e => handleUpdateItem(idx, 'unitOfMeasure', e.target.value)}
                            className="text-[10px] font-black bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none uppercase shadow-sm"
                          >
                            {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input type="number" value={item.rate} onChange={e => handleUpdateItem(idx, 'rate', Number(e.target.value))} className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-center outline-none shadow-sm" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-900">₹{item.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Balance Section */}
          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={14} /> Payment Reconciliation</h3>
              <button
                onClick={() => setIsFullyPaid(!isFullyPaid)}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${isFullyPaid ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                {isFullyPaid && <Check size={12} />} {isFullyPaid ? 'Fully Paid' : 'Toggle Full Payment'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setAmountPaid(val);
                    if (val < total) setIsFullyPaid(false);
                    else if (val >= total) setIsFullyPaid(true);
                  }}
                  className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-blue-500/10"
                  placeholder="Enter payment received..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Balance Due (₹)</label>
                <div className={`w-full px-5 py-4 rounded-2xl font-black text-sm border shadow-sm ${balance > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  ₹{balance.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Receivable</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{total.toLocaleString('en-IN')}</p>
            </div>
            <div className="h-10 w-px bg-slate-200"></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Component</p>
              <p className="text-xl font-black text-blue-600 tracking-tighter">₹{tax.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button disabled={isSaving || isDuplicateDocNumber} onClick={() => handleSave(false)} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50">Save Draft</button>
            <button disabled={isSaving || isDuplicateDocNumber} onClick={() => handleSave(true)} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"><CheckCircle2 size={18} /> Issue Document</button>
          </div>
        </div>
      </div>

      {/* Quick Item Create Modal */}
      {isQuickCreatingItem && (
        <div className="fixed inset-0 z-[400] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><BookPlus size={20} /></div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Add to Master Catalog</h3>
              </div>
              <button onClick={() => setIsQuickCreatingItem(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Item Name (Spec)</label>
                  <input
                    type="text" required
                    value={quickCreateForm.name}
                    onChange={e => setQuickCreateForm({ ...quickCreateForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-sm outline-none"
                    placeholder="Enter full specification name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Unique SKU</label>
                    <input
                      type="text" required
                      value={quickCreateForm.sku}
                      onChange={e => setQuickCreateForm({ ...quickCreateForm, sku: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-xs outline-none"
                      placeholder="SKU-XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">HSN Code</label>
                    <input
                      type="text" required
                      value={quickCreateForm.hsnCode}
                      onChange={e => setQuickCreateForm({ ...quickCreateForm, hsnCode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-xs outline-none"
                      placeholder="8507XXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Category</label>
                    <select
                      value={quickCreateForm.category}
                      onChange={e => setQuickCreateForm({ ...quickCreateForm, category: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-[10px] uppercase outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sale Price (₹)</label>
                    <input
                      type="number" required
                      value={quickCreateForm.sellingPrice}
                      onChange={e => setQuickCreateForm({ ...quickCreateForm, sellingPrice: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={16} />
                <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                  Adding this item will make it permanently available in the Master Catalog for all future invoices and purchase orders.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Register Item & Select
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDocEditor;
