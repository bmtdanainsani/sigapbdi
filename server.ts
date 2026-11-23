import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getStaffUsers,
  upsertStaffUser,
  deleteStaffUser,
} from './src/db/users.ts';
import {
  listApplications,
  upsertApplication,
  deleteApplicationById,
  deleteAllApplicationsInDb,
  listAuditLogs,
  insertAuditLog,
  listNotifications,
  upsertNotification,
  deleteNotificationById,
  getScoringConfigById,
  upsertScoringConfig,
  getAppSettingsById,
  upsertAppSettings,
  listQuestions,
  replaceQuestions,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getArgValue = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return eq ? eq.slice(flag.length + 1) : undefined;
};

const cliPort = Number(getArgValue('--port'));
const PORT =
  (Number.isFinite(cliPort) && cliPort > 0 ? cliPort : undefined) ??
  (Number(process.env.PORT) || 3000);
const HOST = getArgValue('--host') || '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '15mb' }));

const hasCloudSql = Boolean(
  process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER
);

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

// Lightweight in-memory rate limiter for local superadmin verification
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', cloudSqlEnabled: hasCloudSql });
});

app.post('/api/local-auth/verify', (req, res) => {
  const clientIp = req.ip || 'unknown';
  if (!checkAuthRateLimit(clientIp)) {
    return res.status(429).json({
      valid: false,
      error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.',
    });
  }

  const { username, password } = req.body ?? {};
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
  authAttempts.delete(clientIp);
  return res.json({ valid: true });
});

app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const email = req.user!.email || `${uid}@firebase.local`;
  const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;

  if (!hasCloudSql) {
    return res.json({
      user: { uid, email, name: name || email.split('@')[0] },
      cloudSqlEnabled: false,
    });
  }

  try {
    const user = await getOrCreateUser(uid, email, name);
    res.json({ user, cloudSqlEnabled: true });
  } catch (error: any) {
    console.warn('Cloud SQL sync unavailable during /api/auth/sync, continuing with Firestore:', error?.message || error);
    res.json({
      user: { uid, email, name: name || email.split('@')[0] },
      cloudSqlEnabled: false,
    });
  }
});

app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) {
    return res.json({
      cloudSqlEnabled: false,
      users: [],
      applications: [],
      auditLogs: [],
      notifications: [],
      scoringConfig: null,
      appSettings: null,
      questions: [],
    });
  }

  try {
    const uid = req.user!.uid;
    const email = req.user!.email || `${uid}@firebase.local`;
    const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
    await getOrCreateUser(uid, email, name);

    const [
      staffUsers,
      applications,
      auditLogs,
      notifications,
      scoringConfig,
      appSettings,
      questions,
    ] = await Promise.all([
      getStaffUsers(),
      listApplications(),
      listAuditLogs(),
      listNotifications(),
      getScoringConfigById(),
      getAppSettingsById(),
      listQuestions(),
    ]);

    res.json({
      cloudSqlEnabled: true,
      users: staffUsers,
      applications,
      auditLogs,
      notifications,
      scoringConfig,
      appSettings,
      questions,
    });
  } catch (error: any) {
    console.warn('Cloud SQL bootstrap unavailable, falling back to Firestore:', error?.message || error);
    res.json({
      cloudSqlEnabled: false,
      users: [],
      applications: [],
      auditLogs: [],
      notifications: [],
      scoringConfig: null,
      appSettings: null,
      questions: [],
    });
  }
});

app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json([]);
  try {
    const staffUsers = await getStaffUsers();
    res.json(staffUsers);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

app.put('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await upsertStaffUser({ ...req.body, id: req.params.id });
    res.json(saved);
  } catch (error: any) {
    console.error('Failed to save user:', error);
    res.status(500).json({ error: error.message || 'Failed to save user' });
  }
});

app.delete('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ deleted: true, cloudSqlEnabled: false });
  try {
    await deleteStaffUser(String(req.params.id));
    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

app.get('/api/applications', requireAuth, async (_req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json([]);
  try {
    const apps = await listApplications();
    res.json(apps);
  } catch (error: any) {
    console.error('Failed to fetch applications:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch applications' });
  }
});

app.put('/api/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await upsertApplication(
      { ...req.body, id: req.params.id },
      req.user?.uid
    );
    res.json(saved);
  } catch (error: any) {
    console.error('Failed to save application:', error);
    res.status(500).json({ error: error.message || 'Failed to save application' });
  }
});

app.delete('/api/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ deleted: true, cloudSqlEnabled: false });
  try {
    await deleteApplicationById(String(req.params.id));
    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Failed to delete application:', error);
    res.status(500).json({ error: error.message || 'Failed to delete application' });
  }
});

app.delete('/api/applications', requireAuth, async (_req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ deleted: true, cloudSqlEnabled: false });
  try {
    await deleteAllApplicationsInDb();
    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Failed to clear applications:', error);
    res.status(500).json({ error: error.message || 'Failed to clear applications' });
  }
});

app.post('/api/audit-logs', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await insertAuditLog(req.body);
    res.json(saved || { ok: true });
  } catch (error: any) {
    console.error('Failed to insert audit log:', error);
    res.status(500).json({ error: error.message || 'Failed to save audit log' });
  }
});

app.put('/api/notifications/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await upsertNotification({ ...req.body, id: req.params.id });
    res.json(saved);
  } catch (error: any) {
    console.error('Failed to save notification:', error);
    res.status(500).json({ error: error.message || 'Failed to save notification' });
  }
});

app.delete('/api/notifications/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ deleted: true, cloudSqlEnabled: false });
  try {
    await deleteNotificationById(String(req.params.id));
    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Failed to delete notification:', error);
    res.status(500).json({ error: error.message || 'Failed to delete notification' });
  }
});

app.put('/api/scoring-config', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await upsertScoringConfig(req.body);
    res.json(saved);
  } catch (error: any) {
    console.error('Failed to save scoring config:', error);
    res.status(500).json({ error: error.message || 'Failed to save scoring config' });
  }
});

app.put('/api/app-settings', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await upsertAppSettings(req.body);
    res.json(saved);
  } catch (error: any) {
    console.error('Failed to save app settings:', error);
    res.status(500).json({ error: error.message || 'Failed to save app settings' });
  }
});

app.put('/api/questions', requireAuth, async (req: AuthRequest, res) => {
  if (!hasCloudSql) return res.json({ ok: true, cloudSqlEnabled: false });
  try {
    const saved = await replaceQuestions(Array.isArray(req.body?.questions) ? req.body.questions : []);
    res.json(saved);
  } catch (error: any) {
    console.error('Failed to save questions:', error);
    res.status(500).json({ error: error.message || 'Failed to save questions' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distIndexPath));

  if (!isProduction) {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      })
    );
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
    vitePromise.catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err);
      process.exit(1);
    });
  } else {
    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        index: false,
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(distIndexPath);
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
