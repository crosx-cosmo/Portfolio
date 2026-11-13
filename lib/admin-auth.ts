import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runNeonSqlIfConfigured } from '@/lib/neon-db';

export const ADMIN_SESSION_COOKIE = 'crosx_admin_session';
export const BETTER_AUTH_SESSION_COOKIE = 'better-auth.session_token';
const NEON_AUTH_STORAGE_FILE = path.join('/tmp', 'crosx-dev-studio-neon-auth.json');

export interface NeonAuthUserRecord {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: 'admin';
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NeonAuthAccountRecord {
  id: string;
  accountId: string;
  providerId: 'credential';
  userId: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeonAuthSessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NeonAuthVerificationRecord {
  id: string;
  identifier: string;
  value: string;
  purpose: 'password-reset' | 'email-verification';
  expiresAt: string;
  createdAt: string;
}

interface NeonAuthStoreState {
  users: NeonAuthUserRecord[];
  accounts: NeonAuthAccountRecord[];
  sessions: NeonAuthSessionRecord[];
  verifications: NeonAuthVerificationRecord[];
  updatedAt: string;
}

declare global {
  var _crosxNeonAuthMemory: NeonAuthStoreState | undefined;
  var _crosxNeonAuthSchemaReady: boolean | undefined;
  var _crosxRateLimitMap: Map<string, { count: number; resetAt: number }> | undefined;
}

const DEFAULT_ADMIN_ALLOWLIST: Array<{ email: string; name: string }> = [
  { email: 'taskwalaconnect@gmail.com', name: 'IRON CLAD · Studio Owner' },
  { email: 'admin@crosx.in', name: 'IRON CLAD · Principal Architect' },
  { email: 'ironclad@crosx.in', name: 'IRON CLAD · Senior Project Developer' },
  { email: 'founder@crosx.in', name: 'IRON CLAD · Founder' },
];

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Returns the server-side allowlist of authorized administrator emails.
 * Combines ADMIN_ALLOWED_EMAILS environment configuration with the verified studio owner accounts.
 */
export function getAuthorizedAdminAllowlist(): string[] {
  const set = new Set<string>(DEFAULT_ADMIN_ALLOWLIST.map((a) => a.email.toLowerCase()));
  const rawEnv = process.env.ADMIN_ALLOWED_EMAILS || '';
  for (const part of rawEnv.split(',')) {
    const cleaned = part.trim().toLowerCase();
    if (cleaned && EMAIL_FORMAT_REGEX.test(cleaned)) {
      set.add(cleaned);
    }
  }
  return Array.from(set);
}

/**
 * Checks whether an email address is authorized on the server-side administrator allowlist.
 */
export function isEmailAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_FORMAT_REGEX.test(normalized)) return false;
  return getAuthorizedAdminAllowlist().includes(normalized);
}

function getSigningSecret(): string {
  const candidates = [
    process.env.NEON_AUTH_COOKIE_SECRET,
    process.env.ADMIN_SESSION_SECRET,
    process.env.NEON_AUTH_TOKEN,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
  ];
  for (const c of candidates) {
    if (c && c.trim().length >= 8) {
      return crypto.createHash('sha256').update(`crosx-neon-auth:${c.trim()}`).digest('hex');
    }
  }
  return crypto
    .createHash('sha256')
    .update('crosx-dev-studio-neon-auth-better-auth-hmac-key-2026')
    .digest('hex');
}

export function hashSecretWithSalt(secret: string, salt: string): string {
  return crypto.pbkdf2Sync(secret, salt, 12000, 32, 'sha256').toString('hex');
}

export function verifySecretWithSaltConstantTime(
  providedSecret: string,
  salt: string,
  expectedHash: string
): boolean {
  if (!providedSecret || !salt || !expectedHash) return false;
  try {
    const candidateHash = hashSecretWithSalt(providedSecret, salt);
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
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

export function getNeonAuthUpstreamUrl(): string | null {
  const raw =
    process.env.NEON_AUTH_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_NEON_AUTH_URL?.trim() ||
    '';
  if (!raw || !raw.startsWith('http')) return null;
  return raw.replace(/\/+$/, '');
}

async function ensureNeonAuthDatabaseTables(): Promise<void> {
  if (global._crosxNeonAuthSchemaReady) return;
  const res = await runNeonSqlIfConfigured(`
    CREATE SCHEMA IF NOT EXISTS neon_auth;
    CREATE TABLE IF NOT EXISTS neon_auth."user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      banned BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS neon_auth."account" (
      id TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL DEFAULT 'credential',
      "userId" TEXT NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
      password TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("providerId", "accountId")
    );
    CREATE TABLE IF NOT EXISTS neon_auth."session" (
      id TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      token TEXT UNIQUE NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS neon_auth."verification" (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  if (res.ok) {
    global._crosxNeonAuthSchemaReady = true;
  }
}

async function syncUserAndAccountToNeonDb(
  user: NeonAuthUserRecord,
  account: NeonAuthAccountRecord
): Promise<void> {
  await ensureNeonAuthDatabaseTables();
  await runNeonSqlIfConfigured(
    `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", image, role, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       "emailVerified" = EXCLUDED."emailVerified",
       role = EXCLUDED.role,
       "updatedAt" = EXCLUDED."updatedAt";`,
    [
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.image,
      user.role,
      user.banned,
      user.createdAt,
      user.updatedAt,
    ]
  );

  const packedPassword = `${account.passwordSalt}:${account.passwordHash}`;
  await runNeonSqlIfConfigured(
    `INSERT INTO neon_auth."account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $3, $4, $5, $6)
     ON CONFLICT ("providerId", "accountId") DO UPDATE SET
       password = EXCLUDED.password,
       "updatedAt" = EXCLUDED."updatedAt";`,
    [
      account.id,
      account.accountId,
      user.id,
      packedPassword,
      account.createdAt,
      account.updatedAt,
    ]
  );
}

async function syncSessionToNeonDb(session: NeonAuthSessionRecord): Promise<void> {
  await ensureNeonAuthDatabaseTables();
  await runNeonSqlIfConfigured(
    `INSERT INTO neon_auth."session" (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (token) DO UPDATE SET
       "expiresAt" = EXCLUDED."expiresAt",
       "updatedAt" = EXCLUDED."updatedAt";`,
    [
      session.id,
      session.expiresAt,
      session.token,
      session.createdAt,
      session.updatedAt,
      session.ipAddress,
      session.userAgent,
      session.userId,
    ]
  );
}

function buildInitialNeonAuthState(): NeonAuthStoreState {
  const now = new Date().toISOString();
  const users: NeonAuthUserRecord[] = [];
  const accounts: NeonAuthAccountRecord[] = [];

  const envBootstrapSecret =
    process.env.ADMIN_ACCESS_TOKEN?.trim() ||
    process.env.NEON_AUTH_TOKEN?.trim() ||
    crypto.randomBytes(24).toString('hex');

  for (let i = 0; i < DEFAULT_ADMIN_ALLOWLIST.length; i++) {
    const entry = DEFAULT_ADMIN_ALLOWLIST[i];
    const userId = `usr_crosx_admin_${i + 1}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashSecretWithSalt(envBootstrapSecret, salt);

    users.push({
      id: userId,
      name: entry.name,
      email: entry.email.toLowerCase(),
      emailVerified: true,
      image: null,
      role: 'admin',
      banned: false,
      createdAt: now,
      updatedAt: now,
    });

    accounts.push({
      id: `acc_crosx_admin_${i + 1}`,
      accountId: entry.email.toLowerCase(),
      providerId: 'credential',
      userId,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    users,
    accounts,
    sessions: [],
    verifications: [],
    updatedAt: now,
  };
}

async function loadNeonAuthState(): Promise<NeonAuthStoreState> {
  if (global._crosxNeonAuthMemory) {
    return global._crosxNeonAuthMemory;
  }

  try {
    const raw = await fs.readFile(NEON_AUTH_STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as NeonAuthStoreState;
    if (
      parsed &&
      Array.isArray(parsed.users) &&
      Array.isArray(parsed.accounts) &&
      Array.isArray(parsed.sessions)
    ) {
      global._crosxNeonAuthMemory = {
        ...parsed,
        verifications: Array.isArray(parsed.verifications) ? parsed.verifications : [],
      };
      return global._crosxNeonAuthMemory;
    }
  } catch {
    // Check Neon DB neon_auth schema or initialize fresh state
  }

  const initial = buildInitialNeonAuthState();

  try {
    await ensureNeonAuthDatabaseTables();
    const [dbUsers, dbAccounts] = await Promise.all([
      runNeonSqlIfConfigured<Record<string, unknown>>(
        `SELECT * FROM neon_auth."user" WHERE role = 'admin';`
      ),
      runNeonSqlIfConfigured<Record<string, unknown>>(
        `SELECT * FROM neon_auth."account" WHERE "providerId" = 'credential';`
      ),
    ]);

    if (dbUsers.ok && dbUsers.rows.length > 0 && dbAccounts.ok && dbAccounts.rows.length > 0) {
      for (const row of dbUsers.rows) {
        const email = String(row.email || '').toLowerCase();
        if (!isEmailAuthorizedAdmin(email)) continue;
        const accRow = dbAccounts.rows.find(
          (a) => String(a.userId || a.user_id) === String(row.id)
        );
        const packed = String(accRow?.password || '');
        const [salt, hash] = packed.includes(':') ? packed.split(':') : ['', ''];
        if (salt && hash) {
          const existingUserIdx = initial.users.findIndex((u) => u.email === email);
          const userRec: NeonAuthUserRecord = {
            id: String(row.id),
            name: String(row.name || 'IRON CLAD'),
            email,
            emailVerified: Boolean(row.emailVerified ?? row.email_verified ?? true),
            image: row.image ? String(row.image) : null,
            role: 'admin',
            banned: Boolean(row.banned ?? false),
            createdAt: String(row.createdAt || new Date().toISOString()),
            updatedAt: String(row.updatedAt || new Date().toISOString()),
          };
          if (existingUserIdx >= 0) {
            initial.users[existingUserIdx] = userRec;
          } else {
            initial.users.push(userRec);
          }

          const existingAccIdx = initial.accounts.findIndex((a) => a.accountId === email);
          const accRec: NeonAuthAccountRecord = {
            id: String(accRow?.id || `acc_${userRec.id}`),
            accountId: email,
            providerId: 'credential',
            userId: userRec.id,
            passwordSalt: salt,
            passwordHash: hash,
            createdAt: String(accRow?.createdAt || new Date().toISOString()),
            updatedAt: String(accRow?.updatedAt || new Date().toISOString()),
          };
          if (existingAccIdx >= 0) {
            initial.accounts[existingAccIdx] = accRec;
          } else {
            initial.accounts.push(accRec);
          }
        }
      }
    }
  } catch {
    // Fallback to initialized memory state
  }

  global._crosxNeonAuthMemory = initial;
  await saveNeonAuthState(initial);
  return initial;
}

async function saveNeonAuthState(state: NeonAuthStoreState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  global._crosxNeonAuthMemory = state;
  try {
    await fs.writeFile(NEON_AUTH_STORAGE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Keep in-memory state if /tmp write is restricted
  }
}

function createSignedSessionToken(sessionId: string, userId: string, expMs: number): string {
  const payload = `${sessionId}.${userId}.${expMs}`;
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

function parseAndVerifySignedSessionToken(token?: string | null): {
  valid: boolean;
  sessionId?: string;
  userId?: string;
  expMs?: number;
} {
  if (!token) return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 4) return { valid: false };
  const [sessionId, userId, expStr, providedSig] = parts;
  const expMs = Number(expStr);
  if (!sessionId || !userId || !Number.isFinite(expMs) || Date.now() > expMs) {
    return { valid: false };
  }

  const payload = `${sessionId}.${userId}.${expStr}`;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');

  try {
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false };
    }
    return { valid: true, sessionId, userId, expMs };
  } catch {
    return { valid: false };
  }
}

/**
 * Authenticates an administrator via Neon Auth (Managed Better Auth) using Email & Password.
 * Enforces:
 * 1. Strict server-side administrator email allowlist (403 Forbidden for non-admin users).
 * 2. Upstream Neon Auth (/sign-in/email) verification if NEON_AUTH_BASE_URL is configured, OR
 *    constant-time PBKDF2-SHA256 verification against `neon_auth.account` in Neon PostgreSQL.
 * 3. Email verification status enforcement.
 */
export async function signInNeonAdminWithEmailPassword(input: {
  email?: string;
  password?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  ok: boolean;
  status: number;
  code?:
    | 'INVALID_INPUT'
    | 'UNAUTHORIZED_ADMIN_EMAIL'
    | 'INVALID_CREDENTIALS'
    | 'EMAIL_NOT_VERIFIED';
  error?: string;
  sessionToken?: string;
  user?: NeonAuthUserRecord;
  session?: { id: string; expiresAt: string };
}> {
  const rawEmail = (input.email ?? '').trim().toLowerCase();
  const rawPassword = input.password ?? '';

  if (!rawEmail || !EMAIL_FORMAT_REGEX.test(rawEmail)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INPUT',
      error: 'Please enter a valid administrator email address.',
    };
  }

  if (!rawPassword || rawPassword.length < 1) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INPUT',
      error: 'Please enter your administrator password.',
    };
  }

  // Server-side Admin Allowlist Enforcement (Never allow non-admin accounts)
  if (!isEmailAuthorizedAdmin(rawEmail)) {
    return {
      ok: false,
      status: 403,
      code: 'UNAUTHORIZED_ADMIN_EMAIL',
      error:
        'Access denied: This email address is not on the authorized CROSX DEV STUDIO administrator allowlist.',
    };
  }

  const state = await loadNeonAuthState();
  let user = state.users.find((u) => u.email.toLowerCase() === rawEmail);
  let account = state.accounts.find((a) => a.accountId.toLowerCase() === rawEmail);

  // If allowlisted via ADMIN_ALLOWED_EMAILS env var dynamically, ensure user record exists
  if (!user || !account) {
    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const fallbackSecret =
      process.env.ADMIN_ACCESS_TOKEN?.trim() || crypto.randomBytes(24).toString('hex');
    user = {
      id: userId,
      name: 'IRON CLAD · Authorized Admin',
      email: rawEmail,
      emailVerified: true,
      image: null,
      role: 'admin',
      banned: false,
      createdAt: now,
      updatedAt: now,
    };
    account = {
      id: `acc_${crypto.randomBytes(8).toString('hex')}`,
      accountId: rawEmail,
      providerId: 'credential',
      userId,
      passwordSalt: salt,
      passwordHash: hashSecretWithSalt(fallbackSecret, salt),
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(user);
    state.accounts.push(account);
    await saveNeonAuthState(state);
  }

  // Check upstream Managed Better Auth endpoint if NEON_AUTH_BASE_URL is configured
  const upstreamUrl = getNeonAuthUpstreamUrl();
  let verifiedByUpstream = false;

  if (upstreamUrl) {
    try {
      const upstreamRes = await fetch(`${upstreamUrl}/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rawEmail, password: rawPassword }),
        cache: 'no-store',
      });
      if (upstreamRes.ok) {
        verifiedByUpstream = true;
      }
    } catch {
      // Fall back to neon_auth database table credential check
    }
  }

  const verifiedByHash = verifySecretWithSaltConstantTime(
    rawPassword,
    account.passwordSalt,
    account.passwordHash
  );

  if (!verifiedByUpstream && !verifiedByHash) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      error:
        'Invalid email or password. Please verify your credentials or use Forgot Password to reset your Neon Auth administrator password.',
    };
  }

  if (!user.emailVerified) {
    return {
      ok: false,
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Email verification is required before accessing the Admin Console.',
    };
  }

  const now = new Date();
  const expMs = now.getTime() + 1000 * 60 * 60 * 12; // 12 hours
  const expiresAt = new Date(expMs).toISOString();
  const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
  const sessionToken = createSignedSessionToken(sessionId, user.id, expMs);

  const sessionRecord: NeonAuthSessionRecord = {
    id: sessionId,
    userId: user.id,
    token: sessionToken,
    expiresAt,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  state.sessions = [
    sessionRecord,
    ...state.sessions
      .filter((s) => new Date(s.expiresAt).getTime() > Date.now())
      .slice(0, 29),
  ];

  await saveNeonAuthState(state);
  await syncUserAndAccountToNeonDb(user, account);
  await syncSessionToNeonDb(sessionRecord);

  return {
    ok: true,
    status: 200,
    sessionToken,
    user,
    session: {
      id: sessionRecord.id,
      expiresAt: sessionRecord.expiresAt,
    },
  };
}

/**
 * Initiates a Neon Auth (Managed Better Auth) Forgot Password / Password Reset request
 * or Email Verification token dispatch for an allowlisted administrator email.
 * Rejects non-allowlisted emails immediately.
 */
export async function requestNeonAdminVerificationToken(input: {
  email?: string;
  purpose?: 'password-reset' | 'email-verification';
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  message?: string;
  verificationCode?: string;
  expiresAt?: string;
}> {
  const rawEmail = (input.email ?? '').trim().toLowerCase();
  const purpose = input.purpose ?? 'password-reset';

  if (!rawEmail || !EMAIL_FORMAT_REGEX.test(rawEmail)) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter a valid administrator email address.',
    };
  }

  if (!isEmailAuthorizedAdmin(rawEmail)) {
    return {
      ok: false,
      status: 403,
      error:
        'Access denied: Password reset and verification are restricted to authorized CROSX DEV STUDIO administrators.',
    };
  }

  const state = await loadNeonAuthState();
  const code = `NATH-${crypto.randomInt(100000, 999999)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 15).toISOString(); // 15 minutes

  const record: NeonAuthVerificationRecord = {
    id: `ver_${crypto.randomBytes(10).toString('hex')}`,
    identifier: rawEmail,
    value: code,
    purpose,
    expiresAt,
    createdAt: now.toISOString(),
  };

  state.verifications = [
    record,
    ...state.verifications.filter(
      (v) =>
        !(v.identifier === rawEmail && v.purpose === purpose) &&
        new Date(v.expiresAt).getTime() > Date.now()
    ),
  ];
  await saveNeonAuthState(state);

  await ensureNeonAuthDatabaseTables();
  await runNeonSqlIfConfigured(
    `INSERT INTO neon_auth."verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $5);`,
    [record.id, rawEmail, code, expiresAt, now.toISOString()]
  );

  // Also trigger upstream Neon Auth forget-password if configured
  const upstreamUrl = getNeonAuthUpstreamUrl();
  if (upstreamUrl && purpose === 'password-reset') {
    try {
      await fetch(`${upstreamUrl}/forget-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rawEmail, redirectTo: '/admin' }),
      });
    } catch {
      // Handled by neon_auth.verification table
    }
  }

  return {
    ok: true,
    status: 200,
    message:
      purpose === 'password-reset'
        ? `Neon Auth password reset verification code generated for ${rawEmail}.`
        : `Neon Auth email verification code generated for ${rawEmail}.`,
    verificationCode: code,
    expiresAt,
  };
}

/**
 * Completes a Neon Auth Password Reset using a valid verification token from `neon_auth.verification`.
 * Hashes the new password with PBKDF2-SHA256, updates `neon_auth.account`, marks `emailVerified = true`,
 * and revokes all prior sessions for security.
 */
export async function resetNeonAdminPasswordWithToken(input: {
  email?: string;
  verificationCode?: string;
  newPassword?: string;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  message?: string;
}> {
  const rawEmail = (input.email ?? '').trim().toLowerCase();
  const rawCode = (input.verificationCode ?? '').trim().toUpperCase();
  const newPassword = (input.newPassword ?? '').trim();

  if (!rawEmail || !EMAIL_FORMAT_REGEX.test(rawEmail)) {
    return { ok: false, status: 400, error: 'Valid administrator email is required.' };
  }

  if (!isEmailAuthorizedAdmin(rawEmail)) {
    return {
      ok: false,
      status: 403,
      error: 'Access denied: Email is not on the authorized administrator allowlist.',
    };
  }

  if (!rawCode) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter your Neon Auth verification code.',
    };
  }

  if (newPassword.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'New password must be at least 8 characters long.',
    };
  }

  const state = await loadNeonAuthState();
  const matchingVerification = state.verifications.find(
    (v) =>
      v.identifier.toLowerCase() === rawEmail &&
      v.value.toUpperCase() === rawCode &&
      new Date(v.expiresAt).getTime() > Date.now()
  );

  if (!matchingVerification) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid or expired Neon Auth verification code. Please request a new code.',
    };
  }

  const now = new Date().toISOString();
  let user = state.users.find((u) => u.email.toLowerCase() === rawEmail);
  if (!user) {
    user = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      name: 'IRON CLAD · Principal Architect',
      email: rawEmail,
      emailVerified: true,
      image: null,
      role: 'admin',
      banned: false,
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(user);
  } else {
    user.emailVerified = true;
    user.updatedAt = now;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashSecretWithSalt(newPassword, salt);

  let account = state.accounts.find((a) => a.accountId.toLowerCase() === rawEmail);
  if (!account) {
    account = {
      id: `acc_${crypto.randomBytes(8).toString('hex')}`,
      accountId: rawEmail,
      providerId: 'credential',
      userId: user.id,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    };
    state.accounts.push(account);
  } else {
    account.passwordSalt = salt;
    account.passwordHash = hash;
    account.updatedAt = now;
  }

  // Consume verification token and invalidate prior sessions for this user
  state.verifications = state.verifications.filter((v) => v.id !== matchingVerification.id);
  state.sessions = state.sessions.filter((s) => s.userId !== user.id);

  await saveNeonAuthState(state);
  await syncUserAndAccountToNeonDb(user, account);
  await runNeonSqlIfConfigured(
    `DELETE FROM neon_auth."verification" WHERE id = $1;`,
    [matchingVerification.id]
  );

  // Also ensure the allowlisted admin account is provisioned in upstream Managed Better Auth if configured
  const upstreamUrl = getNeonAuthUpstreamUrl();
  if (upstreamUrl) {
    try {
      await fetch(`${upstreamUrl}/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name || 'IRON CLAD · Principal Architect',
          email: rawEmail,
          password: newPassword,
        }),
        cache: 'no-store',
      });
    } catch {
      // Upstream already provisioned or handled by neon_auth schema
    }
  }

  return {
    ok: true,
    status: 200,
    message:
      'Administrator password updated and email verified in Neon Auth. You may now sign in.',
  };
}

/**
 * Verifies an admin email address using a code from `neon_auth.verification`.
 */
export async function verifyNeonAdminEmailToken(input: {
  email?: string;
  verificationCode?: string;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  message?: string;
}> {
  const rawEmail = (input.email ?? '').trim().toLowerCase();
  const rawCode = (input.verificationCode ?? '').trim().toUpperCase();

  if (!isEmailAuthorizedAdmin(rawEmail)) {
    return {
      ok: false,
      status: 403,
      error: 'Access denied: Email is not an authorized administrator.',
    };
  }

  const state = await loadNeonAuthState();
  const match = state.verifications.find(
    (v) =>
      v.identifier.toLowerCase() === rawEmail &&
      v.value.toUpperCase() === rawCode &&
      new Date(v.expiresAt).getTime() > Date.now()
  );

  if (!match) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid or expired verification code.',
    };
  }

  const user = state.users.find((u) => u.email.toLowerCase() === rawEmail);
  if (user) {
    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();
  }
  state.verifications = state.verifications.filter((v) => v.id !== match.id);
  await saveNeonAuthState(state);

  return {
    ok: true,
    status: 200,
    message: `Email ${rawEmail} verified in Neon Auth.`,
  };
}

/**
 * Updates the password for the currently authenticated administrator.
 */
export async function updateAuthenticatedAdminPassword(input: {
  email: string;
  currentPassword?: string;
  newPassword: string;
}): Promise<{
  ok: boolean;
  error?: string;
}> {
  const cleanedNew = (input.newPassword ?? '').trim();
  if (cleanedNew.length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters long.' };
  }

  const rawEmail = input.email.trim().toLowerCase();
  if (!isEmailAuthorizedAdmin(rawEmail)) {
    return { ok: false, error: 'Unauthorized administrator account.' };
  }

  const state = await loadNeonAuthState();
  const user = state.users.find((u) => u.email.toLowerCase() === rawEmail);
  const account = state.accounts.find((a) => a.accountId.toLowerCase() === rawEmail);

  if (!user || !account) {
    return { ok: false, error: 'Administrator account not found in Neon Auth.' };
  }

  if (input.currentPassword && input.currentPassword.trim()) {
    const validCurrent = verifySecretWithSaltConstantTime(
      input.currentPassword,
      account.passwordSalt,
      account.passwordHash
    );
    if (!validCurrent) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
  }

  const salt = crypto.randomBytes(16).toString('hex');
  account.passwordSalt = salt;
  account.passwordHash = hashSecretWithSalt(cleanedNew, salt);
  account.updatedAt = new Date().toISOString();
  user.updatedAt = account.updatedAt;

  await saveNeonAuthState(state);
  await syncUserAndAccountToNeonDb(user, account);
  return { ok: true };
}

/**
 * Resolves the active authenticated administrator user & session from a session token.
 * Enforces both cryptographic token integrity and the server-side admin allowlist.
 */
export async function getAdminSessionFromToken(token?: string | null): Promise<{
  authenticated: boolean;
  user: NeonAuthUserRecord | null;
  session: { id: string; expiresAt: string } | null;
}> {
  const parsed = parseAndVerifySignedSessionToken(token);
  if (!parsed.valid || !parsed.sessionId || !parsed.userId || !parsed.expMs) {
    return { authenticated: false, user: null, session: null };
  }

  const state = await loadNeonAuthState();
  const sessionRec = state.sessions.find((s) => s.id === parsed.sessionId);
  if (sessionRec && new Date(sessionRec.expiresAt).getTime() <= Date.now()) {
    return { authenticated: false, user: null, session: null };
  }

  // If session was explicitly revoked on logout
  if (state.sessions.some((s) => s.id === `revoked:${parsed.sessionId}`)) {
    return { authenticated: false, user: null, session: null };
  }

  const user = state.users.find((u) => u.id === parsed.userId) ?? null;
  if (!user || user.banned || user.role !== 'admin' || !isEmailAuthorizedAdmin(user.email)) {
    return { authenticated: false, user: null, session: null };
  }

  return {
    authenticated: true,
    user,
    session: {
      id: parsed.sessionId,
      expiresAt: sessionRec?.expiresAt ?? new Date(parsed.expMs).toISOString(),
    },
  };
}

export async function verifyAdminSessionToken(token?: string | null): Promise<boolean> {
  const resolved = await getAdminSessionFromToken(token);
  return resolved.authenticated;
}

export async function revokeAdminSessionToken(token?: string | null): Promise<void> {
  if (!token) return;
  const parsed = parseAndVerifySignedSessionToken(token);
  if (!parsed.sessionId) return;

  const state = await loadNeonAuthState();
  state.sessions = [
    {
      id: `revoked:${parsed.sessionId}`,
      userId: parsed.userId || 'revoked',
      token: `revoked_${parsed.sessionId}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...state.sessions.filter((s) => s.id !== parsed.sessionId),
  ];
  await saveNeonAuthState(state);
  await runNeonSqlIfConfigured(`DELETE FROM neon_auth."session" WHERE id = $1;`, [
    parsed.sessionId,
  ]);
}

export function extractSessionCookieFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const part of cookies) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === ADMIN_SESSION_COOKIE || rawName === BETTER_AUTH_SESSION_COOKIE) {
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
 * Server-side sliding-window rate limiter to protect login, password reset, and public ticket lookup endpoints.
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
