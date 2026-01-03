
export enum ProjectStatus {
  COMPLETED = 'COMPLETED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING'
}

export enum NetworkType {
  WATER = 'WATER',
  SEWAGE = 'SEWAGE'
}

export enum PointType {
  MANHOLE = 'MANHOLE',
  SEWAGE_HOUSE_CONNECTION = 'SEWAGE_HOUSE_CONNECTION',
  INSPECTION_CHAMBER = 'INSPECTION_CHAMBER',
  VALVE = 'VALVE',
  FIRE_HYDRANT = 'FIRE_HYDRANT',
  WATER_HOUSE_CONNECTION = 'WATER_HOUSE_CONNECTION',
  AIR_VALVE = 'AIR_VALVE',
  WASH_VALVE = 'WASH_VALVE',
  OIL_TRAP = 'OIL_TRAP',
  ELBOW = 'ELBOW',
  TEE = 'TEE',
  SADDLE = 'SADDLE',
  REDUCER = 'REDUCER',
}

export interface Coordinates {
  x: number; // Easting (UTM)
  y: number; // Northing (UTM)
}

export interface NetworkPoint {
  id: string;
  name: string;
  type: PointType;
  status: ProjectStatus;
  location: Coordinates;
  segmentId?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface NetworkSegment {
  id: string;
  name: string;
  type: NetworkType;
  status: ProjectStatus;
  length: number;
  startNode: Coordinates;
  endNode: Coordinates;
  completionPercentage: number;
  contractor: string;
  startDate?: string;
  expectedEndDate?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  locationName: string;
  segments: NetworkSegment[];
  points: NetworkPoint[];
  lastUpdated: string;
}

export interface NetworkStats {
  totalLength: number;
  completedLength: number;
  totalPoints: number;
  completedPoints: number;
}
