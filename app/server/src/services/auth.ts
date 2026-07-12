import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { table } from '../config';
import { one } from '../db/helpers';
import { optionValue } from '../db/options';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { authenticateRequest } from '../auth/session';
import { ephemeral } from '../store/ephemeral';

export class AuthServiceError extends Error {
  constructor(public readonly status: 400 | 401, public readonly code: string, message: string) {
    super(message);
  }
}

export type AuthUserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
  nickname: string | null;
  avatar: string | null;
  bio?: string | null;
  url?: string | null;
  role: string;
  status: string;
  totp_enabled?: boolean;
  utterlog_id?: string | null;
  utterlog_avatar?: string | null;
};

export const authUserColumns = `id, username, email, password, nickname, avatar, bio, url, role, status,
  coalesce(totp_enabled, false) as totp_enabled, coalesce(utterlog_id, '') as utterlog_id,
  coalesce(utterlog_avatar, '') as utterlog_avatar`;

const loginSchema = z.object({
  email: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
});

const refreshSchema = z.object({ refresh_token: z.string().trim().min(1).max(4096) });

export function publicAuthUser(user: AuthUserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    nickname: user.nickname || user.username,
    avatar: user.avatar || '',
    bio: user.bio || '',
    url: user.url || '',
    role: user.role,
    totp_enabled: !!user.totp_enabled,
    utterlog_id: user.utterlog_id || '',
    utterlog_avatar: user.utterlog_avatar || '',
  };
}

function emailHash(email: string) {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

async function authUser(user: AuthUserRow) {
  const source = await optionValue('avatar_source', 'gravatar');
  const hash = emailHash(user.email);
  return {
    ...publicAuthUser(user),
    avatar: source === 'utterlog'
      ? `https://id.utterlog.com/avatar/${hash}`
      : `https://gravatar.bluecdn.com/avatar/${hash}?s=128&d=mp`,
  };
}

export async function issueAuthTokens(user: AuthUserRow) {
  const access = await signAccessToken(user.id, {
    username: user.username,
    email: user.email,
    role: user.role,
    nickname: user.nickname || user.username,
  });
  return {
    access_token: access.token,
    refresh_token: await signRefreshToken(user.id),
    expires_in: 86400,
    expires_at: access.expiresAt,
    token_type: 'Bearer',
  };
}

export async function loginWithPassword(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new AuthServiceError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || '参数错误');
  const user = await one<AuthUserRow>(`select ${authUserColumns} from ${table('users')} where email = $1`, [parsed.data.email]);
  if (!user) throw new AuthServiceError(401, 'UNAUTHORIZED', '账号不存在');
  if (!(await Bun.password.verify(parsed.data.password, user.password).catch(() => false))) {
    throw new AuthServiceError(401, 'UNAUTHORIZED', '密码错误');
  }
  if (user.status !== 'active') throw new AuthServiceError(401, 'UNAUTHORIZED', '账号已停用');
  if (user.totp_enabled) {
    const tempToken = randomBytes(32).toString('hex');
    await ephemeral.set(`totp-login:${tempToken}`, String(user.id), 300);
    return { require_2fa: true, temp_token: tempToken };
  }
  return { ...(await issueAuthTokens(user)), user: await authUser(user) };
}

export async function refreshAuthTokens(input: unknown) {
  const parsed = refreshSchema.safeParse(input);
  if (!parsed.success) throw new AuthServiceError(400, 'VALIDATION_ERROR', 'refresh_token 不能为空');
  try {
    const { userId } = await verifyRefreshToken(parsed.data.refresh_token);
    const user = await one<AuthUserRow>(`select ${authUserColumns} from ${table('users')} where id = $1`, [userId]);
    if (!user || user.status !== 'active') throw new Error('inactive user');
    return issueAuthTokens(user);
  } catch {
    throw new AuthServiceError(401, 'UNAUTHORIZED', 'Refresh Token 无效');
  }
}

export async function authenticatedUser(request: Request) {
  try {
    const session = await authenticateRequest(request);
    if (!session) throw new Error('missing token');
    const user = await one<AuthUserRow>(`select ${authUserColumns} from ${table('users')} where id = $1`, [session.userId]);
    if (!user) throw new Error('missing user');
    return authUser(user);
  } catch {
    throw new AuthServiceError(401, 'UNAUTHORIZED', 'Token 无效或已过期');
  }
}
