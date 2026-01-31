import React, { useState, useEffect } from 'react';
import { Box, Plus, Minus, Search, AlertCircle, ShoppingBag, TrendingUp, Package, Edit2, Save, X, Hash, ImageIcon, History, ChevronRight, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { InventoryItem, ExpenseCategory, CatalogItem, StockMovement } from '../types';
import { storageService } from '../services/storage';

interface Props {
  items: InventoryItem[];
  catalog: CatalogItem[];
  onUpdate: () => void;
}

const Inventory: React.FC<Props> = ({ items, catalog, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingHistorySKU, setViewingHistorySKU] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [selectedSKU, setSelectedSKU] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('remove');
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (viewingHistorySKU) {
      storageService.getStockMovements(viewingHistorySKU).then(setMovements);
    }
  }, [viewingHistorySKU]);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSKU) return;
    const catalogMatch = catalog.find(c => c.sku === selectedSKU);
    if (!catalogMatch) return;
    const qty = adjustType === 'add' ? adjustQty : -adjustQty;
    await storageService.updateInventoryBySKU(selectedSKU, catalogMatch.name, qty, catalogMatch.category);
    onUpdate();
    setShowAdjustForm(false);
    setAdjustQty(1);
    setSelectedSKU("");
    setSelectedName("");
    setSuggestionQuery("");
  };

  const filteredSuggestions = catalog.filter(c =>
    c.name.toLowerCase().includes(suggestionQuery.toLowerCase()) ||
    c.sku.toLowerCase().includes(suggestionQuery.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Stock Control</h2>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Voltx EV Inventory Ledger</p>
        </div>
        <button onClick={() => setShowAdjustForm(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3">
          <TrendingUp size={18} /> Record Stock Move
        </button>
      </div>

      {showAdjustForm && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 overflow-visible">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Manual Adjustment</h3>
              <button onClick={() => setShowAdjustForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>
            <form onSubmit={handleManualAdjust} className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Catalog Selection</label>
                <div className="relative">
                  <input
                    type="text"
                    value={suggestionQuery || selectedName}
                    onChange={e => {
                      setSuggestionQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    placeholder="Search item to adjust..."
                    className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {showSuggestions && suggestionQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[300] py-2 overflow-hidden">
                      {filteredSuggestions.map(s => (
                        <button
                          key={s.sku}
                          type="button"
                          onClick={() => {
                            setSelectedSKU(s.sku);
                            setSelectedName(s.name);
                            setSuggestionQuery("");
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between group"
                        >
                          <div><p className="text-xs font-black text-slate-900">{s.name}</p><p className="text-[9px] font-bold text-slate-400">{s.sku}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSKU && <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2">Selected: {selectedSKU}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Type</label><select value={adjustType} onChange={e => setAdjustType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none"><option value="add">Add (+)</option><option value="remove">Remove (-)</option></select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Quantity</label><input type="number" min="1" value={adjustQty} onChange={e => setAdjustQty(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none" /></div>
              </div>

              <button type="submit" disabled={!selectedSKU} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-50">Finalize Adjustment</button>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Stock: {editingItem.sku}</h3>
              <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>
            {/* Added comment above fix: Changed adjustInventoryItem call to saveInventoryItem */}
            <form onSubmit={async (e) => { e.preventDefault(); await storageService.saveInventoryItem(editingItem); onUpdate(); setEditingItem(null); }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Stock Level</label><input type="number" value={editingItem.stockLevel} onChange={e => setEditingItem({ ...editingItem, stockLevel: parseInt(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Min Threshold</label><input type="number" value={editingItem.minThreshold} onChange={e => setEditingItem({ ...editingItem, minThreshold: parseInt(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 outline-none" /></div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all">Update Inventory</button>
            </form>
          </div>
        </div>
      )}

      {viewingHistorySKU && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] p-10 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Movement Ledger: {viewingHistorySKU}</h3><button onClick={() => setViewingHistorySKU(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button></div>
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-3xl"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-center">Type</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4">Ref</th></tr></thead><tbody>{movements.map(m => (<tr key={m.id} className="text-xs border-b border-slate-50"><td className="px-6 py-4 font-bold">{new Date(m.date).toLocaleDateString()}</td><td className="px-6 py-4 text-center"><span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">{m.type}</span></td><td className={`px-6 py-4 text-center font-black ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.quantity}</td><td className="px-6 py-4 text-[9px] text-slate-400">{m.referenceId}</td></tr>))}</tbody></table></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100"><div className="relative w-full md:w-96"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Filter SKU/Name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 px-12 py-3.5 rounded-2xl border border-slate-100 font-bold text-sm outline-none" /></div></div>
        <table className="w-full text-left"><thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-8 py-6">Item</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6 text-center">Current</th><th className="px-8 py-6 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredItems.map(item => (<tr key={item.sku} className="hover:bg-slate-50"><td className="px-8 py-6"><div><p className="font-black text-slate-900 leading-tight">{item.name}</p><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{item.sku}</p></div></td><td className="px-8 py-6 text-center">{item.stockLevel <= item.minThreshold ? <span className="text-[9px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">Low Stock</span> : <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Optimal</span>}</td><td className="px-8 py-6 text-center"><p className="text-xl font-black text-slate-900">{item.stockLevel}</p></td><td className="px-8 py-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => setViewingHistorySKU(item.sku)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm"><History size={18} /></button><button onClick={() => setEditingItem({ ...item })} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 shadow-sm"><Edit2 size={18} /></button></div></td></tr>))}</tbody></table>
      </div>
    </div>
  );
};

export default Inventory;