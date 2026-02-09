
import React, { useState, useMemo } from 'react';
import { Calendar, Save, RefreshCw, IndianRupee, ChevronLeft, ChevronRight, X, Calculator, Percent } from 'lucide-react';
import { ExpenseData, ExpenseCategory, User } from '../types';
import { storageService } from '../services/storage';

interface Props {
    expenses: ExpenseData[];
    currentUser: User;
    onUpdate: () => void;
}

const CATEGORIES: ExpenseCategory[] = ['Salaries', 'Rent', 'Utilities', 'IT', 'Professional Services', 'Other'];

interface DetailState {
    base: string;
    gstPercent: string;
    tdsPercent: string;
    esic: string;
    pt: string;
    pf: string;
}

const OpExMonthly: React.FC<Props> = ({ expenses, currentUser, onUpdate }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [editingCell, setEditingCell] = useState<{ category: string, month: string } | null>(null);
    const [details, setDetails] = useState<DetailState>({
        base: '',
        gstPercent: '0',
        tdsPercent: '0',
        esic: '0',
        pt: '0',
        pf: '0'
    });
    const [isSaving, setIsSaving] = useState(false);

    // Financial Year: April to March
    const months = [
        { name: 'Apr', value: '04', yearOffset: 0 },
        { name: 'May', value: '05', yearOffset: 0 },
        { name: 'Jun', value: '06', yearOffset: 0 },
        { name: 'Jul', value: '07', yearOffset: 0 },
        { name: 'Aug', value: '08', yearOffset: 0 },
        { name: 'Sep', value: '09', yearOffset: 0 },
        { name: 'Oct', value: '10', yearOffset: 0 },
        { name: 'Nov', value: '11', yearOffset: 0 },
        { name: 'Dec', value: '12', yearOffset: 0 },
        { name: 'Jan', value: '01', yearOffset: 1 },
        { name: 'Feb', value: '02', yearOffset: 1 },
        { name: 'Mar', value: '03', yearOffset: 1 },
    ];

    const gridData = useMemo(() => {
        const data: Record<string, Record<string, { total: number, data?: ExpenseData }>> = {};

        CATEGORIES.forEach(cat => {
            data[cat] = {};
            months.forEach(m => {
                const year = selectedYear + m.yearOffset;
                const monthStr = `${year}-${m.value}`;

                const categoryExpenses = expenses.filter(e =>
                    e.date.startsWith(monthStr) &&
                    e.type === 'expense' &&
                    e.lineItems?.some(li => li.category === cat)
                );

                const total = categoryExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
                // We take the first manual entry if it exists to pre-populate details
                const manualEntry = categoryExpenses.find(e => e.id.startsWith(`manual_${cat}`));

                data[cat][m.value] = { total, data: manualEntry };
            });
        });

        return data;
    }, [expenses, selectedYear, months]);

    const handleEdit = (category: string, month: string, current: { total: number, data?: ExpenseData }) => {
        setEditingCell({ category, month });

        if (current.data) {
            const li = current.data.lineItems[0];
            setDetails({
                base: (li.amount || 0).toString(),
                gstPercent: (li.gstPercentage || 0).toString(),
                tdsPercent: (current.data.tdsPercentage || 0).toString(),
                esic: (current.data.esicAmount || 0).toString(),
                pt: (current.data.ptAmount || 0).toString(),
                pf: (current.data.pfAmount || 0).toString(),
            });
        } else {
            setDetails({
                base: current.total > 0 ? current.total.toString() : '',
                gstPercent: '0',
                tdsPercent: '0',
                esic: '0',
                pt: '0',
                pf: '0'
            });
        }
    };

    const handleSave = async () => {
        if (!editingCell) return;

        setIsSaving(true);
        try {
            const { category, month } = editingCell;
            const base = parseFloat(details.base) || 0;
            const gstP = parseFloat(details.gstPercent) || 0;
            const tdsP = parseFloat(details.tdsPercent) || 0;
            const esic = parseFloat(details.esic) || 0;
            const pt = parseFloat(details.pt) || 0;
            const pf = parseFloat(details.pf) || 0;

            const gstAmt = (base * gstP) / 100;
            const tdsAmt = (base * tdsP) / 100;

            // Total = Base + GST - TDS - ESIC - PT - PF
            const totalOutflow = base + gstAmt - tdsAmt - esic - pt - pf;

            const monthObj = months.find(m => m.value === month);
            const year = selectedYear + (monthObj?.yearOffset || 0);
            const dateStr = `${year}-${month}-01`;

            const manualExpense: ExpenseData = {
                id: `manual_${category}_${year}_${month}`,
                vendorName: `Manual Adjustment ${category}`,
                date: dateStr,
                totalAmount: totalOutflow,
                taxAmount: gstAmt,
                tdsAmount: tdsAmt,
                tdsPercentage: tdsP,
                esicAmount: esic,
                ptAmount: pt,
                pfAmount: pf,
                currency: 'INR',
                lineItems: [{
                    description: `${category} monthly entry`,
                    amount: base,
                    quantity: 1,
                    rate: base,
                    category: category as ExpenseCategory,
                    gstPercentage: gstP,
                    tdsAmount: tdsAmt,
                    tdsPercentage: tdsP,
                    esicAmount: esic,
                    ptAmount: pt,
                    pfAmount: pf
                }],
                fileName: 'manual_entry',
                createdAt: Date.now(),
                type: 'expense',
                createdBy: currentUser.name,
            };

            await storageService.saveExpense(manualExpense);
            onUpdate();
            setEditingCell(null);
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save entry");
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(amt);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 antigravity-card">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div>
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">Monthly OP EX Ledger</h3>
                    <p className="text-blue-400 text-[10px] font-black mt-2 uppercase tracking-[0.4em]">Financial Year: {selectedYear}-{selectedYear + 1}</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-black text-white uppercase tracking-widest">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="glass-container rounded-[2.5rem] md:rounded-[4rem] overflow-hidden relative">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[1200px]">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-900 border-r border-white/5 z-20">Category</th>
                                {months.map(m => (
                                    <th key={m.value} className="px-8 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{m.name}</th>
                                ))}
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">FY Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {CATEGORIES.map(cat => {
                                const totalFY = Object.values(gridData[cat]).reduce((a, b) => a + b.total, 0);
                                return (
                                    <tr key={cat} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-10 py-8 sticky left-0 bg-slate-950/90 backdrop-blur-md border-r border-white/5 z-20">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{cat}</p>
                                        </td>
                                        {months.map(m => {
                                            const cell = gridData[cat][m.value];
                                            const val = cell.total;
                                            const isEditing = editingCell?.category === cat && editingCell?.month === m.value;

                                            return (
                                                <td key={m.value} className="px-4 py-8 text-center relative">
                                                    {isEditing ? (
                                                        <div className="absolute inset-0 z-30 flex items-center justify-center p-2 bg-slate-900 shadow-2xl rounded-2xl border-2 border-blue-500 min-w-[240px] -translate-y-2">
                                                            <div className="w-full space-y-2">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Base Amount</label>
                                                                        <input
                                                                            autoFocus
                                                                            type="number"
                                                                            value={details.base}
                                                                            onChange={(e) => setDetails({ ...details, base: e.target.value })}
                                                                            className="w-full bg-slate-800 rounded-lg p-1.5 text-[10px] font-black text-white outline-none border border-white/10 focus:border-blue-500"
                                                                        />
                                                                    </div>
                                                                    <div className="w-16">
                                                                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">GST %</label>
                                                                        <input
                                                                            type="number"
                                                                            value={details.gstPercent}
                                                                            onChange={(e) => setDetails({ ...details, gstPercent: e.target.value })}
                                                                            className="w-full bg-slate-800 rounded-lg p-1.5 text-[10px] font-black text-white outline-none border border-white/10 focus:border-blue-500"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {(cat === 'Rent' || cat === 'Salaries' || cat === 'Professional Services') && (
                                                                    <div>
                                                                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">TDS %</label>
                                                                        <input
                                                                            type="number"
                                                                            value={details.tdsPercent}
                                                                            onChange={(e) => setDetails({ ...details, tdsPercent: e.target.value })}
                                                                            className="w-full bg-slate-800 rounded-lg p-1.5 text-[10px] font-black text-white outline-none border border-white/10 focus:border-blue-500"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {cat === 'Salaries' && (
                                                                    <div className="flex gap-2">
                                                                        <div className="flex-1">
                                                                            <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">ESIC</label>
                                                                            <input
                                                                                type="number"
                                                                                value={details.esic}
                                                                                onChange={(e) => setDetails({ ...details, esic: e.target.value })}
                                                                                className="w-full bg-slate-800 rounded-lg p-1.5 text-[10px] font-black text-white outline-none border border-white/10 focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">PT</label>
                                                                            <input
                                                                                type="number"
                                                                                value={details.pt}
                                                                                onChange={(e) => setDetails({ ...details, pt: e.target.value })}
                                                                                className="w-full bg-slate-800 rounded-lg p-1.5 text-[10px] font-black text-white outline-none border border-white/10 focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">PF</label>
                                                                            <input
                                                                                type="number"
                                                                                value={details.pf}
                                                                                onChange={(e) => setDetails({ ...details, pf: e.target.value })}
                                                                                className="w-full bg-slate-800 rounded-lg p-1.5 text-[10px] font-black text-white outline-none border border-white/10 focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Real-time Calculation Summary */}
                                                                {details.base && (
                                                                    <div className="bg-white/5 rounded-lg p-2 space-y-1">
                                                                        <div className="flex justify-between text-[7px] font-bold uppercase tracking-widest">
                                                                            <span className="text-slate-500">GST Amt:</span>
                                                                            <span className="text-green-400">+{formatCurrency((parseFloat(details.base) || 0) * (parseFloat(details.gstPercent) || 0) / 100)}</span>
                                                                        </div>
                                                                        {(cat === 'Rent' || cat === 'Salaries' || parseFloat(details.tdsPercent) > 0) && (
                                                                            <div className="flex justify-between text-[7px] font-bold uppercase tracking-widest">
                                                                                <span className="text-slate-500">TDS Amt:</span>
                                                                                <span className="text-red-400">-{formatCurrency((parseFloat(details.base) || 0) * (parseFloat(details.tdsPercent) || 0) / 100)}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest pt-1 border-t border-white/5">
                                                                            <span className="text-slate-300">Net Outflow:</span>
                                                                            <span className="text-blue-400">{formatCurrency(
                                                                                (parseFloat(details.base) || 0) +
                                                                                ((parseFloat(details.base) || 0) * (parseFloat(details.gstPercent) || 0) / 100) -
                                                                                ((parseFloat(details.base) || 0) * (parseFloat(details.tdsPercent) || 0) / 100) -
                                                                                (parseFloat(details.esic) || 0) -
                                                                                (parseFloat(details.pt) || 0) -
                                                                                (parseFloat(details.pf) || 0)
                                                                            )}</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                                    <button onClick={() => setEditingCell(null)} className="p-1.5 text-slate-400 hover:text-white"><X size={14} /></button>
                                                                    <button
                                                                        onClick={handleSave}
                                                                        disabled={isSaving}
                                                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                                                    >
                                                                        {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                                                        Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="cursor-pointer group-hover:bg-white/10 py-2 rounded-xl transition-all"
                                                            onClick={() => handleEdit(cat, m.value, cell)}
                                                        >
                                                            <p className={`text-xs font-black ${val > 0 ? 'text-white' : 'text-slate-700'}`}>
                                                                {val > 0 ? formatCurrency(val) : '—'}
                                                            </p>
                                                            {val > 0 && cell.data && (
                                                                <div className="mt-1 flex flex-wrap justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {cell.data.taxAmount > 0 && <span className="text-[7px] text-green-400 font-bold uppercase tracking-tighter">GST+</span>}
                                                                    {cell.data.tdsAmount > 0 && <span className="text-[7px] text-red-400 font-bold uppercase tracking-tighter">TDS-</span>}
                                                                    {cell.data.esicAmount > 0 && <span className="text-[7px] text-orange-400 font-bold uppercase tracking-tighter">ESIC-</span>}
                                                                    {cell.data.ptAmount > 0 && <span className="text-[7px] text-purple-400 font-bold uppercase tracking-tighter">PT-</span>}
                                                                    {cell.data.pfAmount > 0 && <span className="text-[7px] text-pink-400 font-bold uppercase tracking-tighter">PF-</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-10 py-8 text-right bg-blue-600/5">
                                            <p className="text-sm font-black text-blue-400 tracking-tighter italic">{formatCurrency(totalFY)}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-white/5 border-t border-white/10">
                                <td className="px-10 py-8 font-black text-[10px] text-white uppercase tracking-widest sticky left-0 bg-slate-900 border-r border-white/5 z-20">Monthly Total</td>
                                {months.map(m => {
                                    const mTotal = CATEGORIES.reduce((sum, cat) => sum + gridData[cat][m.value].total, 0);
                                    return (
                                        <td key={m.value} className="px-8 py-8 text-center font-black text-xs text-slate-300">
                                            {formatCurrency(mTotal)}
                                        </td>
                                    );
                                })}
                                <td className="px-10 py-8 text-right font-black text-lg text-white italic tracking-tighter">
                                    {formatCurrency(CATEGORIES.reduce((sum, cat) => sum + Object.values(gridData[cat]).reduce((a, b) => a + b.total, 0), 0))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                <div className="flex items-center gap-3 px-6 py-4 bg-orange-500/10 border border-orange-500/20 rounded-3xl">
                    <IndianRupee size={16} className="text-orange-400" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Tap any cell to record or adjust monthly components. Rent & Professional Services support TDS, Salaries support ESIC/PT.
                    </p>
                </div>
                <div className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 border border-blue-500/20 rounded-3xl">
                    <Calculator size={16} className="text-blue-400" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Final Total = Base + GST - Deductions (TDS/ESIC/PT). All tax values are saved to the ledger.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OpExMonthly;
