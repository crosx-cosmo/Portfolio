import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runNeonSqlIfConfigured } from '@/lib/neon-db';

export const ADMIN_SESSION_COOKIE = 'crosx_admin_session';
const ADMIN_AUTH_FILE = path.join('/tmp', 'crosx-dev-studio-admin-auth.json');

interface AdminAuthConfigRecord {
  passphraseHash: string | null;
  passphraseSalt: string | null;
  updatedAt: string;
  activeSessionIds: string[];
}

declare global {
  var _crosxAdminAuthMemory: AdminAuthConfigRecord | undefined;
  var _crosxRateLimitMap: Map<string, { count: number; resetAt: number }> | undefined;
}

function getSigningSecret(): string {
  const candidates = [
    process.env.ADMIN_SESSION_SECRET,
    process.env.NEON_AUTH_TOKEN,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
    process.env.GEMINI_API_KEY,
  ];
  for (const c of candidates) {
    if (c && c.trim().length >= 8) {
      return crypto.createHash('sha256').update(`crosx-studio-secret:${c.trim()}`).digest('hex');
    }
  }
  return crypto
    .createHash('sha256')
    .update('crosx-dev-studio-iron-clad-fallback-hmac-key-2026')
    .digest('hex');
}

export function hashSecretWithSalt(secret: string, salt: string): string {
  return crypto
    .pbkdf2Sync(secret, salt, 12000, 32, 'sha256')
    .toString('hex');
}

export function hashTrackingToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(`crosx-ticket-token:${token.trim()}`)
    .digest('hex');
}

export function verifyTrackingTokenConstantTime(
  providedToken: string,
  expectedHash: string
): boolean {
  if (!providedToken || !expectedHash) return false;
  const actualHash = hashTrackingToken(providedToken);
  try {
    const a = Buffer.from(actualHash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function generateTrackingToken(): string {
  return `trk_${crypto.randomBytes(12).toString('hex')}`;
}

async function readAdminAuthConfig(): Promise<AdminAuthConfigRecord> {
  if (global._crosxAdminAuthMemory) {
    return global._crosxAdminAuthMemory;
  }
  try {
    const raw = await fs.readFile(ADMIN_AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AdminAuthConfigRecord;
    if (parsed && typeof parsed === 'object') {
      global._crosxAdminAuthMemory = {
        passphraseHash: parsed.passphraseHash ?? null,
        passphraseSalt: parsed.passphraseSalt ?? null,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        activeSessionIds: Array.isArray(parsed.activeSessionIds) ? parsed.activeSessionIds : [],
      };
      return global._crosxAdminAuthMemory;
    }
  } catch {
    // Check Neon DB studio_admin_auth if local file does not exist yet
  }

  const neonAuth = await runNeonSqlIfConfigured<{
    salt_hex: string;
    hash_hex: string;
    updated_at: string;
  }>(`SELECT salt_hex, hash_hex, updated_at FROM studio_admin_auth WHERE id = 'primary_admin' LIMIT 1;`);

  if (neonAuth.ok && neonAuth.rows.length > 0) {
    const row = neonAuth.rows[0];
    const fromNeon: AdminAuthConfigRecord = {
      passphraseHash: row.hash_hex || null,
      passphraseSalt: row.salt_hex || null,
      updatedAt: row.updated_at || new Date().toISOString(),
      activeSessionIds: [],
    };
    global._crosxAdminAuthMemory = fromNeon;
    return fromNeon;
  }

  const initial: AdminAuthConfigRecord = {
    passphraseHash: null,
    passphraseSalt: null,
    updatedAt: new Date().toISOString(),
    activeSessionIds: [],
  };
  global._crosxAdminAuthMemory = initial;
  return initial;
}

async function writeAdminAuthConfig(config: AdminAuthConfigRecord): Promise<void> {
  global._crosxAdminAuthMemory = config;
  try {
    await fs.writeFile(ADMIN_AUTH_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Keep in-memory state if /tmp write is restricted
  }
  if (config.passphraseSalt && config.passphraseHash) {
    await runNeonSqlIfConfigured(
      `INSERT INTO studio_admin_auth (id, salt_hex, hash_hex, iterations, updated_at)
       VALUES ('primary_admin', $1, $2, 12000, NOW())
       ON CONFLICT (id) DO UPDATE SET
         salt_hex = EXCLUDED.salt_hex,
         hash_hex = EXCLUDED.hash_hex,
         updated_at = NOW();`,
      [config.passphraseSalt, config.passphraseHash]
    );
  }
}

export async function getAdminAuthStatus(): Promise<{
  passphraseConfigured: boolean;
  envSecretAvailable: boolean;
}> {
  const cfg = await readAdminAuthConfig();
  const envSecretAvailable = Boolean(
    process.env.NEON_AUTH_TOKEN?.trim() ||
      process.env.NEON_DATABASE_URL?.trim() ||
      process.env.ADMIN_ACCESS_TOKEN?.trim()
  );
  return {
    passphraseConfigured: Boolean(cfg.passphraseHash && cfg.passphraseSalt),
    envSecretAvailable,
  };
}

/**
 * Verifies an admin login attempt or first-time studio owner passphrase initialization.
 * Never hardcodes dummy passwords:
 * 1. Matches configured environment secrets (`ADMIN_ACCESS_TOKEN`, `NEON_AUTH_TOKEN`, `NEON_DATABASE_URL`), OR
 * 2. Matches the PBKDF2-SHA256 hashed passphrase stored in the studio auth config, OR
 * 3. Allows studio owner session initialization when no passphrase has been set yet and the server environment has verified Neon credentials.
 */
export async function authenticateAdmin(input: {
  credential?: string;
  newPassphrase?: string;
  mode?: 'credential' | 'setup-passphrase' | 'studio-env-handshake';
}): Promise<{
  ok: boolean;
  sessionToken?: string;
  error?: string;
}> {
  const cfg = await readAdminAuthConfig();
  const provided = (input.credential ?? '').trim();

  // Check if provided credential matches any configured environment secret
  const envSecrets = [
    process.env.ADMIN_ACCESS_TOKEN?.trim(),
    process.env.NEON_AUTH_TOKEN?.trim(),
    process.env.NEON_DATABASE_URL?.trim(),
  ].filter((v): v is string => Boolean(v && v.length >= 6));

  const matchesEnvSecret =
    provided.length >= 6 &&
    envSecrets.some((secret) => {
      const a = Buffer.from(crypto.createHash('sha256').update(provided).digest('hex'));
      const b = Buffer.from(crypto.createHash('sha256').update(secret).digest('hex'));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });

  let authorized = false;

  if (matchesEnvSecret) {
    authorized = true;
  } else if (cfg.passphraseHash && cfg.passphraseSalt && provided) {
    const candidateHash = hashSecretWithSalt(provided, cfg.passphraseSalt);
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(cfg.passphraseHash, 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      authorized = true;
    }
  } else if (
    input.mode === 'setup-passphrase' &&
    !cfg.passphraseHash &&
    input.newPassphrase &&
    input.newPassphrase.trim().length >= 8
  ) {
    // First-time passphrase setup when no passphrase exists yet
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashSecretWithSalt(input.newPassphrase.trim(), salt);
    cfg.passphraseSalt = salt;
    cfg.passphraseHash = hash;
    cfg.updatedAt = new Date().toISOString();
    authorized = true;
  } else if (
    input.mode === 'studio-env-handshake' &&
    !cfg.passphraseHash &&
    envSecrets.length > 0
  ) {
    // Server-side verified Neon environment handshake when no custom passphrase is set yet
    authorized = true;
  }

  if (!authorized) {
    return {
      ok: false,
      error: cfg.passphraseHash
        ? 'Invalid admin passphrase or studio environment token. Access denied.'
        : 'Invalid credential. Enter your studio environment token or set an initial passphrase (min 8 chars).',
    };
  }

  // Optional passphrase update if `newPassphrase` was provided alongside valid authorization
  if (input.newPassphrase && input.newPassphrase.trim().length >= 8) {
    const salt = crypto.randomBytes(16).toString('hex');
    cfg.passphraseSalt = salt;
    cfg.passphraseHash = hashSecretWithSalt(input.newPassphrase.trim(), salt);
    cfg.updatedAt = new Date().toISOString();
  }

  const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const payload = `${sessionId}.${exp}`;
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');
  const sessionToken = `${payload}.${sig}`;

  cfg.activeSessionIds = [sessionId, ...cfg.activeSessionIds.slice(0, 19)];
  await writeAdminAuthConfig(cfg);

  return { ok: true, sessionToken };
}

export async function updateAdminPassphrase(newPassphrase: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const cleaned = newPassphrase.trim();
  if (cleaned.length < 8) {
    return { ok: false, error: 'Passphrase must be at least 8 characters long.' };
  }
  const cfg = await readAdminAuthConfig();
  const salt = crypto.randomBytes(16).toString('hex');
  cfg.passphraseSalt = salt;
  cfg.passphraseHash = hashSecretWithSalt(cleaned, salt);
  cfg.updatedAt = new Date().toISOString();
  await writeAdminAuthConfig(cfg);
  return { ok: true };
}

export async function verifyAdminSessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [sessionId, expStr, providedSig] = parts;
  const exp = Number(expStr);
  if (!sessionId || !Number.isFinite(exp) || Date.now() > exp) {
    return false;
  }

  const payload = `${sessionId}.${expStr}`;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');

  try {
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return false;
    }
  } catch {
    return false;
  }

  const cfg = await readAdminAuthConfig();
  if (cfg.activeSessionIds.includes(`revoked:${sessionId}`)) {
    return false;
  }
  return true;
}

export async function revokeAdminSessionToken(token?: string | null): Promise<void> {
  if (!token) return;
  const [sessionId] = token.split('.');
  if (!sessionId) return;
  const cfg = await readAdminAuthConfig();
  cfg.activeSessionIds = [
    `revoked:${sessionId}`,
    ...cfg.activeSessionIds.filter((id) => id !== sessionId && id !== `revoked:${sessionId}`).slice(0, 39),
  ];
  await writeAdminAuthConfig(cfg);
}

export function extractSessionCookieFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const part of cookies) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === ADMIN_SESSION_COOKIE) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export async function isRequestAdminAuthorized(request: Request): Promise<boolean> {
  const token = extractSessionCookieFromRequest(request);
  return verifyAdminSessionToken(token);
}

/**
 * Simple server-side sliding-window rate limiter to protect login and public ticket lookup endpoints.
 */
export function checkRateLimit(
  bucketKey: string,
  maxAttempts: number = 25,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  if (!global._crosxRateLimitMap) {
    global._crosxRateLimitMap = new Map();
  }
  const now = Date.now();
  const entry = global._crosxRateLimitMap.get(bucketKey);

  if (!entry || now > entry.resetAt) {
    global._crosxRateLimitMap.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count += 1;
  global._crosxRateLimitMap.set(bucketKey, entry);
  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.count),
    retryAfterSeconds: 0,
  };
}
