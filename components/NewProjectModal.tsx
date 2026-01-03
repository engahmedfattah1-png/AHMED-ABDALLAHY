
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
  const [projectType, setProjectType] = useState<NetworkType>(NetworkType.WATER);
  const [importType, setImportType] = useState<'NONE' | 'EXCEL' | 'CIVIL3D' | 'SHAPEFILE' | 'KMZ'>('NONE');
  
  const [importedSegments, setImportedSegments] = useState<NetworkSegment[]>([]);
  const [importedPoints, setImportedPoints] = useState<NetworkPoint[]>([]);
  
  const [loading, setLoading] = useState<{segments: boolean, points: boolean}>({ segments: false, points: false });
  const [statusMsg, setStatusMsg] = useState<{segments: string, points: string}>({ segments: '', points: '' });
  
  const [auditResults, setAuditResults] = useState<{issues: AuditIssue[], score: number} | null>(null);

  const projectId = useMemo(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = projectType === NetworkType.WATER ? 'W' : 'S';
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

  // Helper to detect type from string
  const detectPointType = (rawType: any, projectNetworkType: NetworkType): PointType => {
      if (!rawType) {
          return projectNetworkType === NetworkType.WATER ? PointType.VALVE : PointType.MANHOLE;
      }
      const val = String(rawType).toUpperCase();
      
      // 1. Fittings (Elbows, Tees, etc.)
      if (val.includes('ELBOW') || val.includes('BEND') || val.includes('كوع')) return PointType.ELBOW;
      if (val.includes('TEE') || val.includes('مشترك') || val.includes('T-PIECE')) return PointType.TEE;

      // 2. Specific Valves (Air/Wash)
      if (val.includes('AIR') || val.includes('هواء')) return PointType.AIR_VALVE;
      if (val.includes('WASH') || val.includes('غسيل')) return PointType.WASH_VALVE;
      
      // 3. Traps & Oil
      if (val.includes('TRAP') || val.includes('OIL') || val.includes('مصيدة') || val.includes('زيوت')) return PointType.OIL_TRAP;

      // 4. Fire Hydrants
      if (val.includes('FIRE') || val.includes('HYDRANT') || val.includes('حريق') || val.includes('طفاية') || val.includes('طفايه')) return PointType.FIRE_HYDRANT;

      // 5. Inspection Chambers
      if (val.includes('INSPECTION') || val.includes('CHAMBER') || val.includes('تفتيش')) return PointType.INSPECTION_CHAMBER;

      // 6. House Connections (Supports spelling variations)
      if (val.includes('HOUSE') || val.includes('CONN') || val.includes('وصلة') || val.includes('وصله') || val.includes('منزلية') || val.includes('منزليه')) {
          return projectNetworkType === NetworkType.WATER ? PointType.WATER_HOUSE_CONNECTION : PointType.SEWAGE_HOUSE_CONNECTION;
      }

      // 7. Generic Manhole
      if (val.includes('MANHOLE') || val.includes('MAN') || val.includes('منهل') || val.includes('بالوعة')) return PointType.MANHOLE;

      // 8. Generic Valve
      if (val.includes('VALVE') || val.includes('VLV') || val.includes('محبس') || val.includes('صمام')) return PointType.VALVE;
      
      // Default fallback based on project type
      return projectNetworkType === NetworkType.WATER ? PointType.VALVE : PointType.MANHOLE;
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

  // --- Robust Parsing Logic ---
  const parseCivil3DFile = (text: string, isXml: boolean) => {
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];

    if (isXml) { 
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const pipes = xmlDoc.getElementsByTagName("Pipe");
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            const name = pipe.getAttribute("name") || `Pipe-${i}`;
            const desc = pipe.getAttribute("desc") || "Civil 3D Pipe";
            const startNode = pipe.getElementsByTagName("Start")[0];
            const endNode = pipe.getElementsByTagName("End")[0];
            if (startNode && endNode && startNode.textContent && endNode.textContent) {
                const startParts = startNode.textContent.replace(/,/g, ' ').trim().split(/\s+/).map(Number);
                const endParts = endNode.textContent.replace(/,/g, ' ').trim().split(/\s+/).map(Number);
                if (startParts.length >= 2 && endParts.length >= 2) {
                    const sRaw = processCoordinates(startParts[1], startParts[0]);
                    const eRaw = processCoordinates(endParts[1], endParts[0]);
                    
                    if (!isNaN(sRaw.x) && !isNaN(sRaw.y)) {
                        segments.push({
                            id: `XML-S-${i}-${Date.now()}`,
                            name, type: projectType, status: ProjectStatus.PENDING,
                            length: calculateDistance(sRaw, eRaw), completionPercentage: 0,
                            contractor: desc, startNode: sRaw, endNode: eRaw
                        });
                    }
                }
            }
        }
        const structs = xmlDoc.getElementsByTagName("Struct");
        for (let i = 0; i < structs.length; i++) {
            const st = structs[i];
            const name = st.getAttribute("name") || `Struct-${i}`;
            const desc = st.getAttribute("desc") || "";
            const detectedType = detectPointType(desc + " " + name, projectType);

            const center = st.getElementsByTagName("Center")[0];
            if (center && center.textContent) {
                const parts = center.textContent.replace(/,/g, ' ').trim().split(/\s+/).map(Number);
                if (parts.length >= 2 && !isNaN(parts[0])) {
                     const pRaw = processCoordinates(parts[1], parts[0]);
                     points.push({
                         id: `XML-P-${i}-${Date.now()}`,
                         name, type: detectedType,
                         status: ProjectStatus.PENDING, location: pRaw
                     });
                }
            }
        }
      } catch (e) { console.error("LandXML Parsing Error:", e); }
    } else { 
      // DXF parsing remains largely the same basic structure
      const lines = text.split(/\r?\n/);
      let section = '';
      let entityType = '';
      let tempLine: any = {};
      let tempPolyline: { vertices: {x:number, y:number}[] } = { vertices: [] };
      let tempPoint: any = {};

      for (let i = 0; i < lines.length; i++) {
          const code = lines[i].trim();
          const value = lines[i+1]?.trim();
          i++;
          if (code === '0' && value === 'SECTION') { section = ''; continue; }
          if (code === '2' && section === '') { section = value; continue; }
          if (section === 'ENTITIES') {
             if (code === '0') {
                if (entityType === 'LINE' && tempLine.x1 !== undefined) {
                    const s = processCoordinates(tempLine.x1, tempLine.y1);
                    const e = processCoordinates(tempLine.x2, tempLine.y2);
                    segments.push({
                        id: `DXF-L-${segments.length}-${Date.now()}`, name: `DXF Line ${segments.length}`,
                        type: projectType, status: ProjectStatus.PENDING, length: calculateDistance(s, e),
                        completionPercentage: 0, contractor: 'DXF Import', startNode: s, endNode: e
                    });
                } else if (entityType === 'LWPOLYLINE' && tempPolyline.vertices.length > 1) {
                    for(let v=0; v<tempPolyline.vertices.length-1; v++) {
                        const s = processCoordinates(tempPolyline.vertices[v].x, tempPolyline.vertices[v].y);
                        const e = processCoordinates(tempPolyline.vertices[v+1].x, tempPolyline.vertices[v+1].y);
                        segments.push({
                            id: `DXF-PL-${segments.length}-${v}-${Date.now()}`, name: `Polyline Seg ${v}`,
                            type: projectType, status: ProjectStatus.PENDING, length: calculateDistance(s, e),
                            completionPercentage: 0, contractor: 'DXF Import', startNode: s, endNode: e
                        });
                    }
                } else if ((entityType === 'POINT' || entityType === 'INSERT') && tempPoint.x !== undefined) {
                    const p = processCoordinates(tempPoint.x, tempPoint.y);
                    points.push({
                        id: `DXF-P-${points.length}-${Date.now()}`, name: `DXF Point ${points.length}`,
                        type: projectType === NetworkType.WATER ? PointType.VALVE : PointType.MANHOLE,
                        status: ProjectStatus.PENDING, location: p
                    });
                }
                entityType = value;
                tempLine = {}; tempPolyline = { vertices: [] }; tempPoint = {};
             }
             if (entityType === 'LINE') {
                 if (code === '10') tempLine.x1 = parseFloat(value);
                 if (code === '20') tempLine.y1 = parseFloat(value);
                 if (code === '11') tempLine.x2 = parseFloat(value);
                 if (code === '21') tempLine.y2 = parseFloat(value);
             } else if (entityType === 'LWPOLYLINE') {
                 if (code === '10') tempPolyline.vertices.push({ x: parseFloat(value), y: 0 }); 
                 if (code === '20') {
                     const lastIdx = tempPolyline.vertices.length - 1;
                     if (lastIdx >= 0) tempPolyline.vertices[lastIdx].y = parseFloat(value);
                 }
             } else if (entityType === 'POINT' || entityType === 'INSERT') {
                 if (code === '10') tempPoint.x = parseFloat(value);
                 if (code === '20') tempPoint.y = parseFloat(value);
             }
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
    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || `col${Math.random()}`);
    return rows.slice(1).map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const obj: any = {};
      headers.forEach((h, i) => { if (h) obj[h] = cells[i]?.textContent?.trim() || ''; });
      return obj;
    });
  };

  const parseGeoJSONSegments = (features: any[]) => {
      const segments: NetworkSegment[] = [];
      features.forEach((f: any, idx: number) => {
        const props = f.properties || {};
        const featureName = props.Name || props.name || props.NAME || props.id || props.ID || `GIS-Seg-${idx}`;
        const geomType = f.geometry?.type;
        const coords = f.geometry?.coordinates;
        let linesToProcess: any[] = [];
        if (geomType === 'LineString') linesToProcess.push(coords);
        else if (geomType === 'MultiLineString') linesToProcess = coords;
        else if (geomType === 'Polygon') linesToProcess.push(coords[0]);
        else if (geomType === 'MultiPolygon') coords.forEach((poly: any) => linesToProcess.push(poly[0]));
        linesToProcess.forEach((lineCoords: any[], lineIdx) => {
             if (lineCoords && lineCoords.length > 1) {
                  const sRaw = processCoordinates(lineCoords[0][0], lineCoords[0][1]);
                  const eRaw = processCoordinates(lineCoords[lineCoords.length-1][0], lineCoords[lineCoords.length-1][1]);
                  
                  if (isNaN(sRaw.x) || isNaN(sRaw.y) || isNaN(eRaw.x) || isNaN(eRaw.y)) return;
                  segments.push({
                    id: `GIS-S-${idx}-${lineIdx}-${Date.now()}`,
                    name: String(featureName),
                    type: projectType,
                    status: ProjectStatus.PENDING,
                    length: calculateDistance(sRaw, eRaw),
                    completionPercentage: 0,
                    contractor: props.contractor || 'GIS Import',
                    startNode: sRaw,
                    endNode: eRaw
                  });
             }
        });
      });
      return segments;
  };

  const parseGeoJSONPoints = (features: any[]) => {
      const points: NetworkPoint[] = [];
      features.forEach((f: any, idx: number) => {
         if (f.geometry?.type === 'Point') {
             const props = f.properties || {};
             const featureName = props.Name || props.name || props.NAME || props.id || props.ID || `GIS-Pt-${idx}`;
             
             // Detect Type from properties
             const rawType = props.Type || props.type || props.TYPE || props.Class || featureName;
             const pType = detectPointType(rawType, projectType);

             const c = f.geometry.coordinates;
             if (c && !isNaN(c[0]) && !isNaN(c[1])) {
                 const pRaw = processCoordinates(c[0], c[1]);
                 points.push({
                     id: `GIS-P-${idx}-${Date.now()}`,
                     name: String(featureName),
                     type: pType,
                     status: ProjectStatus.PENDING,
                     location: pRaw
                 });
             }
         }
      });
      return points;
  };

  const handleDownloadTemplate = (type: 'SEGMENTS' | 'POINTS') => {
    const data = type === 'SEGMENTS' 
      ? [{ Name: "Line 1", StartLat: 2423087, StartLon: 510669, EndLat: 2423187, EndLon: 510769, Length: 150 }]
      : [{ Name: "Manhole 1", Lat: 2423087, Lon: 510669, Type: "Manhole" }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type === 'SEGMENTS' ? 'Segments' : 'Points'}_Template.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'SEGMENTS' | 'POINTS' | 'BOTH') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'BOTH') {
        setLoading({ segments: true, points: true });
        setStatusMsg({ segments: 'جاري المعالجة...', points: 'جاري المعالجة...' });
    } else {
        setLoading(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: true }));
        setStatusMsg(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: 'جاري المعالجة...' }));
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
                    const nameVal = getFuzzyValue(r, ['Name', 'Segment Name', 'Pipe Name']) || `خط ${idx + 1}`;
                    const contractorVal = getFuzzyValue(r, ['Contractor', 'Company']) || 'غير محدد';
                    return {
                        id: `TAB-S-${idx}-${Date.now()}`,
                        name: String(nameVal),
                        type: projectType,
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
                    const nameVal = getFuzzyValue(r, ['Name', 'Point Name', 'Node Name']) || `نقطة ${idx + 1}`;
                    
                    // Logic to extract Type from Excel
                    const rawType = getFuzzyValue(r, ['Type', 'Point Type', 'Class', 'Category', 'الصنف', 'النوع']);
                    const pType = detectPointType(rawType, projectType);

                    const pRaw = processCoordinates(x, y);

                    return {
                        id: `TAB-P-${idx}-${Date.now()}`,
                        name: String(nameVal),
                        type: pType,
                        status: ProjectStatus.PENDING,
                        location: pRaw
                    };
                }).filter(p => p.location.x !== 0 || p.location.y !== 0);
                setImportedPoints(newPoints);
          }
          finalizeImport(target, newSegments, newPoints);
          return;
      } 
      // 2. Civil 3D / KMZ / SHP / GeoJSON ...
      else if (extension === 'xml' || extension === 'dxf') { 
        const text = await file.text();
        const { segments: c3dSegs, points: c3dPts } = parseCivil3DFile(text, extension === 'xml');
        setImportedSegments(c3dSegs);
        setImportedPoints(c3dPts);
        finalizeImport('BOTH', c3dSegs, c3dPts);
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

        if (target === 'SEGMENTS') {
            for (let i = 0; i < placemarks.length; i++) {
                const p = placemarks[i];
                const name = p.getElementsByTagName("name")[0]?.textContent || `KMZ-Line-${i}`;
                const lineString = p.getElementsByTagName("LineString")[0];
                if (lineString) {
                    const coordsRaw = lineString.getElementsByTagName("coordinates")[0]?.textContent?.trim();
                    if (coordsRaw) {
                        const pointsStr = coordsRaw.replace(/\s+/g, ' ').trim().split(' ');
                        if (pointsStr.length >= 2) {
                            const startParts = pointsStr[0].split(',').map(Number);
                            const endParts = pointsStr[pointsStr.length - 1].split(',').map(Number);
                            if (!isNaN(startParts[0])) {
                                const sRaw = processCoordinates(startParts[0], startParts[1]);
                                const eRaw = processCoordinates(endParts[0], endParts[1]);
                                newSegments.push({
                                    id: `KMZ-S-${i}-${Date.now()}`,
                                    name, type: projectType, status: ProjectStatus.PENDING,
                                    length: calculateDistance(sRaw, eRaw), completionPercentage: 0,
                                    contractor: 'Import', startNode: sRaw, endNode: eRaw
                                });
                            }
                        }
                    }
                }
            }
            setImportedSegments(newSegments);
        } else {
             for (let i = 0; i < placemarks.length; i++) {
                const p = placemarks[i];
                const point = p.getElementsByTagName("Point")[0];
                if(point) {
                    const coordsRaw = point.getElementsByTagName("coordinates")[0]?.textContent?.trim();
                    const parts = coordsRaw?.replace(/\s+/g, '').split(',').map(Number);
                    if (parts && !isNaN(parts[0])) {
                        const pRaw = processCoordinates(parts[0], parts[1]);
                        const name = p.getElementsByTagName("name")[0]?.textContent || `Point-${i}`;
                        const desc = p.getElementsByTagName("description")[0]?.textContent || "";
                        // Detect type from KML name or description
                        const pType = detectPointType(name + " " + desc, projectType);

                        newPoints.push({
                            id: `KMZ-P-${i}-${Date.now()}`,
                            name, type: pType,
                            status: ProjectStatus.PENDING,
                            location: pRaw
                        });
                    }
                }
             }
             setImportedPoints(newPoints);
        }
        finalizeImport(target, newSegments, newPoints);
      }
      else if (extension === 'zip') {
        const buffer = await file.arrayBuffer();
        const geojson = await shp(buffer);
        const features = Array.isArray(geojson) ? geojson.flatMap((g: any) => g.features) : (geojson as any).features;
        if (target === 'SEGMENTS') {
          newSegments = parseGeoJSONSegments(features);
          setImportedSegments(newSegments);
        } else {
          newPoints = parseGeoJSONPoints(features);
          setImportedPoints(newPoints);
        }
        finalizeImport(target, newSegments, newPoints);
      }
      else if (extension === 'geojson' || extension === 'json') {
         const text = await file.text();
         const geojson = JSON.parse(text);
         const features = Array.isArray(geojson) ? geojson : (geojson.features || (geojson.type === 'Feature' ? [geojson] : []));
         if (target === 'SEGMENTS') {
            newSegments = parseGeoJSONSegments(features);
            setImportedSegments(newSegments);
         } else {
            newPoints = parseGeoJSONPoints(features);
            setImportedPoints(newPoints);
         }
         finalizeImport(target, newSegments, newPoints);
      }
    } catch (err) {
      console.error(err);
      if (target === 'BOTH') {
        setStatusMsg({ segments: 'خطأ في الملف', points: 'خطأ في الملف' });
        setLoading({ segments: false, points: false });
      } else {
        setStatusMsg(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: 'خطأ في الملف أو الصيغة' }));
        setLoading(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: false }));
      }
    }
  };

  const finalizeImport = (target: 'SEGMENTS' | 'POINTS' | 'BOTH', segs: NetworkSegment[], pts: NetworkPoint[]) => {
      const currentSegs = target === 'SEGMENTS' ? segs : importedSegments;
      const currentPts = target === 'POINTS' ? pts : importedPoints;
      
      runAuditOnImport(currentSegs, currentPts);
      
      if (target === 'BOTH') {
          if (segs.length === 0 && pts.length === 0) {
            setStatusMsg({ segments: 'لا توجد بيانات', points: 'تأكد من الملف' });
          } else {
            setStatusMsg({
                segments: `تم قراءة ${segs.length} خط`,
                points: `تم قراءة ${pts.length} نقطة`
            });
          }
          setLoading({ segments: false, points: false });
      } else {
          const count = target === 'SEGMENTS' ? segs.length : pts.length;
          const msg = count > 0 ? `تم قراءة ${count} عنصر بنجاح` : 'لم يتم العثور على عناصر';
          setStatusMsg(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: msg }));
          setLoading(prev => ({ ...prev, [target === 'SEGMENTS' ? 'segments' : 'points']: false }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && location.trim()) {
      onSave(projectId, name, location, importedSegments, importedPoints);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 relative shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar" dir="rtl">
        <div className="flex justify-between items-start mb-6">
          <div className="text-right">
            <h3 className="text-2xl font-black text-slate-800">مشروع هندسي جديد</h3>
            <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">التسجيل الجغرافي للشبكة</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl">
             <span className="text-[10px] font-black text-blue-400 block text-center mb-0.5">Project ID</span>
             <span className="text-xs font-mono font-black text-blue-600">{projectId}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Audit Results Banner */}
          {auditResults && (
             <div className={`rounded-2xl p-4 border-2 ${auditResults.score > 80 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center justify-between mb-2">
                   <h4 className="text-xs font-black text-slate-700">نتيجة الفحص الهندسي التلقائي</h4>
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${auditResults.score > 80 ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                      جودة البيانات: {Math.round(auditResults.score)}%
                   </span>
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                   {auditResults.issues.length === 0 
                     ? "البيانات سليمة هندسياً وجاهزة للاعتماد." 
                     : `تم اكتشاف ${auditResults.issues.length} ملاحظة هندسية (مثل خطوط مفصولة أو أطوال غير منطقية). يمكنك المتابعة ولكن يفضل مراجعة المصدر.`}
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">اسم المشروع</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">موقع المنطقة</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" required />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-black text-slate-500 block">نوع الشبكة</label>
             <div className="grid grid-cols-2 gap-4">
               <div onClick={() => setProjectType(NetworkType.WATER)} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${projectType === NetworkType.WATER ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100'}`}>
                 <span className={`block text-xs font-black ${projectType === NetworkType.WATER ? 'text-blue-700' : 'text-slate-500'}`}>شبكة مياه</span>
               </div>
               <div onClick={() => setProjectType(NetworkType.SEWAGE)} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${projectType === NetworkType.SEWAGE ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-100'}`}>
                 <span className={`block text-xs font-black ${projectType === NetworkType.SEWAGE ? 'text-amber-700' : 'text-slate-500'}`}>شبكة صرف صحي</span>
               </div>
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="text-xs font-black text-slate-500 block mb-2">طريقة الإدخال</label>
            <div className="grid grid-cols-5 gap-3">
               <button type="button" onClick={() => setImportType('NONE')} className="p-3 rounded-2xl border-2 bg-slate-50 text-[10px] font-black">يدوي</button>
               <button type="button" onClick={() => setImportType('EXCEL')} className="p-3 rounded-2xl border-2 bg-green-50 text-[10px] font-black text-green-700">Excel / HTML</button>
               <button type="button" onClick={() => setImportType('CIVIL3D')} className="p-3 rounded-2xl border-2 bg-indigo-50 text-[10px] font-black text-indigo-700">Civil 3D</button>
               <button type="button" onClick={() => setImportType('SHAPEFILE')} className="p-3 rounded-2xl border-2 bg-amber-50 text-[10px] font-black text-amber-700">GIS (Zip)</button>
               <button type="button" onClick={() => setImportType('KMZ')} className="p-3 rounded-2xl border-2 bg-sky-50 text-[10px] font-black text-sky-700">KMZ</button>
            </div>
          </div>

          {importType !== 'NONE' && (
            <div className={`grid ${importType === 'CIVIL3D' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
              {importType === 'CIVIL3D' ? (
                <div>
                  <label className="text-[10px] font-black text-slate-400 mb-2 block">ملف المشروع الشامل (LandXML / DXF)</label>
                  <input type="file" accept=".xml,.dxf" className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleFileChange(e, 'BOTH')} />
                  <div className="flex gap-4 mt-2">
                      <p className="text-[9px] text-blue-600 font-bold">{statusMsg.segments}</p>
                      <p className="text-[9px] text-amber-600 font-bold">{statusMsg.points}</p>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1">يتم استخراج شبكة المواسير والنقاط من ملف واحد.</p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 block">ملف الخطوط (Lines)</label>
                        {importType === 'EXCEL' && (
                           <button type="button" onClick={() => handleDownloadTemplate('SEGMENTS')} className="text-[9px] text-blue-500 hover:text-blue-700 font-black underline flex items-center gap-1">
                             <i className="fas fa-download"></i> نموذج فارغ
                           </button>
                        )}
                    </div>
                    <input type="file" accept={importType === 'SHAPEFILE' ? ".zip,.geojson,.json" : importType === 'KMZ' ? ".kmz" : ".xlsx,.csv,.html,.htm"} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleFileChange(e, 'SEGMENTS')} />
                    <p className={`text-[9px] mt-1 font-bold ${statusMsg.segments.includes('ملاحظة') ? 'text-amber-600' : 'text-green-600'}`}>{statusMsg.segments}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 block">ملف النقاط (Points)</label>
                        {importType === 'EXCEL' && (
                           <button type="button" onClick={() => handleDownloadTemplate('POINTS')} className="text-[9px] text-blue-500 hover:text-blue-700 font-black underline flex items-center gap-1">
                             <i className="fas fa-download"></i> نموذج فارغ
                           </button>
                        )}
                    </div>
                    <input type="file" accept={importType === 'SHAPEFILE' ? ".zip,.geojson,.json" : importType === 'KMZ' ? ".kmz" : ".xlsx,.csv,.html,.htm"} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleFileChange(e, 'POINTS')} />
                    <p className="text-[9px] text-green-600 mt-1 font-bold">{statusMsg.points}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-600 transition-all">حفظ المشروع</button>
            <button type="button" onClick={onClose} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
