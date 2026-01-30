
import React, { useState, useEffect } from 'react';
import { Zap, Plus, Settings, Play, History, Box, ArrowRight, PackageCheck, AlertTriangle, Trash2, X, ShieldCheck, ChevronRight, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { CatalogItem, InventoryItem, ProductionOrder, User, BOMItem } from '../types';
import { storageService } from '../services/storage';

interface Props {
  catalog: CatalogItem[];
  inventory: InventoryItem[];
  currentUser: User | null;
  onUpdate: () => void;
}

const Manufacturing: React.FC<Props> = ({ catalog, inventory, currentUser, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'run' | 'history' | 'boms'>('run');
  const [productionHistory, setProductionHistory] = useState<ProductionOrder[]>([]);
  
  // Production Run State
  const [selectedProductSku, setSelectedProductSku] = useState("");
  const [prodQty, setProdQty] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // BOM Editor State
  const [editingBOMProduct, setEditingBOMProduct] = useState<CatalogItem | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await storageService.getProductionHistory();
    setProductionHistory(history);
  };

  const selectedProduct = catalog.find(c => c.sku === selectedProductSku);
  const canBuild = selectedProduct && selectedProduct.bom && selectedProduct.bom.length > 0;

  const checkShortages = () => {
    if (!selectedProduct || !selectedProduct.bom) return [];
    const shortages: { sku: string, needed: number, available: number }[] = [];
    
    for (const item of selectedProduct.bom) {
      const inv = inventory.find(i => i.sku === item.sku);
      const needed = item.quantity * prodQty;
      const available = inv ? inv.stockLevel : 0;
      if (available < needed) {
        shortages.push({ sku: item.sku, needed, available });
      }
    }
    return shortages;
  };

  const shortages = checkShortages();

  const handleStartRun = async () => {
    if (!selectedProduct || shortages.length > 0) return;
    
    setIsProcessing(true);
    try {
      const order: ProductionOrder = {
        id: `PROD-${Date.now().toString().slice(-6)}`,
        productSku: selectedProductSku,
        quantity: prodQty,
        date: Date.now(),
        status: 'completed',
        createdBy: currentUser?.name || 'System',
        notes: `Built ${prodQty} units of ${selectedProduct.name}`
      };

      await storageService.completeProduction(order);
      await loadHistory();
      onUpdate();
      setProdQty(1);
      setSelectedProductSku("");
      alert("Production run successfully completed. Inventory updated.");
    } catch (err) {
      console.error(err);
      alert("Manufacturing conversion failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manufacturing Suite</h2>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Workflow B: Conversion Flow (Inputs → Outputs)</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
           {[
             { id: 'run', label: 'Start Run', icon: Play },
             { id: 'history', label: 'Ledger', icon: History },
             { id: 'boms', label: 'BOM Master', icon: Settings }
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                 activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'
               }`}
             >
               <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'run' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Run Setup */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                 <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Select Target Product for Conversion</label>
                    <select 
                      value={selectedProductSku}
                      onChange={e => setSelectedProductSku(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-6 py-5 rounded-[2rem] font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 text-lg appearance-none"
                    >
                      <option value="">Choose item from Catalog...</option>
                      {catalog.filter(c => c.category === 'Product' || c.category === 'Parts').map(c => (
                        <option key={c.sku} value={c.sku}>{c.sku} - {c.name}</option>
                      ))}
                    </select>
                 </div>

                 {selectedProduct && (
                   <div className="space-y-8 animate-in slide-in-from-top-4">
                      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Quantity</p>
                            <input 
                              type="number" min="1" value={prodQty}
                              onChange={e => setProdQty(Math.max(1, parseInt(e.target.value)))}
                              className="bg-transparent text-4xl font-black text-slate-900 outline-none w-32"
                            />
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Category</p>
                            <p className="font-black text-slate-900">{selectedProduct.category}</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest px-2">Bill of Materials Checklist</h3>
                         {!canBuild ? (
                           <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100 text-center">
                              <AlertTriangle size={32} className="mx-auto text-red-500 mb-2" />
                              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">No BOM defined for this product</p>
                              <button onClick={() => setActiveTab('boms')} className="text-[9px] font-black text-red-800 underline mt-2 block mx-auto">Configure BOM in Master</button>
                           </div>
                         ) : (
                           <div className="space-y-3">
                              {selectedProduct.bom!.map(item => {
                                const inv = inventory.find(i => i.sku === item.sku);
                                const needed = item.quantity * prodQty;
                                const available = inv ? inv.stockLevel : 0;
                                const hasEnough = available >= needed;
                                
                                return (
                                  <div key={item.sku} className={`flex items-center justify-between p-5 rounded-2xl border ${hasEnough ? 'bg-white border-slate-100' : 'bg-red-50 border-red-100'}`}>
                                     <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasEnough ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-500'}`}>
                                           <Box size={20} />
                                        </div>
                                        <div>
                                           <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{catalog.find(c => c.sku === item.sku)?.name || item.sku}</p>
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</p>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-xs font-black text-slate-900">{needed} Units Required</p>
                                        <p className={`text-[9px] font-bold uppercase tracking-widest ${hasEnough ? 'text-emerald-500' : 'text-red-500'}`}>
                                           {hasEnough ? `Available: ${available}` : `Shortage: ${needed - available}`}
                                        </p>
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                         )}
                      </div>
                   </div>
                 )}
              </div>
            </div>

            {/* Run Actions */}
            <div className="space-y-6">
              <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white">
                 <Zap size={32} className="text-emerald-400 mb-6" />
                 <h3 className="text-xl font-black tracking-tight leading-tight mb-2 uppercase">Ready for Conversion?</h3>
                 <p className="text-slate-400 text-xs font-medium leading-relaxed mb-10">
                    Executing this will perform an atomic inventory conversion. Ingredients will be deducted and finished goods will be added to the vault.
                 </p>
                 
                 <button 
                   disabled={!canBuild || shortages.length > 0 || isProcessing || !selectedProduct}
                   onClick={handleStartRun}
                   className="w-full bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                 >
                   {/* Corrected: Added RefreshCw to lucide-react imports */}
                   {isProcessing ? <RefreshCw className="animate-spin" /> : <PackageCheck size={20} />}
                   Complete Production Run
                 </button>

                 {shortages.length > 0 && (
                   <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-6 text-center animate-pulse">
                     Cannot Start: Missing Ingredients
                   </p>
                 )}
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Console</h4>
                    <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Active</span>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-slate-500">BOM Loaded</span>
                       <span className="font-black text-slate-900">{canBuild ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-slate-500">Shortage Count</span>
                       <span className="font-black text-red-600">{shortages.length}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-left">
               <thead className="bg-slate-50">
                 <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Run ID</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Output</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Batch Qty</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Audit</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {productionHistory.map(run => (
                   <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">#{run.id.slice(-6)}</span>
                     </td>
                     <td className="px-8 py-6">
                        <p className="font-black text-slate-900">{catalog.find(c => c.sku === run.productSku)?.name || run.productSku}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{run.productSku}</p>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                           <ArrowDownLeft size={14} /> +{run.quantity}
                        </div>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{run.createdBy}</p>
                        <ShieldCheck size={12} className="mx-auto text-slate-300 mt-1" />
                     </td>
                     <td className="px-8 py-6 text-right">
                        <p className="text-xs font-bold text-slate-600">{new Date(run.date).toLocaleDateString()}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">{new Date(run.date).toLocaleTimeString()}</p>
                     </td>
                   </tr>
                 ))}
                 {productionHistory.length === 0 && (
                   <tr>
                      <td colSpan={5} className="py-32 text-center">
                         <History size={64} className="mx-auto text-slate-100 mb-6" />
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Conversion Vault Empty</p>
                      </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'boms' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-8 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Recipes (BOMs)</p>
             </div>
             <table className="w-full text-left">
               <thead className="bg-slate-50">
                 <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product SKU</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">BOM Structure</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {catalog.filter(c => c.category === 'Product' || c.category === 'Parts').map(item => (
                   <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-6">
                        <p className="font-black text-slate-900">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</p>
                     </td>
                     <td className="px-8 py-6">
                        {item.bom && item.bom.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                             {item.bom.map(b => (
                               <span key={b.sku} className="text-[8px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 uppercase">
                                  {b.sku} (x{b.quantity})
                               </span>
                             ))}
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">No BOM Linked</span>
                        )}
                     </td>
                     <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setEditingBOMProduct(item)}
                          className="text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Settings size={20} />
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>

      {/* BOM Editor Modal */}
      {editingBOMProduct && (
        <BOMEditor 
          product={editingBOMProduct}
          catalog={catalog}
          onClose={() => setEditingBOMProduct(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

interface BOMEditorProps {
  product: CatalogItem;
  catalog: CatalogItem[];
  onClose: () => void;
  onUpdate: () => void;
}

const BOMEditor: React.FC<BOMEditorProps> = ({ product, catalog, onClose, onUpdate }) => {
  const [bomItems, setBomItems] = useState<BOMItem[]>(product.bom || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddIngredient = () => {
    setBomItems([...bomItems, { sku: "", quantity: 1 }]);
  };

  const handleUpdateIngredient = (idx: number, field: keyof BOMItem, value: any) => {
    const newList = [...bomItems];
    newList[idx] = { ...newList[idx], [field]: value };
    setBomItems(newList);
  };

  const handleRemoveIngredient = (idx: number) => {
    setBomItems(bomItems.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedProduct = { ...product, bom: bomItems.filter(b => b.sku !== "") };
    await storageService.saveCatalogItem(updatedProduct);
    onUpdate();
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
       <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh]">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                   <Settings size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">BOM Architect</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{product.sku}: {product.name}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 transition-all"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
             <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredients / Child Components</h4>
                <button onClick={handleAddIngredient} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Plus size={14} /> Add Ingredient</button>
             </div>

             <div className="space-y-3">
                {bomItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex-1">
                        <select 
                          value={item.sku}
                          onChange={e => handleUpdateIngredient(idx, 'sku', e.target.value)}
                          className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-black text-slate-900 outline-none text-xs uppercase"
                        >
                           <option value="">Select Ingredient SKU...</option>
                           {catalog.filter(c => c.sku !== product.sku).map(c => (
                             <option key={c.sku} value={c.sku}>{c.sku} - {c.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="w-24">
                        <input 
                          type="number" min="0.1" step="0.1"
                          value={item.quantity}
                          onChange={e => handleUpdateIngredient(idx, 'quantity', parseFloat(e.target.value))}
                          className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-black text-slate-900 text-center outline-none text-xs"
                          placeholder="Qty"
                        />
                     </div>
                     <button onClick={() => handleRemoveIngredient(idx)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                     </button>
                  </div>
                ))}
                {bomItems.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                     <Box size={32} className="mx-auto text-slate-200 mb-2" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Ingredients Configured</p>
                  </div>
                )}
             </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
             <button onClick={onClose} className="flex-1 bg-white border border-slate-200 py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-white">Discard Changes</button>
             <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                <PackageCheck size={18} /> Update Master Recipe
             </button>
          </div>
       </div>
    </div>
  );
};

export default Manufacturing;
