
import { NetworkSegment, NetworkPoint, ProjectStatus, NetworkType, PointType } from "../types";

export interface AuditIssue {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  targetId?: string;
}

export const runEngineeringAudit = (segments: NetworkSegment[], points: NetworkPoint[]): AuditIssue[] => {
  const issues: AuditIssue[] = [];

  // 1. فحص الخطوط المقطوعة (Disconnected Segments)
  segments.forEach(seg => {
    // التحقق مما إذا كان طرف الخط يتصل بخط آخر أو بنقطة فنية
    const isStartConnected = segments.some(s => s.id !== seg.id && (
      Math.abs(s.startNode.x - seg.startNode.x) < 0.1 && Math.abs(s.startNode.y - seg.startNode.y) < 0.1 ||
      Math.abs(s.endNode.x - seg.startNode.x) < 0.1 && Math.abs(s.endNode.y - seg.startNode.y) < 0.1
    )) || points.some(p => Math.abs(p.location.x - seg.startNode.x) < 0.1 && Math.abs(p.location.y - seg.startNode.y) < 0.1);

    const isEndConnected = segments.some(s => s.id !== seg.id && (
      Math.abs(s.startNode.x - seg.endNode.x) < 0.1 && Math.abs(s.startNode.y - seg.endNode.y) < 0.1 ||
      Math.abs(s.endNode.x - seg.endNode.x) < 0.1 && Math.abs(s.endNode.y - seg.endNode.y) < 0.1
    )) || points.some(p => Math.abs(p.location.x - seg.endNode.x) < 0.1 && Math.abs(p.location.y - seg.endNode.y) < 0.1);

    if (!isStartConnected || !isEndConnected) {
      issues.push({
        id: `DISC-${seg.id}`,
        type: 'WARNING',
        title: 'خط غير متصل بالكامل',
        description: `الخط "${seg.name}" يبدو تائهاً هندسياً في أحد أطرافه ولا يرتبط بعناصر أخرى.`,
        targetId: seg.id
      });
    }

    // 2. فحص الأطوال غير المنطقية
    if (seg.length <= 0) {
      issues.push({
        id: `LEN-${seg.id}`,
        type: 'ERROR',
        title: 'طول غير صالح',
        description: `الخط "${seg.name}" يمتلك طولاً مساوياً للصفر أو سالباً.`,
        targetId: seg.id
      });
    }
  });

  // 3. فحص منطق شبكة الصرف (يجب وجود مناهل عند التقاطعات)
  if (segments.some(s => s.type === NetworkType.SEWAGE)) {
    const sewagePoints = points.filter(p => p.type === PointType.MANHOLE);
    if (sewagePoints.length === 0 && segments.some(s => s.type === NetworkType.SEWAGE)) {
      issues.push({
        id: 'NO-MH',
        type: 'ERROR',
        title: 'غياب المناهل',
        description: 'تم اكتشاف شبكة صرف صحي بدون وجود مناهل مسجلة، وهذا خطأ تصميمي فادح.',
      });
    }
  }

  // 4. فحص العناصر المكررة (Duplicate Locations)
  points.forEach((p1, idx) => {
    points.slice(idx + 1).forEach(p2 => {
      if (Math.abs(p1.location.x - p2.location.x) < 0.01 && Math.abs(p1.location.y - p2.location.y) < 0.01) {
        issues.push({
          id: `DUP-${p1.id}-${p2.id}`,
          type: 'WARNING',
          title: 'عناصر متداخلة',
          description: `العناصر "${p1.name}" و "${p2.name}" تقع في نفس الإحداثيات تماماً.`,
          targetId: p1.id
        });
      }
    });
  });

  return issues;
};
