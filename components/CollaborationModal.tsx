
import React, { useState } from 'react';

interface CollaborationModalProps {
  onConnect: (config: any) => Promise<boolean>;
  onClose: () => void;
  isOpen: boolean;
}

const CollaborationModal: React.FC<CollaborationModalProps> = ({ onConnect, onClose, isOpen }) => {
  const [configJson, setConfigJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Try to parse JSON strictly first, then try to be lenient if user pasted object syntax
      let config;
      try {
        config = JSON.parse(configJson);
      } catch {
        // Fallback: try to clean up JS object notation if pasted directly from Firebase console
        const cleaned = configJson.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"');
        config = JSON.parse(cleaned);
      }

      const success = await onConnect(config);
      if (success) {
        onClose();
      } else {
        setError('Connection failed. Please check your configuration keys.');
      }
    } catch (err) {
      setError('Invalid JSON format. Please paste the configuration object from Firebase Console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
        
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/20">
                <i className="fas fa-network-wired text-xl"></i>
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-800">Team Collaboration</h3>
                <p className="text-xs text-slate-400 font-bold">Connect via Firebase Cloud</p>
            </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 text-[11px] text-slate-600 leading-relaxed font-bold">
            <p className="mb-2"><i className="fas fa-info-circle text-blue-500 mr-1"></i> To enable real-time updates between engineers:</p>
            <ol className="list-decimal pl-4 space-y-1">
                <li>Go to <strong>console.firebase.google.com</strong> and create a project.</li>
                <li>Create a <strong>Firestore Database</strong> (Start in Test Mode).</li>
                <li>Go to Project Settings {'>'} General {'>'} Your apps {'>'} Web App.</li>
                <li>Copy the <code>firebaseConfig</code> object and paste it below.</li>
            </ol>
        </div>

        <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Firebase Config JSON</label>
                <textarea 
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    className="w-full h-32 bg-slate-900 text-green-400 font-mono text-[10px] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
                    required
                ></textarea>
                {error && <p className="text-red-500 text-[10px] font-black mt-2 animate-pulse">{error}</p>}
            </div>

            <div className="flex gap-3">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black text-xs hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
                >
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plug"></i>}
                    Connect
                </button>
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-6 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                >
                    Cancel
                </button>
            </div>
        </form>

      </div>
    </div>
  );
};

export default CollaborationModal;
