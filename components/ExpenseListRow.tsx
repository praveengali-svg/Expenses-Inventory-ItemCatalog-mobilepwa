
import React, { useState } from 'react';
import { ExpenseData, LineItem, ExpenseCategory, CatalogItem } from '../types';
import { ChevronDown, ChevronUp, Eye, Trash2, Building2, Receipt, Calendar, User, Edit3, Save, XCircle, Tag, Plus, Link as LinkIcon } from 'lucide-react';
import CatalogLinkModal from './CatalogLinkModal';

interface Props {
  expense: ExpenseData;
  onDelete: (id: string) => void;
  onView: (expense: ExpenseData) => void;
  onUpdate?: (updated: ExpenseData) => void;
}

const ExpenseListRow: React.FC<Props> = ({ expense, onDelete, onView, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState<ExpenseData>({ ...expense });
  const [linkModalConfig, setLinkModalConfig] = useState<{ idx: number, query: string } | null>(null);

  // Sync state with props when data changes. 
  // We removed isEditing from deps to prevent reverting to stale props immediately after 'Save' (when isEditing becomes false but props haven't updated yet).
  React.useEffect(() => {
    if (!isEditing) {
      setEditForm({ ...expense });
    }
  }, [expense]);

  const categories: ExpenseCategory[] = ["Parts", "Product", "Raw Materials", "Consumables", "Service", "Other", "Purchase", "Courier", "Transportation", "Porter", "Salaries", "Rent", "Utilities", "IT", "Fees", "R&D", "Marketing"];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const categoryColors: Record<string, string> = {
    'Raw Materials': 'bg-amber-50 text-amber-600 border-amber-100',
    'Parts': 'bg-blue-50 text-blue-600 border-blue-100',
    'Product': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Service': 'bg-purple-50 text-purple-600 border-purple-100',
    'Other': 'bg-slate-50 text-slate-600 border-slate-100',
    'Purchase': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'Courier': 'bg-pink-50 text-pink-600 border-pink-100',
    'Transportation': 'bg-cyan-50 text-cyan-600 border-cyan-100',
    'Porter': 'bg-orange-50 text-orange-600 border-orange-100',
    'Consumables': 'bg-teal-50 text-teal-600 border-teal-100',
    'Salaries': 'bg-rose-50 text-rose-600 border-rose-100',
    'Rent': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
    'Utilities': 'bg-yellow-50 text-yellow-600 border-yellow-100',
    'IT': 'bg-sky-50 text-sky-600 border-sky-100',
    'Fees': 'bg-red-50 text-red-600 border-red-100',
    'R&D': 'bg-violet-50 text-violet-600 border-violet-100',
    'Marketing': 'bg-lime-50 text-lime-600 border-lime-100'
  };

  // Determine "Primary" category for the row badge based on the first item
  const primaryCategory = expense.lineItems?.[0]?.category || 'Other';
  const hasMultipleCats = new Set(expense.lineItems?.map(i => i.category)).size > 1;

  const ITEM_LIMIT = 5;
  const itemsToShow = showAllItems ? (editForm.lineItems || []) : (editForm.lineItems?.slice(0, ITEM_LIMIT) || []);
  const hasMoreItems = (editForm.lineItems || []).length > ITEM_LIMIT;

  const handleUpdateItem = (index: number, field: keyof LineItem, value: string | number) => {
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

  const handleLinkItem = (index: number, item: CatalogItem) => {
    if (!item || !item.sku) return;
    const newList = [...(editForm.lineItems || [])];
    newList[index] = {
      ...newList[index],
      sku: item.sku,
      hsnCode: item.hsnCode || newList[index].hsnCode, // Keep existing if missing
      description: item.name,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure || 'PCS'
    };
    setEditForm({ ...editForm, lineItems: newList });
    setLinkModalConfig(null);
  };

  const handleAddItem = () => {
    const newItem: LineItem = { description: '', amount: 0, quantity: 1, rate: 0, category: 'Other', unitOfMeasure: 'PCS' };
    const currentItems = editForm.lineItems || [];
    setEditForm({ ...editForm, lineItems: [...currentItems, newItem] });
  };

  const handleRemoveItem = (index: number) => {
    const newList = (editForm.lineItems || []).filter((_, i) => i !== index);
    const newTotal = newList.reduce((acc, item) => acc + (item.amount || 0), 0);
    setEditForm({ ...editForm, lineItems: newList, totalAmount: newTotal });
  };

  const handleSave = () => {
    if (onUpdate) onUpdate(editForm);
    // Do NOT set isEditing(false) immediately if you want to avoid optimistic revert. 
    // However, typically we close the form. The useEffect will handle the update when props change.
    setIsEditing(false);
  };

  return (
    <>
      <tr
        className={`group transition-colors cursor-pointer border-l-4 ${isExpanded ? 'bg-blue-50/30 border-blue-600' : 'hover:bg-slate-50/80 border-transparent'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="px-6 py-4">
          <div className={`p-2 rounded-xl inline-flex ${expense.type === 'invoice' ? 'bg-slate-900 text-white' : 'bg-slate-600 text-white'}`}>
            {expense.type === 'invoice' ? <Building2 size={16} /> : <Receipt size={16} />}
          </div>
        </td>
        <td className="px-6 py-4">
          <p className="text-sm font-black text-white group-hover:text-slate-900 transition-colors uppercase tracking-tight">{expense.vendorName}</p>
          <div className="flex items-center gap-1.5 mt-1 text-slate-400 font-bold text-[10px] group-hover:text-slate-500">
            <Calendar size={10} />
            {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${categoryColors[primaryCategory] || categoryColors.Other}`}>
              {primaryCategory}
            </span>
            {hasMultipleCats && <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">+ Others</span>}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{expense.createdBy}</span>
            <User size={10} className="text-slate-300" />
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(expense.totalAmount)}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{expense.lineItems?.length || 0} Items</p>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onView(expense); }}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 shadow-sm"
            >
              <Trash2 size={16} />
            </button>
            <div className="p-2 text-slate-300">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-12 py-6 bg-slate-50/50 border-b border-slate-200/50">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                <div className="flex items-center gap-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Audit Log</p>
                  {isEditing && (
                    <button onClick={handleAddItem} className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl hover:bg-blue-100 transition-colors uppercase tracking-widest">
                      <Plus size={12} /> Add Item
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={handleSave} className="flex items-center gap-1.5 text-[9px] font-black text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-md hover:bg-blue-700 transition-colors uppercase tracking-widest">
                        <Save size={14} /> Commit Edit
                      </button>
                      <button onClick={() => { setEditForm({ ...expense }); setIsEditing(false); }} className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest">
                        <XCircle size={14} /> Discard
                      </button>
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setEditForm({ ...expense }); setIsEditing(true); }} className="flex items-center gap-1.5 text-[9px] font-black text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-widest">
                      <Edit3 size={14} /> Edit Items
                    </button>
                  )}
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item & Category</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">HSN/SAC</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty / Rate</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                    {isEditing && <th className="px-4"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itemsToShow?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <select
                              value={item.category || 'Other'}
                              onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800">{item.description}</p>
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase">{item.category}</span>
                              {item.sku && <span className="text-[8px] font-black bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1"><LinkIcon size={8} /> {item.sku}</span>}
                            </div>
                          </div>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => setLinkModalConfig({ idx, query: item.description })}
                            className="mt-2 text-[9px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            <Tag size={10} /> {item.sku ? 'Change Link' : 'Link SKU'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.hsnCode || ''}
                            onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-center outline-none uppercase"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{item.hsnCode || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none"
                            />
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleUpdateItem(idx, 'rate', Number(e.target.value))}
                              className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-center outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-600">{item.quantity || 1}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase">@{formatCurrency(item.rate || item.amount)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleUpdateItem(idx, 'amount', Number(e.target.value))}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-right outline-none"
                          />
                        ) : (
                          <span className="text-xs font-black text-slate-900">{formatCurrency(item.amount)}</span>
                        )}
                      </td>
                      {isEditing && (
                        <td className="px-4 text-right">
                          <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50/30 flex justify-between items-center border-t border-slate-100">
                <div className="flex gap-4">
                  {hasMoreItems && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllItems(!showAllItems); }}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors flex items-center gap-2"
                    >
                      {showAllItems ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Show All</>}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Total:</p>
                  <p className="text-sm font-black text-slate-900">{formatCurrency(isEditing ? editForm.totalAmount : expense.totalAmount)}</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
      {
        linkModalConfig && (
          <CatalogLinkModal
            initialQuery={linkModalConfig.query}
            onClose={() => setLinkModalConfig(null)}
            onSelect={(item) => handleLinkItem(linkModalConfig.idx, item)}
          />
        )
      }
    </>
  );
};

export default ExpenseListRow;
