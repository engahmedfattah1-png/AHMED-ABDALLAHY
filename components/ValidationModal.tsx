
import React from 'react';
import { AuditIssue } from '../services/engineeringService';

interface ValidationModalProps {
  issues: AuditIssue[];
  isOpen: boolean;
  onClose: () => void;
  isAiAnalyzing: boolean;
  aiComment?: string;
}

const ValidationModal: React.FC<ValidationModalProps> = ({ issues, isOpen, onClose, isAiAnalyzing, aiComment }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[85vh] overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <i className="fas fa-user-shield text-2xl"></i>
             </div>
             <div>
               <h3 className="text-xl font-black">تقرير التدقيق الهندسي</h3>
               <p className="text-xs text-slate-400 font-bold mt-1">نتائج فحص ترابط الشبكة وسلامة البيانات</p>
             </div>
          </div>
          <button onClick={onClose} className="absolute top-8 left-8 text-slate-500 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* AI Insights Section */}
          <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full -translate-x-12 -translate-y-12"></div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">رأي المهندس الرقمي (AI)</span>
            </div>
            {isAiAnalyzing ? (
              <div className="flex items-center gap-3">
                <i className="fas fa-spinner fa-spin text-indigo-400"></i>
                <p className="text-xs text-indigo-900 font-bold">جاري تحليل السيناريوهات الهندسية العميقة...</p>
              </div>
            ) : (
              <p className="text-xs text-indigo-900 leading-relaxed font-bold">
                {aiComment || "الشبكة تبدو مستقرة من الناحية الهيكلية، لكن يرجى مراجعة الملاحظات الفنية أدناه."}
              </p>
            )}
          </div>

          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">الملاحظات الفنية المكتشفة ({issues.length})</h4>
          
          <div className="space-y-4">
            {issues.length === 0 ? (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-10 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-green-500">
                   <i className="fas fa-check-circle text-3xl"></i>
                </div>
                <p className="text-sm font-black text-green-800">ممتاز! لم يتم العثور على أخطاء هندسية.</p>
                <p className="text-[10px] text-green-600 mt-1 font-bold">الشبكة مترابطة والبيانات تبدو سليمة ومنطقية.</p>
              </div>
            ) : (
              issues.map(issue => (
                <div key={issue.id} className={`p-5 rounded-3xl border-2 flex gap-4 transition-all hover:scale-[1.01] ${
                  issue.type === 'ERROR' ? 'bg-red-50 border-red-100' : 
                  issue.type === 'WARNING' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
                }`}>
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg ${
                    issue.type === 'ERROR' ? 'bg-red-500 text-white' : 
                    issue.type === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                  }`}>
                    <i className={`fas ${issue.type === 'ERROR' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-800">{issue.title}</h5>
                    <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">{issue.description}</p>
                    {issue.targetId && (
                      <span className="inline-block mt-3 px-3 py-1 bg-white/50 rounded-lg text-[9px] font-mono font-bold text-slate-400">
                        REF_ID: {issue.targetId}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
           <button 
             onClick={onClose}
             className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl"
           >
             فهمت الملاحظات
           </button>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
