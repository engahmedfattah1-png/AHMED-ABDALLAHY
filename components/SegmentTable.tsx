
import React, { useState } from 'react';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';
import { POINT_LABELS } from '../constants';

interface DataTableProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  onSelect: (item: NetworkSegment | NetworkPoint, type: 'SEGMENT' | 'POINT') => void;
  onUpdateTrigger: (item: NetworkSegment | NetworkPoint, type: 'SEGMENT' | 'POINT') => void;
}

const DataTable: React.FC<DataTableProps> = ({ segments, points, onSelect, onUpdateTrigger }) => {
  const [viewMode, setViewMode] = useState<'SEGMENTS' | 'POINTS'>('SEGMENTS');

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED:
        return <span className="px-2 py-1 text-[10px] font-black rounded-lg bg-green-100 text-green-700 border border-green-200">منفذ</span>;
      case ProjectStatus.IN_PROGRESS:
        return <span className="px-2 py-1 text-[10px] font-black rounded-lg bg-amber-100 text-amber-700 border border-amber-200">جاري</span>;
      default:
        return <span className="px-2 py-1 text-[10px] font-black rounded-lg bg-slate-100 text-slate-500 border border-slate-200">مخطط</span>;
    }
  };

  const getPointIcon = (type: PointType) => {
    switch (type) {
      case PointType.VALVE: return <i className="fas fa-faucet text-blue-500"></i>;
      case PointType.MANHOLE: return <i className="fas fa-dot-circle text-amber-700"></i>;
      case PointType.FIRE_HYDRANT: return <i className="fas fa-fire-extinguisher text-red-500"></i>;
      default: return <i className="fas fa-map-marker-alt text-slate-400"></i>;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">سجل بيانات الشبكة</h3>
          <p className="text-[10px] text-slate-400 font-bold">عرض تفصيلي لجميع مكونات المشروع وتحديثاتها</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('SEGMENTS')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'SEGMENTS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
          >
             المواسير ({segments.length})
          </button>
          <button 
            onClick={() => setViewMode('POINTS')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'POINTS' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`}
          >
             العناصر ({points.length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            {viewMode === 'SEGMENTS' ? (
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">الكود</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">اسم القطاع / المسؤول</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">النوع</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الطول</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الإنجاز</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">آخر تحديث</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الحالة</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الإجراءات</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">الكود</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">اسم العنصر</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">التصنيف</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الإحداثيات</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">آخر تحديث</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الحالة</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase text-center">الإجراءات</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-50">
            {viewMode === 'SEGMENTS' ? (
              segments.map((segment) => (
                <tr key={segment.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{segment.id}</td>
                  <td className="px-6 py-4">
                     <div className="text-sm font-black text-slate-800">{segment.name}</div>
                     <div className="text-[10px] text-slate-400 font-bold">{segment.contractor}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black ${segment.type === NetworkType.WATER ? 'text-blue-500' : 'text-amber-600'}`}>
                      {segment.type === NetworkType.WATER ? 'مياه' : 'صرف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-700">{segment.length.toLocaleString()} م</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${segment.completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${segment.completionPercentage}%` }}></div>
                      </div>
                      <span className="text-[9px] font-black text-slate-500">{segment.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-[9px] font-bold text-slate-500 leading-tight">
                       {segment.updatedBy || 'نظام آلي'}
                       <div className="text-[8px] text-slate-400 mt-0.5">{segment.updatedAt || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(segment.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onSelect(segment, 'SEGMENT')} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white transition-all"><i className="fas fa-eye text-xs"></i></button>
                      <button onClick={() => onUpdateTrigger(segment, 'SEGMENT')} className="p-2 rounded-lg bg-blue-600 text-white hover:bg-slate-900 transition-all"><i className="fas fa-tools text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              points.map((point) => (
                <tr key={point.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{point.id}</td>
                  <td className="px-6 py-4">
                     <div className="text-sm font-black text-slate-800">{point.name}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getPointIcon(point.type)}
                      <span className="text-[10px] font-black text-slate-600">{POINT_LABELS[point.type]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-[9px] font-mono font-bold text-slate-400 leading-none">
                    X: {Math.round(point.location.x)}<br/>Y: {Math.round(point.location.y)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-[9px] font-bold text-slate-500 leading-tight">
                       {point.updatedBy || 'نظام آلي'}
                       <div className="text-[8px] text-slate-400 mt-0.5">{point.updatedAt || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(point.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onSelect(point, 'POINT')} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white transition-all"><i className="fas fa-eye text-xs"></i></button>
                      <button onClick={() => onUpdateTrigger(point, 'POINT')} className="p-2 rounded-lg bg-amber-600 text-white hover:bg-slate-900 transition-all"><i className="fas fa-tools text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
