
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Image as ImageIcon, Search, Upload, Trash2, Grid, List, 
  CheckCircle2, Folder, FileText, Download, X, ShieldCheck 
} from 'lucide-react';
import { AppAsset, ExpenseData, CatalogItem } from '../types';
import { storageService } from '../services/storage';

interface Props {
  expenses: ExpenseData[];
  catalog: CatalogItem[];
  onUpdate: () => void;
}

const MediaLibrary: React.FC<Props> = ({ expenses, catalog, onUpdate }) => {
  const [assets, setAssets] = useState<AppAsset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'logo' | 'product' | 'document'>('all');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    const storedAssets = await storageService.getAssets();
    setAssets(storedAssets);
  };

  // Auto-discover images from other stores
  const discoveredImages = useMemo(() => {
    const discovered: AppAsset[] = [];
    
    catalog.forEach(item => {
      if (item.imageUrl) {
        discovered.push({
          id: `cat-${item.sku}`,
          name: `Catalog: ${item.name}`,
          data: item.imageUrl,
          mimeType: item.imageUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          type: 'product',
          createdAt: Date.now(),
          isSystem: true
        });
      }
    });

    expenses.forEach(exp => {
      if (exp.imageUrl) {
        discovered.push({
          id: `exp-${exp.id}`,
          name: `Audit: ${exp.vendorName} (${exp.date})`,
          data: exp.imageUrl,
          mimeType: exp.imageUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg',
          type: 'document',
          createdAt: exp.createdAt,
          isSystem: true
        });
      }
    });

    return discovered;
  }, [expenses, catalog]);

  const allAssets = useMemo(() => {
    return [...assets, ...discoveredImages].filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [assets, discoveredImages, searchTerm, activeFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const newAsset: AppAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        data: reader.result as string,
        mimeType: file.type,
        type: file.name.toLowerCase().includes('logo') ? 'logo' : 'other' as any,
        createdAt: Date.now()
      };
      await storageService.saveAsset(newAsset);
      await loadAssets();
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (asset: AppAsset) => {
    if (asset.isSystem) {
      alert("This image is linked to an expense or catalog item. Please delete it from its original source.");
      return;
    }
    if (confirm("Delete this asset permanently?")) {
      await storageService.deleteAsset(asset.id);
      await loadAssets();
    }
  };

  const downloadAsset = (asset: AppAsset) => {
    const link = document.createElement('a');
    link.href = asset.data;
    link.download = asset.name;
    link.click();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Media Vault</h2>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Digital Asset Management & Discovered Images</p>
        </div>
        <div className="flex gap-3">
          <label className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2">
            <Upload size={18} /> Upload Asset
            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
          </label>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
           <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Search files..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 px-12 py-3.5 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
           </div>

           <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'All Library', icon: Grid },
                { id: 'logo', label: 'Logos', icon: CheckCircle2 },
                { id: 'product', label: 'Products', icon: Folder },
                { id: 'document', label: 'Scans', icon: FileText },
              ].map(filter => (
                <button 
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeFilter === filter.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <filter.icon size={14} /> {filter.label}
                </button>
              ))}
           </div>
           
           <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><Grid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><List size={18} /></button>
           </div>
        </div>

        {allAssets.length === 0 ? (
          <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
             <ImageIcon size={64} className="mx-auto text-slate-100 mb-6" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Assets Found</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6' : 'space-y-4'}>
             {allAssets.map(asset => (
               <div key={asset.id} className={`group relative bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-blue-400 transition-all ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col'}`}>
                  <div className={`${viewMode === 'list' ? 'w-24 h-24 shrink-0' : 'aspect-square w-full'} bg-slate-50 flex items-center justify-center overflow-hidden relative`}>
                     {asset.mimeType === 'application/pdf' ? (
                       <div className="flex flex-col items-center gap-2 text-slate-300">
                          <FileText size={48} />
                          <span className="text-[8px] font-black uppercase">PDF Document</span>
                       </div>
                     ) : (
                       <img src={asset.data} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                     )}
                     
                     <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => downloadAsset(asset)} className="p-2.5 bg-white rounded-xl text-slate-900 hover:bg-blue-600 hover:text-white transition-all"><Download size={18} /></button>
                        {!asset.isSystem && <button onClick={() => handleDelete(asset)} className="p-2.5 bg-white rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>}
                     </div>

                     {asset.isSystem && (
                       <div className="absolute top-2 left-2">
                          <div className="bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1 shadow-sm">
                             <ShieldCheck size={10} className="text-emerald-400" />
                             <span className="text-[8px] font-black uppercase text-white tracking-widest">Linked</span>
                          </div>
                       </div>
                     )}
                  </div>
                  
                  <div className="p-4 min-w-0 flex-1">
                     <p className="text-[10px] font-black text-slate-900 truncate mb-1 uppercase tracking-tight">{asset.name}</p>
                     <div className="flex items-center justify-between gap-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{asset.mimeType.split('/')[1]} • {new Date(asset.createdAt).toLocaleDateString()}</span>
                        {asset.type === 'logo' && <span className="bg-orange-50 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-100 uppercase">Logo</span>}
                     </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
