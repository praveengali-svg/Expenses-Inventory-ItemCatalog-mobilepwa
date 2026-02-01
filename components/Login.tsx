
import React, { useState } from 'react';
import { Lock, ShieldCheck, User as UserIcon, RefreshCw, AlertCircle, Building2, Download } from 'lucide-react';
import { storageService } from '../services/storage';
import { googleDriveService } from '../services/googleDrive';

interface Props {
  onLogin: (user: any) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [accessId, setAccessId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdminNotice, setShowAdminNotice] = useState(false);

  const triggerManualValidation = async () => {
    if (!accessId.trim() || !accessKey.trim()) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const authorizedUser = await storageService.validateUser(accessId, accessKey);
      if (authorizedUser) {
        onLogin(authorizedUser);
      } else {
        setError(true);
        setLoading(false);
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  const restoreFromCloud = async () => {
    setLoading(true);
    try {
      const cloudData = await googleDriveService.downloadSyncFile();
      if (cloudData) {
        if (confirm("Found cloud backup. Restore to this device?")) {
          await storageService.importFullVault(cloudData);
          alert("Neural Vault Restored. Log in now.");
        }
      } else {
        alert("No cloud backup found. Please log in normally.");
      }
    } catch (err) {
      alert("Neural Cloud access failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 selection:bg-blue-500/30 overflow-hidden relative font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className={`w-full max-w-md bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl p-8 sm:p-12 relative z-10 transition-all duration-300 ${error ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
          <div className="bg-white p-2 rounded-[2rem] shadow-xl mb-6 border border-slate-50 flex items-center justify-center w-28 h-28 overflow-hidden">
            <img src="https://lh3.googleusercontent.com/d/1snOc6lVZIwKa-bnUR39Nxr6DelKUjRmQ" alt="Voltx EV Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">Voltx EV Vault</h1>
          <p className="text-slate-400 font-bold text-[10px] sm:text-xs mt-2 uppercase tracking-widest">Authorized Access Only</p>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Phone Number</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input
                type="text"
                value={accessId}
                onChange={(e) => setAccessId(e.target.value)}
                placeholder="91XXXXXXXX"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Security PIN</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="****"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 justify-center text-red-500 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} />
              <p className="text-[9px] font-black uppercase tracking-widest">Authentication Denied</p>
            </div>
          )}

          <button
            type="button"
            onClick={triggerManualValidation}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> Validate Session</>}
          </button>

          <button
            type="button"
            onClick={restoreFromCloud}
            disabled={loading}
            className="w-full bg-white border border-slate-200 text-slate-400 hover:text-blue-600 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Download size={14} /> Restore from Cloud
          </button>
        </div>

        <div className="mt-8 sm:mt-10 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
          <button
            onClick={() => setShowAdminNotice(!showAdminNotice)}
            className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors"
          >
            Terminal Issues?
          </button>

          {showAdminNotice && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center animate-in slide-in-from-top-2 w-full">
              <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                <span className="block font-black mb-1">SYSTEM CONSOLE</span>
                Authorized hardware only. Contact administrator for device whitelisting.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};

export default Login;
