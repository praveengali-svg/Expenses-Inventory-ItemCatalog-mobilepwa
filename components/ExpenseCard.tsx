import React from 'react';
import { ExpenseData, ExpenseCategory } from '../types';
import { Trash2, Calendar, ChevronRight, FileText, ImageIcon, User } from 'lucide-react';

interface Props {
  expense: ExpenseData;
  onDelete: (id: string) => void;
  onView?: (expense: ExpenseData) => void;
}

const ExpenseCard: React.FC<Props> = ({ expense, onDelete, onView }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const isPdf = expense.imageUrl?.includes('application/pdf');

  const categoryColors: Record<string, string> = {
    'Raw Materials': 'bg-amber-100 text-amber-700 border-amber-200',
    'Parts': 'bg-blue-100 text-blue-700 border-blue-200',
    'Product': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Service': 'bg-purple-100 text-purple-700 border-purple-200',
    'Courier': 'bg-pink-100 text-pink-700 border-pink-200',
    'Transportation': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Porter': 'bg-orange-100 text-orange-700 border-orange-200',
    'Consumables': 'bg-teal-100 text-teal-700 border-teal-200',
    'Other': 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // Summary categories
  const primaryCategory = expense.lineItems?.[0]?.category || 'Other';
  // Fixed unknown type error by using a type guard and explicit string[] typing to ensure itemCats indexability
  const itemCats: string[] = Array.from(new Set((expense.lineItems || []).map(i => i.category).filter((c): c is ExpenseCategory => !!c)));

  return (
    <div 
      className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50/50 transition-all group cursor-pointer flex flex-col h-full"
      onClick={() => onView?.(expense)}
    >
      <div className="h-32 bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
        {expense.imageUrl ? (
          isPdf ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <FileText size={32} strokeWidth={1.5} />
              <span className="text-[10px] font-black uppercase tracking-widest">Audit Document</span>
            </div>
          ) : (
            <img 
              src={expense.imageUrl} 
              alt="Receipt Preview" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-60 group-hover:opacity-100"
            />
          )
        ) : (
          <ImageIcon size={32} className="text-slate-200" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
        <div className="absolute top-3 left-3">
           <div className="bg-white/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1 shadow-sm">
              <User size={10} className="text-blue-600" />
              <span className="text-[8px] font-black uppercase text-slate-600 truncate max-w-[80px]">{expense.createdBy}</span>
           </div>
        </div>
        <div className="absolute top-3 right-3 flex gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
            className="bg-white/90 backdrop-blur p-1.5 rounded-lg text-slate-400 hover:text-red-500 shadow-sm border border-slate-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-wrap gap-1">
            {itemCats.slice(0, 2).map((cat, i) => (
              /* Use cat as string to ensure compatibility with Record<string, string> index */
              <span key={i} className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${categoryColors[cat] || categoryColors.Other}`}>
                {cat}
              </span>
            ))}
            {itemCats.length > 2 && <span className="text-[8px] font-black text-slate-400 px-1">+{itemCats.length - 2}</span>}
          </div>
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Calendar size={10} />
            {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </div>

        <h3 className="text-sm font-black text-slate-900 truncate mb-4">
          {expense.vendorName}
        </h3>
        
        <div className="mt-auto flex items-end justify-between pt-4 border-t border-slate-50">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Grand Total</p>
            <div className="text-lg font-black text-slate-900 tracking-tight">
              {formatCurrency(expense.totalAmount)}
            </div>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-blue-600 transition-all">
            <ChevronRight size={18} className="text-blue-600 group-hover:text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCard;