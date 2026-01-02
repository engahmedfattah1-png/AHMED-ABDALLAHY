
import React, { useState, useRef, useMemo } from 'react';
import { NetworkSegment, NetworkType, ProjectStatus, NetworkPoint, PointType } from '../types';
import { STATUS_COLORS } from '../constants';

interface NetworkMapProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  selectedType: NetworkType | 'ALL';
  onSegmentClick: (segment: NetworkSegment) => void;
  onPointClick: (point: NetworkPoint) => void;
}

const NetworkMap: React.FC<NetworkMapProps> = ({ segments, points, selectedType, onSegmentClick, onPointClick }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => {
    if (segments.length === 0 && points.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 800, rangeX: 1000, rangeY: 800 };
    }
    const allX = [
      ...segments.flatMap(s => [s.startNode.x, s.endNode.x]),
      ...points.map(p => p.location.x)
    ];
    const allY = [
      ...segments.flatMap(s => [s.startNode.y, s.endNode.y]),
      ...points.map(p => p.location.y)
    ];
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    const paddingX = (maxX - minX) * 0.1 || 100;
    const paddingY = (maxY - minY) * 0.1 || 100;
    
    return {
      minX: minX - paddingX,
      minY: minY - paddingY,
      maxX: maxX + paddingX,
      maxY: maxY + paddingY,
      rangeX: (maxX - minX) + (paddingX * 2),
      rangeY: (maxY - minY) + (paddingY * 2)
    };
  }, [segments, points]);

  const transformX = (x: number) => ((x - bounds.minX) / bounds.rangeX) * 1000;
  const transformY = (y: number) => 800 - (((y - bounds.minY) / bounds.rangeY) * 800);

  const renderPointIcon = (point: NetworkPoint) => {
    const color = STATUS_COLORS[point.status];
    const tx = transformX(point.location.x);
    const ty = transformY(point.location.y);
    
    let stroke = "white";
    let r = 6;
    if (point.type === PointType.MANHOLE) stroke = "#f97316";
    if (point.type === PointType.VALVE) stroke = "#3b82f6";
    if (point.type === PointType.FIRE_HYDRANT) stroke = "#ef4444";
    
    return (
      <g className="hover:scale-125 transition-transform origin-center">
        <circle 
          cx={tx} cy={ty} r={r} 
          fill={color} 
          stroke={stroke} 
          strokeWidth="1.5" 
        />
      </g>
    );
  };

  const isWater = selectedType === NetworkType.WATER || selectedType === 'ALL';
  const isSewage = selectedType === NetworkType.SEWAGE || selectedType === 'ALL';

  return (
    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 w-full overflow-hidden relative" ref={containerRef}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-2">
          <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm"><i className="fas fa-minus"></i></button>
          <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 5))} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm"><i className="fas fa-plus"></i></button>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">التخطيط المتري (UTM Zone 37N)</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">نظام إحداثيات عالمي متوافق مع أجهزة الـ GPS المساحية</p>
        </div>
      </div>
      
      <div className="relative w-full aspect-[16/9] bg-[#0b0f1a] rounded-[32px] overflow-hidden shadow-inner border border-slate-800">
        <div className="absolute top-6 right-6 z-20 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-300">الشبكة الموحدة</span>
           <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        </div>

        <div className="absolute bottom-10 left-10 z-20 bg-[#0f172a]/90 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-2xl min-w-[200px]">
           <div className="flex items-center gap-2 mb-3">
             <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">UTM PROJECTION ACTIVE</span>
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           </div>
           <div className="text-[10px] font-mono font-black text-slate-400 flex items-center gap-4">
              <span>UNIT: Meters (m)</span>
              <div className="w-px h-3 bg-white/10"></div>
              <span>ZONE: 37 North</span>
           </div>
        </div>

        <svg 
          viewBox="0 0 1000 800" 
          className="w-full h-full relative z-10 transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`, cursor: 'crosshair' }}
        >
          <defs>
            <pattern id="darkGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#darkGrid)" />

          {segments.filter(s => selectedType === 'ALL' || s.type === selectedType).map((segment) => (
            <g key={segment.id} className="cursor-pointer group/line" onClick={() => onSegmentClick(segment)}>
              <line
                x1={transformX(segment.startNode.x)} y1={transformY(segment.startNode.y)}
                x2={transformX(segment.endNode.x)} y2={transformY(segment.endNode.y)}
                stroke={segment.type === NetworkType.WATER ? '#3b82f6' : '#f59e0b'}
                strokeWidth="3"
                strokeDasharray={segment.status === ProjectStatus.PENDING ? "5,5" : "0"}
                strokeLinecap="round"
                className="transition-all duration-300 group-hover/line:stroke-white group-hover/line:stroke-[5px]"
              />
              <line
                x1={transformX(segment.startNode.x)} y1={transformY(segment.startNode.y)}
                x2={transformX(segment.endNode.x)} y2={transformY(segment.endNode.y)}
                stroke={STATUS_COLORS[segment.status]}
                strokeWidth="1.5"
                strokeOpacity="0.5"
                strokeLinecap="round"
              />
            </g>
          ))}

          {points.filter(p => {
            if (selectedType === 'ALL') return true;
            const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(p.type);
            return selectedType === NetworkType.WATER ? isWaterPoint : !isWaterPoint;
          }).map((point) => (
            <g key={point.id} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); onPointClick(point); }}>
              {renderPointIcon(point)}
            </g>
          ))}
        </svg>
      </div>

      {/* مفتاح الخريطة الديناميكي */}
      <div className="bg-slate-50/80 backdrop-blur-sm mt-6 p-5 rounded-3xl border border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">مفتاح العناصر النشطة</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-4">
           {isWater && (
             <>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">خطوط مياه</span>
                 <div className="w-8 h-1.5 bg-blue-500 rounded-full"></div>
               </div>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">محابس</span>
                 <div className="w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded shadow-sm"></div>
               </div>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">حنفيات حريق</span>
                 <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
               </div>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">توصيلات مياه</span>
                 <div className="w-3 h-3 bg-cyan-400 rounded-full border border-white"></div>
               </div>
             </>
           )}
           
           {isSewage && (
             <>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">خطوط انحدار</span>
                 <div className="w-8 h-1.5 bg-amber-500 rounded-full"></div>
               </div>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">مناهل</span>
                 <div className="w-3.5 h-3.5 border-2 border-amber-600 rounded-full bg-white shadow-sm"></div>
               </div>
               <div className="flex items-center justify-center gap-3 px-4">
                 <span className="text-[11px] font-black text-slate-500">غرف تفتيش</span>
                 <div className="w-3 h-3 bg-amber-800 rounded-full border border-white"></div>
               </div>
             </>
           )}

           <div className="flex items-center justify-center gap-3 px-4">
             <span className="text-[11px] font-black text-slate-500">GPS LIVE</span>
             <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkMap;
