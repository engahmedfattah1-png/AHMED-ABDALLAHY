
import React, { useState, useEffect, useMemo } from 'react';
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
  
  const filteredSegmentsForSelect = useMemo(() => {
    return segments.filter(s => currentFilterType === 'ALL' || s.type === currentFilterType);
  }, [segments, currentFilterType]);

  const filteredPointsForSelect = useMemo(() => {
    return points.filter(p => {
      if (currentFilterType === 'ALL') return true;
      const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(p.type);
      return currentFilterType === NetworkType.WATER ? isWaterPoint : !isWaterPoint;
    });
  }, [points, currentFilterType]);

  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(initialSelection?.type === 'SEGMENT' ? initialSelection.id : '');
  const [segmentProgress, setSegmentProgress] = useState<number>(0);
  const [segmentStatus, setSegmentStatus] = useState<ProjectStatus>(ProjectStatus.PENDING);
  
  const [selectedPointId, setSelectedPointId] = useState<string>(initialSelection?.type === 'POINT' ? initialSelection.id : '');
  const [pointStatus, setPointStatus] = useState<ProjectStatus>(ProjectStatus.PENDING);

  const [newName, setNewName] = useState('');
  const [newLength, setNewLength] = useState(0);
  const [newType, setNewType] = useState<NetworkType>(currentFilterType === 'ALL' ? NetworkType.WATER : (currentFilterType as NetworkType));
  const [newPointType, setNewPointType] = useState<PointType>(PointType.MANHOLE);
  
  const [easting, setEasting] = useState(638000);
  const [northing, setNorthing] = useState(3324000);

  useEffect(() => {
    if (initialSelection) {
      setMainMode('UPDATE');
      setSubMode(initialSelection.type);
      if (initialSelection.type === 'SEGMENT') setSelectedSegmentId(initialSelection.id);
      else setSelectedPointId(initialSelection.id);
    }
  }, [initialSelection]);

  useEffect(() => {
    if (mainMode === 'UPDATE') {
      if (subMode === 'SEGMENT' && selectedSegmentId) {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg) { setSegmentProgress(seg.completionPercentage); setSegmentStatus(seg.status); }
      } else if (subMode === 'POINT' && selectedPointId) {
        const pt = points.find(p => p.id === selectedPointId);
        if (pt) setPointStatus(pt.status);
      }
    }
  }, [selectedSegmentId, selectedPointId, subMode, mainMode, segments, points]);

  const handleSegmentStatusChange = (status: ProjectStatus) => {
    setSegmentStatus(status);
    if (status === ProjectStatus.COMPLETED) setSegmentProgress(100);
    else if (status === ProjectStatus.PENDING) setSegmentProgress(0);
    else if (status === ProjectStatus.IN_PROGRESS && (segmentProgress === 0 || segmentProgress === 100)) setSegmentProgress(50);
  };

  const handleCreateNew = () => {
    if (!newName) return;
    const timestamp = new Date().toLocaleString('ar-EG');
    if (subMode === 'SEGMENT') {
      onAddSegment({
        id: `S-${Date.now().toString().slice(-4)}`,
        name: newName,
        type: newType,
        status: ProjectStatus.PENDING,
        length: newLength,
        completionPercentage: 0,
        contractor: 'إضافة يدوية',
        startNode: { x: easting, y: northing },
        endNode: { x: easting + newLength, y: northing },
        updatedBy: updaterName,
        updatedAt: timestamp
      });
    } else {
      onAddPoint({
        id: `P-${Date.now().toString().slice(-4)}`,
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

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED: return 'منفذ';
      case ProjectStatus.IN_PROGRESS: return 'جاري التنفيذ';
      case ProjectStatus.PENDING: return 'متبقي';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button onClick={() => setMainMode('UPDATE')} className={`whitespace-nowrap px-6 py-2 rounded-lg text-xs font-black transition-all ${mainMode === 'UPDATE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <i className="fas fa-edit ml-2"></i> تحديث الحالة
          </button>
          <button onClick={() => setMainMode('CREATE')} className={`whitespace-nowrap px-6 py-2 rounded-lg text-xs font-black transition-all ${mainMode === 'CREATE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <i className="fas fa-plus ml-2"></i> إضافة جديدة
          </button>
          <button onClick={() => setMainMode('IMPORT')} className={`whitespace-nowrap px-6 py-2 rounded-lg text-xs font-black transition-all ${mainMode === 'IMPORT' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <i className="fas fa-file-excel ml-2"></i> استيراد ملفات
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
          <label className="text-xs font-black text-slate-500 block mb-2">اسم القائم بالتحديث (المستخدم)</label>
          <div className="relative">
            <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input 
              type="text" 
              value={updaterName} 
              onChange={(e) => setUpdaterName(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 pl-10 pr-4 py-3 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
              placeholder="أدخل اسمك هنا..."
            />
          </div>
        </div>

        {mainMode === 'IMPORT' ? (
          <ImportPanel onImported={onBulkImport} />
        ) : mainMode === 'UPDATE' ? (
          <div className="space-y-8">
            <div className="flex justify-center mb-6">
               <div className="bg-slate-100 p-1 rounded-2xl flex w-full max-w-sm">
                  <button onClick={() => setSubMode('SEGMENT')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${subMode === 'SEGMENT' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>تحديث الخطوط</button>
                  <button onClick={() => setSubMode('POINT')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${subMode === 'POINT' ? 'bg-white shadow-md text-amber-600' : 'text-slate-400'}`}>تحديث العناصر</button>
               </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 block">
                {subMode === 'SEGMENT' ? 'اختر الخط' : 'اختر العنصر'}
              </label>
              <select 
                value={subMode === 'SEGMENT' ? selectedSegmentId : selectedPointId}
                onChange={(e) => subMode === 'SEGMENT' ? setSelectedSegmentId(e.target.value) : setSelectedPointId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-inner"
              >
                <option value="">-- اختر من القائمة --</option>
                {subMode === 'SEGMENT' 
                  ? filteredSegmentsForSelect.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)
                  : filteredPointsForSelect.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)
                }
              </select>
            </div>

            {(subMode === 'SEGMENT' ? selectedSegmentId : selectedPointId) && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                {subMode === 'SEGMENT' ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED].map(st => (
                        <button key={st} onClick={() => handleSegmentStatusChange(st)} className={`py-4 rounded-2xl border-2 text-[10px] font-black transition-all ${segmentStatus === st ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                          {getStatusLabel(st)}
                        </button>
                      ))}
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[32px] text-center shadow-2xl relative overflow-hidden">
                       <span className="text-4xl font-black text-white block mb-2">{segmentProgress}%</span>
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">نسبة الإنجاز الفعلية</span>
                       <input type="range" min="0" max="100" value={segmentProgress} onChange={(e) => setSegmentProgress(Number(e.target.value))} className="w-full mt-6 h-1.5 bg-slate-800 rounded-full appearance-none accent-blue-500" />
                    </div>
                    <button onClick={() => onUpdateSegment(selectedSegmentId, segmentProgress, updaterName)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-900 transition-all active:scale-95">
                      حفظ التحديث بواسطة {updaterName}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED].map(st => (
                        <button key={st} onClick={() => setPointStatus(st)} className={`py-4 rounded-2xl border-2 text-[10px] font-black transition-all ${pointStatus === st ? 'bg-amber-600 text-white border-amber-600 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}>
                          {getStatusLabel(st)}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => onUpdatePoint(selectedPointId, pointStatus, updaterName)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-amber-600 transition-all active:scale-95">
                      تحديث الحالة بواسطة {updaterName}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
             <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                  <button onClick={() => setSubMode('SEGMENT')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${subMode === 'SEGMENT' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>خط جديد</button>
                  <button onClick={() => setSubMode('POINT')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${subMode === 'POINT' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>نقطة/عنصر جديد</button>
             </div>
             {/* ... rest of create fields ... */}
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Easting (UTM-X)</label>
                 <input type="number" value={easting} onChange={(e) => setEasting(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Northing (UTM-Y)</label>
                 <input type="number" value={northing} onChange={(e) => setNorthing(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none" />
               </div>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400">الاسم التعريفي (Code/Name)</label>
               <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none" placeholder="مثال: MH-01 أو Line-A" />
             </div>
             {subMode === 'SEGMENT' ? (
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">الطول (متر)</label>
                   <input type="number" value={newLength} onChange={(e) => setNewLength(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">النوع</label>
                   <select value={newType} onChange={(e) => setNewType(e.target.value as NetworkType)} className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none">
                     <option value={NetworkType.WATER}>مياه</option>
                     <option value={NetworkType.SEWAGE}>صرف صحي</option>
                   </select>
                 </div>
               </div>
             ) : (
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase">نوع العنصر</label>
                 <select value={newPointType} onChange={(e) => setNewPointType(e.target.value as PointType)} className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none">
                    {Object.entries(POINT_LABELS).map(([val, label]) => {
                      const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(val as PointType);
                      if (currentFilterType === NetworkType.WATER && !isWaterPoint) return null;
                      if (currentFilterType === NetworkType.SEWAGE && isWaterPoint) return null;
                      return <option key={val} value={val}>{label}</option>;
                    })}
                 </select>
               </div>
             )}
             <button onClick={handleCreateNew} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-900 transition-all active:scale-95">
               <i className="fas fa-plus-circle ml-2"></i> إضافة وتسجيل البيانات
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementPanel;
