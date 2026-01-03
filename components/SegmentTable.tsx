
import React, { useState, useMemo, useEffect } from 'react';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';
import { POINT_LABELS } from '../constants';

interface DataTableProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  onSelect: (item: NetworkSegment | NetworkPoint, type: 'SEGMENT' | 'POINT') => void;
  onUpdateTrigger: (item: NetworkSegment | NetworkPoint, type: 'SEGMENT' | 'POINT') => void;
}

type TabCategory = 'PIPES' | 'VALVES' | 'FITTINGS' | 'WATER_CONN' | 'MANHOLES' | 'SEWAGE_CONN';

const DataTable: React.FC<DataTableProps> = ({ segments, points, onSelect, onUpdateTrigger }) => {
  const [activeTab, setActiveTab] = useState<TabCategory>('PIPES');

  // Reset tab to pipes when data changes significantly to avoid empty views
  useEffect(() => {
    setActiveTab('PIPES');
  }, [segments.length, points.length]);

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
      case PointType.INSPECTION_CHAMBER: return <i className="fas fa-square text-amber-600"></i>;
      case PointType.FIRE_HYDRANT: return <i className="fas fa-fire-extinguisher text-red-500"></i>;
      case PointType.AIR_VALVE: return <i className="fas fa-wind text-sky-400"></i>;
      case PointType.WASH_VALVE: return <i className="fas fa-soap text-indigo-400"></i>;
      case PointType.OIL_TRAP: return <i className="fas fa-filter text-slate-600"></i>;
      case PointType.WATER_HOUSE_CONNECTION: return <i className="fas fa-home text-blue-400"></i>;
      case PointType.SEWAGE_HOUSE_CONNECTION: return <i className="fas fa-home text-amber-700"></i>;
      case PointType.ELBOW: return <i className="fas fa-level-down-alt text-slate-500 transform rotate-90"></i>;
      case PointType.TEE: return <i className="fas fa-code-branch text-slate-500"></i>;
      default: return <i className="fas fa-map-marker-alt text-slate-400"></i>;
    }
  };

  // --- Filtering Logic ---
  const categorizedPoints = useMemo(() => {
    return {
      valves: points.filter(p => p.type === PointType.VALVE),
      fittings: points.filter(p => [PointType.AIR_VALVE, PointType.WASH_VALVE, PointType.FIRE_HYDRANT, PointType.ELBOW, PointType.TEE].includes(p.type)),
      waterConn: points.filter(p => p.type === PointType.WATER_HOUSE_CONNECTION),
      manholes: points.filter(p => [PointType.MANHOLE, PointType.INSPECTION_CHAMBER, PointType.OIL_TRAP].includes(p.type)),
      sewageConn: points.filter(p => p.type === PointType.SEWAGE_HOUSE_CONNECTION),
    };
  }, [points]);

  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'PIPES': return segments;
      case 'VALVES': return categorizedPoints.valves;
      case 'FITTINGS': return categorizedPoints.fittings;
      case 'WATER_CONN': return categorizedPoints.waterConn;
      case 'MANHOLES': return categorizedPoints.manholes;
      case 'SEWAGE_CONN': return categorizedPoints.sewageConn;
      default: return [];
    }
  }, [activeTab, segments, categorizedPoints]);

  const hasWaterData = categorizedPoints.valves.length > 0 || categorizedPoints.fittings.length > 0 || categorizedPoints.waterConn.length > 0;
  const hasSewageData = categorizedPoints.manholes.length > 0 || categorizedPoints.sewageConn.length > 0;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      <div className="p-6 border-b border-slate-50 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">سجل بيانات الشبكة</h3>
          <p className="text-[10px] text-slate-400 font-bold">عرض تفصيلي وتصنيف دقيق لمكونات الشبكة</p>
        </div>
        
        <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-2xl overflow-x-auto custom-scrollbar">
          {/* Always Show Pipes */}
          <button 
            onClick={() => setActiveTab('PIPES')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'PIPES' ? 'bg-white shadow text-slate-800 ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
             <i className="fas fa-ruler-horizontal"></i>
             المواسير ({segments.length})
          </button>

          {/* Water Categories */}
          {hasWaterData && (
             <>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                
                <button 
                  onClick={() => setActiveTab('VALVES')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'VALVES' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'text-slate-400 hover:text-blue-500'}`}
                >
                  <i className="fas fa-faucet"></i>
                  محابس تحكم ({categorizedPoints.valves.length})
                </button>

                <button 
                  onClick={() => setActiveTab('FITTINGS')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'FITTINGS' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-400 hover:text-indigo-500'}`}
                >
                  <i className="fas fa-tools"></i>
                  قطع خاصة ({categorizedPoints.fittings.length})
                </button>

                <button 
                  onClick={() => setActiveTab('WATER_CONN')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'WATER_CONN' ? 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100' : 'text-slate-400 hover:text-cyan-500'}`}
                >
                  <i className="fas fa-home"></i>
                  توصيلات منزلية ({categorizedPoints.waterConn.length})
                </button>
             </>
          )}

          {/* Sewage Categories */}
          {hasSewageData && (
             <>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>

                <button 
                  onClick={() => setActiveTab('MANHOLES')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'MANHOLES' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' : 'text-slate-400 hover:text-amber-600'}`}
                >
                  <i className="fas fa-dot-circle"></i>
                  المناهل ({categorizedPoints.manholes.length})
                </button>

                <button 
                  onClick={() => setActiveTab('SEWAGE_CONN')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'SEWAGE_CONN' ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-100' : 'text-slate-400 hover:text-orange-500'}`}
                >
                  <i className="fas fa-network-wired"></i>
                  توصيلات منزلية ({categorizedPoints.sewageConn.length})
                </button>
             </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            {activeTab === 'PIPES' ? (
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">الكود</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">اسم الخط</th>
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
            {currentData.length > 0 ? (
              activeTab === 'PIPES' ? (
                (currentData as NetworkSegment[]).map((segment) => (
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
                (currentData as NetworkPoint[]).map((point) => (
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
              )
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-bold text-xs">
                  لا توجد بيانات متاحة في هذا التصنيف
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
