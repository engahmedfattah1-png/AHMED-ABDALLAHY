
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { NetworkSegment, ProjectStatus, NetworkPoint, NetworkType } from '../types';
import { STATUS_COLORS } from '../constants';

interface StatsPanelProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  networkType: NetworkType | 'ALL';
}

const StatsPanel: React.FC<StatsPanelProps> = ({ segments, points, networkType }) => {
  const totalLength = segments.reduce((acc, curr) => acc + curr.length, 0);
  const completedLength = segments.reduce((acc, curr) => acc + (curr.length * curr.completionPercentage / 100), 0);
  
  const completedPoints = points.filter(p => p.status === ProjectStatus.COMPLETED).length;
  const inProgressPoints = points.filter(p => p.status === ProjectStatus.IN_PROGRESS).length;
  const pendingPoints = points.filter(p => p.status === ProjectStatus.PENDING).length;

  const pointData = [
    { name: 'منفذ', value: completedPoints, color: STATUS_COLORS[ProjectStatus.COMPLETED] },
    { name: 'جاري', value: inProgressPoints, color: STATUS_COLORS[ProjectStatus.IN_PROGRESS] },
    { name: 'متبقي', value: pendingPoints, color: STATUS_COLORS[ProjectStatus.PENDING] },
  ];

  const typeLabel = networkType === 'ALL' ? 'الشبكة الموحدة' : networkType === NetworkType.WATER ? 'شبكة المياه' : 'شبكة الصرف';
  const accentColor = networkType === NetworkType.WATER ? 'border-blue-500' : networkType === NetworkType.SEWAGE ? 'border-amber-600' : 'border-slate-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className={`bg-white rounded-xl shadow-lg p-6 border-r-4 ${accentColor}`}>
        <h4 className="text-gray-500 font-bold text-sm mb-2">أطوال {typeLabel}</h4>
        <div className="text-3xl font-black text-slate-900">{Math.round(totalLength).toLocaleString()} <span className="text-xs text-gray-400">متر</span></div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span>نسبة الإنجاز المخطط</span>
            <span className="font-bold">{totalLength > 0 ? Math.round((completedLength / totalLength) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${networkType === NetworkType.WATER ? 'bg-blue-600' : 'bg-amber-600'}`} 
              style={{ width: `${totalLength > 0 ? (completedLength / totalLength) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-lg p-6 border-r-4 ${networkType === NetworkType.WATER ? 'border-blue-400' : 'border-amber-500'}`}>
        <h4 className="text-gray-500 font-bold text-sm mb-2">عناصر {typeLabel}</h4>
        <div className="text-3xl font-black text-slate-900">{points.length} <span className="text-xs text-gray-400">عنصر</span></div>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 text-center bg-green-50 rounded p-1">
            <div className="text-[10px] text-green-600">منفذ</div>
            <div className="text-sm font-bold">{completedPoints}</div>
          </div>
          <div className="flex-1 text-center bg-amber-50 rounded p-1">
            <div className="text-[10px] text-amber-600">جاري</div>
            <div className="text-sm font-bold">{inProgressPoints}</div>
          </div>
          <div className="flex-1 text-center bg-slate-50 rounded p-1">
            <div className="text-[10px] text-slate-400">متبقي</div>
            <div className="text-sm font-bold">{pendingPoints}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4">
        <h4 className="text-gray-800 font-bold text-sm mb-2 px-2">موقف تنفيذ المناهل/المحابس</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pointData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 10}} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {pointData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
