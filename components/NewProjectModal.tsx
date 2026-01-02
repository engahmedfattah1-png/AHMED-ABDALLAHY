
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';

interface NewProjectModalProps {
  onSave: (id: string, name: string, location: string, segments: NetworkSegment[], points: NetworkPoint[]) => void;
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [importType, setImportType] = useState<'NONE' | 'EXCEL' | 'DXF' | 'GIS'>('NONE');
  const [importedData, setImportedData] = useState<{ segments: NetworkSegment[], points: NetworkPoint[] }>({ segments: [], points: [] });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const projectId = useMemo(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `PRJ-${year}-${random}`;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMsg('جاري معالجة الملف...');
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'xlsx' || extension === 'csv') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);
          
          const segments: NetworkSegment[] = rows.map((r, idx) => ({
            id: `XL-${idx}-${Date.now()}`,
            name: r.Name || r.name || `خط مستورد ${idx}`,
            type: (r.Type || r.type)?.toUpperCase() === 'SEWAGE' ? NetworkType.SEWAGE : NetworkType.WATER,
            status: ProjectStatus.PENDING,
            length: parseFloat(r.Length || r.length || 0),
            completionPercentage: 0,
            contractor: r.Contractor || r.contractor || 'غير محدد',
            startNode: { x: parseFloat(r.StartX || r.startX || 0), y: parseFloat(r.StartY || r.startY || 0) },
            endNode: { x: parseFloat(r.EndX || r.endX || 0), y: parseFloat(r.EndY || r.endY || 0) }
          }));
          setImportedData({ segments, points: [] });
          setStatusMsg(`تم تحليل ${segments.length} خط من الإكسيل`);
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } 
      else if (extension === 'dxf') {
        const text = await file.text();
        const segments: NetworkSegment[] = [];
        const points: NetworkPoint[] = [];
        const lines = text.split('\n');
        let i = 0;

        while (i < lines.length) {
          const line = lines[i].trim();
          if (line === 'LINE') {
            const seg: any = { id: `CAD-L-${Date.now()}-${segments.length}`, status: ProjectStatus.PENDING, type: NetworkType.WATER, completionPercentage: 0 };
            while (i < lines.length && lines[i].trim() !== '0') {
              const code = lines[i].trim();
              const val = lines[i+1]?.trim();
              if (code === '10') seg.startX = parseFloat(val);
              if (code === '20') seg.startY = parseFloat(val);
              if (code === '11') seg.endX = parseFloat(val);
              if (code === '21') seg.endY = parseFloat(val);
              i += 2;
            }
            if (seg.startX !== undefined) {
               segments.push({
                 ...seg,
                 name: `خط CAD ${segments.length + 1}`,
                 length: Math.sqrt(Math.pow(seg.endX - seg.startX, 2) + Math.pow(seg.endY - seg.startY, 2)),
                 startNode: { x: seg.startX, y: seg.startY },
                 endNode: { x: seg.endX, y: seg.endY },
                 contractor: 'AutoCAD Import'
               });
            }
          } else if (line === 'CIRCLE') {
            const pt: any = { id: `CAD-P-${Date.now()}-${points.length}`, status: ProjectStatus.PENDING, type: PointType.MANHOLE };
            while (i < lines.length && lines[i].trim() !== '0') {
              const code = lines[i].trim();
              const val = lines[i+1]?.trim();
              if (code === '10') pt.x = parseFloat(val);
              if (code === '20') pt.y = parseFloat(val);
              i += 2;
            }
            if (pt.x !== undefined) points.push({ ...pt, name: `نقطة CAD ${points.length + 1}`, location: { x: pt.x, y: pt.y } });
          } else { i++; }
        }
        setImportedData({ segments, points });
        setStatusMsg(`تم تحليل ${segments.length} ماسورة و ${points.length} عنصر من الأوتوكاد`);
        setLoading(false);
      }
      else if (extension === 'geojson' || extension === 'json') {
        const content = JSON.parse(await file.text());
        const segments: NetworkSegment[] = [];
        const points: NetworkPoint[] = [];
        if (content.features) {
          content.features.forEach((f: any, idx: number) => {
            if (f.geometry.type === 'LineString') {
              const coords = f.geometry.coordinates;
              segments.push({
                id: `GIS-S-${idx}`,
                name: f.properties?.name || `خط GIS ${idx}`,
                type: f.properties?.type === 'sewage' ? NetworkType.SEWAGE : NetworkType.WATER,
                status: ProjectStatus.PENDING,
                length: f.properties?.length || 0,
                completionPercentage: 0,
                contractor: 'GIS Import',
                startNode: { x: coords[0][0], y: coords[0][1] },
                endNode: { x: coords[coords.length-1][0], y: coords[coords.length-1][1] }
              });
            } else if (f.geometry.type === 'Point') {
              points.push({
                id: `GIS-P-${idx}`,
                name: f.properties?.name || `نقطة GIS ${idx}`,
                type: PointType.MANHOLE,
                status: ProjectStatus.PENDING,
                location: { x: f.geometry.coordinates[0], y: f.geometry.coordinates[1] }
              });
            }
          });
        }
        setImportedData({ segments, points });
        setStatusMsg('تم تحليل بيانات GIS بنجاح');
        setLoading(false);
      }
    } catch (err) {
      setStatusMsg('خطأ في قراءة الملف');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && location.trim()) {
      onSave(projectId, name, location, importedData.segments, importedData.points);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 relative shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar" dir="rtl">
        
        <div className="flex justify-between items-start mb-8">
          <div className="text-right">
            <h3 className="text-2xl font-black text-slate-800">مشروع هندسي جديد</h3>
            <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">التسجيل الرسمي للشبكة</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl">
             <span className="text-[10px] font-black text-blue-400 block text-center mb-0.5">Project ID</span>
             <span className="text-xs font-mono font-black text-blue-600">{projectId}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">اسم المشروع</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
                placeholder="مثال: شبكة مياه حي الشروق"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">موقع المنطقة (UTM Zone)</label>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
                placeholder="مثال: 37N - التجمع الخامس"
                required
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="text-xs font-black text-slate-500 block mb-2">طريقة إدخال بيانات الشبكة الأولية</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               <button type="button" onClick={() => setImportType('NONE')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${importType === 'NONE' ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                  <i className="fas fa-keyboard"></i>
                  <span className="text-[10px] font-black">يدوي</span>
               </button>
               <button type="button" onClick={() => setImportType('EXCEL')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${importType === 'EXCEL' ? 'bg-green-600 border-green-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-green-200'}`}>
                  <i className="fas fa-file-excel"></i>
                  <span className="text-[10px] font-black">Excel</span>
               </button>
               <button type="button" onClick={() => setImportType('DXF')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${importType === 'DXF' ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                  <i className="fas fa-drafting-compass"></i>
                  <span className="text-[10px] font-black">AutoCAD</span>
               </button>
               <button type="button" onClick={() => setImportType('GIS')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${importType === 'GIS' ? 'bg-amber-600 border-amber-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}>
                  <i className="fas fa-globe-africa"></i>
                  <span className="text-[10px] font-black">GIS</span>
               </button>
            </div>
          </div>

          {importType !== 'NONE' && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'} text-3xl text-slate-400 mb-2`}></i>
                  <p className="text-xs font-black text-slate-500">اضغط لرفع ملف {importType}</p>
                  <p className="text-[9px] text-slate-400 mt-1">DXF, XLSX, CSV, or GeoJSON</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
              {statusMsg && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                   <p className="text-[10px] font-black text-blue-700">{statusMsg}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button 
              type="submit"
              className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-600 transition-all"
            >
              تأسيس المشروع والبيانات
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-8 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
