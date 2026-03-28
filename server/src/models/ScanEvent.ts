import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IScanEvent extends Document {
  unit: Types.ObjectId;
  user: Types.ObjectId;
  action: 'fabricated' | 'delivered' | 'installed';
  timestamp: Date;
  location?: { lat: number; lng: number };
}

const scanEventSchema = new Schema<IScanEvent>(
  {
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['fabricated', 'delivered', 'installed'],
      required: true,
    },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: false }
);

export const ScanEvent = mongoose.model<IScanEvent>('ScanEvent', scanEventSchema);
