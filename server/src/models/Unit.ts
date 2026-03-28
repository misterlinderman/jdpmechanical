import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStageStatus {
  completedAt: Date;
  completedBy: Types.ObjectId;
}

export interface IUnit extends Document {
  project: Types.ObjectId;
  equipmentId: string;
  floor: number;
  referenceDocument: string;
  submittalGPM: number;
  designGPM: number;
  lineSize: string;
  ctlSize: string;
  supplyDirection: 'Left' | 'Right';
  qrCodeUrl: string;
  fabricated: IStageStatus | null;
  delivered: IStageStatus | null;
  installed: IStageStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

const stageStatusSchema = new Schema<IStageStatus>(
  {
    completedAt: { type: Date, required: true },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const unitSchema = new Schema<IUnit>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    equipmentId: { type: String, required: true, trim: true },
    floor: { type: Number, required: true },
    referenceDocument: { type: String, required: true, trim: true },
    submittalGPM: { type: Number, required: true },
    designGPM: { type: Number, required: true },
    lineSize: { type: String, required: true, trim: true },
    ctlSize: { type: String, required: true, trim: true },
    supplyDirection: { type: String, enum: ['Left', 'Right'], required: true },
    qrCodeUrl: { type: String, default: '' },
    fabricated: { type: stageStatusSchema, default: null },
    delivered: { type: stageStatusSchema, default: null },
    installed: { type: stageStatusSchema, default: null },
  },
  { timestamps: true }
);

unitSchema.index({ project: 1, equipmentId: 1 }, { unique: true });
unitSchema.index({ floor: 1 });
unitSchema.index({ project: 1, floor: 1 });

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
