/**
 * Removes all units whose equipment ID starts with DEMO- and their ScanEvents.
 * Run from server/: npm run seed:purge-demo
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase, disconnectDatabase } from '../config/database';
import { Unit, ScanEvent } from '../models';

async function main(): Promise<void> {
  await connectDatabase();
  try {
  const demoUnits = await Unit.find({ equipmentId: /^DEMO-/i }).select('_id equipmentId').lean();
  const ids = demoUnits.map((u) => u._id);

  if (ids.length === 0) {
    console.log('No DEMO-* units found. Nothing to purge.');
    return;
  }

  const ev = await ScanEvent.deleteMany({ unit: { $in: ids } });
  const un = await Unit.deleteMany({ _id: { $in: ids } });

  console.log(`Deleted ${un.deletedCount} unit(s), ${ev.deletedCount} scan event(s).`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
