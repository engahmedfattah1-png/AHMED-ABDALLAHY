
import { NetworkSegment, NetworkType, ProjectStatus, NetworkPoint, PointType, Project } from './types';

// دالة مساعدة لتوليد شبكة مياه (Grid-like)
const generateWaterNetwork = (projectId: string, startX: number, startY: number, count: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  const spacing = 200;

  for (let i = 0; i < count; i++) {
    const isHorizontal = i < count / 2;
    const row = isHorizontal ? i : Math.floor((i - count / 2) / 2);
    const col = isHorizontal ? 0 : (i % 2);
    
    const sX = startX + (isHorizontal ? 0 : col * spacing * 2);
    const sY = startY + (isHorizontal ? i * spacing : 0);
    const eX = sX + (isHorizontal ? spacing * 4 : 0);
    const eY = sY + (isHorizontal ? 0 : spacing * 4);

    const status = i % 3 === 0 ? ProjectStatus.COMPLETED : i % 3 === 1 ? ProjectStatus.IN_PROGRESS : ProjectStatus.PENDING;

    segments.push({
      id: `${projectId}-W-${i + 1}`,
      name: `خط مياه فرعي ${i + 1}`,
      type: NetworkType.WATER,
      status: status,
      length: spacing * 4,
      startNode: { x: sX, y: sY },
      endNode: { x: eX, y: eY },
      completionPercentage: status === ProjectStatus.COMPLETED ? 100 : status === ProjectStatus.IN_PROGRESS ? 40 : 0,
      contractor: i % 2 === 0 ? 'المقاولون العرب' : 'أوراسكوم'
    });

    // إضافة محابس عند البدايات
    if (i % 4 === 0) {
      points.push({
        id: `${projectId}-V-${i}`,
        name: `محبس V-${i+1}`,
        type: PointType.VALVE,
        status: status,
        location: { x: sX, y: sY }
      });
    }
    // إضافة حنفيات حريق
    if (i % 7 === 0) {
      points.push({
        id: `${projectId}-FH-${i}`,
        name: `حنفية حريق FH-${i+1}`,
        type: PointType.FIRE_HYDRANT,
        status: status,
        location: { x: eX, y: eY }
      });
    }
  }
  return { segments, points };
};

// دالة مساعدة لتوليد شبكة صرف (Tree-like)
const generateSewageNetwork = (projectId: string, startX: number, startY: number, count: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  const segLength = 150;

  for (let i = 0; i < count; i++) {
    const sX = startX + (i * 50);
    const sY = startY + (i * segLength);
    const eX = sX;
    const eY = sY + segLength;

    const status = i < count / 2 ? ProjectStatus.COMPLETED : ProjectStatus.IN_PROGRESS;

    segments.push({
      id: `${projectId}-S-${i + 1}`,
      name: `مجمع انحدار ${i + 1}`,
      type: NetworkType.SEWAGE,
      status: status,
      length: segLength,
      startNode: { x: sX, y: sY },
      endNode: { x: eX, y: eY },
      completionPercentage: status === ProjectStatus.COMPLETED ? 100 : 65,
      contractor: 'إيجيكو للمقاولات'
    });

    // إضافة مناهل عند كل وصلة
    points.push({
      id: `${projectId}-MH-${i}`,
      name: `منهل MH-${i+1}`,
      type: PointType.MANHOLE,
      status: status,
      location: { x: sX, y: sY }
    });
  }
  return { segments, points };
};

// توليد المشاريع الأربعة
const project1Data = { 
  w: generateWaterNetwork('CAI', 638000, 3324000, 20), 
  s: generateSewageNetwork('CAI', 639000, 3324000, 15) 
};
const project2Data = { 
  w: generateWaterNetwork('ALM', 450000, 3410000, 20), 
  s: generateSewageNetwork('ALM', 451000, 3410000, 15) 
};
const project3Data = { 
  w: generateWaterNetwork('ASY', 550000, 3010000, 20), 
  s: generateSewageNetwork('ASY', 551000, 3010000, 15) 
};
const project4Data = { 
  w: generateWaterNetwork('SUEZ', 720000, 3280000, 20), 
  s: generateSewageNetwork('SUEZ', 721000, 3280000, 15) 
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'PRJ-001',
    name: 'مشروع تطوير شرق القاهرة',
    locationName: 'القاهرة الجديدة (UTM 37N)',
    lastUpdated: '2024-05-20',
    segments: [...project1Data.w.segments, ...project1Data.s.segments],
    points: [...project1Data.w.points, ...project1Data.s.points]
  },
  {
    id: 'PRJ-002',
    name: 'مشروع مدينة العلمين الجديدة',
    locationName: 'الساحل الشمالي (UTM 35N)',
    lastUpdated: '2024-06-01',
    segments: [...project2Data.w.segments, ...project2Data.s.segments],
    points: [...project2Data.w.points, ...project2Data.s.points]
  },
  {
    id: 'PRJ-003',
    name: 'تطوير قرى حياة كريمة - أسيوط',
    locationName: 'أسيوط (UTM 36N)',
    lastUpdated: '2024-05-28',
    segments: [...project3Data.w.segments, ...project3Data.s.segments],
    points: [...project3Data.w.points, ...project3Data.s.points]
  },
  {
    id: 'PRJ-004',
    name: 'المنطقة الصناعية - السويس',
    locationName: 'محور قناة السويس (UTM 36N)',
    lastUpdated: '2024-06-05',
    segments: [...project4Data.w.segments, ...project4Data.s.segments],
    points: [...project4Data.w.points, ...project4Data.s.points]
  }
];

export const STATUS_COLORS = {
  [ProjectStatus.COMPLETED]: '#10b981',
  [ProjectStatus.IN_PROGRESS]: '#f59e0b',
  [ProjectStatus.PENDING]: '#94a3b8',
};

export const POINT_LABELS: Record<PointType, string> = {
  [PointType.MANHOLE]: 'منهل',
  [PointType.SEWAGE_HOUSE_CONNECTION]: 'وصلة منزلية صرف',
  [PointType.INSPECTION_CHAMBER]: 'غرفة تفتيش',
  [PointType.VALVE]: 'محبس',
  [PointType.FIRE_HYDRANT]: 'حنفية حريق',
  [PointType.WATER_HOUSE_CONNECTION]: 'وصلة منزلية مياه',
};
