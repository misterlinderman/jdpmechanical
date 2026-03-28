/**
 * Seeds units with equipment IDs prefixed DEMO- for local QA (dashboard, QR, import flow).
 * Run from server/: npm run seed:demo
 *
 * Optional: set SEED_ACTOR_EMAIL in server/.env to a user who has logged in once
 * (MongoDB User row exists). Then some units get fabricated/delivered/installed
 * and matching ScanEvents for activity widgets.
 */
import path from 'path';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase, disconnectDatabase } from '../config/database';
import { getDefaultProjectId } from '../services/projectService';
import { Unit, User, ScanEvent } from '../models';

const DEMO_PREFIX = /^DEMO-/i;

async function main(): Promise<void> {
  await connectDatabase();
  try {
  const projectId = await getDefaultProjectId();

  const existing = await Unit.countDocuments({
    project: projectId,
    equipmentId: DEMO_PREFIX,
  });
  if (existing > 0) {
    console.warn(
      `Found ${existing} existing DEMO-* unit(s). Run npm run seed:purge-demo first, or delete them in the app.`
    );
    process.exitCode = 1;
    return;
  }

  const actorEmail = process.env.SEED_ACTOR_EMAIL?.trim().toLowerCase();
  const actor = actorEmail ? await User.findOne({ email: actorEmail }) : await User.findOne().sort({ createdAt: 1 });
  if (!actor) {
    console.warn(
      'No MongoDB User found (log in once via the app, or set SEED_ACTOR_EMAIL). Seeding units only (all stages empty).'
    );
  }

  const now = Date.now();
  const actorId = actor?._id as Types.ObjectId | undefined;

  const base = {
    project: projectId,
    referenceDocument: 'DEMO-REF',
    submittalGPM: 45,
    designGPM: 44,
    lineSize: '6',
    ctlSize: '8',
    supplyDirection: 'Left' as const,
    qrCodeUrl: '',
  };

  const specs: { equipmentId: string; floor: number; stage: 'none' | 'fab' | 'del' | 'ins' }[] = [
    { equipmentId: 'DEMO-001', floor: 1, stage: 'none' },
    { equipmentId: 'DEMO-002', floor: 1, stage: 'fab' },
    { equipmentId: 'DEMO-003', floor: 1, stage: 'del' },
    { equipmentId: 'DEMO-004', floor: 2, stage: 'ins' },
    { equipmentId: 'DEMO-005', floor: 2, stage: 'none' },
    { equipmentId: 'DEMO-006', floor: 2, stage: 'fab' },
    { equipmentId: 'DEMO-007', floor: 3, stage: 'del' },
    { equipmentId: 'DEMO-008', floor: 3, stage: 'ins' },
    { equipmentId: 'DEMO-009', floor: 3, stage: 'none' },
    { equipmentId: 'DEMO-010', floor: 4, stage: 'fab' },
    { equipmentId: 'DEMO-011', floor: 4, stage: 'ins' },
    { equipmentId: 'DEMO-012', floor: 5, stage: 'none' },
  ];

  const docs = specs.map((s, i) => {
    const t = new Date(now - (specs.length - i) * 60_000);
    let fabricated: { completedAt: Date; completedBy: Types.ObjectId } | null = null;
    let delivered: { completedAt: Date; completedBy: Types.ObjectId } | null = null;
    let installed: { completedAt: Date; completedBy: Types.ObjectId } | null = null;
    if (actorId) {
      if (s.stage === 'fab' || s.stage === 'del' || s.stage === 'ins') {
        fabricated = { completedAt: t, completedBy: actorId };
      }
      if (s.stage === 'del' || s.stage === 'ins') {
        delivered = { completedAt: new Date(t.getTime() + 30_000), completedBy: actorId };
      }
      if (s.stage === 'ins') {
        installed = { completedAt: new Date(t.getTime() + 60_000), completedBy: actorId };
      }
    }
    return {
      ...base,
      equipmentId: s.equipmentId,
      floor: s.floor,
      referenceDocument: `${base.referenceDocument}-${s.equipmentId}`,
      fabricated,
      delivered,
      installed,
    };
  });

  const inserted = await Unit.insertMany(docs);
  console.log(`Inserted ${inserted.length} DEMO-* units.`);

  if (actorId) {
    const events: { unit: Types.ObjectId; user: Types.ObjectId; action: 'fabricated' | 'delivered' | 'installed'; timestamp: Date }[] = [];
    for (let i = 0; i < inserted.length; i++) {
      const u = inserted[i];
      const spec = specs[i];
      const t = new Date(now - (specs.length - i) * 60_000);
      if (spec.stage === 'fab' || spec.stage === 'del' || spec.stage === 'ins') {
        events.push({ unit: u._id as Types.ObjectId, user: actorId, action: 'fabricated', timestamp: t });
      }
      if (spec.stage === 'del' || spec.stage === 'ins') {
        events.push({
          unit: u._id as Types.ObjectId,
          user: actorId,
          action: 'delivered',
          timestamp: new Date(t.getTime() + 30_000),
        });
      }
      if (spec.stage === 'ins') {
        events.push({
          unit: u._id as Types.ObjectId,
          user: actorId,
          action: 'installed',
          timestamp: new Date(t.getTime() + 60_000),
        });
      }
    }
    if (events.length) {
      await ScanEvent.insertMany(events);
      console.log(`Inserted ${events.length} scan events for activity / dashboard.`);
    }
  }

  } finally {
    await disconnectDatabase();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
