
import React, { useState, useEffect, useMemo } from 'react';
import { NetworkSegment, NetworkType, NetworkPoint, PointType, ProjectStatus, Project } from './types';
import { MOCK_PROJECTS } from './constants';
import NetworkMap from './components/NetworkMap';
import StatsPanel from './components/StatsPanel';
import DataTable from './components/SegmentTable'; 
import ManagementPanel from './components/ManagementPanel';
import ValidationModal from './components/ValidationModal';
import NewProjectModal from './components/NewProjectModal';
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
  const [filterType, setFilterType] = useState<NetworkType | 'ALL'>('ALL');
  const [managementSelection, setManagementSelection] = useState<{type: 'SEGMENT' | 'POINT', id: string} | undefined>(undefined);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('infra_visited'));
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const filteredData = useMemo(() => {
    if (!activeProject) return { segments: [], points: [] };
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

  const handleAddNewProject = (id: string, name: string, location: string, importedSegments: NetworkSegment[], importedPoints: NetworkPoint[]) => {
    const newProject: Project = {
      id,
      name,
      locationName: location,
      lastUpdated: new Date().toISOString().split('T')[0],
      segments: importedSegments,
      points: importedPoints
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    addLog(`تم إنشاء مشروع جديد: ${name} بكود ${id}`, 'SYSTEM');
    setShowNewProjectModal(false);
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
    <div className="min-h-screen bg-[#f1f5f9] pb-12 font-sans overflow-x-hidden" dir="rtl">
      
      {/* Welcome Onboarding */}
      {showWelcome && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-xl">
           <div className="bg-white rounded-[48px] w-full max-w-xl p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40 rotate-3">
                 <i className="fas fa-drafting-compass text-white text-3xl"></i>
              </div>
              <h2 className="text-2xl font-black text-[#0f172a] mb-4">أهلاً بك في InfraTrack Pro</h2>
              <p className="text-sm text-slate-500 font-bold leading-relaxed mb-8">
                نظامك المتكامل لإدارة ومتابعة تنفيذ شبكات المياه والصرف الصحي ميدانياً. 
                تم تحديث الواجهة لتطابق معايير اللوحات الهندسية العالمية.
              </p>
              <button onClick={closeWelcome} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-600 transition-all">
                 ابدأ العمل الآن
              </button>
           </div>
        </div>
      )}

      {/* Modals */}
      {showNewProjectModal && <NewProjectModal onSave={handleAddNewProject} onClose={() => setShowNewProjectModal(false)} />}
      <ValidationModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} issues={auditIssues} isAiAnalyzing={isAiAuditing} aiComment={aiAuditComment} />

      <header className="bg-[#0f172a] text-white shadow-2xl sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#0f172a]/95">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl cursor-pointer" onClick={() => setShowNewProjectModal(true)} title="مشروع جديد">
                <i className="fas fa-plus text-xl"></i>
              </div>
              <h1 className="hidden sm:block text-xl font-black tracking-tighter">INFRA TRACK</h1>
            </div>
            <div className="flex-1 flex gap-2">
              <select 
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="flex-1 md:w-64 bg-slate-800 text-white border border-white/10 px-4 py-2.5 rounded-2xl text-[11px] font-black focus:border-blue-500 outline-none"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <i className="fas fa-folder-plus"></i> مشروع جديد
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-white/5">
              <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>الكل</button>
              <button onClick={() => setFilterType(NetworkType.WATER)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === NetworkType.WATER ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>مياه</button>
              <button onClick={() => setFilterType(NetworkType.SEWAGE)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === NetworkType.SEWAGE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>صرف</button>
            </div>
            <button onClick={handleRunAudit} className="w-11 h-11 bg-white/5 hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all border border-white/5 shadow-xl" title="تدقيق هندسي"><i className="fas fa-shield-halved text-blue-400"></i></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 mt-10">
        {/* إحصائيات المشروع */}
        <StatsPanel segments={filteredData.segments} points={filteredData.points} networkType={filterType} />

        <div className="space-y-10">
          
          {/* الجزء العلوي: المخطط الهندسي (الخريطة) */}
          <section id="map-section" className="w-full">
            <NetworkMap 
              segments={activeProject?.segments || []} 
              points={activeProject?.points || []} 
              selectedType={filterType} 
              onSegmentClick={(seg) => {
                setManagementSelection({type: 'SEGMENT', id: seg.id});
                document.getElementById('management-section')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              onPointClick={(pt) => {
                setManagementSelection({type: 'POINT', id: pt.id});
                document.getElementById('management-section')?.scrollIntoView({ behavior: 'smooth' });
              }} 
            />
          </section>

          {/* الجزء السفلي: البيانات والتحديثات */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" id="data-and-updates">
            
            {/* سجل البيانات (الجدول) */}
            <div className="xl:col-span-8">
              <DataTable 
                segments={filteredData.segments} 
                points={filteredData.points} 
                onSelect={(item, type) => {
                   document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                }} 
                onUpdateTrigger={(item, type) => { 
                  setManagementSelection({type, id: item.id});
                  document.getElementById('management-section')?.scrollIntoView({ behavior: 'smooth' });
                }} 
              />
            </div>

            {/* لوحة التحديثات والإدارة */}
            <div className="xl:col-span-4 space-y-8">
              <div id="management-section">
                <ManagementPanel 
                  segments={activeProject?.segments || []} points={activeProject?.points || []} 
                  onUpdateSegment={updateSegmentProgress} onUpdatePoint={updatePointStatus}
                  onAddSegment={(s) => updateActiveProjectData([...activeProject.segments, s], activeProject.points)}
                  onAddPoint={(p) => updateActiveProjectData(activeProject.segments, [...activeProject.points, p])}
                  onBulkImport={(s, p) => updateActiveProjectData([...activeProject.segments, ...s], [...activeProject.points, ...p])}
                  initialSelection={managementSelection} currentFilterType={filterType}
                />
              </div>

              {/* السجل المباشر في الجانب */}
              <div className="bg-[#0f172a] rounded-[32px] p-6 text-white shadow-2xl border border-white/5">
                <h4 className="text-[10px] font-black mb-6 uppercase text-blue-400 tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  السجل الميداني المباشر
                </h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {logs.length > 0 ? logs.map(log => (
                      <div key={log.id} className="text-[10px] border-b border-white/5 pb-4 last:border-0 hover:bg-white/5 p-2 rounded-xl transition-colors">
                        <p className="text-slate-200 font-bold leading-relaxed">{log.message}</p>
                        <span className="text-[8px] text-slate-500 mt-2 block font-mono">{log.timestamp}</span>
                      </div>
                    )) : <p className="text-[10px] text-slate-500 italic text-center py-10">في انتظار تحديثات الموقع...</p>}
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
