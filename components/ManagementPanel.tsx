
import React, { useState, useEffect } from 'react';
import { NetworkType, ProjectStatus, PointType, NetworkSegment, NetworkPoint } from '../types';
import { POINT_LABELS, STATUS_COLORS } from '../constants';
import ImportPanel from './ImportPanel';

interface ManagementPanelProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  onUpdateSegment: (id: string, progress: number, userName: string) => void;
  onUpdatePoint: (id: string, status: ProjectStatus, userName: string) => void;
  onAddSegment: (seg: NetworkSegment) => void;
  onAddPoint: (pt: NetworkPoint) => void;
  onBulkImport: (segments: NetworkSegment[], points: NetworkPoint[]) => void;
  initialSelection?: { type: 'SEGMENT' | 'POINT', id: string };
  currentFilterType?: NetworkType | 'ALL';
}

const ManagementPanel: React.FC<ManagementPanelProps> = ({ 
  segments, points, onUpdateSegment, onUpdatePoint, onAddSegment, onAddPoint, onBulkImport, initialSelection, currentFilterType = 'ALL'
}) => {
  const [mainMode, setMainMode] = useState<'UPDATE' | 'CREATE' | 'IMPORT'>('UPDATE');
  const [subMode, setSubMode] = useState<'SEGMENT' | 'POINT'>(initialSelection?.type || 'SEGMENT');
  const [updaterName, setUpdaterName] = useState('مهندس الموقع');
  
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(initialSelection?.type === 'SEGMENT' ? initialSelection.id : '');
  const [segmentProgress, setSegmentProgress] = useState<number>(0);
  const [segmentStatus, setSegmentStatus] = useState<ProjectStatus>(ProjectStatus.PENDING);
  
  const [selectedPointId, setSelectedPointId] = useState<string>(initialSelection?.type === 'POINT' ? initialSelection.id : '');
  const [pointStatus, setPointStatus] = useState<ProjectStatus>(ProjectStatus.PENDING);

  // حقول الإضافة الجديدة
  const [newName, setNewName] = useState('');
  const [newLength, setNewLength] = useState(0);
  const [newType, setNewType] = useState<NetworkType>(currentFilterType === 'ALL' ? NetworkType.WATER : (currentFilterType as NetworkType));
  const [newPointType, setNewPointType] = useState<PointType>(PointType.MANHOLE);
  const [easting, setEasting] = useState(638000);
  const [northing, setNorthing] = useState(3324000);

  // Password Protection State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (initialSelection) {
      setMainMode('UPDATE');
      setSubMode(initialSelection.type);
      if (initialSelection.type === 'SEGMENT') {
        setSelectedSegmentId(initialSelection.id);
        const seg = segments.find(s => s.id === initialSelection.id);
        if (seg) {
          setSegmentProgress(seg.completionPercentage);
          setSegmentStatus(seg.status);
        }
      } else {
        setSelectedPointId(initialSelection.id);
        const pt = points.find(p => p.id === initialSelection.id);
        if (pt) setPointStatus(pt.status);
      }
    }
  }, [initialSelection, segments, points]);

  const handleCreateNew = () => {
    if (!newName) return;
    const timestamp = new Date().toLocaleString('ar-EG');
    const uniqueId = `ID-${Date.now().toString().slice(-6)}`;
    
    if (subMode === 'SEGMENT') {
      onAddSegment({
        id: uniqueId,
        name: newName,
        type: newType,
        status: ProjectStatus.PENDING,
        length: newLength,
        completionPercentage: 0,
        contractor: updaterName,
        startNode: { x: easting, y: northing },
        endNode: { x: easting + newLength, y: northing },
        updatedBy: updaterName,
        updatedAt: timestamp
      });
    } else {
      onAddPoint({
        id: uniqueId,
        name: newName,
        type: newPointType,
        status: ProjectStatus.PENDING,
        location: { x: easting, y: northing },
        updatedBy: updaterName,
        updatedAt: timestamp
      });
    }
    setNewName('');
    setMainMode('UPDATE');
  };

  const handleStatusChange = (status: ProjectStatus) => {
    if (subMode === 'SEGMENT') {
      setSegmentStatus(status);
      if (status === ProjectStatus.COMPLETED) setSegmentProgress(100);
      else if (status === ProjectStatus.PENDING) setSegmentProgress(0);
      else if (segmentProgress === 100 || segmentProgress === 0) setSegmentProgress(50);
    } else {
      setPointStatus(status);
    }
  };

  const getStatusLabel = (s: ProjectStatus) => {
    switch(s) {
      case ProjectStatus.COMPLETED: return 'منفذ (Executed)';
      case ProjectStatus.IN_PROGRESS: return 'جاري (In Progress)';
      default: return 'مخطط (Not Executed)';
    }
  };

  const getStatusColor = (s: ProjectStatus) => STATUS_COLORS[s];

  // --- Password & Verification Logic ---
  const initiateUpdate = () => {
    setIsPasswordModalOpen(true);
    setPasswordInput('');
    setPasswordError(false);
  };

  const confirmUpdateWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '123456') {
      if (subMode === 'SEGMENT') {
        onUpdateSegment(selectedSegmentId, segmentProgress, updaterName);
      } else {
        onUpdatePoint(selectedPointId, pointStatus, updaterName);
      }
      setIsPasswordModalOpen(false);
    } else {
      setPasswordError(true);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative">
      
      {/* Password Modal (Fixed Overlay) */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
             
             {/* Decorative header */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 ring-4 ring-blue-50/50">
                   <i className="fas fa-fingerprint text-3xl"></i>
                </div>
                <h4 className="text-lg font-black text-slate-800">تأكيد العملية</h4>
                <p className="text-xs text-slate-400 font-bold mt-1">هذا الإجراء محمي، يرجى إدخال رمز المهندس</p>
             </div>
             
             <form onSubmit={confirmUpdateWithPassword} className="space-y-4">
               <div>
                 <input 
                   type="password" 
                   value={passwordInput}
                   onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                   className={`w-full bg-slate-50 border-2 px-4 py-4 rounded-2xl text-center font-black tracking-[0.5em] text-xl outline-none transition-all placeholder:tracking-normal placeholder:font-bold placeholder:text-sm ${passwordError ? 'border-red-500 bg-red-50 text-red-900 animate-pulse' : 'border-slate-100 focus:border-blue-500 focus:bg-white focus:shadow-md'}`}
                   placeholder="******"
                   autoFocus
                   maxLength={6}
                 />
                 {passwordError && (
                   <div className="flex items-center justify-center gap-2 mt-2 text-red-500 animate-in slide-in-from-top-1">
                     <i className="fas fa-exclamation-circle text-xs"></i>
                     <span className="text-[10px] font-black">رمز المرور غير صحيح</span>
                   </div>
                 )}
               </div>
               
               <div className="grid grid-cols-2 gap-3 pt-2">
                 <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-200 transition-all">إلغاء</button>
                 <button type="submit" className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">تأكيد</button>
               </div>
             </form>
          </div>
        </div>
      )}

      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
        <div className="flex bg-slate-200 p-1 rounded-xl w-full">
          <button onClick={() => setMainMode('UPDATE')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${mainMode === 'UPDATE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>تحديث الحالة</button>
          <button onClick={() => setMainMode('CREATE')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${mainMode === 'CREATE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>إضافة يدوية</button>
          <button onClick={() => setMainMode('IMPORT')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${mainMode === 'IMPORT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>استيراد</button>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6">
          <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">المهندس المسؤول</label>
          <input 
            type="text" 
            value={updaterName} 
            onChange={(e) => setUpdaterName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {mainMode === 'IMPORT' ? (
          <ImportPanel onImported={onBulkImport} />
        ) : mainMode === 'UPDATE' ? (
          <div className="space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setSubMode('SEGMENT')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${subMode === 'SEGMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>مواسير</button>
              <button onClick={() => setSubMode('POINT')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${subMode === 'POINT' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}>عناصر</button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">اختيار العنصر</label>
              <select 
                value={subMode === 'SEGMENT' ? selectedSegmentId : selectedPointId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (subMode === 'SEGMENT') {
                    setSelectedSegmentId(val);
                    const seg = segments.find(s => s.id === val);
                    if (seg) {
                      setSegmentProgress(seg.completionPercentage);
                      setSegmentStatus(seg.status);
                    }
                  } else {
                    setSelectedPointId(val);
                    const pt = points.find(p => p.id === val);
                    if (pt) setPointStatus(pt.status);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="">-- اختر --</option>
                {subMode === 'SEGMENT' 
                  ? segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  : points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                }
              </select>
            </div>

            {(subMode === 'SEGMENT' ? selectedSegmentId : selectedPointId) && (
              <div className="space-y-6 pt-4 border-t border-slate-50">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">الحالة التنفيذية</label>
                   <div className="grid grid-cols-1 gap-2">
                     {[ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED].map(st => {
                       const isActive = (subMode === 'SEGMENT' ? segmentStatus : pointStatus) === st;
                       const statusColor = getStatusColor(st);
                       return (
                         <button 
                           key={st} 
                           onClick={() => handleStatusChange(st)} 
                           className={`py-3 px-4 rounded-xl text-[10px] font-black transition-all border-2 flex items-center gap-3 ${
                             isActive 
                             ? 'bg-slate-50 shadow-sm' 
                             : 'bg-white border-slate-100 text-slate-400 grayscale'
                           }`}
                           style={{ borderColor: isActive ? statusColor : undefined }}
                         >
                           <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }}></div>
                           {getStatusLabel(st)}
                         </button>
                       );
                     })}
                   </div>
                 </div>

                 {subMode === 'SEGMENT' && (
                   <div className="bg-slate-50 p-4 rounded-2xl">
                     <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] font-black text-slate-400">الإنجاز اللحظي</span>
                       <span className="text-xl font-black text-blue-600">{segmentProgress}%</span>
                     </div>
                     <input type="range" min="0" max="100" value={segmentProgress} onChange={(e) => setSegmentProgress(Number(e.target.value))} className="w-full accent-blue-600" />
                   </div>
                 )}

                 <button 
                   onClick={initiateUpdate} 
                   className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group"
                 >
                   <i className="fas fa-shield-alt text-blue-400 group-hover:text-white transition-colors"></i>
                   <span>حفظ وتحديث البيانات</span>
                 </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-left-4">
             <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setSubMode('SEGMENT')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${subMode === 'SEGMENT' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>خط جديد</button>
                  <button onClick={() => setSubMode('POINT')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${subMode === 'POINT' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>نقطة جديدة</button>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
               <input type="number" value={easting} onChange={(e) => setEasting(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold" placeholder="X (Easting)" />
               <input type="number" value={northing} onChange={(e) => setNorthing(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold" placeholder="Y (Northing)" />
             </div>

             <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold" placeholder="اسم العنصر / الكود" />

             {subMode === 'SEGMENT' ? (
               <div className="grid grid-cols-2 gap-3">
                 <input type="number" value={newLength} onChange={(e) => setNewLength(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold" placeholder="الطول (م)" />
                 <select value={newType} onChange={(e) => setNewType(e.target.value as NetworkType)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold">
                   <option value={NetworkType.WATER}>مياه</option>
                   <option value={NetworkType.SEWAGE}>صرف</option>
                 </select>
               </div>
             ) : (
               <select value={newPointType} onChange={(e) => setNewPointType(e.target.value as PointType)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold">
                  {Object.entries(POINT_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
               </select>
             )}

             <button onClick={handleCreateNew} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs shadow-lg">إضافة للشبكة</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementPanel;
