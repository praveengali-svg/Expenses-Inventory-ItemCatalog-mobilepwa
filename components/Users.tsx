
import React, { useState, useEffect } from 'react';
import { User, Shield, Phone, Lock, Trash2, UserPlus, X, Save } from 'lucide-react';
import { storageService } from '../services/storage';
import { User as UserType } from '../types';

interface Props {
    onUpdate?: () => void;
}

const Users: React.FC<Props> = ({ onUpdate }) => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState<Partial<UserType>>({
        name: '',
        phone: '',
        pin: '',
        role: 'staff'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const data = await storageService.getUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name || !newUser.phone || !newUser.pin) return;

        const userToSave: UserType = {
            ...(newUser as UserType),
            createdAt: Date.now()
        };

        await storageService.saveUser(userToSave);
        setNewUser({ name: '', phone: '', pin: '', role: 'staff' });
        setShowAddForm(false);
        loadUsers();
        onUpdate?.();
    };

    const handleDeleteUser = async (phone: string) => {
        if (confirm(`Revoke access for ${phone}?`)) {
            await storageService.deleteUser(phone);
            loadUsers();
            onUpdate?.();
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div>
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">Access Control</h3>
                    <p className="text-blue-400 text-[10px] font-black mt-2 uppercase tracking-[0.4em]">Neural Identity Management</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-[0_20px_50px_-10px_rgba(37,99,235,0.4)] flex items-center gap-3 active:scale-95 transition-all"
                >
                    <UserPlus size={18} /> Provision Access
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.phone} className="glass-container p-8 rounded-[3rem] border border-white/5 group hover:border-blue-500/30 transition-all duration-500">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                                <User size={28} />
                            </div>
                            <button
                                onClick={() => handleDeleteUser(user.phone)}
                                className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <h4 className="text-xl font-black text-white uppercase tracking-tight mb-1">{user.name}</h4>
                        <div className="flex items-center gap-2 mb-6">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                {user.role}
                            </span>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3 text-slate-400">
                                <Phone size={14} className="opacity-40" />
                                <span className="text-[11px] font-black tracking-widest">{user.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <Lock size={14} className="opacity-40" />
                                <span className="text-[11px] font-black tracking-[0.4em]">****</span>
                            </div>
                        </div>
                    </div>
                ))}

                {users.length === 0 && !loading && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[4rem]">
                        <Shield size={48} className="mx-auto mb-6 text-slate-800" />
                        <p className="text-slate-600 font-black uppercase tracking-widest">No Staff Accounts Active</p>
                    </div>
                )}
            </div>

            {showAddForm && (
                <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-lg rounded-[3.5rem] p-10 border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><UserPlus size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">New Associate</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Identity Provisioning</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white transition-colors"><X size={28} /></button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Legal Name</label>
                                <input
                                    autoFocus required
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="Employee Name"
                                    className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-[2rem] font-black text-white text-sm outline-none focus:border-blue-600 transition-all placeholder:text-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Phone Link</label>
                                    <input
                                        required
                                        value={newUser.phone}
                                        onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                        placeholder="91XXXXXXXX"
                                        className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-[2rem] font-black text-white text-sm outline-none focus:border-blue-600 transition-all placeholder:text-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Security PIN</label>
                                    <input
                                        required type="password"
                                        value={newUser.pin}
                                        onChange={e => setNewUser({ ...newUser, pin: e.target.value })}
                                        placeholder="****"
                                        className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-[2rem] font-black text-white text-sm outline-none focus:border-blue-600 transition-all placeholder:text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Role Cluster</label>
                                <div className="flex gap-4">
                                    {(['staff', 'admin'] as const).map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewUser({ ...newUser, role })}
                                            className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${newUser.role === role ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                                        >
                                            {role === 'admin' ? <span className="flex items-center justify-center gap-2"><Shield size={12} /> Admin</span> : 'Staff'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-white text-slate-950 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 mt-4">
                                <Save size={18} /> Finalize Provision
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
