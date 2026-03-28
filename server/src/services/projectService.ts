import { Types } from 'mongoose';
import { Project } from '../models';

/**
 * Single default project for alpha; multi-project can extend this later.
 */
export async function getDefaultProjectId(): Promise<Types.ObjectId> {
  let doc = await Project.findOne({ name: 'Default' });
  if (!doc) {
    doc = await Project.create({ name: 'Default', client: 'Default' });
  }
  return doc._id as Types.ObjectId;
}
