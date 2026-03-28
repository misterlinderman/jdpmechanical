import { Router, Response } from 'express';
import { checkJwt, AuthRequest, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ScanEvent, Unit } from '../models';

const router = Router();
router.use(checkJwt);

router.get(
  '/recent',
  requireRole('admin', 'pm'),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const events = await ScanEvent.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate({ path: 'unit', select: 'equipmentId floor' })
      .populate({ path: 'user', select: 'name email' })
      .lean();

    res.json({ success: true, data: events });
  })
);

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 100);
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const skip = (page - 1) * limit;

    const stage = req.query.stage as string | undefined;
    const floorRaw = req.query.floor as string | undefined;

    const q: Record<string, unknown> = {};
    if (stage && ['fabricated', 'delivered', 'installed'].includes(stage)) {
      q.action = stage;
    }

    if (floorRaw !== undefined && floorRaw !== '') {
      const f = parseInt(floorRaw, 10);
      if (!Number.isNaN(f)) {
        const ids = await Unit.find({ floor: f }).distinct('_id');
        q.unit = { $in: ids };
      }
    }

    const [events, total] = await Promise.all([
      ScanEvent.find(q)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'unit', select: 'equipmentId floor' })
        .populate({ path: 'user', select: 'name email' }),
      ScanEvent.countDocuments(q),
    ]);

    res.json({ success: true, data: events, page, limit, total });
  })
);

export default router;
