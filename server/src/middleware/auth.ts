import { auth } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

// Auth0 JWT validation middleware
export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
});

// Use the Request type directly - express-oauth2-jwt-bearer augments it with auth property
export type AuthRequest = Request;

/** Auth0 RBAC roles (configure custom claim namespace in Auth0 Action or RBAC settings). */
export const extractRoles = (req: Request): string[] => {
  const payload = req.auth?.payload as Record<string, unknown> | undefined;
  if (!payload) return [];

  const namespace =
    process.env.AUTH0_ROLE_NAMESPACE ||
    (process.env.AUTH0_AUDIENCE
      ? `${String(process.env.AUTH0_AUDIENCE).replace(/\/$/, '')}/roles`
      : '');

  const fromClaim = namespace ? payload[namespace] : undefined;
  const raw = fromClaim ?? payload.roles ?? payload.permissions;

  if (Array.isArray(raw)) {
    return raw.map((r) => String(r));
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  return [];
};

export const requireRole =
  (...allowed: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const roles = extractRoles(req);
    const ok = allowed.some((r) => roles.includes(r));
    if (!ok) {
      next(createError('Forbidden: insufficient role for this action', 403));
      return;
    }
    next();
  };

// Extract user ID from token
export const extractUserId = (req: Request): string | null => {
  return req.auth?.payload?.sub || null;
};

// Optional auth - doesn't fail if no token, just doesn't set user
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If token exists, validate it
  checkJwt(req, res, (err) => {
    if (err) {
      // Token invalid, but optional so continue without auth
      return next();
    }
    next();
  });
};
