export interface StageStatus {
  completedAt: string;
  completedBy?: { _id: string; name: string; email?: string };
}

export interface IUnit {
  _id: string;
  project: string;
  equipmentId: string;
  floor: number;
  referenceDocument: string;
  submittalGPM: number;
  designGPM: number;
  lineSize: string;
  ctlSize: string;
  supplyDirection: 'Left' | 'Right';
  qrCodeUrl: string;
  fabricated: StageStatus | null;
  delivered: StageStatus | null;
  installed: StageStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface IScanEvent {
  _id: string;
  unit: string | { equipmentId: string; floor: number };
  user: string | { name: string; email?: string };
  action: 'fabricated' | 'delivered' | 'installed';
  timestamp: string;
}
