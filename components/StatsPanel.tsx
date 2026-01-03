
import React from 'react';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';
import { POINT_LABELS } from '../constants';

interface StatsPanelProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  networkType: NetworkType | 'ALL';
}

const StatsPanel: React.FC<StatsPanelProps> = ({ segments, points, networkType }) => {
  const totalLength = segments.reduce((acc, curr) => acc + curr.length, 0);
  const completedLength = segments.reduce((acc, curr) => acc + (curr.length * curr.completionPercentage / 100), 0);
  const overallProgress = totalLength > 0 ? Math.round((completedLength / totalLength) * 100) : 0;

  const totalPoints = points.length;
  const executedPoints = points.filter(p => p.status === ProjectStatus.COMPLETED).length;
  const inProgressPoints = points.filter(p => p.status === ProjectStatus.IN_PROGRESS).length;
  
  // Group points by Type
  const typeCounts = points.reduce((acc, curr) => {
    const type = curr.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<PointType, number>);

  // Sort types by count descending
  const sortedTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([type, count]) => ({ type: type as PointType, count: count as number }));

  // SVG Configuration
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 10; 

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      
      {/* Card 1: Point Classification */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-7 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
            
            {/* Visualizing Execution Status on the ring */}
            <circle 
              cx="48" cy="48" r={radius} stroke="#f59e0b" strokeWidth={strokeWidth} fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={circumference * (1 - (inProgressPoints + executedPoints) / (totalPoints || 1))} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <circle 
              cx="48" cy="48" r={radius} stroke="#10b981" strokeWidth={strokeWidth} fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={circumference * (1 - executedPoints / (totalPoints || 1))} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out delay-100"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-800">{totalPoints}</span>
            <span className="text-[9px] font-bold text-slate-400">Items</span>
          </div>
        </div>

        <div className="text-left flex-1 pl-4 overflow-hidden">
          <h3 className="text-[11px] font-black text-slate-400 mb-2 uppercase tracking-wider">Classification</h3>
          <div className="space-y-1.5 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
            {sortedTypes.length > 0 ? (
              sortedTypes.map(({ type, count }) => (
                <div key={type} className="flex items-center justify-start gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    type.includes('MANHOLE') ? 'bg-amber-600' : 
                    type.includes('VALVE') ? 'bg-blue-600' : 
                    type.includes('FIRE') ? 'bg-red-500' : 'bg-slate-400'
                  }`}></div>
                  <span className="text-[10px] font-bold text-slate-600 truncate">
                    {POINT_LABELS[type] || type} ({count})
                  </span>
                </div>
              ))
            ) : (
              <span className="text-[10px] text-slate-300">No items</span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Network Length */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-8 flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex items-center justify-start gap-2 mb-4">
          <div className="w-6 h-6 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
             <i className="fas fa-ruler-combined text-xs"></i>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Network</span>
        </div>
        
        <div className="text-left mb-6">
          <div className="text-4xl font-black text-slate-800 flex items-baseline justify-start gap-2">
            <span>{totalLength.toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-400">m</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Total recorded linear length</p>
        </div>

        <div className="w-full">
          <div className="flex justify-between items-end mb-2">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-500">Executed: {Math.round(completedLength).toLocaleString()} m</span>
            </div>
            <span className="text-[11px] font-black text-blue-600">{overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-1000 ease-out" 
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Card 3: Overall Progress */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-7 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
        {/* Decorative background blur */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
        
        <div className="relative w-28 h-28 z-10 shrink-0">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} stroke="#eff6ff" strokeWidth={strokeWidth} fill="transparent" />
            <circle 
              cx="48" cy="48" r={radius} stroke="#3b82f6" strokeWidth={strokeWidth} fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={circumference * (1 - overallProgress / 100)} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <i className="fas fa-chart-pie text-blue-500 text-lg mb-1 opacity-80"></i>
             <span className="text-[10px] font-black text-slate-400">Progress</span>
          </div>
        </div>

        <div className="text-left flex-1 pl-4 z-10">
          <div className="text-[10px] font-black text-blue-500 mb-2 uppercase tracking-wider bg-blue-50 inline-block px-2 py-1 rounded-lg">KPI Index</div>
          <div className="text-5xl font-black text-slate-800 mb-2 tracking-tighter flex items-center justify-start">
            {overallProgress}<span className="text-xl text-slate-400 ml-1">%</span>
          </div>
          <div className="text-[9px] font-bold text-slate-400 leading-tight">
             Overall Project Completion<br/>Based on approved works
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatsPanel;
