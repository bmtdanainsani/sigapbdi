import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

interface VercelReq extends IncomingMessage {
  body?: unknown;
}

const DEFAULT_SUPERADMIN_SCRYPT_DIGEST =
  '43a1b87e944b7052eac6eebdf61bc685:107b625bdd465eaa14733276530a9d654a4ea87b7ef14e6b58b22cb2bca0d43d6198bda442ccf107ca23fab94dff320d37982f5a678fd8da70b574c8ea5abfd7';

const verifySuperadminPassword = (candidatePassword: string): boolean => {
  const envPass = process.env.SUPERADMIN_PASSWORD?.trim();
  if (envPass && envPass !== 'MY_SUPERADMIN_PASSWORD') {
    const a = crypto.createHash('sha256').update(candidatePassword).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    return crypto.timingSafeEqual(a, b);
  }
  const [salt, storedHex] = DEFAULT_SUPERADMIN_SCRYPT_DIGEST.split(':');
  if (!salt || !storedHex) return false;
  const candidateBuf = crypto.scryptSync(candidatePassword, salt, 64);
  const storedBuf = Buffer.from(storedHex, 'hex');
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
};

const authAttempts = new Map<string, { count: number; resetAt: number }>();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 20;

const checkAuthRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }
  if (entry.count >= AUTH_MAX_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
};

const sendJson = (res: ServerResponse, statusCode: number, data: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const readJsonBody = async (req: VercelReq): Promise<Record<string, unknown>> => {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export default async function handler(req: VercelReq, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { valid: false, error: 'Method not allowed' });
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!checkAuthRateLimit(clientIp)) {
    return sendJson(res, 429, {
      valid: false,
      error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.',
    });
  }

  const body = await readJsonBody(req);
  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return sendJson(res, 400, { valid: false, error: 'Invalid credentials payload' });
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser !== 'superadmin' && cleanUser !== 'bmtdanainsani@gmail.com') {
    return sendJson(res, 401, { valid: false });
  }

  if (!verifySuperadminPassword(password.trim())) {
    return sendJson(res, 401, { valid: false });
  }

  authAttempts.delete(clientIp);
  return sendJson(res, 200, { valid: true });
}
