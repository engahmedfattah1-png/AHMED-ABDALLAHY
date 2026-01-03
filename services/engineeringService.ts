
import { NetworkSegment, NetworkPoint, ProjectStatus, NetworkType, PointType } from "../types";

export interface AuditIssue {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  targetId?: string;
  location?: { x: number, y: number }; // Added for map interaction
}

// Helper: Calculate distance in meters (Haversine approximation for lat/lng)
const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const R = 6371e3;
    const φ1 = p1.y * Math.PI/180;
    const φ2 = p2.y * Math.PI/180;
    const Δφ = (p2.y-p1.y) * Math.PI/180;
    const Δλ = (p2.x-p1.x) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Threshold for "connected" items in meters
const CONNECTION_TOLERANCE = 1.0; 

export const runEngineeringAudit = (segments: NetworkSegment[], points: NetworkPoint[]): AuditIssue[] => {
  const issues: AuditIssue[] = [];

  // --- 1. فحص المواسير (Segments) ---
  segments.forEach(seg => {
    // A. فحص الحلقات الذاتية (Self-Loops)
    const selfDist = getDistance(seg.startNode, seg.endNode);
    if (selfDist < 0.1) {
       issues.push({
         id: `LOOP-${seg.id}`,
         type: 'ERROR',
         title: 'حلقة مغلقة (Self-Loop)',
         description: `الخط "${seg.name}" يبدأ وينتهي في نفس النقطة، وهذا غير منطقي هندسياً.`,
         targetId: seg.id,
         location: seg.startNode
       });
    }

    // B. فحص الأطوال غير المنطقية
    if (seg.length < 1 && selfDist > 1) {
       // Length field says 0 but geometry says otherwise
       issues.push({
        id: `LEN-MM-${seg.id}`,
        type: 'WARNING',
        title: 'تعارض في الطول',
        description: `البيانات الوصفية تقول الطول ${seg.length}م بينما الرسم الهندسي يظهر ${Math.round(selfDist)}م.`,
        targetId: seg.id,
        location: seg.startNode
      });
    } else if (seg.length > 2000) {
        issues.push({
            id: `LEN-MAX-${seg.id}`,
            type: 'WARNING',
            title: 'قطاع طويل جداً',
            description: `طول الخط يتجاوز 2 كم (${Math.round(seg.length)}م) دون نقاط تحكم وسطية.`,
            targetId: seg.id,
            location: { 
                x: (seg.startNode.x + seg.endNode.x) / 2, 
                y: (seg.startNode.y + seg.endNode.y) / 2 
            }
        });
    }

    // C. فحص الاتصال (Connectivity Check)
    // هل البداية متصلة بأي شيء (ماسورة أخرى أو نقطة)؟
    const startConnectedToSeg = segments.some(s => s.id !== seg.id && (getDistance(s.startNode, seg.startNode) < CONNECTION_TOLERANCE || getDistance(s.endNode, seg.startNode) < CONNECTION_TOLERANCE));
    const startConnectedToPoint = points.some(p => getDistance(p.location, seg.startNode) < CONNECTION_TOLERANCE);
    
    // هل النهاية متصلة؟
    const endConnectedToSeg = segments.some(s => s.id !== seg.id && (getDistance(s.startNode, seg.endNode) < CONNECTION_TOLERANCE || getDistance(s.endNode, seg.endNode) < CONNECTION_TOLERANCE));
    const endConnectedToPoint = points.some(p => getDistance(p.location, seg.endNode) < CONNECTION_TOLERANCE);

    if (!startConnectedToSeg && !startConnectedToPoint) {
        issues.push({
            id: `DISC-START-${seg.id}`,
            type: 'WARNING',
            title: 'بداية تائهة (Open Start)',
            description: `بداية الخط "${seg.name}" لا تتصل بأي عنصر آخر في الشبكة.`,
            targetId: seg.id,
            location: seg.startNode
        });
    }

    if (!endConnectedToSeg && !endConnectedToPoint) {
        issues.push({
            id: `DISC-END-${seg.id}`,
            type: 'WARNING',
            title: 'نهاية تائهة (Open End)',
            description: `نهاية الخط "${seg.name}" سائبة ولا ترتبط بأي عنصر.`,
            targetId: seg.id,
            location: seg.endNode
        });
    }
  });

  // --- 2. فحص النقاط (Points) ---
  points.forEach((pt, idx) => {
      // A. النقاط اليتيمة (Orphan Points)
      // نقطة موجودة في الخريطة لكن لا يمر بها أي خط
      const isConnected = segments.some(s => 
          getDistance(s.startNode, pt.location) < CONNECTION_TOLERANCE || 
          getDistance(s.endNode, pt.location) < CONNECTION_TOLERANCE
      );

      if (!isConnected) {
          issues.push({
              id: `ORPHAN-${pt.id}`,
              type: 'INFO', // قد تكون نقطة مستقبلية
              title: 'نقطة يتيمة (Orphan Node)',
              description: `العنصر "${pt.name}" موجود على الخريطة لكنه غير متصل بأي ماسورة.`,
              targetId: pt.id,
              location: pt.location
          });
      }

      // B. النقاط المكررة (Duplicate Geometry)
      // نفحص فقط العناصر التالية لتجنب تكرار الخطأ
      for (let i = idx + 1; i < points.length; i++) {
          const otherPt = points[i];
          if (getDistance(pt.location, otherPt.location) < 0.1) { // Same spot
              issues.push({
                  id: `DUP-${pt.id}-${otherPt.id}`,
                  type: 'ERROR',
                  title: 'تطابق مكاني (Duplicate)',
                  description: `يوجد عنصران في نفس الإحداثيات تماماً: "${pt.name}" و "${otherPt.name}".`,
                  targetId: pt.id,
                  location: pt.location
              });
          }
      }
  });

  // --- 3. فحص منطق الصرف الصحي ---
  if (segments.some(s => s.type === NetworkType.SEWAGE)) {
    const manholes = points.filter(p => p.type === PointType.MANHOLE);
    if (manholes.length === 0) {
      issues.push({
        id: 'NO-MH',
        type: 'ERROR',
        title: 'شبكة صرف بلا مناهل',
        description: 'يحتوي المشروع على خطوط صرف صحي ولكن لا توجد مناهل مسجلة.',
        location: segments.find(s => s.type === NetworkType.SEWAGE)?.startNode
      });
    }
  }

  return issues;
};
