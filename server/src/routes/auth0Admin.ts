import { Router, Response } from 'express';
import { checkJwt, AuthRequest, requireRole } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import {
  isAuth0ManagementConfigured,
  listManagedRoles,
  listUsers,
  getUserManagedRoles,
  setUserManagedRoles,
} from '../services/auth0Management';

const router = Router();

router.use(checkJwt);
router.use(requireRole('admin'));

function parseUserIdParam(raw: string | undefined): string {
  if (!raw) throw createError('User id is required', 400);
  try {
    return decodeURIComponent(raw);
  } catch {
    throw createError('Invalid user id', 400);
  }
}

// GET /api/admin/auth0/status — env present (does not verify M2M credentials)
router.get(
  '/status',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: { configured: isAuth0ManagementConfigured() },
    });
  })
);

// GET /api/admin/auth0/roles
router.get(
  '/roles',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const roles = await listManagedRoles();
    res.json({ success: true, data: roles });
  })
);

// GET /api/admin/auth0/users?page=&per_page=&q=
router.get(
  '/users',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Number(req.query.page ?? 0);
    const perPage = Number(req.query.per_page ?? 25);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const { users, total } = await listUsers({
      page: Number.isFinite(page) ? page : 0,
      perPage: Number.isFinite(perPage) ? perPage : 25,
      query: q,
    });
    res.json({
      success: true,
      data: { users, total, page: Number.isFinite(page) ? page : 0, per_page: Number.isFinite(perPage) ? perPage : 25 },
    });
  })
);

// GET /api/admin/auth0/users/:userId/roles
router.get(
  '/users/:userId/roles',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseUserIdParam(req.params.userId);
    const roles = await getUserManagedRoles(userId);
    res.json({ success: true, data: roles });
  })
);

// PUT /api/admin/auth0/users/:userId/roles — body: { roles: string[] } (names: admin, pm, …)
router.put(
  '/users/:userId/roles',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = parseUserIdParam(req.params.userId);
    const raw = req.body?.roles;
    if (!Array.isArray(raw)) {
      throw createError('Body must include roles: string[]', 400);
    }
    const roles = raw.map((r) => String(r));
    await setUserManagedRoles(userId, roles);
    const updated = await getUserManagedRoles(userId);
    res.json({ success: true, data: updated });
  })
);

export default router;
