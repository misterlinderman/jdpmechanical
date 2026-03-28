import { Router, Response } from 'express';
import multer from 'multer';
import { checkJwt, AuthRequest, requireRole, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Unit } from '../models';
import { getDefaultProjectId } from '../services/projectService';
import { parseImportBuffer } from '../services/importService';
import { Types } from 'mongoose';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.use(checkJwt);

const populateStages = [
  { path: 'fabricated.completedBy', select: 'name email' },
  { path: 'delivered.completedBy', select: 'name email' },
  { path: 'installed.completedBy', select: 'name email' },
];

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

// GET /api/units — admin, pm
router.get(
  '/',
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

    const units = await Unit.find(q).sort({ floor: 1, equipmentId: 1 }).populate(populateStages);
    res.json({ success: true, data: units });
  })
);

// POST /api/units — admin
router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = await getDefaultProjectId();
    const {
      equipmentId,
      floor,
      referenceDocument,
      submittalGPM,
      designGPM,
      lineSize,
      ctlSize,
      supplyDirection,
    } = req.body;

    if (
      !equipmentId ||
      floor === undefined ||
      !referenceDocument ||
      submittalGPM === undefined ||
      designGPM === undefined ||
      !lineSize ||
      !ctlSize ||
      !supplyDirection
    ) {
      throw createError('Missing required unit fields', 400);
    }
    if (supplyDirection !== 'Left' && supplyDirection !== 'Right') {
      throw createError('supplyDirection must be Left or Right', 400);
    }

    const unit = await Unit.create({
      project: projectId,
      equipmentId: String(equipmentId).trim(),
      floor: Number(floor),
      referenceDocument: String(referenceDocument).trim(),
      submittalGPM: Number(submittalGPM),
      designGPM: Number(designGPM),
      lineSize: String(lineSize).trim(),
      ctlSize: String(ctlSize).trim(),
      supplyDirection,
      qrCodeUrl: '',
      fabricated: null,
      delivered: null,
      installed: null,
    });

    const populated = await Unit.findById(unit._id).populate(populateStages);
    res.status(201).json({ success: true, data: populated });
  })
);

// POST /api/units/import — admin
router.post(
  '/import',
  requireRole('admin'),
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file?.buffer) {
      throw createError('No file uploaded (field name: file)', 400);
    }

    const dryRun =
      req.body?.dryRun === 'true' ||
      req.body?.dryRun === true ||
      req.body?.dryRun === '1';

    const projectId = await getDefaultProjectId();
    const { valid, errors, columnMap } = parseImportBuffer(req.file.buffer, projectId);

    if (dryRun) {
      res.json({
        success: true,
        data: {
          columnMap,
          errors,
          validCount: valid.length,
          ready: valid.length > 0 && errors.length === 0,
        },
      });
      return;
    }

    const existing = await Unit.find({
      project: projectId,
      equipmentId: { $in: valid.map((v) => v.equipmentId) },
    }).select('equipmentId');
    const existingSet = new Set(existing.map((e) => e.equipmentId.toLowerCase()));

    const mergeErrors = [...errors];
    const toInsert = valid.filter((row) => {
      if (existingSet.has(row.equipmentId.toLowerCase())) {
        mergeErrors.push({
          row: 0,
          message: `Already exists in database: ${row.equipmentId}`,
        });
        return false;
      }
      return true;
    });

    const docs = toInsert.map((row) => ({
      ...row,
      qrCodeUrl: '',
      fabricated: null,
      delivered: null,
      installed: null,
    }));

    let inserted = 0;
    if (docs.length > 0) {
      const result = await Unit.insertMany(docs, { ordered: false });
      inserted = result.length;
    }

    const io = req.app.get('io') as { emit: (ev: string, p: unknown) => void } | undefined;
    io?.emit('units:imported', { count: inserted });

    res.json({
      success: true,
      data: {
        inserted,
        errors: mergeErrors,
        columnMap,
        previewCount: valid.length,
      },
    });
  })
);

// GET /api/units/:id — all authenticated roles
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw createError('Invalid unit id', 400);
    }
    const unit = await Unit.findById(id).populate(populateStages);
    if (!unit) {
      throw createError('Unit not found', 404);
    }
    res.json({ success: true, data: unit });
  })
);

// PUT /api/units/:id — admin
router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw createError('Invalid unit id', 400);
    }

    const allowed = [
      'equipmentId',
      'floor',
      'referenceDocument',
      'submittalGPM',
      'designGPM',
      'lineSize',
      'ctlSize',
      'supplyDirection',
      'qrCodeUrl',
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        patch[key] = req.body[key];
      }
    }

    if (patch.supplyDirection && patch.supplyDirection !== 'Left' && patch.supplyDirection !== 'Right') {
      throw createError('supplyDirection must be Left or Right', 400);
    }

    const unit = await Unit.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).populate(
      populateStages
    );
    if (!unit) {
      throw createError('Unit not found', 404);
    }
    res.json({ success: true, data: unit });
  })
);

// DELETE /api/units/:id — admin
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw createError('Invalid unit id', 400);
    }
    const unit = await Unit.findByIdAndDelete(id);
    if (!unit) {
      throw createError('Unit not found', 404);
    }
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
