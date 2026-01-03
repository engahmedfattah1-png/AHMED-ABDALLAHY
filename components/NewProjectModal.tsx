
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import shp from 'shpjs';
import JSZip from 'jszip';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';
import { runEngineeringAudit, AuditIssue } from '../services/engineeringService';

interface NewProjectModalProps {
  onSave: (id: string, name: string, location: string, segments: NetworkSegment[], points: NetworkPoint[]) => void;
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  // Allow 'MIXED' as a state, though underlying data is strictly Water/Sewage
  const [projectType, setProjectType] = useState<NetworkType | 'MIXED'>(NetworkType.WATER);
  const [importType, setImportType] = useState<'NONE' | 'EXCEL' | 'CIVIL3D' | 'SHAPEFILE' | 'KMZ'>('NONE');
  
  const [importedSegments, setImportedSegments] = useState<NetworkSegment[]>([]);
  const [importedPoints, setImportedPoints] = useState<NetworkPoint[]>([]);
  
  const [loading, setLoading] = useState<{segments: boolean, points: boolean}>({ segments: false, points: false });
  const [statusMsg, setStatusMsg] = useState<{segments: string, points: string}>({ segments: '', points: '' });
  
  const [auditResults, setAuditResults] = useState<{issues: AuditIssue[], score: number} | null>(null);

  const projectId = useMemo(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = projectType === NetworkType.WATER ? 'W' : projectType === NetworkType.SEWAGE ? 'S' : 'M';
    return `PRJ-${prefix}-${year}-${random}`;
  }, [projectType]);

  const calculateDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const R = 6371e3;
    const φ1 = p1.y * Math.PI/180;
    const φ2 = p2.y * Math.PI/180;
    const Δφ = (p2.y-p1.y) * Math.PI/180;
    const Δλ = (p2.x-p1.x) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const runAuditOnImport = (segs: NetworkSegment[], pts: NetworkPoint[]) => {
     const issues = runEngineeringAudit(segs, pts);
     const totalItems = segs.length + pts.length;
     const score = totalItems > 0 ? Math.max(0, 100 - (issues.length * 5)) : 100;
     setAuditResults({ issues, score });
  };

  // --- Helper: Fuzzy Get Value ---
  const getFuzzyValue = (row: any, candidates: string[]): any => {
    const rowKeys = Object.keys(row);
    const normalizedMap: Record<string, string> = {};
    rowKeys.forEach(k => {
        normalizedMap[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
    });

    for (const candidate of candidates) {
        const normCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
        const actualKey = normalizedMap[normCandidate];
        if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '') {
            return row[actualKey];
        }
    }
    return undefined;
  };

  /**
   * STRICT Type Detection Logic with MIXED support
   */
  const detectPointType = (rawType: any, projectNetworkType: NetworkType | 'MIXED'): PointType => {
      const val = String(rawType || "").toUpperCase();
      
      const checkSewage = () => {
          if (val.includes('INSPECTION') || val.includes('CHAMBER') || val.includes('تفتيش')) return PointType.INSPECTION_CHAMBER;
          if (val.includes('TRAP') || val.includes('OIL') || val.includes('مصيدة') || val.includes('زيوت')) return PointType.OIL_TRAP;
          if (val.includes('SEWAGE HOUSE') || val.includes('SEWAGE CONN') || val.includes('صرف') || val.includes('منزلية صرف')) return PointType.SEWAGE_HOUSE_CONNECTION;
          if (val.includes('MANHOLE') || val.includes('MAN') || val.includes('منهل') || val.includes('بالوعة')) return PointType.MANHOLE;
          return null;
      };

      const checkWater = () => {
          if (val.includes('ELBOW') || val.includes('BEND') || val.includes('كوع')) return PointType.ELBOW;
          if (val.includes('TEE') || val.includes('مشترك') || val.includes('T-PIECE')) return PointType.TEE;
          if (val.includes('SADDLE') || val.includes('CLAMP') || val.includes('STRAP') || val.includes('سرج')) return PointType.SADDLE;
          if (val.includes('REDUCER') || val.includes('MASLOOB') || val.includes('مسلوب')) return PointType.REDUCER;
          if (val.includes('AIR') || val.includes('هواء')) return PointType.AIR_VALVE;
          if (val.includes('WASH') || val.includes('غسيل')) return PointType.WASH_VALVE;
          if (val.includes('FIRE') || val.includes('HYDRANT') || val.includes('حريق')) return PointType.FIRE_HYDRANT;
          // Enhanced detection for Water House Connections including generic terms
          if (val.includes('WATER HOUSE') || val.includes('WATER CONN') || val.includes('HOUSE') || val.includes('CONN') || val.includes('H.C') || val.includes('HC') || val.includes('مياه') || val.includes('منزلية') || val.includes('منزليه') || val.includes('وصلة') || val.includes('وصله')) return PointType.WATER_HOUSE_CONNECTION;
          if (val.includes('VALVE') || val.includes('VLV') || val.includes('محبس')) return PointType.VALVE;
          return null;
      };

      if (projectNetworkType === NetworkType.SEWAGE) {
          const s = checkSewage();
          if (s) return s;
          // Fallback for generic terms in strict Sewage mode
          if (val.includes('HOUSE') || val.includes('CONN') || val.includes('HC') || val.includes('H.C')) return PointType.SEWAGE_HOUSE_CONNECTION;
          return PointType.MANHOLE;
      }

      if (projectNetworkType === NetworkType.WATER) {
          return checkWater() || PointType.VALVE;
      }

      // MIXED MODE
      if (projectNetworkType === 'MIXED') {
          const s = checkSewage();
          if (s) return s;
          const w = checkWater();
          if (w) return w;
          // Fallback based on simple string match if explicit type check failed
          if (val.includes('MH') || val.includes('M.H')) return PointType.MANHOLE;
          return PointType.VALVE; // Default fallback for mixed
      }
      
      return PointType.MANHOLE;
  };

  const parseFloatSafe = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // --- UTM Conversion Helper ---
  const processCoordinates = (x: number, y: number): { x: number, y: number } => {
    if ((x > 180 || y > 90) && (window as any).proj4) {
      try {
        const utm37n = "+proj=utm +zone=37 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
        const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
        const converted = (window as any).proj4(utm37n, wgs84, [x, y]);
        return { x: converted[0], y: converted[1] };
      } catch (e) {
        console.warn("Conversion failed", e);
        return { x, y };
      }
    }
    return { x, y };
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'SEGMENTS' | 'POINTS' | 'BOTH') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'BOTH') {
        setLoading({ segments: true, points: true });
        setStatusMsg({ segments: 'Processing...', points: 'Processing...' });
    } else {
        setLoading(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: true }));
        setStatusMsg(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: 'Processing...' }));
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      let newSegments: NetworkSegment[] = [];
      let newPoints: NetworkPoint[] = [];

      // 1. Tabular Data (Excel / CSV / HTML)
      if (extension === 'xlsx' || extension === 'csv' || extension === 'html' || extension === 'htm') {
          let rows: any[] = [];
          if (extension === 'html' || extension === 'htm') {
             const text = await file.text();
             rows = parseHTMLTable(text); 
          } else {
             const data = await file.arrayBuffer();
             const workbook = XLSX.read(data, { type: 'array' });
             const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
             rows = XLSX.utils.sheet_to_json(firstSheet);
          }
          
          if (target === 'SEGMENTS') {
                newSegments = rows.map((r, idx) => {
                    const startX = parseFloatSafe(getFuzzyValue(r, ['StartLon', 'Start Longitude', 'StartX', 'X1', 'Lon1', 'Start_Lon', 'Start Lon']));
                    const startY = parseFloatSafe(getFuzzyValue(r, ['StartLat', 'Start Latitude', 'StartY', 'Y1', 'Lat1', 'Start_Lat', 'Start Lat']));
                    const endX = parseFloatSafe(getFuzzyValue(r, ['EndLon', 'End Longitude', 'EndX', 'X2', 'Lon2', 'End_Lon', 'End Lon']));
                    const endY = parseFloatSafe(getFuzzyValue(r, ['EndLat', 'End Latitude', 'EndY', 'Y2', 'Lat2', 'End_Lat', 'End Lat']));
                    
                    const start = processCoordinates(startX, startY);
                    const end = processCoordinates(endX, endY);
                    
                    let len = parseFloatSafe(getFuzzyValue(r, ['Length', 'Len', 'Distance']));
                    if (len === 0 && start.x !== 0 && end.x !== 0) {
                        len = calculateDistance(start, end);
                    }
                    const nameVal = getFuzzyValue(r, ['Name', 'Segment Name', 'Pipe Name']) || `Pipe ${idx + 1}`;
                    const contractorVal = getFuzzyValue(r, ['Contractor', 'Company']) || 'Unknown';
                    const rawType = getFuzzyValue(r, ['Type', 'Network', 'Service']) || '';

                    // Determine Segment Type
                    let segType = NetworkType.WATER;
                    if (projectType === NetworkType.SEWAGE) segType = NetworkType.SEWAGE;
                    else if (projectType === NetworkType.WATER) segType = NetworkType.WATER;
                    else {
                         // Mixed Mode Detection
                         const combinedStr = (String(rawType) + " " + String(nameVal)).toUpperCase();
                         if (combinedStr.includes('SEWAGE') || combinedStr.includes('DRAIN') || combinedStr.includes('GRAVITY') || combinedStr.includes('SANITARY') || combinedStr.includes('صرف')) {
                             segType = NetworkType.SEWAGE;
                         } else {
                             segType = NetworkType.WATER;
                         }
                    }
                    
                    return {
                        id: `TAB-S-${idx}-${Date.now()}`,
                        name: String(nameVal),
                        type: segType,
                        status: ProjectStatus.PENDING,
                        length: len,
                        completionPercentage: 0,
                        contractor: String(contractorVal),
                        startNode: start,
                        endNode: end
                    };
                }).filter(s => s.startNode.x !== 0 || s.startNode.y !== 0);
                setImportedSegments(newSegments);
          } else {
                newPoints = rows.map((r, idx) => {
                    const x = parseFloatSafe(getFuzzyValue(r, ['Lon', 'Longitude', 'X', 'Easting']));
                    const y = parseFloatSafe(getFuzzyValue(r, ['Lat', 'Latitude', 'Y', 'Northing']));
                    
                    if (x !== 0 && y !== 0) {
                        const nameVal = getFuzzyValue(r, ['Name', 'Point Name', 'Node Name']) || `Point ${idx + 1}`;
                        const rawType = getFuzzyValue(r, ['Type', 'Point Type', 'Class', 'Category']);
                        
                        // Strict/Mixed Type Detection
                        const pType = detectPointType(rawType || nameVal, projectType); 
                        const pRaw = processCoordinates(x, y);

                        return {
                            id: `TAB-P-${idx}-${Date.now()}`,
                            name: String(nameVal),
                            type: pType,
                            status: ProjectStatus.PENDING,
                            location: pRaw
                        };
                    }
                    return null;
                }).filter(p => p !== null) as NetworkPoint[];
                setImportedPoints(newPoints);
          }
          finalizeImport(target, newSegments, newPoints);
          return;
      } 
      // Other formats implementation would follow similar logic...
      
    } catch (err) {
      console.error(err);
      setStatusMsg(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: 'Error' }));
      setLoading(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: false }));
    }
  };

  const finalizeImport = (target: 'SEGMENTS' | 'POINTS' | 'BOTH', segs: NetworkSegment[], pts: NetworkPoint[]) => {
      const currentSegs = target === 'SEGMENTS' ? segs : importedSegments;
      const currentPts = target === 'POINTS' ? pts : importedPoints;
      
      runAuditOnImport(currentSegs, currentPts);
      
      if (target === 'BOTH') {
          setStatusMsg({
            segments: `Read ${segs.length}`,
            points: `Read ${pts.length}`
          });
          setLoading({ segments: false, points: false });
      } else {
          const count = target === 'SEGMENTS' ? segs.length : pts.length;
          setStatusMsg(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: `Read ${count}` }));
          setLoading(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: false }));
      }
  };

  const parseHTMLTable = (htmlText: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) return [];
    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || `col${Math.random()}`);
    return rows.slice(1).map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const obj: any = {};
      headers.forEach((h, i) => { if (h) obj[h] = cells[i]?.textContent?.trim() || ''; });
      return obj;
    });
  };

  const handleDownloadTemplate = (type: 'SEGMENTS' | 'POINTS') => {
    let data: any[] = [];

    if (type === 'SEGMENTS') {
        if (projectType === 'MIXED') {
            data = [
                { Name: "Water Pipe 01", StartLat: 2423087, StartLon: 510669, EndLat: 2423187, EndLon: 510769, Length: 150, Type: "Water" },
                { Name: "Sewage Line 01", StartLat: 2423200, StartLon: 510800, EndLat: 2423300, EndLon: 510900, Length: 140, Type: "Sewage" }
            ];
        } else {
            data = [{ Name: "Pipe 1", StartLat: 2423087, StartLon: 510669, EndLat: 2423187, EndLon: 510769, Length: 150, Type: projectType }];
        }
    } else {
        if (projectType === 'MIXED') {
            data = [
                { Name: "Valve 01", Lat: 2423087, Lon: 510669, Type: "Valve" },
                { Name: "Manhole 01", Lat: 2423200, Lon: 510800, Type: "Manhole" }
            ];
        } else if (projectType === NetworkType.SEWAGE) {
            data = [{ Name: "Manhole 1", Lat: 2423087, Lon: 510669, Type: "Manhole" }];
        } else {
            data = [{ Name: "Valve 1", Lat: 2423087, Lon: 510669, Type: "Valve" }];
        }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type === 'SEGMENTS' ? 'Segments' : 'Points'}_${projectType}_Template.xlsx`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && location.trim()) {
      onSave(projectId, name, location, importedSegments, importedPoints);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 relative shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar" dir="ltr">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-800">New Engineering Project</h3>
            <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">Geospatial Network Registry</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl">
             <span className="text-[10px] font-black text-blue-400 block text-center mb-0.5">Project ID</span>
             <span className="text-xs font-mono font-black text-blue-600">{projectId}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {auditResults && (
             <div className={`rounded-2xl p-4 border-2 ${auditResults.score > 80 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center justify-between mb-2">
                   <h4 className="text-xs font-black text-slate-700">Engineering Audit Result</h4>
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${auditResults.score > 80 ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                      Data Quality: {Math.round(auditResults.score)}%
                   </span>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">Project Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" required />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-black text-slate-500 block">Network Type</label>
             <div className="grid grid-cols-3 gap-3">
               <div onClick={() => setProjectType(NetworkType.WATER)} className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${projectType === NetworkType.WATER ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100'}`}>
                 <i className={`fas fa-tint ${projectType === NetworkType.WATER ? 'text-blue-600' : 'text-slate-300'}`}></i>
                 <span className={`block text-[10px] font-black ${projectType === NetworkType.WATER ? 'text-blue-700' : 'text-slate-500'}`}>Water Only</span>
               </div>
               <div onClick={() => setProjectType(NetworkType.SEWAGE)} className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${projectType === NetworkType.SEWAGE ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-100'}`}>
                 <i className={`fas fa-toilet ${projectType === NetworkType.SEWAGE ? 'text-amber-600' : 'text-slate-300'}`}></i>
                 <span className={`block text-[10px] font-black ${projectType === NetworkType.SEWAGE ? 'text-amber-700' : 'text-slate-500'}`}>Sewage Only</span>
               </div>
               <div onClick={() => setProjectType('MIXED')} className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${projectType === 'MIXED' ? 'bg-purple-50 border-purple-500' : 'bg-white border-slate-100'}`}>
                 <i className={`fas fa-layer-group ${projectType === 'MIXED' ? 'text-purple-600' : 'text-slate-300'}`}></i>
                 <span className={`block text-[10px] font-black ${projectType === 'MIXED' ? 'text-purple-700' : 'text-slate-500'}`}>Combined</span>
               </div>
             </div>
             {projectType === 'MIXED' && (
                <p className="text-[9px] text-purple-600 font-bold mt-1 bg-purple-50 p-2 rounded-lg border border-purple-100">
                   <i className="fas fa-info-circle mr-1"></i>
                   File Import: Ensure an 'Network' or 'Type' column exists in your Excel file to distinguish between Water and Sewage elements.
                </p>
             )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="text-xs font-black text-slate-500 block mb-2">Input Method</label>
            <div className="grid grid-cols-5 gap-3">
               <button type="button" onClick={() => setImportType('NONE')} className="p-3 rounded-2xl border-2 bg-slate-50 text-[10px] font-black">Manual</button>
               <button type="button" onClick={() => setImportType('EXCEL')} className="p-3 rounded-2xl border-2 bg-green-50 text-[10px] font-black text-green-700">Excel / HTML</button>
               <button type="button" disabled className="p-3 rounded-2xl border-2 bg-slate-50 text-[10px] font-black text-slate-300">Civil 3D</button>
               <button type="button" disabled className="p-3 rounded-2xl border-2 bg-slate-50 text-[10px] font-black text-slate-300">GIS (Zip)</button>
               <button type="button" disabled className="p-3 rounded-2xl border-2 bg-slate-50 text-[10px] font-black text-slate-300">KMZ</button>
            </div>
          </div>

          {importType === 'EXCEL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 block">Segments File (Lines)</label>
                        <button type="button" onClick={() => handleDownloadTemplate('SEGMENTS')} className="text-[9px] text-blue-500 hover:text-blue-700 font-black underline flex items-center gap-1">
                             <i className="fas fa-download"></i> Template
                        </button>
                    </div>
                    <input type="file" accept=".xlsx,.csv,.html,.htm" className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleFileChange(e, 'SEGMENTS')} />
                    <p className="text-[9px] text-green-600 mt-1 font-bold">{statusMsg.segments}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 block">Points File</label>
                        <button type="button" onClick={() => handleDownloadTemplate('POINTS')} className="text-[9px] text-blue-500 hover:text-blue-700 font-black underline flex items-center gap-1">
                             <i className="fas fa-download"></i> Template
                        </button>
                    </div>
                    <input type="file" accept=".xlsx,.csv,.html,.htm" className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleFileChange(e, 'POINTS')} />
                    <p className="text-[9px] text-green-600 mt-1 font-bold">{statusMsg.points}</p>
                  </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-600 transition-all">Save Project</button>
            <button type="button" onClick={onClose} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
