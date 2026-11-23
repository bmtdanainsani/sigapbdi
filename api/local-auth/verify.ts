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

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }

  let parsedBody: Record<string, unknown> = {};
  if (typeof req.body === 'string') {
    try {
      parsedBody = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return res.status(400).json({ valid: false, error: 'Invalid JSON payload' });
    }
  } else if (req.body && typeof req.body === 'object') {
    parsedBody = req.body as Record<string, unknown>;
  }

  const username = parsedBody.username;
  const password = parsedBody.password;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ valid: false, error: 'Invalid credentials payload' });
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser !== 'superadmin' && cleanUser !== 'bmtdanainsani@gmail.com') {
    return res.status(401).json({ valid: false });
  }

  if (!verifySuperadminPassword(password.trim())) {
    return res.status(401).json({ valid: false });
  }

  return res.status(200).json({ valid: true });
}
