
import React from 'react';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus } from '../types';

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
  const pendingPoints = points.filter(p => p.status === ProjectStatus.PENDING).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      
      {/* الكارت الأول: تعداد العناصر الفنية */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-7 flex items-start justify-between">
        <div className="relative w-24 h-24 mt-2">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle cx="48" cy="48" r="38" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
            
            {/* Planned segment (Grey - start) */}
            <circle 
              cx="48" cy="48" r="38" stroke="#e2e8f0" strokeWidth="8" fill="transparent" 
              strokeDasharray={2 * Math.PI * 38} 
              strokeDashoffset={0} 
              strokeLinecap="round"
            />
            
            {/* In Progress segment (Orange) */}
            <circle 
              cx="48" cy="48" r="38" stroke="#f59e0b" strokeWidth="8" fill="transparent" 
              strokeDasharray={2 * Math.PI * 38} 
              strokeDashoffset={2 * Math.PI * 38 * (1 - (inProgressPoints + executedPoints) / (totalPoints || 1))} 
              strokeLinecap="round"
            />

            {/* Executed segment (Teal/Green) */}
            <circle 
              cx="48" cy="48" r="38" stroke="#10b981" strokeWidth="8" fill="transparent" 
              strokeDasharray={2 * Math.PI * 38} 
              strokeDashoffset={2 * Math.PI * 38 * (1 - executedPoints / (totalPoints || 1))} 
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-400">{totalPoints}</span>
          </div>
        </div>

        <div className="text-right flex-1 pr-4">
          <div className="flex items-center gap-2 justify-end mb-1">
            <span className="text-[10px] font-bold text-slate-400">تعداد العناصر الفنية</span>
            <i className="fas fa-map-marker-alt text-amber-500 text-[10px]"></i>
          </div>
          <div className="text-4xl font-black text-[#1e293b] mb-4 flex items-baseline justify-end gap-2">
            <span className="text-sm font-bold text-slate-400">عنصر</span>
            <span>{totalPoints}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-end gap-3">
              <span className="text-[11px] font-black text-slate-700">منفذ</span>
              <span className="text-[11px] font-black text-[#10b981] w-6 text-left">{executedPoints}</span>
            </div>
            <div className="flex items-center justify-end gap-3">
              <span className="text-[11px] font-black text-slate-700">جاري</span>
              <span className="text-[11px] font-black text-[#f59e0b] w-6 text-left">{inProgressPoints}</span>
            </div>
            <div className="flex items-center justify-end gap-3">
              <span className="text-[11px] font-black text-slate-700">مخطط</span>
              <span className="text-[11px] font-black text-slate-300 w-6 text-left">{pendingPoints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* الكارت الثاني: إجمالي أطوال الشبكة الموحدة */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-8 flex flex-col justify-between">
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-[10px] font-bold text-slate-400">إجمالي أطوال الشبكة الموحدة</span>
          <div className="w-4 h-1 bg-[#3b82f6] rounded-full"></div>
        </div>
        
        <div className="text-right mb-6">
          <div className="text-4xl font-black text-[#1e293b] flex items-baseline justify-end gap-2">
            <span className="text-sm font-bold text-slate-400">متر</span>
            <span>{totalLength.toLocaleString()}</span>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[11px] font-black text-slate-400">{overallProgress}%</span>
            <div className="text-right">
              <span className="text-[11px] font-black text-slate-700 tracking-tighter">المنفذ: {Math.round(completedLength).toLocaleString()} م</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#f59e0b] h-full transition-all duration-1000" 
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* الكارت الثالث: نسبة الإنجاز الكلية (تصميم داكن) */}
      <div className="bg-[#0f172a] rounded-[35px] shadow-xl p-8 flex items-center justify-between text-white relative overflow-hidden">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.15)" strokeWidth="8" fill="transparent" />
            <circle 
              cx="48" cy="48" r="38" stroke="white" strokeWidth="8" fill="transparent" 
              strokeDasharray={2 * Math.PI * 38} 
              strokeDashoffset={2 * Math.PI * 38 * (1 - overallProgress / 100)} 
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-bolt text-blue-400 text-sm opacity-20"></i>
          </div>
        </div>

        <div className="text-right flex-1 pr-6">
          <div className="text-[10px] font-bold text-blue-400 mb-2">نسبة الإنجاز الكلية</div>
          <div className="text-6xl font-black text-white mb-2 tracking-tighter">
            {overallProgress}<span className="text-2xl text-blue-400 ml-1">%</span>
          </div>
          <div className="text-[9px] font-bold text-slate-400 leading-tight">
            بناءً على الأطوال<br />المعتمدة
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatsPanel;
