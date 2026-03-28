import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractRoles } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Unit, ScanEvent, User, IUser } from '../models';
import { ensureMongoUser } from '../services/userSync';

const router = Router();
router.use(checkJwt);

type ScanCode = 'ALREADY_DONE' | 'PREREQUISITE_MISSING' | 'WRONG_ROLE';

function roleToAction(role: string): 'fabricated' | 'delivered' | 'installed' | null {
  if (role === 'fabricator') return 'fabricated';
  if (role === 'driver') return 'delivered';
  if (role === 'installer') return 'installed';
  return null;
}

function workerDisplayName(user: IUser): string {
  const parts = (user.name || '').trim().split(/\s+/);
  if (parts.length === 0) return 'Worker';
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

router.post(
  '/:unitId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { unitId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      res.status(400).json({ success: false, error: 'Invalid unit id', code: 'WRONG_ROLE' as ScanCode });
      return;
    }

    const roles = extractRoles(req);
    if (roles.includes('admin') || roles.includes('pm')) {
      res.status(403).json({
        success: false,
        error: 'Your role cannot record a scan for this unit.',
        code: 'WRONG_ROLE' as ScanCode,
      });
      return;
    }

    const workerRole = ['fabricator', 'driver', 'installer'].find((r) => roles.includes(r));
    const action = workerRole ? roleToAction(workerRole) : null;
    if (!action) {
      res.status(403).json({
        success: false,
        error: 'Your role cannot record a scan for this unit.',
        code: 'WRONG_ROLE' as ScanCode,
      });
      return;
    }

    const mongoUser = await ensureMongoUser(req);
    const unit = await Unit.findById(unitId);
    if (!unit) {
      throw createError('Unit not found', 404);
    }

    const now = new Date();
    const stageKey = action;

    if (action === 'fabricated' && unit.fabricated) {
      const by = unit.fabricated.completedBy
        ? await User.findById(unit.fabricated.completedBy)
        : null;
      res.status(409).json({
        success: false,
        error: `This stage was completed by ${by?.name || 'another user'} on ${unit.fabricated.completedAt.toISOString()}`,
        code: 'ALREADY_DONE' as ScanCode,
      });
      return;
    }
    if (action === 'delivered') {
      if (!unit.fabricated) {
        res.status(409).json({
          success: false,
          error: 'Fabrication must be complete before delivery.',
          code: 'PREREQUISITE_MISSING' as ScanCode,
        });
        return;
      }
      if (unit.delivered) {
        const by = unit.delivered.completedBy ? await User.findById(unit.delivered.completedBy) : null;
        res.status(409).json({
          success: false,
          error: `This stage was completed by ${by?.name || 'another user'} on ${unit.delivered.completedAt.toISOString()}`,
          code: 'ALREADY_DONE' as ScanCode,
        });
        return;
      }
    }
    if (action === 'installed') {
      if (!unit.delivered) {
        res.status(409).json({
          success: false,
          error: 'Delivery must be complete before installation.',
          code: 'PREREQUISITE_MISSING' as ScanCode,
        });
        return;
      }
      if (unit.installed) {
        const by = unit.installed.completedBy ? await User.findById(unit.installed.completedBy) : null;
        res.status(409).json({
          success: false,
          error: `This stage was completed by ${by?.name || 'another user'} on ${unit.installed.completedAt.toISOString()}`,
          code: 'ALREADY_DONE' as ScanCode,
        });
        return;
      }
    }

    unit[stageKey] = {
      completedAt: now,
      completedBy: mongoUser._id,
    };
    await unit.save();

    const eventDoc = await ScanEvent.create({
      unit: unit._id,
      user: mongoUser._id,
      action: stageKey,
      timestamp: now,
      location: req.body?.location,
    });

    const updated = await Unit.findById(unit._id).populate([
      { path: 'fabricated.completedBy', select: 'name email' },
      { path: 'delivered.completedBy', select: 'name email' },
      { path: 'installed.completedBy', select: 'name email' },
    ]);

    const io = req.app.get('io') as { emit: (ev: string, p: unknown) => void } | undefined;
    if (updated) {
      io?.emit('unit:updated', updated.toObject());
    }

    res.json({
      success: true,
      unit: updated,
      event: eventDoc,
      workerName: workerDisplayName(mongoUser),
    });
  })
);

export default router;
