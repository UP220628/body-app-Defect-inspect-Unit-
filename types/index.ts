// Plant type for A1/A2 segregation
export type Plant = 'A1' | 'A2';

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// User interface with plant field
export interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  providerId?: number;
  plant?: Plant;
}

// Unit interface with plant field
export interface Unit {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusId: number;
  statusName?: string;
  isAvailableToday: boolean;
  registeredById: number;
  providerId?: number;
  plant?: Plant;
  estimatedRepairHours?: number;
  estimatedCompletionDate?: Date;
  vqaComment?: string | null;
  priorityNote?: string;
  priorityRank?: number;
  priorityAssignedById?: number;
  priorityAssignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  defects?: UnitDefect[];
}

// Unit Defect interface
export interface UnitDefect {
  id: number;
  type: string;
  zone: string;
  grade: 'V1' | 'V2' | 'V3';
  description?: string;
  isResolved: boolean;
}

