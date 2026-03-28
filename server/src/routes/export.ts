import { Router, Response } from 'express';
import { checkJwt, AuthRequest, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { Unit, User } from '../models';
import { Types } from 'mongoose';

const router = Router();
router.use(checkJwt);

function stageFilter(stage: string | undefined): Record<string, unknown> | null {
  if (!stage || stage === 'all') return null;
  switch (stage) {
    case 'fabricated':
      return { fabricated: { $ne: null } };
    case 'delivered':
      return { delivered: { $ne: null } };
    case 'installed':
      return { installed: { $ne: null } };
    case 'pending':
      return { fabricated: null };
    default:
      return null;
  }
}

async function resolveName(id: Types.ObjectId | null | undefined): Promise<string> {
  if (!id) return '';
  const u = await User.findById(id).select('name');
  return u?.name || '';
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get(
  '/csv',
  requireRole('admin', 'pm'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const floorRaw = req.query.floor as string | undefined;
    const stage = req.query.stage as string | undefined;
    const q: Record<string, unknown> = {};
    if (floorRaw !== undefined && floorRaw !== '') {
      const f = parseInt(floorRaw, 10);
      if (!Number.isNaN(f)) q.floor = f;
    }
    const sf = stageFilter(stage);
    if (sf) Object.assign(q, sf);

    const units = await Unit.find(q).sort({ floor: 1, equipmentId: 1 }).lean();

    const headers = [
      'Equipment ID',
      'Floor',
      'Reference Document',
      'Line Size',
      'CTL Size',
      'Supply Direction',
      'Submittal GPM',
      'Design GPM',
      'Fabricated By',
      'Fabricated At',
      'Delivered By',
      'Delivered At',
      'Installed By',
      'Installed At',
    ];

    const lines: string[] = [headers.map(escapeCsvCell).join(',')];

    for (const u of units) {
      const fabBy = await resolveName(u.fabricated?.completedBy as Types.ObjectId | undefined);
      const delBy = await resolveName(u.delivered?.completedBy as Types.ObjectId | undefined);
      const insBy = await resolveName(u.installed?.completedBy as Types.ObjectId | undefined);
      const row = [
        u.equipmentId,
        u.floor,
        u.referenceDocument,
        u.lineSize,
        u.ctlSize,
        u.supplyDirection,
        u.submittalGPM,
        u.designGPM,
        fabBy,
        u.fabricated?.completedAt?.toISOString() || '',
        delBy,
        u.delivered?.completedAt?.toISOString() || '',
        insBy,
        u.installed?.completedAt?.toISOString() || '',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }

    const csv = lines.join('\n');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fpb-status-${date}.csv"`);
    res.send(csv);
  })
);

export default router;
