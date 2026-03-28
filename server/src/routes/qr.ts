import { Router, Response } from 'express';
import { checkJwt, AuthRequest, requireRole } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Unit } from '../models';
import { generateQRBatch } from '../services/qrService';
import { generateStickerPDF } from '../services/pdfService';
import { Types } from 'mongoose';

const router = Router();
router.use(checkJwt);

router.post(
  '/generate',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { unitIds, all } = req.body as { unitIds?: string[]; all?: boolean };

    let targets: Types.ObjectId[] = [];
    if (all === true) {
      const missing = await Unit.find({
        $or: [
          { qrCodeUrl: '' },
          { qrCodeUrl: null },
          { qrCodeUrl: { $exists: false } },
        ],
      }).select('_id');
      targets = missing.map((u) => u._id as Types.ObjectId);
    } else if (Array.isArray(unitIds) && unitIds.length > 0) {
      targets = unitIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    } else {
      throw createError('Provide unitIds array or all: true', 400);
    }

    if (targets.length === 0) {
      res.json({ success: true, data: { generated: 0, urls: [] as { unitId: string; url: string }[] } });
      return;
    }

    const idStrings = targets.map((id) => id.toString());
    const urls = await generateQRBatch(idStrings);

    const bulk = urls.map(({ unitId, url }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(unitId) },
        update: { $set: { qrCodeUrl: url } },
      },
    }));
    await Unit.bulkWrite(bulk);

    res.json({
      success: true,
      data: {
        generated: urls.length,
        urls,
      },
    });
  })
);

router.get(
  '/sheet',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const floorRaw = req.query.floor as string | undefined;
    const q: Record<string, unknown> = {
      qrCodeUrl: { $exists: true, $nin: ['', null] },
    };
    if (floorRaw !== undefined && floorRaw !== '') {
      const f = parseInt(floorRaw, 10);
      if (!Number.isNaN(f)) q.floor = f;
    }

    const units = await Unit.find(q).sort({ floor: 1, equipmentId: 1 }).lean();
    const stickerData = units
      .filter((u) => u.qrCodeUrl)
      .map((u) => ({
        equipmentId: u.equipmentId,
        floor: u.floor,
        qrCodeUrl: u.qrCodeUrl as string,
      }));

    if (stickerData.length === 0) {
      throw createError('No units with QR codes to export', 400);
    }

    const pdf = await generateStickerPDF(stickerData);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fpb-stickers-${date}.pdf"`);
    res.send(pdf);
  })
);

export default router;
