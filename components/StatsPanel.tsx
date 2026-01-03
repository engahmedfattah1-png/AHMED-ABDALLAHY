
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

  // SVG Configuration
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 10; // Increased thickness for better visibility

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      
      {/* الكارت الأول: تعداد العناصر الفنية */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-7 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
            {/* Background ring (Full Circle) */}
            <circle cx="48" cy="48" r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
            
            {/* Pending segment (The base layer for 'unfilled') - handled by background ring mostly, 
                but we can stack colors. 
                Strategy: 
                1. Draw Full Circle Orange (Represents Total Active: InProgress + Executed)
                2. Draw Full Circle Green (Represents Executed) on top.
                The rest remains the background color (Pending).
            */}

            {/* Total Active (In Progress + Executed) -> Orange */}
            <circle 
              cx="48" cy="48" r={radius} stroke="#f59e0b" strokeWidth={strokeWidth} fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={circumference * (1 - (inProgressPoints + executedPoints) / (totalPoints || 1))} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />

            {/* Executed -> Green */}
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
            <span className="text-[9px] font-bold text-slate-400">إجمالي</span>
          </div>
        </div>

        <div className="text-right flex-1 pr-2">
          <h3 className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">حالة العناصر</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold text-slate-600">منفذ ({executedPoints})</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold text-slate-600">جاري ({inProgressPoints})</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold text-slate-600">مخطط ({pendingPoints})</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* الكارت الثاني: إجمالي أطوال الشبكة الموحدة */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-8 flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">إجمالي الشبكة</span>
          <div className="w-6 h-6 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
             <i className="fas fa-ruler-combined text-xs"></i>
          </div>
        </div>
        
        <div className="text-right mb-6">
          <div className="text-4xl font-black text-slate-800 flex items-baseline justify-end gap-2">
            <span className="text-sm font-bold text-slate-400">م.ط</span>
            <span>{totalLength.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">إجمالي أطوال الخطوط المسجلة</p>
        </div>

        <div className="w-full">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[11px] font-black text-blue-600">{overallProgress}%</span>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500">المنفذ: {Math.round(completedLength).toLocaleString()} م</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-l from-blue-500 to-blue-400 h-full transition-all duration-1000 ease-out" 
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* الكارت الثالث: نسبة الإنجاز الكلية (تصميم أبيض بدل الأسود) */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 p-7 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
        {/* Decorative background blur */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
        
        <div className="relative w-28 h-28 z-10">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 96 96">
            {/* Track */}
            <circle cx="48" cy="48" r={radius} stroke="#eff6ff" strokeWidth={strokeWidth} fill="transparent" />
            {/* Progress */}
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
             <span className="text-[10px] font-black text-slate-400">الإنجاز</span>
          </div>
        </div>

        <div className="text-right flex-1 pr-4 z-10">
          <div className="text-[10px] font-black text-blue-500 mb-2 uppercase tracking-wider bg-blue-50 inline-block px-2 py-1 rounded-lg">المؤشر العام</div>
          <div className="text-5xl font-black text-slate-800 mb-2 tracking-tighter flex items-center justify-end">
            {overallProgress}<span className="text-xl text-slate-400 mr-1">%</span>
          </div>
          <div className="text-[9px] font-bold text-slate-400 leading-tight">
             نسبة التقدم الكلية للمشروع<br/>بناءً على الأعمال المعتمدة
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatsPanel;
