
import React, { useState, useRef } from 'react';
import {
  BookOpen, Plus, Search, Trash2, Edit2, Save, X, Tag, IndianRupee, Hash, ClipboardList, Package, Filter, Camera, Upload, ImageIcon, Link, ArrowRight, ExternalLink, Box, Sparkles, ChevronDown, Ruler
} from 'lucide-react';
import { CatalogItem, ExpenseCategory, InventoryItem, User as AppUser } from '../types';
import { storageService } from '../services/storage';

interface Props {
  items: CatalogItem[];
  inventory: InventoryItem[];
  currentUser: AppUser | null;
  onUpdate: () => void;
}

const Catalog: React.FC<Props> = ({ items, inventory, currentUser, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Form State
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gstPercentage, setGstPercentage] = useState(18);
  const [basePrice, setBasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [unitOfMeasure, setUnitOfMeasure] = useState("PCS");
  const [category, setCategory] = useState<ExpenseCategory>("Product");
  const [type, setType] = useState<'good' | 'service'>('good');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: ExpenseCategory[] = ['Parts', 'Product', 'Raw Materials', 'Consumables', 'Service', 'Other', 'Purchase', 'Courier', 'Transportation', 'Porter'];
  const uomOptions = ["PCS", "SET", "PAIR", "KGS", "MTR", "NOS", "BOX", "PKT"];

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.hsnCode.includes(searchTerm)
  );

  const resetForm = () => {
    setSku(""); setName(""); setDescription(""); setHsnCode("");
    setGstPercentage(18); setBasePrice(0); setSellingPrice(0); setUnitOfMeasure("PCS"); setCategory("Product"); setType("good");
    setImageUrl(undefined);
    setEditingItem(null);
    setIsFormOpen(false);
    setShowSuggestions(false);
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setSku(item.sku);
    setName(item.name);
    setDescription(item.description);
    setHsnCode(item.hsnCode);
    setGstPercentage(item.gstPercentage);
    setBasePrice(item.basePrice);
    setSellingPrice(item.sellingPrice || 0);
    setUnitOfMeasure(item.unitOfMeasure || "PCS");
    setCategory(item.category);
    setType(item.type);
    setImageUrl(item.imageUrl);
    setIsFormOpen(true);
  };

  const handleSelectTemplate = (template: CatalogItem) => {
    setName(template.name);
    setDescription(template.description);
    setHsnCode(template.hsnCode);
    setGstPercentage(template.gstPercentage);
    setBasePrice(template.basePrice);
    setSellingPrice(template.sellingPrice || 0);
    setUnitOfMeasure(template.unitOfMeasure || "PCS");
    setCategory(template.category);
    setType(template.type);
    setImageUrl(template.imageUrl);
    setShowSuggestions(false);
  };

  const nameSuggestions = items.filter(i =>
    name.length > 1 && i.name.toLowerCase().includes(name.toLowerCase()) && i.sku !== sku
  ).slice(0, 5);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: CatalogItem = {
      id: editingItem?.id || crypto.randomUUID(),
      sku, name, description, hsnCode, gstPercentage, basePrice, sellingPrice, unitOfMeasure, category, type, imageUrl
    };
    await storageService.saveCatalogItem(item);
    onUpdate();
    resetForm();
  };

  const handleDelete = async (sku: string) => {
    if (confirm("Permanently delete this item from master catalog?")) {
      await storageService.deleteCatalogItem(sku);
      onUpdate();
    }
  };

  const handleInitializeStock = async (item: CatalogItem) => {
    if (confirm(`Initialize inventory record for SKU: ${item.sku}?`)) {
      await storageService.updateInventoryBySKU(item.sku, item.name, 0, item.category);
      // Inventory updates require manual syncing of UOM if needed, 
      // but storageService uses 'Units' as default normally.
      onUpdate();
    }
  };

  const getStockLevel = (sku: string) => {
    const inv = inventory.find(i => i.sku === sku);
    return inv ? inv.stockLevel : null;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Item Master Catalog</h2>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Central Source of Truth: Inwards & Outwards Identity</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-purple-700 transition-all flex items-center gap-3"
          >
            <Plus size={18} /> Define New Item
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full h-full max-w-4xl md:h-auto md:max-w-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[95vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600 p-2.5 rounded-2xl text-white">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingItem ? 'Edit Item Master' : 'New Item Master'}</h3>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-10">
              <div className="flex flex-col md:flex-row gap-10">
                {/* Visual ID */}
                <div className="w-full md:w-48 space-y-4 shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-purple-300 transition-all overflow-hidden group"
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="text-center p-6">
                        <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Attach Media</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file" ref={fileInputRef} className="hidden" accept="image/*"
                    onChange={handleImageChange}
                  />
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Item Type</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button type="button" onClick={() => setType('good')} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'good' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Good</button>
                      <button type="button" onClick={() => setType('service')} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Service</button>
                    </div>
                  </div>
                </div>

                {/* Identity Data */}
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Unique SKU (Link Key)</label>
                      <input
                        type="text" required value={sku} onChange={e => setSku(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-purple-500/10"
                        placeholder="SKU-XXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Global Category</label>
                      <select
                        value={category} onChange={e => setCategory(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2 relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex justify-between">
                        <span>Item Master Name</span>
                        {nameSuggestions.length > 0 && <span className="text-blue-600 animate-pulse flex items-center gap-1"><Sparkles size={10} /> Recognized</span>}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => {
                          setName(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none text-lg focus:ring-4 focus:ring-purple-500/10"
                        placeholder="Enter item name..."
                      />

                      {showSuggestions && nameSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-[300] py-4 overflow-hidden animate-in fade-in slide-in-from-top-2">
                          <p className="px-6 pb-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Template to Auto-Populate</p>
                          {nameSuggestions.map(s => (
                            <button
                              key={s.sku}
                              type="button"
                              onClick={() => handleSelectTemplate(s)}
                              className="w-full text-left px-6 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-black text-slate-900 group-hover:text-purple-600 transition-colors">{s.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{s.sku} • {s.category}</p>
                              </div>
                              <div className="bg-purple-50 px-2 py-1 rounded-lg text-[8px] font-black text-purple-600 uppercase border border-purple-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                Use Template
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 px-2">
                  <IndianRupee size={14} className="text-purple-600" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials & Taxation</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">HSN / SAC</label>
                    <input
                      type="text" required value={hsnCode} onChange={e => setHsnCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">GST Rate</label>
                    <select
                      value={gstPercentage} onChange={e => setGstPercentage(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none"
                    >
                      <option value={0}>0% Exempt</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% Standard</option>
                      <option value={28}>28% High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">UOM</label>
                    <select
                      value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none"
                    >
                      {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-blue-600">Purchase Price (₹)</label>
                    <input
                      type="number" required value={basePrice} onChange={e => setBasePrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-emerald-600">Selling Price (₹)</label>
                    <input
                      type="number" required value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))}
                      className="w-full bg-emerald-50/30 border border-emerald-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Detailed Specification</label>
                <textarea
                  rows={3} value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-bold text-slate-700 outline-none resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={resetForm} className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all">Discard</button>
                <button type="submit" className="flex-[2] bg-purple-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> Commit to Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text" placeholder="Filter by Name, SKU or HSN..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 px-12 py-3.5 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <Filter size={14} /> Total: {filteredItems.length}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Item</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SKU</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fin / Tax</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">UOM</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Live Stock</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Purchase (₹)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-emerald-600">Selling (₹)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const stock = getStockLevel(item.sku);
                return (
                  <tr key={item.sku} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="text-slate-200"><ImageIcon size={24} /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate uppercase tracking-tight">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter border ${item.type === 'good' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                              {item.type}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">{item.sku}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-700 uppercase">{item.hsnCode}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">GST {item.gstPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">{item.unitOfMeasure || "PCS"}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {stock !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-black ${stock < 5 ? 'text-red-500' : 'text-slate-900'}`}>{stock} Units</span>
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${stock < 5 ? 'bg-red-500 w-1/4' : 'bg-emerald-500 w-full'}`}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInitializeStock(item)}
                          className="text-[8px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 mx-auto group/link"
                        >
                          <Link size={10} className="group-hover/link:rotate-45 transition-transform" /> Initialize Stock
                        </button>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-black text-slate-900 tracking-tight text-xs">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.basePrice)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-black text-emerald-600 tracking-tight">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.sellingPrice || 0)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {currentUser?.role === 'admin' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(item.sku)} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 shadow-sm transition-all"><Trash2 size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Read Only</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-200">
                      <BookOpen size={64} />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Catalog Master is Empty</p>
                      <button onClick={() => setIsFormOpen(true)} className="text-[9px] font-black text-blue-600 uppercase tracking-widest underline decoration-2 underline-offset-4">Define your first item</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Catalog;