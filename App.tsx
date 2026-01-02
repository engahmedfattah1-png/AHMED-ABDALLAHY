
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

  const [isStandalone, setIsStandalone] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [isAiAuditing, setIsAiAuditing] = useState(false);
  const [aiAuditComment, setAiAuditComment] = useState('');

  useEffect(() => {
    localStorage.setItem('infra_projects_v7', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);
  }, []);

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

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('تم نسخ الرابط! أرسله عبر الواتساب وافتحه في متصفح Safari');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans overflow-x-hidden" dir="rtl">
      
      {/* Share Modal / iPhone Guide */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setShowShareModal(false)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 relative shadow-2xl animate-in zoom-in-95">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <i className="fas fa-mobile-alt text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800">تثبيت InfraTrack</h3>
                <p className="text-xs text-slate-500 font-bold mt-2">حوّل هذا الرابط إلى تطبيق حقيقي على هاتفك</p>
             </div>

             <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shrink-0 text-xs">1</div>
                   <p className="text-[11px] font-bold text-slate-600 leading-relaxed">افتح الرابط في <span className="text-blue-600 font-black">Safari</span> على الأيفون.</p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shrink-0 text-xs">2</div>
                   <p className="text-[11px] font-bold text-slate-600 leading-relaxed">اضغط أيقونة **المشاركة** <i className="fas fa-share-square text-blue-500 mx-1"></i> (المربع والسهم).</p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shrink-0 text-xs">3</div>
                   <p className="text-[11px] font-bold text-slate-600 leading-relaxed">اختر **إضافة إلى الشاشة الرئيسية** (Add to Home Screen).</p>
                </div>
             </div>

             <div className="flex flex-col gap-3">
                <button onClick={copyUrlToClipboard} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-transform">
                   <i className="fas fa-copy ml-2"></i> نسخ الرابط للإرسال
                </button>
                <button onClick={() => setShowShareModal(false)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm active:scale-95 transition-transform">
                   إغلاق
                </button>
             </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white shadow-2xl sticky top-0 z-50 border-b border-white/10 backdrop-blur-md bg-slate-900/90">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><i className="fas fa-layer-group text-xl"></i></div>
              <h1 className="text-xl font-black tracking-tight">InfraTrack Pro</h1>
            </div>
            <div className="flex-1 md:flex-none">
              <select 
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="w-full md:w-64 bg-slate-800 text-white border-2 border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-black focus:border-blue-500 outline-none transition-all cursor-pointer shadow-inner"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-white/5">
              <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${filterType === 'ALL' ? 'bg-blue-600 shadow-lg text-white' : 'text-slate-400'}`}>الكل</button>
              <button onClick={() => setFilterType(NetworkType.WATER)} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${filterType === NetworkType.WATER ? 'bg-blue-600 shadow-lg text-white' : 'text-slate-400'}`}>مياه</button>
              <button onClick={() => setFilterType(NetworkType.SEWAGE)} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${filterType === NetworkType.SEWAGE ? 'bg-blue-600 shadow-lg text-white' : 'text-slate-400'}`}>صرف</button>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setShowShareModal(true)} className="w-11 h-11 bg-white/5 hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all group border border-white/5" title="تثبيت التطبيق">
                 <i className="fas fa-mobile-alt text-blue-400 group-hover:text-white"></i>
               </button>
               <button onClick={handleRunAudit} className="w-11 h-11 bg-white/5 hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all group border border-white/5" title="تدقيق هندسي">
                 <i className="fas fa-user-shield text-blue-400 group-hover:text-white"></i>
               </button>
            </div>
          </div>
        </div>
      </header>

      <ValidationModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} issues={auditIssues} isAiAnalyzing={isAiAuditing} aiComment={aiAuditComment} />

      <main className="container mx-auto px-4 mt-8">
        <div className="mb-6 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <i className="fas fa-map-marker-alt text-blue-500"></i>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">الموقع:</span>
             <span className="text-[10px] font-bold text-slate-800">{activeProject.locationName}</span>
           </div>
           <div className="text-[9px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-widest">
             UTM ZONE 37N
           </div>
        </div>
        
        <StatsPanel segments={filteredData.segments} points={filteredData.points} networkType={filterType} />

        <div className="flex gap-1 mb-8 bg-white/50 backdrop-blur p-1 rounded-[24px] w-fit border border-white shadow-sm overflow-x-auto no-scrollbar max-w-full">
          <button onClick={() => setActiveTab('OVERVIEW')} className={`whitespace-nowrap px-8 py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'OVERVIEW' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>بيانات الشبكة</button>
          <button onClick={() => setActiveTab('MAP')} className={`whitespace-nowrap px-8 py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'MAP' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>خريطة الموقع</button>
          <button onClick={() => { setActiveTab('MANAGE'); setManagementSelection(undefined); }} className={`whitespace-nowrap px-8 py-3 rounded-[18px] text-sm font-black transition-all ${activeTab === 'MANAGE' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>لوحة التحديث</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-9">
            {activeTab === 'OVERVIEW' && (
              <DataTable 
                segments={filteredData.segments} 
                points={filteredData.points} 
                onSelect={(item) => setActiveTab('MAP')} 
                onUpdateTrigger={(item, type) => { setManagementSelection({type, id: item.id}); setActiveTab('MANAGE'); }} 
              />
            )}
            {activeTab === 'MAP' && (
              <NetworkMap segments={activeProject.segments} points={activeProject.points} selectedType={filterType} onSegmentClick={()=>{}} onPointClick={()=>{}} />
            )}
            {activeTab === 'MANAGE' && (
              <ManagementPanel 
                segments={activeProject.segments} 
                points={activeProject.points} 
                onUpdateSegment={updateSegmentProgress}
                onUpdatePoint={updatePointStatus}
                onAddSegment={(s) => updateActiveProjectData([...activeProject.segments, s], activeProject.points)}
                onAddPoint={(p) => updateActiveProjectData(activeProject.segments, [...activeProject.points, p])}
                onBulkImport={(s, p) => updateActiveProjectData([...activeProject.segments, ...s], [...activeProject.points, ...p])}
                initialSelection={managementSelection}
                currentFilterType={filterType}
              />
            )}
          </div>
          <div className="lg:col-span-3">
             <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl lg:sticky lg:top-28">
               <h4 className="text-[10px] font-black mb-6 uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                 <i className="fas fa-history text-blue-500"></i> سجل العمليات الميدانية
               </h4>
               <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                  {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="text-[10px] border-b border-white/5 pb-4 last:border-0">
                      <p className="text-slate-300 font-bold leading-relaxed">{log.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[8px] text-slate-600 font-mono tracking-wider">{log.timestamp}</span>
                        <div className="w-1 h-1 rounded-full bg-blue-600/50"></div>
                        <span className="text-[8px] text-slate-600 font-black uppercase">{log.type}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-terminal text-slate-700 text-xs"></i>
                      </div>
                      <p className="text-[10px] text-slate-500 italic font-bold">انتظار البيانات الميدانية...</p>
                    </div>
                  )}
               </div>
               <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                    <span>حالة النظام:</span>
                    <span className="text-green-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      متصل (Online)
                    </span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
