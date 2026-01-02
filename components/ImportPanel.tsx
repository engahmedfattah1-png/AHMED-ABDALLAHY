
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';

interface ImportPanelProps {
  onImported: (segments: NetworkSegment[], points: NetworkPoint[]) => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ onImported }) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const parseDXF = (text: string) => {
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (line === 'LINE') {
        const seg: any = { id: `CAD-L-${Date.now()}-${segments.length}`, status: ProjectStatus.PENDING, type: NetworkType.WATER, completionPercentage: 0 };
        // Basic DXF parser for LINE entities
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
             name: `خط أوتوكاد ${segments.length + 1}`,
             length: Math.sqrt(Math.pow(seg.endX - seg.startX, 2) + Math.pow(seg.endY - seg.startY, 2)),
             startNode: { x: seg.startX, y: seg.startY },
             endNode: { x: seg.endX, y: seg.endY },
             contractor: 'مستورد من CAD'
           });
        }
      } else if (line === 'CIRCLE' || line === 'POINT') {
        const pt: any = { id: `CAD-P-${Date.now()}-${points.length}`, status: ProjectStatus.PENDING, type: PointType.MANHOLE };
        while (i < lines.length && lines[i].trim() !== '0') {
          const code = lines[i].trim();
          const val = lines[i+1]?.trim();
          if (code === '10') pt.x = parseFloat(val);
          if (code === '20') pt.y = parseFloat(val);
          i += 2;
        }
        if (pt.x !== undefined) {
          points.push({ ...pt, name: `نقطة CAD ${points.length + 1}`, location: { x: pt.x, y: pt.y } });
        }
      } else {
        i++;
      }
    }
    return { segments, points };
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setStatusMsg('جاري تحليل الملف...');
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'xlsx' || extension === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
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
          onImported(segments, []);
          setStatusMsg(`تم استيراد ${segments.length} خط بنجاح`);
        };
        reader.readAsArrayBuffer(file);
      } 
      else if (extension === 'dxf') {
        const text = await file.text();
        const { segments, points } = parseDXF(text);
        onImported(segments, points);
        setStatusMsg(`تم تحليل الأوتوكاد: ${segments.length} ماسورة، ${points.length} عنصر`);
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
                length: f.properties?.length || 100,
                completionPercentage: 0,
                contractor: 'مستورد من GIS',
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
        onImported(segments, points);
        setStatusMsg(`تم استيراد بيانات GIS بنجاح`);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('خطأ في معالجة الملف. يرجى التأكد من الصيغة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-200 hover:border-blue-500 transition-all group">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
           <i className={`fas ${loading ? 'fa-spinner fa-spin text-blue-500' : 'fa-file-import text-blue-400'} text-3xl`}></i>
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2">الاستيراد الهندسي الذكي</h3>
        <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto mb-8">
          اسحب ملفات (AutoCAD DXF) أو (Excel XLSX) أو (GIS GeoJSON) هنا لبناء الشبكة تلقائياً
        </p>

        <label className="relative inline-block cursor-pointer">
          <span className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl block">
            {loading ? 'جاري التحميل...' : 'اختيار ملف من الجهاز'}
          </span>
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx,.csv,.dxf,.geojson,.json"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
        </label>

        {statusMsg && (
          <div className="mt-6 p-3 bg-blue-50 text-blue-700 text-[10px] font-black rounded-xl animate-bounce">
             <i className="fas fa-info-circle ml-2"></i> {statusMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-slate-50">
        <div className="text-center">
          <i className="fas fa-file-excel text-green-500 text-xl mb-2"></i>
          <span className="block text-[9px] font-black text-slate-400 uppercase">Excel Sheets</span>
        </div>
        <div className="text-center">
          <i className="fas fa-drafting-compass text-blue-500 text-xl mb-2"></i>
          <span className="block text-[9px] font-black text-slate-400 uppercase">AutoCAD DXF</span>
        </div>
        <div className="text-center">
          <i className="fas fa-globe-africa text-amber-600 text-xl mb-2"></i>
          <span className="block text-[9px] font-black text-slate-400 uppercase">GIS Data</span>
        </div>
      </div>
    </div>
  );
};

export default ImportPanel;
