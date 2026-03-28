import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  client: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true, default: 'Default' },
  },
  { timestamps: true }
);

projectSchema.index({ name: 1 }, { unique: true });

export const Project = mongoose.model<IProject>('Project', projectSchema);
