
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
  // تم تغيير المفتاح إلى v8 لفرض مسح البيانات القديمة وتحميل المشاريع الجديدة
  const STORAGE_KEY = 'infra_projects_v8';

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : MOCK_PROJECTS;
    } catch (e) {
      console.error("Error loading projects", e);
      return MOCK_PROJECTS;
    }
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || '');
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filterType, setFilterType] = useState<NetworkType | 'ALL'>('ALL');
  const [managementSelection, setManagementSelection] = useState<{type: 'SEGMENT' | 'POINT', id: string} | undefined>(undefined);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('infra_visited'));
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  
  // التأكد من أن activeProjectId صالح دائماً
  useEffect(() => {
    if (projects.length > 0) {
      const exists = projects.find(p => p.id === activeProjectId);
      if (!exists) {
        setActiveProjectId(projects[0].id);
      }
    } else {
      setActiveProjectId('');
    }
  }, [projects, activeProjectId]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || (projects.length > 0 ? projects[0] : undefined),
  [projects, activeProjectId]);

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

  // البيانات الخاصة بوضع التقسيم (Split View)
  const splitViewData = useMemo(() => {
    if (!activeProject || filterType !== 'ALL') return { water: null, sewage: null };
    
    const waterSegments = activeProject.segments.filter(s => s.type === NetworkType.WATER);
    const waterPoints = activeProject.points.filter(p => [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(p.type));
    
    const sewageSegments = activeProject.segments.filter(s => s.type === NetworkType.SEWAGE);
    const sewagePoints = activeProject.points.filter(p => ![PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION].includes(p.type));
    
    return {
      water: { segments: waterSegments, points: waterPoints },
      sewage: { segments: sewageSegments, points: sewagePoints }
    };
  }, [activeProject, filterType]);

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [isAiAuditing, setIsAiAuditing] = useState(false);
  const [aiAuditComment, setAiAuditComment] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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

  const handleDeleteProject = () => {
    if (!activeProject) return;
    
    // استخدام confirm لضمان نية المستخدم
    if (window.confirm(`تنبيه هام!\n\nهل أنت متأكد تماماً من حذف مشروع "${activeProject.name}"؟\nسيتم فقد جميع البيانات المرتبطة به نهائياً.`)) {
      const projectToDeleteId = activeProject.id;
      const updatedProjects = projects.filter(p => p.id !== projectToDeleteId);
      
      // Select the next available project ID before deleting to avoid undefined state glitches
      const nextProject = updatedProjects.length > 0 ? updatedProjects[0] : null;
      
      setProjects(updatedProjects);
      setActiveProjectId(nextProject ? nextProject.id : '');
      addLog(`تم حذف المشروع: ${activeProject.name}`, 'SYSTEM');
    }
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
    if (!activeProject) return;
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
    if (!activeProject) return;
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

  const handleSelection = (type: 'SEGMENT' | 'POINT', id: string) => {
    setManagementSelection({type, id});
    document.getElementById('management-section')?.scrollIntoView({ behavior: 'smooth' });
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
              <div className="bg-blue-600 p-2.5 rounded-2xl cursor-pointer shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform" onClick={() => setShowNewProjectModal(true)} title="إضافة مشروع جديد">
                <i className="fas fa-folder-plus text-xl text-white"></i>
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-black tracking-widest text-blue-400 leading-none">شركة مهام المثالي</h1>
                <span className="text-[14px] font-black tracking-tighter text-white mt-1 uppercase">INFRA TRACK PRO</span>
              </div>
            </div>
            <div className="flex-1 flex gap-2">
              <select 
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="flex-1 md:w-72 bg-slate-800/80 text-white border border-white/10 px-4 py-2.5 rounded-2xl text-[12px] font-black focus:border-blue-500 outline-none hover:bg-slate-800 transition-colors"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {projects.length > 0 && (
                <button 
                  onClick={handleDeleteProject}
                  className="px-4 h-10 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl flex items-center justify-center gap-2 transition-all border border-red-500/20 group"
                  title="حذف المشروع الحالي"
                >
                  <i className="fas fa-trash-alt"></i>
                  <span className="text-[10px] font-black hidden md:inline">حذف</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-white/5 shadow-inner">
              <button onClick={() => setFilterType('ALL')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>الكل</button>
              <button onClick={() => setFilterType(NetworkType.WATER)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === NetworkType.WATER ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>مياه</button>
              <button onClick={() => setFilterType(NetworkType.SEWAGE)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === NetworkType.SEWAGE ? 'bg-amber-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>صرف</button>
            </div>
            <button onClick={handleRunAudit} className="w-12 h-12 bg-white/5 hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all border border-white/5 shadow-xl hover:shadow-blue-500/20" title="تشغيل الفحص الهندسي الذكي">
              <i className="fas fa-brain text-blue-400 group-hover:text-white"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 mt-10">
        {/* إحصائيات المشروع - المطابقة للصورة تماماً */}
        <StatsPanel segments={filteredData.segments} points={filteredData.points} networkType={filterType} />

        {activeProject ? (
          <div className="space-y-12">
            
            {/* الجزء العلوي: المخطط الهندسي (الخريطة) */}
            <section id="map-section" className="w-full">
              {filterType === 'ALL' && splitViewData.water && splitViewData.sewage ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="w-full">
                    <NetworkMap 
                      title="شبكة المياه"
                      segments={splitViewData.water.segments} 
                      points={splitViewData.water.points} 
                      selectedType={NetworkType.WATER}
                      onSegmentClick={(seg) => handleSelection('SEGMENT', seg.id)} 
                      onPointClick={(pt) => handleSelection('POINT', pt.id)} 
                    />
                  </div>
                  <div className="w-full">
                    <NetworkMap 
                      title="شبكة الصرف الصحي"
                      segments={splitViewData.sewage.segments} 
                      points={splitViewData.sewage.points} 
                      selectedType={NetworkType.SEWAGE}
                      onSegmentClick={(seg) => handleSelection('SEGMENT', seg.id)} 
                      onPointClick={(pt) => handleSelection('POINT', pt.id)} 
                    />
                  </div>
                </div>
              ) : (
                <NetworkMap 
                  segments={filteredData.segments} 
                  points={filteredData.points} 
                  selectedType={filterType} 
                  onSegmentClick={(seg) => handleSelection('SEGMENT', seg.id)} 
                  onPointClick={(pt) => handleSelection('POINT', pt.id)} 
                />
              )}
            </section>

            {/* الجزء السفلي: البيانات والتحديثات */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10" id="data-and-updates">
              
              {/* سجل البيانات (الجدول) */}
              <div className="xl:col-span-8">
                <DataTable 
                  segments={filteredData.segments} 
                  points={filteredData.points} 
                  onSelect={(item, type) => {
                    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                  }} 
                  onUpdateTrigger={(item, type) => handleSelection(type, item.id)} 
                />
              </div>

              {/* لوحة التحديثات والإدارة */}
              <div className="xl:col-span-4 space-y-10">
                <div id="management-section">
                  <ManagementPanel 
                    segments={activeProject.segments || []} points={activeProject.points || []} 
                    onUpdateSegment={updateSegmentProgress} onUpdatePoint={updatePointStatus}
                    onAddSegment={(s) => activeProject && updateActiveProjectData([...activeProject.segments, s], activeProject.points)}
                    onAddPoint={(p) => activeProject && updateActiveProjectData(activeProject.segments, [...activeProject.points, p])}
                    onBulkImport={(s, p) => activeProject && updateActiveProjectData([...activeProject.segments, ...s], [...activeProject.points, ...p])}
                    initialSelection={managementSelection} currentFilterType={filterType}
                  />
                </div>

                {/* السجل المباشر في الجانب */}
                <div className="bg-[#0f172a] rounded-[40px] p-8 text-white shadow-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl"></div>
                  <h4 className="text-[11px] font-black mb-6 uppercase text-blue-400 tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    تحديثات الموقع الحية
                  </h4>
                  <div className="space-y-5 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
                      {logs.length > 0 ? logs.map(log => (
                        <div key={log.id} className="text-[11px] border-b border-white/5 pb-5 last:border-0 hover:bg-white/5 p-3 rounded-2xl transition-all">
                          <p className="text-slate-200 font-bold leading-relaxed">{log.message}</p>
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-[9px] text-blue-400 font-black uppercase tracking-tight">{log.type}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{log.timestamp}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                          <i className="fas fa-satellite-dish text-4xl mb-4"></i>
                          <p className="text-[11px] font-black italic">بانتظار وصول بيانات...</p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
             <i className="fas fa-folder-open text-6xl text-slate-300 mb-6"></i>
             <h3 className="text-xl font-black text-slate-400">لا توجد مشاريع نشطة</h3>
             <p className="text-sm font-bold text-slate-400 mt-2">أنشئ مشروعاً جديداً للبدء</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
