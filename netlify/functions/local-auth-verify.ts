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

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
}

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { valid: false, error: 'Method not allowed' });
  }

  let parsedBody: Record<string, unknown> = {};
  if (event.body) {
    try {
      parsedBody = JSON.parse(event.body) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { valid: false, error: 'Invalid JSON payload' });
    }
  }

  const username = parsedBody.username;
  const password = parsedBody.password;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return jsonResponse(400, { valid: false, error: 'Invalid credentials payload' });
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser !== 'superadmin' && cleanUser !== 'bmtdanainsani@gmail.com') {
    return jsonResponse(401, { valid: false });
  }

  if (!verifySuperadminPassword(password.trim())) {
    return jsonResponse(401, { valid: false });
  }

  return jsonResponse(200, { valid: true });
};
