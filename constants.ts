
import { NetworkSegment, NetworkType, ProjectStatus, NetworkPoint, PointType, Project } from './types';

export const STATUS_COLORS = {
  [ProjectStatus.COMPLETED]: '#22c55e', 
  [ProjectStatus.IN_PROGRESS]: '#f59e0b', 
  [ProjectStatus.PENDING]: '#94a3b8',     
};

// --- Helper Functions for Geometry ---
// NOTE: Coordinates are now Lat/Lng (Decimal Degrees)
// x = Longitude, y = Latitude

const movePoint = (start: {x: number, y: number}, dxMeters: number, dyMeters: number) => {
    // Approx: 1 deg lat ~= 111km, 1 deg lon ~= 111km * cos(lat)
    const latChange = dyMeters / 111111;
    const lonChange = dxMeters / (111111 * Math.cos(start.y * Math.PI / 180));
    return { x: start.x + lonChange, y: start.y + latChange };
}

// 1. Manar Project - Jeddah
const createWaterLoop = (pid: string, startLat: number, startLon: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  
  const p0 = { x: startLon, y: startLat };
  const p1 = movePoint(p0, 400, 0); // East 400m
  const p2 = movePoint(p1, 0, 400); // North 400m
  const p3 = movePoint(p0, 0, 400); // North 400m (from start) -> TopLeft
  
  const nodes = [p0, p1, p2, p3]; // 0:BL, 1:BR, 2:TR, 3:TL

  const lines = [
    { s: 0, e: 1, name: 'South Main Line 400mm' },
    { s: 1, e: 2, name: 'East Main Line 400mm' },
    { s: 2, e: 3, name: 'North Main Line 400mm' },
    { s: 3, e: 0, name: 'West Main Line 400mm' }
  ];

  lines.forEach((l, idx) => {
    segments.push({
      id: `${pid}-W-MAIN-${idx}`,
      name: l.name,
      type: NetworkType.WATER,
      status: ProjectStatus.COMPLETED,
      length: 400,
      startNode: nodes[l.s],
      endNode: nodes[l.e],
      completionPercentage: 100,
      contractor: 'National Water Co.'
    });
    
    points.push({
      id: `${pid}-V-${idx}`,
      name: `Isolation Valve ${idx+1}`,
      type: PointType.VALVE,
      status: ProjectStatus.COMPLETED,
      location: nodes[l.s]
    });
  });

  // Midpoint connection
  const midBottom = movePoint(p0, 200, 0);
  const midTop = movePoint(p3, 200, 0);
  
  segments.push({
    id: `${pid}-W-SUB-1`,
    name: 'Mid Distribution Line',
    type: NetworkType.WATER,
    status: ProjectStatus.IN_PROGRESS,
    length: 400,
    startNode: midBottom,
    endNode: midTop,
    completionPercentage: 60,
    contractor: 'Arab Contractors'
  });

  points.push({
    id: `${pid}-FH-1`,
    name: 'Central Fire Hydrant',
    type: PointType.FIRE_HYDRANT,
    status: ProjectStatus.COMPLETED,
    location: movePoint(midBottom, 0, 200)
  });

  return { segments, points };
};

const createSewageTree = (pid: string, startLat: number, startLon: number, direction: 'NORTH' | 'EAST'): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  const spacing = 60; 

  const trunkNodes = [];
  for(let i=0; i<6; i++) {
    trunkNodes.push(
      direction === 'EAST' 
      ? movePoint({x: startLon, y: startLat}, i * spacing, 0)
      : movePoint({x: startLon, y: startLat}, 0, i * spacing)
    );
  }

  for(let i=0; i<trunkNodes.length - 1; i++) {
    segments.push({
      id: `${pid}-S-TRUNK-${i}`,
      name: `Gravity Main ${i+1}`,
      type: NetworkType.SEWAGE,
      status: ProjectStatus.COMPLETED,
      length: spacing,
      startNode: trunkNodes[i],
      endNode: trunkNodes[i+1],
      completionPercentage: 100,
      contractor: 'Bin Laden Group'
    });

    points.push({
      id: `${pid}-MH-${i}`,
      name: `Main Manhole ${i+1}`,
      type: PointType.MANHOLE,
      status: ProjectStatus.COMPLETED,
      location: trunkNodes[i]
    });
  }
  points.push({
    id: `${pid}-MH-LAST`,
    name: 'Final Collection Manhole',
    type: PointType.MANHOLE,
    status: ProjectStatus.COMPLETED,
    location: trunkNodes[trunkNodes.length-1]
  });

  for(let i=1; i<4; i++) {
    const startNode = trunkNodes[i];
    // Branch moves away
    const branchEnd = direction === 'EAST' 
        ? movePoint(startNode, 0, 50) 
        : movePoint(startNode, 50, 0);

    segments.push({
      id: `${pid}-S-LAT-${i}`,
      name: `House Connection ${i}`,
      type: NetworkType.SEWAGE,
      status: ProjectStatus.IN_PROGRESS,
      length: 50,
      startNode: branchEnd,
      endNode: startNode,
      completionPercentage: 40,
      contractor: 'Al Injaz Est.'
    });

    points.push({
      id: `${pid}-IC-${i}`,
      name: `Inspection Chamber ${i}`,
      type: PointType.INSPECTION_CHAMBER,
      status: ProjectStatus.PENDING,
      location: branchEnd
    });
  }

  return { segments, points };
};

const createLogisticNetwork = (pid: string, startLat: number, startLon: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];
    
    for(let i=0; i<5; i++) {
        const start = movePoint({x: startLon, y: startLat}, i*100, 0);
        const end = movePoint(start, 100, 0); 
        
        const lineStart = movePoint({x: startLon, y: startLat}, 0, i * 50);
        const lineEnd = movePoint(lineStart, 300, 0);

        segments.push({
            id: `${pid}-W-${i}`,
            name: `Warehouse Feed Line ${i+1}`,
            type: NetworkType.WATER,
            status: ProjectStatus.COMPLETED,
            length: 300,
            startNode: lineStart,
            endNode: lineEnd,
            completionPercentage: 100,
            contractor: 'El Seif Engineering'
        });
        
        if(i % 2 === 0) {
            points.push({
                id: `${pid}-AV-${i}`,
                name: `Air Valve ${i}`,
                type: PointType.AIR_VALVE,
                status: ProjectStatus.COMPLETED,
                location: lineStart
            });
        } else {
             points.push({
                id: `${pid}-WV-${i}`,
                name: `Wash Valve ${i}`,
                type: PointType.WASH_VALVE,
                status: ProjectStatus.COMPLETED,
                location: lineEnd
            });
        }
        
        // Sewage Offset
        const sewStart = movePoint(lineStart, 0, -10);
        const sewEnd = movePoint(lineEnd, 0, -10);

        segments.push({
            id: `${pid}-S-${i}`,
            name: `Industrial Waste Line ${i+1}`,
            type: NetworkType.SEWAGE,
            status: i > 2 ? ProjectStatus.PENDING : ProjectStatus.IN_PROGRESS,
            length: 300,
            startNode: sewStart,
            endNode: sewEnd,
            completionPercentage: i > 2 ? 0 : 75,
            contractor: 'El Seif Engineering'
        });

        points.push({
            id: `${pid}-TRAP-${i}`,
            name: `Oil Trap ${i}`,
            type: PointType.OIL_TRAP,
            status: i > 2 ? ProjectStatus.PENDING : ProjectStatus.COMPLETED,
            location: sewStart
        });
    }

    return { segments, points };
}


// --- DEFINING PROJECTS WITH REAL JEDDAH/TAIF COORDINATES ---

// 1. Manar (Jeddah Al Manar District) ~ 21.603, 39.230
const manarWater = createWaterLoop('MNR', 21.6030, 39.2300);
const manarSewage = createSewageTree('MNR', 21.6040, 39.2310, 'EAST');

const projectManar: Project = {
  id: 'PRJ-JED-MNR',
  name: 'Al Manar Project',
  locationName: 'Jeddah - Al Manar',
  lastUpdated: '2024-05-15',
  segments: [...manarWater.segments, ...manarSewage.segments],
  points: [...manarWater.points, ...manarSewage.points]
};

// 2. Logistic (Jeddah Industrial City South) ~ 21.430, 39.230
const logisticNet = createLogisticNetwork('LOG', 21.4300, 39.2300);

const projectLogistic: Project = {
  id: 'PRJ-JED-LOG',
  name: 'Logistics Hub Project',
  locationName: 'Jeddah - Industrial City',
  lastUpdated: '2024-06-10',
  segments: logisticNet.segments,
  points: logisticNet.points
};

// 3. Abu Farea (Taif) ~ 21.270, 40.410
const far3Sewage1 = createSewageTree('FR3-A', 21.2700, 40.4100, 'NORTH');
const far3Sewage2 = createSewageTree('FR3-B', 21.2700, 40.4120, 'NORTH');

const projectAbuFarea: Project = {
  id: 'PRJ-TAIF-FR3',
  name: 'Abu Farea Project',
  locationName: 'Taif - Abu Farea Valley',
  lastUpdated: '2024-06-01',
  segments: [...far3Sewage1.segments, ...far3Sewage2.segments],
  points: [...far3Sewage1.points, ...far3Sewage2.points]
};

export const MOCK_PROJECTS: Project[] = [
  projectManar,
  projectLogistic,
  projectAbuFarea
];

export const POINT_LABELS: Record<PointType, string> = {
  [PointType.MANHOLE]: 'Manhole',
  [PointType.SEWAGE_HOUSE_CONNECTION]: 'Sewage House Conn.',
  [PointType.INSPECTION_CHAMBER]: 'Inspection Chamber',
  [PointType.VALVE]: 'Control Valve',
  [PointType.FIRE_HYDRANT]: 'Fire Hydrant',
  [PointType.WATER_HOUSE_CONNECTION]: 'Water Meter',
  [PointType.AIR_VALVE]: 'Air Valve',
  [PointType.WASH_VALVE]: 'Wash Valve',
  [PointType.OIL_TRAP]: 'Oil Trap',
  [PointType.ELBOW]: 'Elbow',
  [PointType.TEE]: 'Tee',
  [PointType.SADDLE]: 'Saddle',
  [PointType.REDUCER]: 'Reducer',
};
