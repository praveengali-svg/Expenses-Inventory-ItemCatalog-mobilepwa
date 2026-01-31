
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Search, FileText, Printer, Trash2,
  ArrowRightLeft, FileCheck, ClipboardList, PackageCheck, Eye,
  ChevronDown, X, Edit3, User, Calendar, Tag, IndianRupee, PrinterIcon, DownloadCloud, ArrowRight, Layers
} from 'lucide-react';
import { SalesDocument, SalesDocType, InventoryItem, User as AppUser, LineItem, CatalogItem } from '../types';
import { storageService } from '../services/storage';
import SalesDocEditor from './SalesDocEditor';
import SalesDocViewer from './SalesDocViewer';
import BulkImport from './BulkImport';

interface Props {
  sales: SalesDocument[];
  inventory: InventoryItem[];
  catalog: CatalogItem[];
  currentUser: AppUser | null;
  onUpdate: () => void;
  defaultFilter?: SalesDocType | "All";
}

const Sales: React.FC<Props> = ({ sales, inventory, catalog, currentUser, onUpdate, defaultFilter = "All" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<SalesDocType | "All">(defaultFilter);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SalesDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState<SalesDocument | null>(null);
  const [creationType, setCreationType] = useState<SalesDocType>('sales_invoice');

  useEffect(() => {
    setFilterType(defaultFilter);
  }, [defaultFilter]);

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.docNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" || s.type === filterType;
    return matchesSearch && matchesType;
  });

  const docLabels: Record<SalesDocType, string> = {
    sales_invoice: 'Sales Invoice',
    credit_note: 'Sale Return',
    quotation: 'Quotation',
    proforma: 'Proforma Invoice',
    delivery_challan: 'Delivery Challan'
  };

  const docColors: Record<SalesDocType, string> = {
    sales_invoice: 'bg-orange-50 text-orange-600 border-orange-100',
    credit_note: 'bg-red-50 text-red-600 border-red-100',
    quotation: 'bg-blue-50 text-blue-600 border-blue-100',
    proforma: 'bg-purple-50 text-purple-600 border-purple-100',
    delivery_challan: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const handleCreateNew = (type: SalesDocType) => {
    setCreationType(type);
    setSelectedDoc(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (doc: SalesDocument) => {
    setViewingDoc(null);
    setSelectedDoc(doc);
    setCreationType(doc.type);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently remove this sales record?")) {
      await storageService.deleteSalesDoc(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {isEditorOpen && (
        <SalesDocEditor
          type={creationType}
          doc={selectedDoc}
          inventory={inventory}
          catalog={catalog}
          currentUser={currentUser}
          onClose={() => setIsEditorOpen(false)}
          onSave={onUpdate}
        />
      )}

      {viewingDoc && (
        <SalesDocViewer
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onEdit={handleEdit}
        />
      )}

      {isBulkImportOpen && (
        <BulkImport
          currentUser={currentUser}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={onUpdate}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Sales & Revenue</h2>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Outward Distribution Management</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-50 transition-all flex items-center gap-3"
          >
            <Layers size={18} /> Bulk Import
          </button>
          <button
            onClick={() => handleCreateNew('sales_invoice')}
            className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-orange-700 transition-all flex items-center gap-3"
          >
            <Plus size={18} /> New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search Customer or Doc #..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 px-12 py-3.5 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto max-w-full">
            {(['All', 'sales_invoice', 'proforma', 'quotation', 'credit_note', 'delivery_challan'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === type ? 'bg-white text-orange-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-900'
                  }`}
              >
                {type === 'All' ? 'View All' : docLabels[type as SalesDocType]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setViewingDoc(doc)}>
                  <td className="px-8 py-6">
                    <div>
                      <p className="font-black text-slate-900 leading-tight uppercase tracking-tight">{doc.docNumber}</p>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${docColors[doc.type]}`}>
                        {docLabels[doc.type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{doc.customerName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar size={10} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${doc.status === 'issued' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className={`font-black text-sm tracking-tight ${(doc.balanceAmount || 0) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {formatCurrency(doc.balanceAmount || 0)}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="font-black text-slate-900 tracking-tight">{formatCurrency(doc.totalAmount)}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(doc); }}
                        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-orange-600 shadow-sm transition-all"
                        title="Edit Data"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all"
                        title="View & Print"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 shadow-sm transition-all"
                        title="Delete Permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-200">
                      <ShoppingBag size={64} />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Sales Ledger is Empty</p>
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

export default Sales;
