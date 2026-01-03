
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import shp from 'shpjs';
import JSZip from 'jszip';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';

interface ImportPanelProps {
  onImported: (segments: NetworkSegment[], points: NetworkPoint[]) => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ onImported }) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Haversine calc for length
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

  // --- Helper: Fuzzy Get Value ---
  const getFuzzyValue = (row: any, candidates: string[]): any => {
    const rowKeys = Object.keys(row);
    // Prepare normalized map
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
    // If coordinates are large (e.g. > 180), assume UTM.
    // Defaulting to Zone 37N (common for Western Saudi Arabia - Jeddah/Makkah/Taif).
    // Zone 38N is for Riyadh/East.
    if ((x > 180 || y > 90) && (window as any).proj4) {
      try {
        const utm37n = "+proj=utm +zone=37 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
        const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
        // Proj4 takes [Easting, Northing] -> [Longitude, Latitude]
        // Note: x is Longitude-ish (Easting), y is Latitude-ish (Northing)
        const converted = (window as any).proj4(utm37n, wgs84, [x, y]);
        return { x: converted[0], y: converted[1] };
      } catch (e) {
        console.warn("Conversion failed", e);
        return { x, y };
      }
    }
    return { x, y };
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Segment Template
    const segData = [{ Name: "Pipe 1", StartLat: 2423087, StartLon: 510669, EndLat: 2423187, EndLon: 510769, Length: 150 }];
    const wsSeg = XLSX.utils.json_to_sheet(segData);
    XLSX.utils.book_append_sheet(wb, wsSeg, "Segments");

    // Point Template
    const ptData = [{ Name: "Manhole 1", Lat: 2423087, Lon: 510669, Type: "Manhole" }];
    const wsPt = XLSX.utils.json_to_sheet(ptData);
    XLSX.utils.book_append_sheet(wb, wsPt, "Points");

    XLSX.writeFile(wb, `InfraTrack_Template.xlsx`);
  };

  const parseGeoJSONFeatures = (features: any[]) => {
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];

    features.forEach((f: any, idx: number) => {
        const props = f.properties || {};
        const name = props.Name || props.name || props.NAME || props.id || props.ID || `GIS-Item-${idx}`;
        
        if (f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString') {
            const coords = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates[0] : f.geometry.coordinates;
            if (coords && coords.length > 1) {
                const sRaw = processCoordinates(coords[0][0], coords[0][1]);
                const eRaw = processCoordinates(coords[coords.length-1][0], coords[coords.length-1][1]);
                segments.push({
                    id: `GIS-S-${idx}-${Date.now()}`,
                    name: String(name),
                    type: NetworkType.WATER, // Default
                    status: ProjectStatus.PENDING,
                    length: calculateDistance(sRaw, eRaw),
                    completionPercentage: 0,
                    contractor: 'GIS Import',
                    startNode: sRaw,
                    endNode: eRaw
                });
            }
        } else if (f.geometry?.type === 'Point') {
            const pRaw = processCoordinates(f.geometry.coordinates[0], f.geometry.coordinates[1]);
            points.push({
                id: `GIS-P-${idx}-${Date.now()}`,
                name: String(name),
                type: PointType.MANHOLE, // Default
                status: ProjectStatus.PENDING,
                location: pRaw
            });
        }
    });
    return { segments, points };
  };

  const parseLandXML = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];

    // Parse Pipes
    const pipes = xmlDoc.getElementsByTagName("Pipe");
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        const name = pipe.getAttribute("name") || `C3D-Pipe-${i}`;
        const startTag = pipe.getElementsByTagName("Start")[0];
        const endTag = pipe.getElementsByTagName("End")[0];

        if (startTag && endTag && startTag.textContent && endTag.textContent) {
             const startParts = startTag.textContent.replace(/,/g, ' ').trim().split(/\s+/).map(Number);
             const endParts = endTag.textContent.replace(/,/g, ' ').trim().split(/\s+/).map(Number);
            
             // Y X -> x, y (Assuming Northing Easting order in LandXML)
            if (startParts.length >= 2 && endParts.length >= 2) {
                const sRaw = processCoordinates(startParts[1], startParts[0]);
                const eRaw = processCoordinates(endParts[1], endParts[0]);
                
                if (!isNaN(sRaw.x) && !isNaN(sRaw.y)) {
                    segments.push({
                        id: `C3D-S-${i}-${Date.now()}`,
                        name: name,
                        type: NetworkType.WATER,
                        status: ProjectStatus.PENDING,
                        length: calculateDistance(sRaw, eRaw),
                        completionPercentage: 0,
                        contractor: 'Civil 3D',
                        startNode: sRaw,
                        endNode: eRaw
                    });
                }
            }
        }
    }

    // Parse Structures
    const structs = xmlDoc.getElementsByTagName("Struct");
    for (let i = 0; i < structs.length; i++) {
        const st = structs[i];
        const name = st.getAttribute("name") || `C3D-MH-${i}`;
        const center = st.getElementsByTagName("Center")[0];
        if (center && center.textContent) {
            const parts = center.textContent.replace(/,/g, ' ').trim().split(/\s+/).map(Number);
            if (parts.length >= 2 && !isNaN(parts[0])) {
                 const pRaw = processCoordinates(parts[1], parts[0]);
                 points.push({
                     id: `C3D-P-${i}-${Date.now()}`,
                     name: name,
                     type: PointType.MANHOLE,
                     status: ProjectStatus.PENDING,
                     location: pRaw
                 });
            }
        }
    }
    return { segments, points };
  };

  const parseDXF = (dxfText: string) => {
    const lines = dxfText.split(/\r?\n/);
    let section = '';
    let entityType = '';
    
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];

    // Temporary buffers for entities
    let tempLine: any = {};
    let tempPolyline: { vertices: {x:number, y:number}[] } = { vertices: [] };
    let tempPoint: any = {};

    for (let i = 0; i < lines.length; i++) {
        const code = lines[i].trim();
        const value = lines[i+1]?.trim();
        i++; // Skip value line

        if (code === '0' && value === 'SECTION') { section = ''; continue; }
        if (code === '2' && section === '') { section = value; continue; }

        if (section === 'ENTITIES') {
            if (code === '0') {
              // --- Finalize Previous Entity ---
              if (entityType === 'LINE' && tempLine.x1 !== undefined) {
                  const s = processCoordinates(tempLine.x1, tempLine.y1);
                  const e = processCoordinates(tempLine.x2, tempLine.y2);
                  segments.push({
                      id: `DXF-L-${segments.length}-${Date.now()}`, name: `DXF Line ${segments.length}`,
                      type: NetworkType.WATER, status: ProjectStatus.PENDING, length: calculateDistance(s, e),
                      completionPercentage: 0, contractor: 'DXF', startNode: s, endNode: e
                  });
              }
              else if (entityType === 'LWPOLYLINE' && tempPolyline.vertices.length > 1) {
                  for(let v=0; v<tempPolyline.vertices.length-1; v++) {
                      const s = processCoordinates(tempPolyline.vertices[v].x, tempPolyline.vertices[v].y);
                      const e = processCoordinates(tempPolyline.vertices[v+1].x, tempPolyline.vertices[v+1].y);
                      segments.push({
                          id: `DXF-PL-${segments.length}-${v}-${Date.now()}`, name: `Polyline Seg ${v}`,
                          type: NetworkType.WATER, status: ProjectStatus.PENDING, length: calculateDistance(s, e),
                          completionPercentage: 0, contractor: 'DXF', startNode: s, endNode: e
                      });
                  }
              }
              else if ((entityType === 'POINT' || entityType === 'INSERT') && tempPoint.x !== undefined) {
                  const p = processCoordinates(tempPoint.x, tempPoint.y);
                  points.push({
                      id: `DXF-P-${points.length}-${Date.now()}`, name: `DXF Point ${points.length}`,
                      type: PointType.MANHOLE, status: ProjectStatus.PENDING, location: p
                  });
              }

              // --- Start New Entity ---
              entityType = value;
              tempLine = {};
              tempPolyline = { vertices: [] };
              tempPoint = {};
            }

            // --- Collect Data based on Entity Type ---
            if (entityType === 'LINE') {
                if (code === '10') tempLine.x1 = parseFloat(value);
                if (code === '20') tempLine.y1 = parseFloat(value);
                if (code === '11') tempLine.x2 = parseFloat(value);
                if (code === '21') tempLine.y2 = parseFloat(value);
            }
            else if (entityType === 'LWPOLYLINE') {
                if (code === '10') tempPolyline.vertices.push({ x: parseFloat(value), y: 0 }); 
                if (code === '20') {
                    const lastIdx = tempPolyline.vertices.length - 1;
                    if (lastIdx >= 0) tempPolyline.vertices[lastIdx].y = parseFloat(value);
                }
            }
            else if (entityType === 'POINT' || entityType === 'INSERT') {
                if (code === '10') tempPoint.x = parseFloat(value);
                if (code === '20') tempPoint.y = parseFloat(value);
            }
        }
    }
    return { segments, points };
  };

  const parseHTMLTable = (htmlText: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) return [];

    // Extract headers from first row
    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || `col${Math.random()}`);

    // Extract data
    return rows.slice(1).map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const obj: any = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = cells[i]?.textContent?.trim() || '';
      });
      return obj;
    });
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setStatusMsg('جاري تحليل الملف...');
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'xlsx' || extension === 'csv' || extension === 'html' || extension === 'htm') {
        let rows: any[] = [];
        if (extension === 'html' || extension === 'htm') {
             const text = await file.text();
             rows = parseHTMLTable(text);
        } else {
             const data = new Uint8Array(await file.arrayBuffer());
             const workbook = XLSX.read(data, { type: 'array' });
             const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
             rows = XLSX.utils.sheet_to_json(firstSheet);
        }
        
        const segments: NetworkSegment[] = rows.map((r, idx) => {
          // Robust mapping for Coordinates using Fuzzy Match
          // Candidates for Start X
          const startX = parseFloatSafe(getFuzzyValue(r, ['StartLon', 'Start Longitude', 'StartX', 'X1', 'Lon1', 'Start_Lon', 'Start Lon']));
          // Candidates for Start Y
          const startY = parseFloatSafe(getFuzzyValue(r, ['StartLat', 'Start Latitude', 'StartY', 'Y1', 'Lat1', 'Start_Lat', 'Start Lat']));
          // Candidates for End X
          const endX = parseFloatSafe(getFuzzyValue(r, ['EndLon', 'End Longitude', 'EndX', 'X2', 'Lon2', 'End_Lon', 'End Lon']));
          // Candidates for End Y
          const endY = parseFloatSafe(getFuzzyValue(r, ['EndLat', 'End Latitude', 'EndY', 'Y2', 'Lat2', 'End_Lat', 'End Lat']));
          
          const start = processCoordinates(startX, startY);
          const end = processCoordinates(endX, endY);
          
          let len = parseFloatSafe(getFuzzyValue(r, ['Length', 'Len', 'Distance']));
          if (len === 0 && start.x !== 0 && end.x !== 0) {
              len = calculateDistance(start, end);
          }
          
          const nameVal = getFuzzyValue(r, ['Name', 'Segment Name', 'Pipe Name']) || `خط مستورد ${idx}`;
          const typeVal = getFuzzyValue(r, ['Type', 'Network Type']) || 'WATER';
          const contractorVal = getFuzzyValue(r, ['Contractor', 'Company']) || 'غير محدد';

          return {
            id: `XL-${idx}-${Date.now()}`,
            name: String(nameVal),
            type: String(typeVal).toUpperCase().includes('SEWAGE') ? NetworkType.SEWAGE : NetworkType.WATER,
            status: ProjectStatus.PENDING,
            length: len,
            completionPercentage: 0,
            contractor: String(contractorVal),
            startNode: start,
            endNode: end
          };
        }).filter(s => s.startNode.x !== 0 || s.startNode.y !== 0);

        onImported(segments, []);
        setStatusMsg(`تم استيراد ${segments.length} خط بنجاح`);
      } 
      else if (extension === 'kmz') {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const kmlFileName = Object.keys(zip.files).find(name => name.endsWith('.kml'));
        if (!kmlFileName) throw new Error("KML not found");
        const kmlText = await zip.file(kmlFileName)!.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const placemarks = xmlDoc.getElementsByTagName("Placemark");
        
        const segments: NetworkSegment[] = [];
        const points: NetworkPoint[] = [];

        for (let i = 0; i < placemarks.length; i++) {
            const p = placemarks[i];
            const name = p.getElementsByTagName("name")[0]?.textContent || `عنصر KMZ ${i}`;
            const lineString = p.getElementsByTagName("LineString")[0];
            if (lineString) {
                const coordsRaw = lineString.getElementsByTagName("coordinates")[0]?.textContent?.trim();
                if (coordsRaw) {
                    const pointsStr = coordsRaw.replace(/\s+/g, ' ').trim().split(' ');
                    if (pointsStr.length >= 2) {
                        const startParts = pointsStr[0].split(',').map(Number);
                        const endParts = pointsStr[pointsStr.length - 1].split(',').map(Number);
                        const start = processCoordinates(startParts[0], startParts[1]);
                        const end = processCoordinates(endParts[0], endParts[1]);
                        segments.push({
                            id: `KMZ-S-${i}`,
                            name,
                            type: NetworkType.WATER,
                            status: ProjectStatus.PENDING,
                            length: calculateDistance(start, end),
                            completionPercentage: 0,
                            contractor: 'KMZ Import',
                            startNode: start,
                            endNode: end
                        });
                    }
                }
                continue;
            }
            const point = p.getElementsByTagName("Point")[0];
            if (point) {
                const coordsRaw = point.getElementsByTagName("coordinates")[0]?.textContent?.trim();
                if (coordsRaw) {
                    const parts = coordsRaw.replace(/\s+/g, '').split(',').map(Number);
                    const pRaw = processCoordinates(parts[0], parts[1]);
                    points.push({
                        id: `KMZ-P-${i}`,
                        name,
                        type: PointType.MANHOLE,
                        status: ProjectStatus.PENDING,
                        location: pRaw
                    });
                }
            }
        }
        onImported(segments, points);
        setStatusMsg(`تم استيراد KMZ: ${segments.length} خط، ${points.length} عنصر`);
      }
      else if (extension === 'zip') { // SHP
          const buffer = await file.arrayBuffer();
          const geojson = await shp(buffer);
          const features = Array.isArray(geojson) ? geojson.flatMap((g: any) => g.features) : (geojson as any).features;
          const { segments, points } = parseGeoJSONFeatures(features);
          onImported(segments, points);
          setStatusMsg(`تم استيراد SHP: ${segments.length} خط، ${points.length} عنصر`);
      }
      else if (extension === 'geojson' || extension === 'json') { // GeoJSON
         const text = await file.text();
         const geojson = JSON.parse(text);
         const features = Array.isArray(geojson) ? geojson : (geojson.features || (geojson.type === 'Feature' ? [geojson] : []));
         const { segments, points } = parseGeoJSONFeatures(features);
         onImported(segments, points);
         setStatusMsg(`تم استيراد GeoJSON: ${segments.length} خط، ${points.length} عنصر`);
      }
      else if (extension === 'xml' || extension === 'dxf') { // Civil 3D
          const text = await file.text();
          if (extension === 'xml') {
              const { segments, points } = parseLandXML(text);
              onImported(segments, points);
              setStatusMsg(`تم استيراد LandXML: ${segments.length} خط، ${points.length} نقطة`);
          } else {
              const { segments, points } = parseDXF(text);
              onImported(segments, points);
              setStatusMsg(`تم استيراد DXF: ${segments.length} خط، ${points.length} نقطة`);
          }
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('خطأ في معالجة الملف.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-200 hover:border-blue-500 transition-all group">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
           <i className={`fas ${loading ? 'fa-spinner fa-spin text-blue-500' : 'fa-file-import text-blue-400'} text-3xl`}></i>
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2">استيراد المخططات الجغرافية</h3>
        <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto mb-4">
           (Civil 3D / KMZ / Shapefile Zip / GeoJSON / Excel / HTML)
        </p>

        <button 
           type="button"
           onClick={handleDownloadTemplate} 
           className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-colors"
        >
           <i className="fas fa-file-excel"></i> تحميل نموذج Excel
        </button>
        
        <label className="relative inline-block cursor-pointer w-full">
          <span className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl block">
            {loading ? 'جاري التحميل...' : 'اختيار ملف من الجهاز'}
          </span>
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx,.csv,.dxf,.zip,.kmz,.geojson,.json,.xml,.html,.htm"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
        </label>
        
        {statusMsg && <div className="mt-4 text-xs font-bold text-blue-600">{statusMsg}</div>}
      </div>
    </div>
  );
};

export default ImportPanel;
