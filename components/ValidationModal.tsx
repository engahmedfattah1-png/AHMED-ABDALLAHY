
import React from 'react';
import { AuditIssue } from '../services/engineeringService';

interface ValidationModalProps {
  issues: AuditIssue[];
  isOpen: boolean;
  onClose: () => void;
  isAiAnalyzing: boolean;
  aiComment?: string;
  onLocateIssue: (location: { x: number, y: number }) => void;
}

const ValidationModal: React.FC<ValidationModalProps> = ({ issues, isOpen, onClose, isAiAnalyzing, aiComment, onLocateIssue }) => {
  if (!isOpen) return null;

  // Sorting: Errors first, then Warnings, then Info
  const sortedIssues = [...issues].sort((a, b) => {
      const priority = { 'ERROR': 0, 'WARNING': 1, 'INFO': 2 };
      return priority[a.type] - priority[b.type];
  });

  const handleLocate = (issue: AuditIssue) => {
      if (issue.location) {
          onLocateIssue(issue.location);
          // Optional: Keep modal open or close it? 
          // Usually better to minimize or close on mobile, let's keep it simple and close for now so user sees map.
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[40px] w-full max-w-3xl max-h-[85vh] overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative flex justify-between items-start">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <i className="fas fa-microscope text-2xl animate-pulse"></i>
             </div>
             <div>
               <h3 className="text-xl font-black">تقرير التدقيق الهندسي</h3>
               <p className="text-xs text-slate-400 font-bold mt-1">تحليل طوبولوجي وتكاملي للشبكة</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
          
          {/* AI Insights Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-robot text-indigo-600"></i>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">تحليل الذكاء الاصطناعي (AI)</span>
                </div>
                {isAiAnalyzing ? (
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-500 font-bold">جاري دراسة السيناريوهات الهندسية...</p>
                </div>
                ) : (
                <p className="text-xs text-slate-700 leading-relaxed font-bold border-r-4 border-indigo-500 pr-3">
                    {aiComment || "جاري انتظار التحليل..."}
                </p>
                )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
             <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">الملاحظات ({sortedIssues.length})</h4>
             <div className="flex gap-2">
                 <span className="px-2 py-1 bg-red-100 text-red-600 text-[9px] font-black rounded-lg">{issues.filter(i => i.type === 'ERROR').length} خطأ</span>
                 <span className="px-2 py-1 bg-amber-100 text-amber-600 text-[9px] font-black rounded-lg">{issues.filter(i => i.type === 'WARNING').length} تحذير</span>
             </div>
          </div>
          
          <div className="space-y-3">
            {sortedIssues.length === 0 ? (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-green-500 animate-bounce">
                   <i className="fas fa-check-double text-4xl"></i>
                </div>
                <h2 className="text-lg font-black text-green-800 mb-2">الشبكة سليمة تماماً</h2>
                <p className="text-xs text-green-600 font-bold max-w-xs mx-auto">لم يتم العثور على أخطاء طوبولوجية أو مشاكل في البيانات.</p>
              </div>
            ) : (
              sortedIssues.map(issue => (
                <div key={issue.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-xl shadow-inner ${
                    issue.type === 'ERROR' ? 'bg-red-50 text-red-500' : 
                    issue.type === 'WARNING' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    <i className={`fas ${issue.type === 'ERROR' ? 'fa-ban' : issue.type === 'WARNING' ? 'fa-exclamation-triangle' : 'fa-info'}`}></i>
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h5 className="text-sm font-black text-slate-800">{issue.title}</h5>
                        {issue.location && (
                            <button 
                                onClick={() => handleLocate(issue)}
                                className="text-[10px] bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-500 px-3 py-1.5 rounded-lg font-black transition-all flex items-center gap-2"
                            >
                                <i className="fas fa-map-marker-alt"></i> تحديد الموقع
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">{issue.description}</p>
                    {issue.targetId && (
                      <div className="mt-2 flex gap-2">
                          <span className="px-2 py-1 bg-slate-50 rounded-md text-[9px] font-mono text-slate-400 border border-slate-100">
                            ID: {issue.targetId}
                          </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
