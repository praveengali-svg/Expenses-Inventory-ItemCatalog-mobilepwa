
import React, { useState, useRef } from 'react';
import { 
  X, Upload, FileText, Table as TableIcon, CheckCircle2, 
  AlertCircle, RefreshCw, Layers, ShieldCheck, Database, 
  ArrowRight, IndianRupee, LayoutGrid, Check, Info, FileSpreadsheet
} from 'lucide-react';
import { SalesDocument, User, SalesDocType, LineItem } from '../types';
import { storageService } from '../services/storage';
import { extractSalesData } from '../services/gemini';
import * as XLSX from 'xlsx';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  currentUser: User | null;
}

interface ImportItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  data?: Partial<SalesDocument>;
  error?: string;
}

interface SpreadsheetMapping {
  customerName: string;
  docNumber: string;
  date: string;
  totalAmount: string;
  customerGst: string;
}

const BulkImport: React.FC<Props> = ({ onClose, onSuccess, currentUser }) => {
  const [mode, setMode] = useState<'pdf' | 'spreadsheet'>('pdf');
  const [importQueue, setImportQueue] = useState<ImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Spreadsheet specific state
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<SpreadsheetMapping>({
    customerName: '',
    docNumber: '',
    date: '',
    totalAmount: '',
    customerGst: ''
  });
  const [previewData, setPreviewData] = useState<Partial<SalesDocument>[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (mode === 'pdf') {
      const newItems: ImportItem[] = files.map(f => ({
        id: crypto.randomUUID(),
        file: f,
        status: 'pending'
      }));
      setImportQueue([...importQueue, ...newItems]);
    } else {
      // Spreadsheet handling
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        if (jsonData.length > 0) {
          setSpreadsheetData(jsonData);
          setColumns(Object.keys(jsonData[0]));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);
    const updatedQueue = [...importQueue];

    for (let i = 0; i < updatedQueue.length; i++) {
      if (updatedQueue[i].status !== 'pending') continue;

      updatedQueue[i].status = 'processing';
      setImportQueue([...updatedQueue]);

      try {
        const file = updatedQueue[i].file;
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const extracted = await extractSalesData(base64, file.type, file.name);
        updatedQueue[i].data = extracted;
        updatedQueue[i].status = 'done';
      } catch (err) {
        updatedQueue[i].status = 'error';
        updatedQueue[i].error = "AI Extraction Failed";
      }
      setImportQueue([...updatedQueue]);
    }
    setIsProcessing(false);
  };

  const generatePreview = () => {
    const parsed = spreadsheetData.map(row => {
      const doc: Partial<SalesDocument> = {
        id: crypto.randomUUID(),
        customerName: String(row[mapping.customerName] || "Unknown"),
        docNumber: String(row[mapping.docNumber] || `IMP-${Date.now()}`),
        date: String(row[mapping.date] || new Date().toISOString().split('T')[0]),
        totalAmount: Number(row[mapping.totalAmount]) || 0,
        customerGst: String(row[mapping.customerGst] || ""),
        type: 'sales_invoice',
        status: 'issued',
        createdAt: Date.now(),
        createdBy: currentUser?.name || 'System',
        lineItems: [{
          description: "Spreadsheet Import",
          quantity: 1,
          rate: Number(row[mapping.totalAmount]) || 0,
          amount: Number(row[mapping.totalAmount]) || 0,
          category: 'Product'
        }]
      };
      return doc;
    });
    setPreviewData(parsed);
  };

  const finalizeImport = async () => {
    setIsProcessing(true);
    try {
      const docsToSave = mode === 'pdf' 
        ? importQueue.filter(q => q.status === 'done').map(q => q.data as SalesDocument)
        : previewData as SalesDocument[];

      for (const doc of docsToSave) {
        // Ensure standard fields are present
        const fullDoc: SalesDocument = {
          taxAmount: 0,
          notes: "Batch Imported",
          lineItems: [],
          ...doc,
          createdBy: currentUser?.name || 'Batch User'
        } as SalesDocument;
        await storageService.saveSalesDoc(fullDoc);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert("Failed to save imported documents.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isSpreadsheetValid = mapping.customerName && mapping.totalAmount && spreadsheetData.length > 0;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12 overflow-hidden">
      <div className="bg-white w-full h-full max-w-6xl rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-5">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl">
                 <Layers size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Sales Ingest</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Automated Multi-Source Extraction</p>
              </div>
           </div>
           <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button 
                onClick={() => { setMode('pdf'); setImportQueue([]); setPreviewData([]); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'pdf' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
              >
                <FileText size={14} /> PDF/AI Batch
              </button>
              <button 
                onClick={() => { setMode('spreadsheet'); setImportQueue([]); setPreviewData([]); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'spreadsheet' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
              >
                <TableIcon size={14} /> Excel Mapper
              </button>
           </div>
           <button onClick={onClose} className="p-3 text-slate-300 hover:text-slate-900 rounded-2xl hover:bg-white transition-all"><X size={28} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Main Workspace */}
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-10 custom-scrollbar">
             
             {mode === 'pdf' ? (
               <div className="space-y-10">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-4 border-dashed border-slate-100 rounded-[3rem] py-20 text-center hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                     <div className="drift-animation inline-block mb-6">
                        <Upload size={64} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                     </div>
                     <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Select Neural Batch</h3>
                     <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Select multiple PDF or Image invoices from your files</p>
                  </div>

                  {importQueue.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {importQueue.map(item => (
                         <div key={item.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className={`p-3 rounded-xl ${item.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
                                  <FileText size={20} />
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-900 truncate max-w-[150px]">{item.file.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.status}</p>
                               </div>
                            </div>
                            {item.status === 'processing' && <RefreshCw size={16} className="animate-spin text-blue-500" />}
                            {item.status === 'done' && <CheckCircle2 size={20} className="text-emerald-500" />}
                            {item.status === 'error' && <AlertCircle size={20} className="text-red-500" />}
                         </div>
                       ))}
                    </div>
                  )}
               </div>
             ) : (
               <div className="space-y-10">
                  {spreadsheetData.length === 0 ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-4 border-dashed border-slate-100 rounded-[3rem] py-20 text-center hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                    >
                      <FileSpreadsheet size={64} className="mx-auto text-slate-200 mb-6 group-hover:text-emerald-400 transition-colors" />
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Connect Ledger File</h3>
                      <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Upload .xlsx, .xls or .csv</p>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                       <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <Database className="text-emerald-600" />
                             <div>
                                <p className="text-sm font-black text-emerald-900 uppercase">File Parsed</p>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{spreadsheetData.length} records identified</p>
                             </div>
                          </div>
                          <button onClick={() => setSpreadsheetData([])} className="text-emerald-400 hover:text-emerald-900"><RefreshCw size={18} /></button>
                       </div>

                       <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Entity Field Mapping</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {(Object.keys(mapping) as Array<keyof SpreadsheetMapping>).map(field => (
                               <div key={field} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{field.replace(/([A-Z])/g, ' $1')}</label>
                                  <select 
                                    value={mapping[field]}
                                    onChange={e => setMapping({...mapping, [field]: e.target.value})}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  >
                                    <option value="">Map Column...</option>
                                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                  </select>
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       <button 
                         onClick={generatePreview}
                         disabled={!isSpreadsheetValid}
                         className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50"
                       >
                         Generate Pre-Ingest Preview
                       </button>
                    </div>
                  )}

                  {previewData.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ingest Preview</h3>
                       <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                          <table className="w-full text-left text-xs font-bold">
                             <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                   <th className="px-6 py-4">Customer</th>
                                   <th className="px-6 py-4">Invoice #</th>
                                   <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {previewData.slice(0, 5).map((d, idx) => (
                                  <tr key={idx} className="bg-white">
                                     <td className="px-6 py-4 truncate max-w-[200px]">{d.customerName}</td>
                                     <td className="px-6 py-4">{d.docNumber}</td>
                                     <td className="px-6 py-4 text-right">₹{d.totalAmount?.toLocaleString()}</td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                          {previewData.length > 5 && (
                            <div className="p-4 text-center bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                               And {previewData.length - 5} more records...
                            </div>
                          )}
                       </div>
                    </div>
                  )}
               </div>
             )}

             <input type="file" ref={fileInputRef} className="hidden" multiple={mode === 'pdf'} accept={mode === 'pdf' ? 'application/pdf,image/*' : '.xlsx,.xls,.csv'} onChange={handleFileSelect} />
          </div>

          {/* Sidebar / Status Panel */}
          <div className="w-full lg:w-96 bg-slate-50 border-l border-slate-100 p-8 lg:p-10 flex flex-col space-y-10">
             <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingest Control</h4>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Method</span>
                      <span className="font-black text-slate-900 uppercase tracking-tight">{mode === 'pdf' ? 'Neural Batch' : 'Excel Mapping'}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Total Items</span>
                      <span className="font-black text-blue-600">{mode === 'pdf' ? importQueue.length : spreadsheetData.length}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Verified</span>
                      <span className="font-black text-emerald-600">{mode === 'pdf' ? importQueue.filter(q => q.status === 'done').length : previewData.length}</span>
                   </div>
                </div>
             </div>

             <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl text-white flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                   <ShieldCheck size={24} className="text-blue-200" />
                   <h3 className="text-lg font-black uppercase tracking-tight leading-tight">Secure Vault Transfer</h3>
                </div>
                <p className="text-blue-100 text-[10px] font-bold leading-relaxed uppercase mb-10">
                  Data extracted will be atomically committed to the Voltx Ledger. Ensure GST compatibility before finalizing.
                </p>
                
                <div className="mt-auto space-y-4">
                   {mode === 'pdf' && importQueue.length > 0 && importQueue.some(q => q.status === 'pending') && (
                     <button 
                       onClick={processQueue}
                       disabled={isProcessing}
                       className="w-full bg-white text-blue-600 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                     >
                       {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <Layers size={20} />}
                       Initiate Neural Extraction
                     </button>
                   )}

                   <button 
                     disabled={isProcessing || (mode === 'pdf' ? !importQueue.some(q => q.status === 'done') : previewData.length === 0)}
                     onClick={finalizeImport}
                     className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                   >
                     {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                     Finalize Vault Ingest
                   </button>
                </div>
             </div>

             <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-200">
                <Info size={16} className="text-slate-400 shrink-0" />
                <p className="text-[8px] font-bold text-slate-500 uppercase leading-tight tracking-widest">
                  Bulk import uses asynchronous processing. Large batches may take up to 2 minutes.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
