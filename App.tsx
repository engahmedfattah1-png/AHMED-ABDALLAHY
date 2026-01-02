
import React, { useState, useEffect, useMemo } from 'react';
import { NetworkSegment, NetworkType, NetworkPoint, PointType, ProjectStatus, Project } from './types';
import { MOCK_PROJECTS } from './constants';
import NetworkMap from './components/NetworkMap';
import StatsPanel from './components/StatsPanel';
import DataTable from './components/SegmentTable'; 
import ManagementPanel from './components/ManagementPanel';
import ValidationModal from './components/ValidationModal';
import { getProjectInsights } from './services/geminiService';
import { runEngineeringAudit, AuditIssue } from './services/engineeringService';

interface AuditEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'UPDATE' | 'CREATE' | 'SYSTEM' | 'AUDIT';
}

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('infra_projects_v7');
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || '');
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAP' | 'MANAGE'>('OVERVIEW');
  const [filterType, setFilterType] = useState<NetworkType | 'ALL'>('ALL');
  const [managementSelection, setManagementSelection] = useState<{type: 'SEGMENT' | 'POINT', id: string} | undefined>(undefined);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('infra_visited'));
  
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const filteredData = useMemo(() => {
    const segments = activeProject.segments.filter(s => filterType === 'ALL' || s.type === filterType);
    const points = activeProject.points.filter(p => {
      if (filterType === 'ALL') return true;
      const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(p.type);
      return filterType === NetworkType.WATER ? isWaterPoint : !isWaterPoint;
    });
    return { segments, points };
  }, [activeProject, filterType]);

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [isAiAuditing, setIsAiAuditing] = useState(false);
  const [aiAuditComment, setAiAuditComment] = useState('');

  useEffect(() => {
    localStorage.setItem('infra_projects_v7', JSON.stringify(projects));
  }, [projects]);

  const addLog = (message: string, type: 'UPDATE' | 'CREATE' | 'SYSTEM' | 'AUDIT' = 'UPDATE') => {
    const newLog: AuditEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 9)]);
  };

  const handleRunAudit = async () => {
    const issues = runEngineeringAudit(filteredData.segments, filteredData.points);
    setAuditIssues(issues);
    setIsAuditOpen(true);
    setIsAiAuditing(true);
    try {
      const aiResponse = await getProjectInsights(filteredData.segments);
      setAiAuditComment(aiResponse);
    } catch {
      setAiAuditComment("الذكاء الاصطناعي غير متاح حالياً.");
    } finally {
      setIsAiAuditing(false);
    }
  };

  const updateActiveProjectData = (updatedSegments: NetworkSegment[], updatedPoints: NetworkPoint[]) => {
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId ? { ...p, segments: updatedSegments, points: updatedPoints, lastUpdated: new Date().toISOString() } : p
    ));
  };

  const updateSegmentProgress = (id: string, progress: number, userName: string) => {
    const timestamp = new Date().toLocaleString('ar-EG');
    const updatedSegments = activeProject.segments.map(s => {
      if (s.id === id) {
        const newStatus = progress === 100 ? ProjectStatus.COMPLETED : progress > 0 ? ProjectStatus.IN_PROGRESS : ProjectStatus.PENDING;
        addLog(`تحديث ${s.name} بواسطة ${userName}`);
        return { ...s, completionPercentage: progress, status: newStatus, updatedBy: userName, updatedAt: timestamp };
      }
      return s;
    });
    updateActiveProjectData(updatedSegments, activeProject.points);
  };

  const updatePointStatus = (id: string, status: ProjectStatus, userName: string) => {
    const timestamp = new Date().toLocaleString('ar-EG');
    const updatedPoints = activeProject.points.map(p => {
      if (p.id === id) {
        addLog(`تحديث ${p.name} بواسطة ${userName}`);
        return { ...p, status, updatedBy: userName, updatedAt: timestamp };
      }
      return p;
    });
    updateActiveProjectData(activeProject.segments, updatedPoints);
  };

  const closeWelcome = () => {
    localStorage.setItem('infra_visited', 'true');
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans overflow-x-hidden" dir="rtl">
      
      {/* Welcome Onboarding */}
      {showWelcome && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
           <div className="bg-white rounded-[48px] w-full max-w-xl p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40 rotate-3">
                 <i className="fas fa-drafting-compass text-white text-3xl"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">أهلاً بك في InfraTrack Pro</h2>
              <p className="text-sm text-slate-500 font-bold leading-relaxed mb-8">
                نظامك المتكامل لإدارة ومتابعة تنفيذ شبكات المياه والصرف الصحي ميدانياً. 
                استخدم الخريطة المترية لمراقبة التقدم، وقم بتحديث الحالات لحظياً من موقع العمل.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <i className="fas fa-map-marked-alt text-blue-500 mb-2"></i>
                    <p className="text-[10px] font-black">خريطة UTM دقيقة</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <i className="fas fa-robot text-indigo-500 mb-2"></i>
                    <p className="text-[10px] font-black">تدقيق ذكاء اصطناعي</p>
                 </div>
              </div>
              <button onClick={closeWelcome} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-600 transition-all">
                 ابدأ العمل الآن
              </button>
           </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 relative shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="text-center mb-6">
                <i className="fas fa-mobile-alt text-4xl text-blue-600 mb-4"></i>
                <h3 className="text-xl font-black text-slate-800">تثبيت التطبيق على الأيفون</h3>
             </div>
             <div className="space-y-4 mb-8 text-right">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                   <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                   <p className="text-xs font-bold text-slate-600">افتح الرابط في Safari.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                   <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                   <p className="text-xs font-bold text-slate-600">اضغط أيقونة المشاركة <i className="fas fa-share-square mx-1"></i>.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                   <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                   <p className="text-xs font-bold text-slate-600">اختر "إضافة إلى الشاشة الرئيسية".</p>
                </div>
             </div>
             <button onClick={() => setShowShareModal(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">إغلاق</button>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white shadow-2xl sticky top-0 z-50 border-b border-white/10 backdrop-blur-md bg-slate-900/95">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl"><i className="fas fa-layer-group text-xl"></i></div>
              <h1 className="text-xl font-black tracking-tight">InfraTrack Pro</h1>
            </div>
            <select 
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="flex-1 md:w-64 bg-slate-800 text-white border-2 border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-black focus:border-blue-500 outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-800/50 rounded-2xl p-1">
              <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${filterType === 'ALL' ? 'bg-blue-600' : 'text-slate-400'}`}>الكل</button>
              <button onClick={() => setFilterType(NetworkType.WATER)} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${filterType === NetworkType.WATER ? 'bg-blue-600' : 'text-slate-400'}`}>مياه</button>
              <button onClick={() => setFilterType(NetworkType.SEWAGE)} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${filterType === NetworkType.SEWAGE ? 'bg-blue-600' : 'text-slate-400'}`}>صرف</button>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setShowShareModal(true)} className="w-11 h-11 bg-white/5 hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all"><i className="fas fa-mobile-alt text-blue-400"></i></button>
               <button onClick={handleRunAudit} className="w-11 h-11 bg-white/5 hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all"><i className="fas fa-user-shield text-blue-400"></i></button>
            </div>
          </div>
        </div>
      </header>

      <ValidationModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} issues={auditIssues} isAiAnalyzing={isAiAuditing} aiComment={aiAuditComment} />

      <main className="container mx-auto px-4 mt-8">
        <StatsPanel segments={filteredData.segments} points={filteredData.points} networkType={filterType} />

        <div className="flex gap-1 mb-8 bg-white/50 backdrop-blur p-1 rounded-[24px] w-fit border border-white shadow-sm overflow-x-auto no-scrollbar max-w-full">
          <button onClick={() => setActiveTab('OVERVIEW')} className={`whitespace-nowrap px-8 py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'OVERVIEW' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>البيانات</button>
          <button onClick={() => setActiveTab('MAP')} className={`whitespace-nowrap px-8 py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'MAP' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>الخريطة</button>
          <button onClick={() => { setActiveTab('MANAGE'); setManagementSelection(undefined); }} className={`whitespace-nowrap px-8 py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'MANAGE' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>التحديثات</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-9">
            {activeTab === 'OVERVIEW' && <DataTable segments={filteredData.segments} points={filteredData.points} onSelect={() => setActiveTab('MAP')} onUpdateTrigger={(item, type) => { setManagementSelection({type, id: item.id}); setActiveTab('MANAGE'); }} />}
            {activeTab === 'MAP' && <NetworkMap segments={activeProject.segments} points={activeProject.points} selectedType={filterType} onSegmentClick={()=>{}} onPointClick={()=>{}} />}
            {activeTab === 'MANAGE' && (
              <ManagementPanel 
                segments={activeProject.segments} points={activeProject.points} 
                onUpdateSegment={updateSegmentProgress} onUpdatePoint={updatePointStatus}
                onAddSegment={(s) => updateActiveProjectData([...activeProject.segments, s], activeProject.points)}
                onAddPoint={(p) => updateActiveProjectData(activeProject.segments, [...activeProject.points, p])}
                onBulkImport={(s, p) => updateActiveProjectData([...activeProject.segments, ...s], [...activeProject.points, ...p])}
                initialSelection={managementSelection} currentFilterType={filterType}
              />
            )}
          </div>
          <div className="lg:col-span-3">
             <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl lg:sticky lg:top-28">
               <h4 className="text-[10px] font-black mb-6 uppercase text-slate-500 tracking-widest flex items-center gap-2"><i className="fas fa-history"></i> السجل الميداني</h4>
               <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                  {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="text-[10px] border-b border-white/5 pb-4">
                      <p className="text-slate-300 font-bold leading-relaxed">{log.message}</p>
                      <span className="text-[8px] text-slate-600 mt-2 block">{log.timestamp}</span>
                    </div>
                  )) : <p className="text-[10px] text-slate-500 italic text-center py-10">انتظار البيانات...</p>}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
