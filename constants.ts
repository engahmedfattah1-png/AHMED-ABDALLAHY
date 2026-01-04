import { NetworkSegment, NetworkType, ProjectStatus, NetworkPoint, PointType, Project } from './types';

export const STATUS_COLORS = {
  [ProjectStatus.COMPLETED]: '#22c55e', 
  [ProjectStatus.IN_PROGRESS]: '#f59e0b', 
  [ProjectStatus.PENDING]: '#94a3b8',     
};

// --- Helper Functions for Geometry ---
const movePoint = (start: {x: number, y: number}, dxMeters: number, dyMeters: number) => {
    // Approx: 1 deg lat ~= 111km, 1 deg lon ~= 111km * cos(lat)
    const latChange = dyMeters / 111111;
    const lonChange = dxMeters / (111111 * Math.cos(start.y * Math.PI / 180));
    return { x: start.x + lonChange, y: start.y + latChange };
}

// Helper to create a water loop
const createWaterLoop = (pid: string, startLat: number, startLon: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  
  const p0 = { x: startLon, y: startLat };
  const p1 = movePoint(p0, 400, 0); // East 400m
  const p2 = movePoint(p1, 0, 400); // North 400m
  const p3 = movePoint(p0, 0, 400); // North 400m (from start) -> TopLeft
  
  const nodes = [p0, p1, p2, p3]; 

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

  return { segments, points };
};

// Helper to create a sewage tree
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

  return { segments, points };
};

const createLogisticNetwork = (pid: string, startLat: number, startLon: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
    const segments: NetworkSegment[] = [];
    const points: NetworkPoint[] = [];
    // Mock data generation logic...
    return { segments, points };
}

// --- DEFINING PROJECTS ---

// 1. Manar Project - Jeddah
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

// 2. Logistic Hub
const logisticNet = createLogisticNetwork('LOG', 21.4300, 39.2300);
const projectLogistic: Project = {
  id: 'PRJ-JED-LOG',
  name: 'Logistics Hub Project',
  locationName: 'Jeddah - Industrial City',
  lastUpdated: '2024-06-10',
  segments: logisticNet.segments,
  points: logisticNet.points
};

// 3. Abu Farea
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

// 4. Al Fanar Scheme (مخطط الفنار) - NEW
// Located in North Jeddah (Obhur area approximately)
const fanarWater = createWaterLoop('FNR', 21.7600, 39.1300); 
const fanarSewage = createSewageTree('FNR', 21.7610, 39.1310, 'NORTH');

const projectFanar: Project = {
  id: 'PRJ-JED-FNR',
  name: 'Al Fanar Scheme (مخطط الفنار)',
  locationName: 'Jeddah - Al Fanar',
  lastUpdated: new Date().toISOString().split('T')[0],
  segments: [...fanarWater.segments, ...fanarSewage.segments],
  points: [...fanarWater.points, ...fanarSewage.points]
};

export const MOCK_PROJECTS: Project[] = [
  projectFanar, // Display first as requested
  projectManar,
  projectLogistic,
  projectAbuFarea
];

export const POINT_LABELS: Record<PointType, string> = {
  [PointType.MANHOLE]: 'Manhole',
  [PointType.SEWAGE_HOUSE_CONNECTION]: 'House Connection (Sewage)',
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

// Strict filtering for manual entry and validation
export const WATER_ONLY_POINTS = [
  PointType.VALVE,
  PointType.FIRE_HYDRANT,
  PointType.WATER_HOUSE_CONNECTION,
  PointType.AIR_VALVE,
  PointType.WASH_VALVE,
  PointType.ELBOW,
  PointType.TEE,
  PointType.SADDLE,
  PointType.REDUCER
];

export const SEWAGE_ONLY_POINTS = [
  PointType.MANHOLE,
  PointType.INSPECTION_CHAMBER,
  PointType.SEWAGE_HOUSE_CONNECTION,
  PointType.OIL_TRAP
];