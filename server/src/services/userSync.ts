import { AuthRequest, extractUserId } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { User, IUser } from '../models';

interface JwtPayloadShape {
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
}

export async function ensureMongoUser(req: AuthRequest): Promise<IUser> {
  const auth0Id = extractUserId(req);
  if (!auth0Id) {
    throw createError('Unauthorized', 401);
  }

  let user = await User.findOne({ auth0Id });
  if (user) {
    return user;
  }

  const payload = req.auth?.payload as JwtPayloadShape | undefined;
  const email = payload?.email?.trim() || `${auth0Id.replace(/\|/g, '_')}@users.placeholder`;
  const name =
    (payload?.name || payload?.nickname || 'User').trim() || 'User';

  user = await User.create({
    auth0Id,
    email,
    name,
    picture: payload?.picture,
  });
  return user;
}
