import React, { useState, useEffect, useMemo } from 'react';
import { compressImage } from '../utils/image';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { ExpenseData, SalesDocument } from '../types';
import { ArrowUpCircle, ShoppingBag, Wallet, Zap, ArrowRight } from 'lucide-react';

interface Props {
  expenses: ExpenseData[];
  sales: SalesDocument[];
  onRestore: (data: any) => Promise<void>;
}

const Dashboard: React.FC<Props> = ({ expenses, sales, onRestore }) => {
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const monthwiseSummary = useMemo(() => {
    const summary: Record<string, { totalPurchase: number; totalRev: number }> = {};
    expenses.forEach(e => {
      const key = new Date(e.date).toLocaleString('en-IN', { month: 'short' });
      if (!summary[key]) summary[key] = { totalPurchase: 0, totalRev: 0 };
      summary[key].totalPurchase += e.totalAmount;
    });
    sales.filter(s => s.type === 'sales_invoice').forEach(s => {
      const key = new Date(s.date).toLocaleString('en-IN', { month: 'short' });
      if (!summary[key]) summary[key] = { totalPurchase: 0, totalRev: 0 };
      summary[key].totalRev += s.totalAmount;
    });

    // Sort by month order if needed, here just returning entries
    return Object.entries(summary).map(([name, data]) => ({
      name,
      revenue: data.totalRev,
      purchases: data.totalPurchase
    }));
  }, [expenses, sales]);

  const totalRevenue = sales.filter(s => s.type === 'sales_invoice').reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalCapex = expenses.reduce((acc, e) => acc + e.totalAmount, 0);

  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Neural Pulse</h2>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Realtime Vector Analytics</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all flex items-center gap-3"
        >
          <ArrowUpCircle size={18} className="text-blue-500" /> Restore Vault
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = async (ev) => {
                let data;
                try {
                  data = JSON.parse(ev.target?.result as string);
                } catch (parseErr) {
                  console.error("JSON Parse Error:", parseErr);
                  alert("The file you uploaded is not a valid JSON file. Please check for syntax errors.");
                  return;
                }

                try {
                  if (confirm("This will merge the JSON data into your current vault. Large images will be compressed to save space. Continue?")) {
                    // Pre-process images in the JSON to reduce size before import
                    if (data.expenses && Array.isArray(data.expenses)) {
                      for (const exp of data.expenses) {
                        if (exp.imageUrl && exp.imageUrl.startsWith('data:image') && exp.imageUrl.length > 200000) {
                          try { exp.imageUrl = await compressImage(exp.imageUrl, 800, 0.3); } catch (e) { }
                        }
                      }
                    }
                    if (data.catalog && Array.isArray(data.catalog)) {
                      for (const item of data.catalog) {
                        if (item.imageUrl && item.imageUrl.startsWith('data:image') && item.imageUrl.length > 200000) {
                          try { item.imageUrl = await compressImage(item.imageUrl, 800, 0.3); } catch (e) { }
                        }
                      }
                    }
                    if (data.assets && Array.isArray(data.assets)) {
                      for (const asset of data.assets) {
                        if (asset.data && asset.data.startsWith('data:image') && asset.data.length > 200000) {
                          try { asset.data = await compressImage(asset.data, 800, 0.3); } catch (e) { }
                        }
                      }
                    }
                    await onRestore(data);
                    alert("Vault Restored Successfully!");
                  }
                } catch (restoreErr: any) {
                  console.error("Vault Restore Error:", restoreErr);
                  alert(`Vault restore failed: ${restoreErr.message || 'Unknown error'}. Please check the console for details.`);
                }
              };
              reader.readAsText(file);
            }
          }}
        />
      </div>

      {/* ANTIGRAVITY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Outward Revenue', val: totalRevenue, icon: ArrowUpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Inventory Capex', val: totalCapex, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Network OPEX', val: totalCapex * 0.1, icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Net Efficiency', val: totalRevenue - totalCapex, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map((item, i) => (
          <div key={i} className="glass-container p-10 rounded-[3rem] antigravity-card hover:scale-[1.02] transition-transform group">
            <div className={`${item.bg} ${item.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-2xl group-hover:rotate-12 transition-transform`}>
              <item.icon size={32} />
            </div>
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">{item.label}</h3>
            <p className="text-4xl font-black text-white tracking-tighter italic">₹{item.val.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* REFINERY CHART */}
        <div className="lg:col-span-2 glass-container p-12 rounded-[4rem] space-y-12">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Neural Vector Flow</h3>
              <p className="text-[10px] font-bold text-slate-500 mt-2">Cash Flow Multi-Track</p>
            </div>
            <div className="flex gap-8">
              <div className="flex items-center gap-3 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_15px_orange]"></div> Revenue
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_15px_blue]"></div> Capex
              </div>
            </div>
          </div>
          <div className="h-96 w-full relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                <AreaChart data={monthwiseSummary}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={5} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="purchases" stroke="#3b82f6" strokeWidth={5} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-800 uppercase font-black text-[10px] tracking-widest">
                Loading Vector Plane...
              </div>
            )}
          </div>
        </div>

        {/* RECENT STREAM */}
        <div className="glass-container p-10 rounded-[4rem] flex flex-col">
          <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-10">Live Stream</h3>
          <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
            {[...expenses, ...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map((act, i) => (
              <div key={i} className="flex justify-between items-center group cursor-pointer border-l-2 border-white/5 pl-6 hover:border-blue-500 transition-all">
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                    {(act as any).vendorName || (act as any).customerName}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">₹{act.totalAmount.toLocaleString()}</p>
                </div>
                <ArrowRight size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
