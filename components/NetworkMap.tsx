
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

type MapTheme = 'SATELLITE' | 'STREET' | 'DARK_ENGINEERING';

const NetworkMap: React.FC<NetworkMapProps> = ({ segments, points, selectedType, onSegmentClick, onPointClick }) => {
  const [theme, setTheme] = useState<MapTheme>('DARK_ENGINEERING');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // حساب النطاق الجغرافي للبيانات لتوسيط الخريطة (Projection Logic)
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
    
    // إضافة هامش (Padding) بنسبة 10%
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
    
    switch (point.type) {
      case PointType.MANHOLE:
        return (
          <g>
            <circle cx={tx} cy={ty} r="10" fill="white" stroke={color} strokeWidth="3" className="hover:r-12 transition-all shadow-lg" />
            <circle cx={tx} cy={ty} r="4" fill={color} />
          </g>
        );
      case PointType.VALVE:
        return <rect x={tx - 6} y={ty - 6} width="12" height="12" fill={color} stroke="white" strokeWidth="1" className="hover:scale-125 transform origin-center transition-all" />;
      default:
        return <circle cx={tx} cy={ty} r="6" fill={color} stroke="white" strokeWidth="2" />;
    }
  };

  const MapView = ({ type, title, colorClass }: { type: NetworkType | 'ALL', title: string, colorClass: string }) => {
    const filteredSegments = segments.filter(s => type === 'ALL' || s.type === type);
    const filteredPoints = points.filter(p => {
      if (type === 'ALL') return true;
      const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(p.type);
      return type === NetworkType.WATER ? isWaterPoint : !isWaterPoint;
    });

    return (
      <div className="relative flex-1 bg-slate-900 overflow-hidden group">
        <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
           <span className="text-[10px] text-white font-black">{title}</span>
        </div>

        <svg 
          viewBox="0 0 1000 800" 
          className="w-full h-full relative z-10 transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`, cursor: 'crosshair' }}
        >
          {/* Grid Lines for UTM context */}
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {filteredSegments.map((segment) => (
            <g key={segment.id} className="cursor-pointer group/line" onClick={() => onSegmentClick(segment)}>
              <line
                x1={transformX(segment.startNode.x)} y1={transformY(segment.startNode.y)}
                x2={transformX(segment.endNode.x)} y2={transformY(segment.endNode.y)}
                stroke={STATUS_COLORS[segment.status]}
                strokeWidth={segment.type === NetworkType.WATER ? "4" : "7"}
                strokeLinecap="round"
                className="transition-all duration-300 group-hover/line:stroke-white group-hover/line:stroke-[10px]"
              />
            </g>
          ))}

          {filteredPoints.map((point) => (
            <g key={point.id} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); onPointClick(point); }}>
              {renderPointIcon(point)}
              <text 
                x={transformX(point.location.x)} 
                y={transformY(point.location.y) - 20} 
                textAnchor="middle" 
                className="text-[9px] fill-slate-400 font-bold opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none"
              >
                {point.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full overflow-hidden relative border border-slate-200" ref={containerRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">التخطيط المتري (UTM Zone 37N)</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">نظام إحداثيات عالمي متوافق مع أجهزة الـ GPS المساحية</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 5))} className="w-10 h-10 bg-slate-100 text-slate-800 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><i className="fas fa-plus"></i></button>
          <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} className="w-10 h-10 bg-slate-100 text-slate-800 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><i className="fas fa-minus"></i></button>
        </div>
      </div>
      
      <div className="relative w-full aspect-[21/9] border border-slate-200 rounded-3xl overflow-hidden bg-slate-900 shadow-inner">
        <MapView type={selectedType} title={selectedType === 'ALL' ? 'الشبكة الموحدة' : selectedType === 'WATER' ? 'شبكة المياه' : 'شبكة الصرف'} colorClass="bg-blue-500" />

        {/* HUD Info Box */}
        <div className="absolute bottom-6 left-6 z-30 bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-[10px] text-white font-mono shadow-2xl">
           <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-400 font-black">UTM PROJECTION ACTIVE</span>
              </div>
              <div className="flex gap-4 mt-1">
                <span>ZONE: 37 North</span>
                <span className="text-slate-500">|</span>
                <span>UNIT: Meters (m)</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
          <span className="text-[10px] font-black text-slate-600">خطوط مياه</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-600 rounded-sm shadow-[0_0_5px_rgba(217,119,6,0.5)]"></div>
          <span className="text-[10px] font-black text-slate-600">مجمعات صرف</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-circle text-[8px] text-slate-400"></i>
          <span className="text-[10px] font-black text-slate-600">منهل / محبس</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-600">تزامن مساحي مباشر</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkMap;
