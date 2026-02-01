import React, { useState, useEffect, useRef, useCallback } from 'react';
import { compressImage } from './utils/image';
import {
  LayoutDashboard, History, ScanLine, Receipt, RefreshCw, Camera, Upload, Box, ShoppingBag, BookOpen, Building2, Wallet, Plus, FilePlus, Zap, ImageIcon, ChevronLeft, ChevronRight, Menu, FileText, ClipboardList, ArrowRightLeft, PackageCheck, XCircle, ChevronDown, IndianRupee, Cloud, CloudOff, ShieldCheck, CheckCircle2, AlertCircle, FileCheck, PieChart
} from 'lucide-react';
import { AppStatus, ExpenseData, User, InventoryItem, SalesDocument, CatalogItem, SalesDocType, DocumentType } from './types';
import { storageService } from './services/storage';
import { extractExpenseData } from './services/gemini';
import { googleDriveService } from './services/googleDrive';
import Dashboard from './components/Dashboard';
import ReceiptViewer from './components/ReceiptViewer';
import CameraScanner from './components/CameraScanner';
import ExpenseListRow from './components/ExpenseListRow';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Catalog from './components/Catalog';
import Reports from './components/Reports';
import Login from './components/Login';
import PurchaseOrderEditor from './components/PurchaseOrderEditor';
import Manufacturing from './components/Manufacturing';
import MediaLibrary from './components/MediaLibrary';
import Users from './components/Users';

type TabID = 'dashboard' | 'purchase_invoice' | 'purchase_order' | 'opex' | 'sales_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'delivery_challan' | 'inventory' | 'catalog' | 'reports' | 'manufacturing' | 'media' | 'users';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabID>('dashboard');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [sales, setSales] = useState<SalesDocument[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPOEditor, setShowPOEditor] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSalesExpanded, setIsSalesExpanded] = useState(true);
  const [isPurchasesExpanded, setIsPurchasesExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLocalData = useCallback(async () => {
    const [exp, sls, inv, cat] = await Promise.all([
      storageService.getExpenses(),
      storageService.getSales(),
      storageService.getInventory(),
      storageService.getCatalog()
    ]);
    setExpenses(exp);
    setSales(sls);
    setInventory(inv);
    setCatalog(cat);
  }, []);

  const neuralCloudSync = useCallback(async (forceDirection?: 'push' | 'pull') => {
    if (!user) return;
    setCloudStatus('synced'); // In Firestore, we are always "synced" if connection is live
  }, [user]);

  useEffect(() => {
    if (user) {
      loadLocalData();
      // Enforce role-based access for staff
      if (user.role === 'staff' && (activeTab === 'dashboard' || activeTab === 'reports' || activeTab === 'opex' || activeTab === 'purchase_order' || activeTab === 'inventory' || activeTab === 'manufacturing' || activeTab === 'media' || activeTab === 'users' || activeTab === 'proforma' || activeTab === 'quotation' || activeTab === 'credit_note' || activeTab === 'delivery_challan')) {
        setActiveTab('purchase_invoice');
      }
    }
  }, [user, activeTab, loadLocalData]);

  const processFile = async (file: File | { base64: string, mimeType: string, name: string }) => {
    setStatus(AppStatus.SCANNING);

    let fileData = '';
    let mimeType = '';
    let fileName = '';

    if (file instanceof File) {
      fileName = file.name;
      mimeType = file.type;
      const rawData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      // Compress immediately for storage efficiency
      fileData = await compressImage(rawData, 1200, 0.6);
    } else {
      // For camera/base64 inputs
      fileData = await compressImage(file.base64, 1200, 0.6);
      mimeType = file.mimeType;
      fileName = file.name;
    }

    const hint: DocumentType | undefined = activeTab === 'purchase_order' ? 'purchase_order' : (activeTab === 'purchase_invoice' ? 'invoice' : 'expense');

    try {
      const extracted = await extractExpenseData(fileData, mimeType, fileName, hint);

      const newExpense: ExpenseData = {
        vendorName: "Unknown Vendor",
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        taxAmount: 0,
        currency: 'INR',
        lineItems: [],
        fileName,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        type: hint || extracted.type || 'expense',
        ...extracted,
        imageUrl: fileData,
        createdBy: user!.name,
      } as ExpenseData;

      await storageService.saveExpense(newExpense);
      await loadLocalData();
      await neuralCloudSync('push');
      setStatus(AppStatus.IDLE);
      setSelectedExpense(newExpense);
    } catch (err: any) {
      console.error("AI Ingest failed", err);

      // Fallback: Save as a draft/manual entry
      const fallbackExpense: ExpenseData = {
        vendorName: "Manual Review Required",
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        taxAmount: 0,
        currency: 'INR',
        lineItems: [],
        fileName,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        type: hint || 'expense',
        imageUrl: fileData,
        createdBy: user!.name,
        status: 'received', // Mark as received but needs review
        docNumber: 'PENDING-SCAN'
      } as ExpenseData;

      await storageService.saveExpense(fallbackExpense);
      await loadLocalData();

      alert(`Scan failed (${err.message}). Document saved for manual review.`);
      setStatus(AppStatus.IDLE);
    }
  };

  const wrapChange = async (fn: () => Promise<void>) => {
    await fn();
    await loadLocalData();
    neuralCloudSync('push');
  };

  if (!user) return <Login onLogin={setUser} />;

  const isSalesTab = ['sales_invoice', 'proforma', 'quotation', 'credit_note', 'delivery_challan'].includes(activeTab);

  const renderDocLog = (data: ExpenseData[], title: string, subtitle: string, isPO = false) => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 antigravity-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">{title}</h3>
          <p className="text-blue-400 text-[10px] font-black mt-2 uppercase tracking-[0.4em]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
          {isPO && <button onClick={() => setShowPOEditor(true)} className="flex-1 bg-orange-600 text-white px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><FilePlus size={18} /> New PO</button>}
          <button onClick={() => setShowScanner(true)} className="flex-1 bg-white/10 text-white px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-3"><Camera size={18} /> Scan</button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><Upload size={18} /> Ingest</button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" accept="image/*,application/pdf" />
        </div>
      </div>

      <div className="glass-container rounded-[2.5rem] md:rounded-[4rem] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-white/5">
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Issuer</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tag</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Audit</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map(exp => (
                <ExpenseListRow
                  key={exp.id} expense={exp} onView={setSelectedExpense}
                  onDelete={async (id) => { if (confirm("Purge document?")) await wrapChange(() => storageService.deleteExpense(id)); }}
                  onUpdate={async (u) => await wrapChange(() => storageService.saveExpense(u))}
                />
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && <div className="py-48 text-center text-slate-600"><History size={64} className="mx-auto mb-6 opacity-20" /><h3 className="font-black uppercase tracking-[0.5em]">Vault Idle</h3></div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Sidebar */}
      <aside
        className={`${isSidebarCollapsed ? 'md:w-28' : 'md:w-80'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:sticky left-0 top-0 h-screen w-80 bg-slate-950/95 backdrop-blur-3xl flex flex-col p-6 z-[200] transition-all duration-500 border-r border-white/5`}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-16`}>
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="bg-white p-1 rounded-2xl min-w-[48px] h-12 flex items-center justify-center overflow-hidden"><img src="https://lh3.googleusercontent.com/d/1snOc6lVZIwKa-bnUR39Nxr6DelKUjRmQ" className="w-full h-full object-contain" alt="Voltx" /></div>
            {!isSidebarCollapsed && <div className="animate-in fade-in slide-in-from-left-4"><h1 className="text-white font-black text-xl tracking-tighter uppercase leading-none">Voltx EV</h1><p className="text-blue-400 text-[8px] font-black uppercase tracking-[0.4em] mt-1.5">Neural Vault</p></div>}
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white"><XCircle /></button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          {user.role === 'admin' && <NavItem id="dashboard" label="Neural Hub" icon={LayoutDashboard} active={activeTab === 'dashboard'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />}
          <div className="pt-6">
            <p className={`text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 px-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Purchases</p>
            <NavItem id="purchase_invoice" label="Invoices" icon={Receipt} active={activeTab === 'purchase_invoice'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('purchase_invoice'); setIsMobileMenuOpen(false); }} />
            {user.role === 'admin' && <NavItem id="opex" label="Expenses" icon={Wallet} active={activeTab === 'opex'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('opex'); setIsMobileMenuOpen(false); }} />}
            {user.role === 'admin' && <NavItem id="purchase_order" label="Orders" icon={FileText} active={activeTab === 'purchase_order'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('purchase_order'); setIsMobileMenuOpen(false); }} />}
          </div>
          <div className="pt-6">
            <p className={`text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 px-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Revenue</p>
            <NavItem id="sales_invoice" label="Billing" icon={IndianRupee} active={activeTab === 'sales_invoice'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('sales_invoice'); setIsMobileMenuOpen(false); }} />
            {user.role === 'admin' && (
              <>
                <NavItem id="proforma" label="Proforma" icon={FileCheck} active={activeTab === 'proforma'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('proforma'); setIsMobileMenuOpen(false); }} />
                <NavItem id="quotation" label="Quotation" icon={ClipboardList} active={activeTab === 'quotation'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('quotation'); setIsMobileMenuOpen(false); }} />
                <NavItem id="delivery_challan" label="Challans" icon={PackageCheck} active={activeTab === 'delivery_challan'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('delivery_challan'); setIsMobileMenuOpen(false); }} />
                <NavItem id="credit_note" label="Returns" icon={ArrowRightLeft} active={activeTab === 'credit_note'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('credit_note'); setIsMobileMenuOpen(false); }} />
              </>
            )}
          </div>
          <div className="pt-6">
            <p className={`text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 px-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Logistics</p>
            {user.role === 'admin' && <NavItem id="inventory" label="Inventory" icon={Box} active={activeTab === 'inventory'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} />}
            <NavItem id="catalog" label="Master" icon={BookOpen} active={activeTab === 'catalog'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('catalog'); setIsMobileMenuOpen(false); }} />
          </div>
          {user.role === 'admin' && (
            <div className="pt-6">
              <p className={`text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 px-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>Insights</p>
              <NavItem id="reports" label="Analytics" icon={PieChart} active={activeTab === 'reports'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} />
            </div>
          )}
          {user.role === 'admin' && (
            <div className="pt-6">
              <p className={`text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 px-4 ${isSidebarCollapsed ? 'hidden' : ''}`}>System</p>
              <NavItem id="users" label="Access" icon={ShieldCheck} active={activeTab === 'users'} collapsed={isSidebarCollapsed} onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} />
            </div>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className={`flex items-center gap-4 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">{user.name.charAt(0)}</div>
            {!isSidebarCollapsed && <div className="flex-1 overflow-hidden"><p className="text-white text-[10px] font-black truncate">{user.name}</p><p className="text-slate-500 text-[8px] font-black uppercase">{user.role}</p></div>}
            <button onClick={() => neuralCloudSync()} className="text-slate-600 hover:text-blue-400 transition-colors"><RefreshCw size={14} className={cloudStatus === 'syncing' ? 'animate-spin' : ''} /></button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(37,99,235,0.05)_0%,transparent_50%)]">
        <header className="h-20 md:h-32 flex justify-between items-center px-6 md:px-12 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50 bg-slate-950/50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-white"><Menu /></button>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase italic">{activeTab.replace('_', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all ${cloudStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              cloudStatus === 'syncing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'
              }`}>
              {cloudStatus === 'synced' ? <Cloud size={14} className="animate-pulse" /> : <CloudOff size={14} />}
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                {cloudStatus === 'synced' ? 'Neural Link Active' : cloudStatus === 'syncing' ? 'Syncing...' : 'Link Idle'}
              </span>
            </div>
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
              <Building2 size={32} className="text-white" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard
                expenses={expenses}
                sales={sales}
                onRestore={async (data) => {
                  await storageService.importFullVault(data);
                  await loadLocalData();
                  // Firestore handles its own sync, no need for manual push
                }}
              />
            )}
            {activeTab === 'purchase_invoice' && renderDocLog(expenses.filter(e => e.type === 'invoice'), "Purchase Invoices", "Supply Flow")}
            {activeTab === 'purchase_order' && renderDocLog(expenses.filter(e => e.type === 'purchase_order'), "Orders", "Formal Procurement", true)}
            {activeTab === 'opex' && renderDocLog(expenses.filter(e => e.type === 'expense'), "Operations", "Overhead Ledger")}
            {isSalesTab && <Sales sales={sales} inventory={inventory} catalog={catalog} currentUser={user} onUpdate={loadLocalData} defaultFilter={activeTab as SalesDocType} />}
            {activeTab === 'inventory' && <Inventory items={inventory} catalog={catalog} onUpdate={loadLocalData} />}
            {activeTab === 'catalog' && <Catalog items={catalog} inventory={inventory} currentUser={user} onUpdate={loadLocalData} />}
            {activeTab === 'reports' && <Reports sales={sales} expenses={expenses} />}
            {activeTab === 'manufacturing' && <Manufacturing catalog={catalog} inventory={inventory} currentUser={user} onUpdate={loadLocalData} />}
            {activeTab === 'media' && <MediaLibrary expenses={expenses} catalog={catalog} onUpdate={loadLocalData} />}
            {activeTab === 'users' && user.role === 'admin' && <Users onUpdate={loadLocalData} />}
          </div>
        </div>
      </main>

      {selectedExpense && <ReceiptViewer expense={selectedExpense} onClose={() => setSelectedExpense(null)} onUpdate={async (u) => wrapChange(() => storageService.saveExpense(u))} />}
      {showScanner && <CameraScanner onCapture={(b) => { processFile({ base64: b, mimeType: 'image/jpeg', name: `sc_${Date.now()}.jpg` }); setShowScanner(false); }} onClose={() => setShowScanner(false)} title="Neural Audit" />}
      {showPOEditor && <PurchaseOrderEditor catalog={catalog} currentUser={user} onClose={() => setShowPOEditor(false)} onSave={() => wrapChange(() => Promise.resolve())} />}

      {status === AppStatus.SCANNING && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="relative mb-20">
            <div className="scan-beam"></div>
            <div className="w-56 h-56 border-2 border-blue-500/20 rounded-[4rem] animate-pulse flex items-center justify-center bg-white/5 shadow-[0_0_100px_rgba(37,99,235,0.1)]">
              <ScanLine size={80} className="text-blue-500" />
            </div>
          </div>
          <h2 className="text-white font-black text-5xl uppercase tracking-[0.5em] mb-4 italic">Ingesting</h2>
          <p className="text-blue-400 font-bold text-sm uppercase tracking-[0.3em] animate-pulse">Mapping Document to Neural Ledger...</p>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ id: string, label: string, icon: any, active: boolean, collapsed: boolean, onClick: () => void }> = ({ id, label, icon: Icon, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all relative magnetic-item ${active ? 'bg-blue-600 text-white shadow-[0_20px_50px_-10px_rgba(37,99,235,0.6)] scale-105 z-10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
  >
    <Icon size={18} className={active ? 'scale-110' : 'opacity-60'} />
    {!collapsed && <span className="truncate">{label}</span>}
  </button>
);

export default App;
