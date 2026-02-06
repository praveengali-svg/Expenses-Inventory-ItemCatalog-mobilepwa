import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Sparkles, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { CatalogItem, ExpenseCategory } from '../types';
import { storageService } from '../services/storage';

interface Props {
    initialQuery?: string;
    onSelect: (item: CatalogItem) => void;
    onClose: () => void;
}

const CATEGORIES: ExpenseCategory[] = ['Parts', 'Product', 'Raw Materials', 'Consumables', 'Service', 'Other'];

const CatalogLinkModal: React.FC<Props> = ({ initialQuery = '', onSelect, onClose }) => {
    const [query, setQuery] = useState(initialQuery);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [mode, setMode] = useState<'search' | 'create'>('search');

    // Create Form State
    const [newItem, setNewItem] = useState<Partial<CatalogItem>>({
        name: initialQuery,
        sku: '',
        category: 'Product',
        sellingPrice: 0,
        basePrice: 0,
        hsnCode: '',
        unitOfMeasure: 'PCS'
    });

    useEffect(() => {
        storageService.getCatalog().then(setCatalog);
    }, []);

    useEffect(() => {
        // Auto-generate SKU if creating
        if (mode === 'create' && newItem.name && !newItem.sku) {
            setNewItem(prev => ({
                ...prev,
                sku: prev.name?.substring(0, 4).toUpperCase() + '-' + Date.now().toString().slice(-4)
            }));
        }
    }, [mode]);

    const filteredItems = catalog.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.sku.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name || !newItem.sku) return;

        const createdItem: CatalogItem = {
            id: crypto.randomUUID(),
            sku: newItem.sku.toUpperCase(),
            name: newItem.name,
            description: 'Quick added via Linker',
            hsnCode: newItem.hsnCode || '',
            gstPercentage: 18,
            basePrice: newItem.basePrice || 0,
            sellingPrice: newItem.sellingPrice || 0,
            unitOfMeasure: newItem.unitOfMeasure || 'PCS',
            category: newItem.category as ExpenseCategory,
            type: 'good'
        };

        await storageService.saveCatalogItem(createdItem);
        onSelect(createdItem);
    };

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl text-white shadow-lg ${mode === 'search' ? 'bg-blue-600' : 'bg-orange-600'}`}>
                            {mode === 'search' ? <Search size={20} /> : <Plus size={20} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                {mode === 'search' ? 'Link Catalog Item' : 'Create & Link New'}
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {mode === 'search' ? 'Search Master Database' : 'Add to Digital Catalog'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-white"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {mode === 'search' ? (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    autoFocus
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search by Name or SKU..."
                                    className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Suggestions</p>
                                {filteredItems.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredItems.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => onSelect(item)}
                                                className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm group-hover:text-blue-700">{item.name}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{item.sku}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">₹{item.sellingPrice}</span>
                                                    </div>
                                                </div>
                                                <CheckCircle2 className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" size={18} />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs font-black text-slate-300 uppercase">No items found</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setNewItem(prev => ({ ...prev, name: query }));
                                        setMode('create');
                                    }}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Create "{query || 'New Item'}"
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Item Name</label>
                                <input
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-sm outline-none"
                                    placeholder="Item Name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">SKU</label>
                                    <input
                                        required
                                        value={newItem.sku}
                                        onChange={e => setNewItem({ ...newItem, sku: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-xs outline-none uppercase"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Category</label>
                                    <select
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value as any })}
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-xs outline-none uppercase"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Base Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={newItem.basePrice}
                                        onChange={e => setNewItem({ ...newItem, basePrice: Number(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-xs outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">HSN Code</label>
                                    <input
                                        value={newItem.hsnCode}
                                        onChange={e => setNewItem({ ...newItem, hsnCode: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl font-black text-slate-900 text-xs outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMode('search')}
                                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Save & Link
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CatalogLinkModal;
