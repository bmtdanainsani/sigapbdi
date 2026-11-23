import crypto from 'crypto';

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

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ valid: false, error: 'Method not allowed' }, { status: 405 });
  }

  const forwarded = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0]?.trim() || 'unknown';

  if (!checkAuthRateLimit(clientIp)) {
    return Response.json(
      {
        valid: false,
        error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.',
      },
      { status: 429 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ valid: false, error: 'Invalid credentials payload' }, { status: 400 });
  }

  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return Response.json({ valid: false, error: 'Invalid credentials payload' }, { status: 400 });
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser !== 'superadmin' && cleanUser !== 'bmtdanainsani@gmail.com') {
    return Response.json({ valid: false }, { status: 401 });
  }

  if (!verifySuperadminPassword(password.trim())) {
    return Response.json({ valid: false }, { status: 401 });
  }

  authAttempts.delete(clientIp);
  return Response.json({ valid: true });
};
