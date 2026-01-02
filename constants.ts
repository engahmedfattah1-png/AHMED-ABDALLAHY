
import { NetworkSegment, NetworkType, ProjectStatus, NetworkPoint, PointType, Project } from './types';

// ألوان الحالة مطابقة للصورة المرفقة
export const STATUS_COLORS = {
  [ProjectStatus.COMPLETED]: '#22c55e', // أخضر (Executed)
  [ProjectStatus.IN_PROGRESS]: '#f59e0b', // أصفر/برتقالي (In Progress)
  [ProjectStatus.PENDING]: '#ef4444',     // أحمر (Not Executed)
};

const generateWaterNetwork = (projectId: string, startX: number, startY: number, count: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  const spacing = 150;

  for (let i = 0; i < count; i++) {
    const isHorizontal = i % 2 === 0;
    const sX = startX + (isHorizontal ? 0 : (i/2) * spacing);
    const sY = startY + (isHorizontal ? (i/2) * spacing : 0);
    const eX = sX + (isHorizontal ? spacing * 2 : 0);
    const eY = sY + (isHorizontal ? 0 : spacing * 2);

    const status = i % 4 === 0 ? ProjectStatus.COMPLETED : i % 4 === 1 ? ProjectStatus.IN_PROGRESS : ProjectStatus.PENDING;

    segments.push({
      id: `${projectId}-W-${i + 1}`,
      name: `خط مياه رئيسي ${i + 1}`,
      type: NetworkType.WATER,
      status: status,
      length: spacing * 2,
      startNode: { x: sX, y: sY },
      endNode: { x: eX, y: eY },
      completionPercentage: status === ProjectStatus.COMPLETED ? 100 : status === ProjectStatus.IN_PROGRESS ? 45 : 0,
      contractor: 'شركة النيل العامة'
    });

    if (i % 3 === 0) {
      points.push({
        id: `${projectId}-V-${i}`,
        name: `محبس بوابه ${i+1}`,
        type: PointType.VALVE,
        status: status,
        location: { x: sX, y: sY }
      });
    }
    if (i % 5 === 0) {
      points.push({
        id: `${projectId}-FH-${i}`,
        name: `حنفية حريق ${i+1}`,
        type: PointType.FIRE_HYDRANT,
        status: status,
        location: { x: eX, y: eY }
      });
    }
  }
  return { segments, points };
};

const generateSewageNetwork = (projectId: string, startX: number, startY: number, count: number): { segments: NetworkSegment[], points: NetworkPoint[] } => {
  const segments: NetworkSegment[] = [];
  const points: NetworkPoint[] = [];
  const segLength = 120;

  for (let i = 0; i < count; i++) {
    const sX = startX + (i * 20);
    const sY = startY + (i * segLength);
    const eX = sX + 20;
    const eY = sY + segLength;

    const status = i % 3 === 0 ? ProjectStatus.COMPLETED : ProjectStatus.PENDING;

    segments.push({
      id: `${projectId}-S-${i + 1}`,
      name: `خط انحدار ${i + 1}`,
      type: NetworkType.SEWAGE,
      status: status,
      length: segLength,
      startNode: { x: sX, y: sY },
      endNode: { x: eX, y: eY },
      completionPercentage: status === ProjectStatus.COMPLETED ? 100 : 0,
      contractor: 'المقاولون العرب'
    });

    points.push({
      id: `${projectId}-MH-${i}`,
      name: `منهل خرساني ${i+1}`,
      type: PointType.MANHOLE,
      status: status,
      location: { x: sX, y: sY }
    });

    if (i % 4 === 0) {
      points.push({
        id: `${projectId}-IC-${i}`,
        name: `غرفة تفتيش ${i+1}`,
        type: PointType.INSPECTION_CHAMBER,
        status: status,
        location: { x: sX + 15, y: sY + 30 }
      });
    }
  }
  return { segments, points };
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'PRJ-CAI-24',
    name: 'تطوير شبكة القاهرة الجديدة',
    locationName: 'القاهرة (UTM 36N)',
    lastUpdated: '2024-10-01',
    segments: [...generateWaterNetwork('CAI', 638000, 3324000, 15).segments, ...generateSewageNetwork('CAI', 638500, 3324000, 10).segments],
    points: [...generateWaterNetwork('CAI', 638000, 3324000, 15).points, ...generateSewageNetwork('CAI', 638500, 3324000, 10).points]
  },
  {
    id: 'PRJ-ALX-24',
    name: 'توسعة محطة السيوف',
    locationName: 'الإسكندرية (UTM 35N)',
    lastUpdated: '2024-11-15',
    segments: generateWaterNetwork('ALX', 450000, 3450000, 25).segments,
    points: generateWaterNetwork('ALX', 450000, 3450000, 25).points
  },
  {
    id: 'PRJ-DEL-24',
    name: 'إحلال شبكات صرف طنطا',
    locationName: 'الغربية (UTM 36N)',
    lastUpdated: '2024-09-20',
    segments: generateSewageNetwork('DEL', 350000, 3300000, 20).segments,
    points: generateSewageNetwork('DEL', 350000, 3300000, 20).points
  },
  {
    id: 'PRJ-ASW-24',
    name: 'مشروع مياه قري أسوان',
    locationName: 'أسوان (UTM 36N)',
    lastUpdated: '2024-12-05',
    segments: generateWaterNetwork('ASW', 700000, 2700000, 18).segments,
    points: generateWaterNetwork('ASW', 700000, 2700000, 18).points
  },
  {
    id: 'PRJ-PSD-24',
    name: 'البنية التحتية لمنطقة القناة',
    locationName: 'بورسعيد (UTM 36N)',
    lastUpdated: '2024-08-10',
    segments: [...generateWaterNetwork('PSD', 600000, 3450000, 12).segments, ...generateSewageNetwork('PSD', 600500, 3450000, 12).segments],
    points: [...generateWaterNetwork('PSD', 600000, 3450000, 12).points, ...generateSewageNetwork('PSD', 600500, 3450000, 12).points]
  }
];

export const POINT_LABELS: Record<PointType, string> = {
  [PointType.MANHOLE]: 'منهل',
  [PointType.SEWAGE_HOUSE_CONNECTION]: 'وصلة منزلية صرف',
  [PointType.INSPECTION_CHAMBER]: 'غرفة تفتيش',
  [PointType.VALVE]: 'محبس',
  [PointType.FIRE_HYDRANT]: 'حنفية حريق',
  [PointType.WATER_HOUSE_CONNECTION]: 'وصلة منزلية مياه',
};
