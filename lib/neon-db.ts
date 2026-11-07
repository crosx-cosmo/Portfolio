import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectInquiryRecord } from '@/lib/inquiry-validator';

const STORAGE_FILE = path.join('/tmp', 'crosx-dev-studio-inquiries.json');

export interface NeonConnectionTelemetry {
  configured: boolean;
  secretKeyUsed: 'NEON_DATABASE_URL' | 'DATABASE_URL' | 'POSTGRES_URL' | 'NONE';
  protocolMode: 'neon-serverless-sql' | 'neon-data-api-rest-v1' | 'local-fallback';
  maskedEndpoint: string;
  region: string;
  databaseName: string;
  gatewayReachable: boolean;
  neonRequestId: string | null;
}

declare global {
  var _crosxInquiriesMemory: ProjectInquiryRecord[] | undefined;
  var _neonTableInitialized: boolean | undefined;
  var _lastNeonTelemetry: NeonConnectionTelemetry | undefined;
}

/**
 * Normalizes a raw Neon environment secret string (stripping optional `psql` command wrappers or quotes).
 */
export function normalizeNeonSecret(raw?: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  if (cleaned.toLowerCase().startsWith('psql ')) {
    cleaned = cleaned.slice(5).trim();
  }
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/**
 * Masks the unique endpoint identifier in a Neon hostname for safe UI telemetry display.
 */
function maskNeonHostname(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length === 0) return hostname;
  const first = parts[0];
  if (first.startsWith('ep-') && first.length > 12) {
    parts[0] = `${first.slice(0, 12)}-••••`;
  }
  return parts.join('.');
}

/**
 * Extracts AWS/GCP region from a Neon hostname (e.g. `ep-....ap-southeast-1.aws.neon.tech` -> `ap-southeast-1`).
 */
function extractNeonRegion(hostname: string): string {
  const match = hostname.match(
    /\.([a-z]{2}-[a-z]+-\d+)\.(?:aws|gcp|azure)\.neon\.tech$/i
  );
  if (match && match[1]) return match[1];
  return 'neon-cloud';
}

/**
 * Parses the configured Neon secret (`NEON_DATABASE_URL`, `DATABASE_URL`, or `POSTGRES_URL`)
 * and determines whether it is a `postgresql://` connection string or a Neon Data API (`https://.../rest/v1`) URL.
 */
export function resolveNeonConfig(): {
  configured: boolean;
  rawUrl: string;
  secretKeyUsed: 'NEON_DATABASE_URL' | 'DATABASE_URL' | 'POSTGRES_URL' | 'NONE';
  protocolMode: 'neon-serverless-sql' | 'neon-data-api-rest-v1' | 'local-fallback';
  hostname: string;
  maskedEndpoint: string;
  region: string;
  databaseName: string;
} {
  const candidates: Array<{
    key: 'NEON_DATABASE_URL' | 'DATABASE_URL' | 'POSTGRES_URL';
    val: string | undefined;
  }> = [
    { key: 'NEON_DATABASE_URL', val: process.env.NEON_DATABASE_URL },
    { key: 'DATABASE_URL', val: process.env.DATABASE_URL },
    { key: 'POSTGRES_URL', val: process.env.POSTGRES_URL },
  ];

  for (const candidate of candidates) {
    const cleaned = normalizeNeonSecret(candidate.val);
    if (
      !cleaned ||
      cleaned === 'MY_NEON_DATABASE_URL' ||
      cleaned.includes('password@ep-crosx-studio')
    ) {
      continue;
    }

    try {
      const parsed = new URL(cleaned);
      const isPostgresProtocol =
        parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
      const isHttpsNeon =
        parsed.protocol === 'https:' &&
        (parsed.hostname.endsWith('.neon.tech') || parsed.pathname.includes('/rest/v1'));

      if (!isPostgresProtocol && !isHttpsNeon) {
        continue;
      }

      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      const dbName = pathSegments[0] || 'neondb';

      return {
        configured: true,
        rawUrl: cleaned,
        secretKeyUsed: candidate.key,
        protocolMode: isPostgresProtocol ? 'neon-serverless-sql' : 'neon-data-api-rest-v1',
        hostname: parsed.hostname,
        maskedEndpoint: maskNeonHostname(parsed.hostname),
        region: extractNeonRegion(parsed.hostname),
        databaseName: dbName,
      };
    } catch {
      continue;
    }
  }

  return {
    configured: false,
    rawUrl: '',
    secretKeyUsed: 'NONE',
    protocolMode: 'local-fallback',
    hostname: 'localhost',
    maskedEndpoint: 'local-neon-ledger',
    region: 'local',
    databaseName: 'neondb',
  };
}

export function isNeonConfigured(): boolean {
  return resolveNeonConfig().configured;
}

/**
 * Executes a parameterized SQL query against Neon's Serverless HTTP SQL endpoint (`https://<host>/sql`).
 */
export async function executeNeonHttpQuery<T = Record<string, unknown>>(
  connectionString: string,
  query: string,
  params: unknown[] = []
): Promise<{ rows: T[]; neonRequestId: string | null }> {
  const parsed = new URL(connectionString);
  const endpoint = `https://${parsed.hostname}/sql`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': connectionString,
      'Neon-Raw-Text-Output': 'false',
    },
    body: JSON.stringify({ query, params }),
    cache: 'no-store',
  });

  const neonRequestId = response.headers.get('neon-request-id');

  if (!response.ok) {
    throw new Error(`Neon HTTP SQL request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { rows?: T[] };
  return {
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    neonRequestId,
  };
}

/**
 * Executes a parameterized SQL query using the active Neon configuration if `protocolMode === 'neon-serverless-sql'`.
 * Updates global telemetry automatically.
 */
export async function runNeonSqlIfConfigured<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<{ ok: boolean; rows: T[]; neonRequestId: string | null }> {
  const config = resolveNeonConfig();
  if (!config.configured || config.protocolMode !== 'neon-serverless-sql') {
    return { ok: false, rows: [], neonRequestId: null };
  }
  try {
    const { rows, neonRequestId } = await executeNeonHttpQuery<T>(
      config.rawUrl,
      query,
      params
    );
    global._lastNeonTelemetry = {
      configured: true,
      secretKeyUsed: config.secretKeyUsed,
      protocolMode: 'neon-serverless-sql',
      maskedEndpoint: config.maskedEndpoint,
      region: config.region,
      databaseName: config.databaseName,
      gatewayReachable: true,
      neonRequestId,
    };
    return { ok: true, rows, neonRequestId };
  } catch {
    return { ok: false, rows: [], neonRequestId: null };
  }
}

/**
 * Handshakes with a Neon Data API (`https://...apirest...neon.tech/neondb/rest/v1`) endpoint,
 * using `NEON_AUTH_TOKEN` if provided, and captures the live `neon-request-id` from Neon's gateway.
 */
async function probeOrQueryNeonDataApi(
  restBaseUrl: string,
  method: 'GET' | 'POST',
  recordToInsert?: ProjectInquiryRecord
): Promise<{
  rows: ProjectInquiryRecord[] | null;
  gatewayReachable: boolean;
  neonRequestId: string | null;
}> {
  const token =
    process.env.NEON_AUTH_TOKEN?.trim() ||
    process.env.NEON_API_KEY?.trim() ||
    '';

  const base = restBaseUrl.replace(/\/+$/, '');
  const targetUrl =
    method === 'POST'
      ? `${base}/studio_project_inquiries`
      : `${base}/studio_project_inquiries?select=*&order=created_at.desc&limit=50`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.apikey = token;
  }

  try {
    const response = await fetch(
      token ? targetUrl : base,
      {
        method: token && method === 'POST' ? 'POST' : 'GET',
        headers,
        body:
          token && method === 'POST' && recordToInsert
            ? JSON.stringify({
                id: recordToInsert.id,
                name: recordToInsert.name,
                email: recordToInsert.email,
                company: recordToInsert.company,
                service_scope: recordToInsert.serviceScope,
                timeline: recordToInsert.timeline,
                project_brief: recordToInsert.projectBrief,
                created_at: recordToInsert.createdAt,
              })
            : undefined,
        cache: 'no-store',
      }
    );

    const neonRequestId = response.headers.get('neon-request-id');
    const gatewayReachable = Boolean(neonRequestId) || response.status < 500;

    if (token && response.ok && method === 'GET') {
      const data = (await response.json()) as Array<{
        id: string;
        name?: string;
        client_name?: string;
        email?: string;
        client_email?: string;
        company?: string;
        company_name?: string;
        service_scope: string;
        timeline?: string;
        timeline_window?: string;
        project_brief: string;
        created_at: string;
      }>;
      if (Array.isArray(data)) {
        const mapped: ProjectInquiryRecord[] = data.map((r) => {
          const resolvedName = r.name || r.client_name || 'Client';
          const resolvedEmail = r.email || r.client_email || '';
          const resolvedCompany = r.company || r.company_name || 'Independent / Stealth Venture';
          const resolvedTimeline = r.timeline || r.timeline_window || '';
          return {
            id: r.id,
            name: resolvedName,
            email: resolvedEmail,
            company: resolvedCompany,
            serviceScope: r.service_scope,
            timeline: resolvedTimeline,
            projectBrief: r.project_brief,
            createdAt: r.created_at,
            databaseEngine: 'Neon Serverless PostgreSQL',
            sqlPreview: {
              statement:
                'INSERT INTO studio_project_inquiries (id, name, email, company, service_scope, timeline, project_brief, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
              params: [
                r.id,
                resolvedName,
                resolvedEmail,
                resolvedCompany,
                r.service_scope,
                resolvedTimeline,
                r.project_brief,
                r.created_at,
              ],
            },
          };
        });
        return { rows: mapped, gatewayReachable, neonRequestId };
      }
    }

    return { rows: null, gatewayReachable, neonRequestId };
  } catch {
    return { rows: null, gatewayReachable: false, neonRequestId: null };
  }
}

async function ensureNeonTable(connectionString: string): Promise<string | null> {
  if (global._neonTableInitialized) return null;
  const { neonRequestId } = await executeNeonHttpQuery(
    connectionString,
    `CREATE TABLE IF NOT EXISTS studio_project_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT 'Independent / Stealth Venture',
      service_scope TEXT NOT NULL DEFAULT '',
      timeline TEXT NOT NULL DEFAULT '',
      project_brief TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
  );
  global._neonTableInitialized = true;
  return neonRequestId;
}

async function readLocalInquiries(): Promise<ProjectInquiryRecord[]> {
  try {
    const raw = await fs.readFile(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      global._crosxInquiriesMemory = parsed;
      return parsed;
    }
  } catch {
    // Fallback to in-memory list when file does not exist yet
  }
  return global._crosxInquiriesMemory ?? [];
}

async function writeLocalInquiries(records: ProjectInquiryRecord[]): Promise<void> {
  global._crosxInquiriesMemory = records;
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // Keep in-memory state if /tmp write is restricted
  }
}

export async function listStudioInquiries(): Promise<{
  inquiries: ProjectInquiryRecord[];
  storageEngine: 'neon-postgresql' | 'neon-data-api' | 'neon-compatible-local-ledger';
  neonTelemetry: NeonConnectionTelemetry;
}> {
  const config = resolveNeonConfig();

  if (config.configured && config.protocolMode === 'neon-serverless-sql') {
    try {
      await ensureNeonTable(config.rawUrl);
      const { rows, neonRequestId } = await executeNeonHttpQuery<Record<string, string>>(
        config.rawUrl,
        `SELECT * FROM studio_project_inquiries ORDER BY created_at DESC LIMIT 50;`
      );

      const mapped: ProjectInquiryRecord[] = rows.map((r) => {
        const resolvedName = r.name || r.client_name || 'Client';
        const resolvedEmail = r.email || r.client_email || '';
        const resolvedCompany = r.company || r.company_name || 'Independent / Stealth Venture';
        const resolvedTimeline = r.timeline || r.timeline_window || '';
        return {
          id: r.id,
          name: resolvedName,
          email: resolvedEmail,
          company: resolvedCompany,
          serviceScope: r.service_scope,
          timeline: resolvedTimeline,
          projectBrief: r.project_brief,
          createdAt: r.created_at,
          databaseEngine: 'Neon Serverless PostgreSQL',
          sqlPreview: {
            statement:
              'INSERT INTO studio_project_inquiries (id, name, email, company, service_scope, timeline, project_brief, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
            params: [
              r.id,
              resolvedName,
              resolvedEmail,
              resolvedCompany,
              r.service_scope,
              resolvedTimeline,
              r.project_brief,
              r.created_at,
            ],
          },
        };
      });

      const telemetry: NeonConnectionTelemetry = {
        configured: true,
        secretKeyUsed: config.secretKeyUsed,
        protocolMode: 'neon-serverless-sql',
        maskedEndpoint: config.maskedEndpoint,
        region: config.region,
        databaseName: config.databaseName,
        gatewayReachable: true,
        neonRequestId,
      };
      global._lastNeonTelemetry = telemetry;
      return { inquiries: mapped, storageEngine: 'neon-postgresql', neonTelemetry: telemetry };
    } catch {
      // Fall through to local ledger with telemetry preserved
    }
  }

  if (config.configured && config.protocolMode === 'neon-data-api-rest-v1') {
    const probe = await probeOrQueryNeonDataApi(config.rawUrl, 'GET');
    const localRecords = await readLocalInquiries();
    const telemetry: NeonConnectionTelemetry = {
      configured: true,
      secretKeyUsed: config.secretKeyUsed,
      protocolMode: 'neon-data-api-rest-v1',
      maskedEndpoint: config.maskedEndpoint,
      region: config.region,
      databaseName: config.databaseName,
      gatewayReachable: probe.gatewayReachable,
      neonRequestId: probe.neonRequestId,
    };
    global._lastNeonTelemetry = telemetry;

    return {
      inquiries: probe.rows ?? localRecords,
      storageEngine: 'neon-data-api',
      neonTelemetry: telemetry,
    };
  }

  const inquiries = await readLocalInquiries();
  const fallbackTelemetry: NeonConnectionTelemetry = {
    configured: config.configured,
    secretKeyUsed: config.secretKeyUsed,
    protocolMode: config.protocolMode,
    maskedEndpoint: config.maskedEndpoint,
    region: config.region,
    databaseName: config.databaseName,
    gatewayReachable: false,
    neonRequestId: null,
  };
  return {
    inquiries,
    storageEngine: 'neon-compatible-local-ledger',
    neonTelemetry: fallbackTelemetry,
  };
}

export async function persistStudioInquiry(record: ProjectInquiryRecord): Promise<{
  record: ProjectInquiryRecord;
  totalCount: number;
  storageEngine: 'neon-postgresql' | 'neon-data-api' | 'neon-compatible-local-ledger';
  neonTelemetry: NeonConnectionTelemetry;
}> {
  const existing = await readLocalInquiries();
  const updated = [record, ...existing].slice(0, 50);
  await writeLocalInquiries(updated);

  const config = resolveNeonConfig();

  if (config.configured && config.protocolMode === 'neon-serverless-sql') {
    try {
      await ensureNeonTable(config.rawUrl);
      const { neonRequestId } = await executeNeonHttpQuery(
        config.rawUrl,
        `INSERT INTO studio_project_inquiries (id, name, email, company, service_scope, timeline, project_brief, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          record.id,
          record.name,
          record.email,
          record.company,
          record.serviceScope,
          record.timeline,
          record.projectBrief,
          record.createdAt,
        ]
      );
      const telemetry: NeonConnectionTelemetry = {
        configured: true,
        secretKeyUsed: config.secretKeyUsed,
        protocolMode: 'neon-serverless-sql',
        maskedEndpoint: config.maskedEndpoint,
        region: config.region,
        databaseName: config.databaseName,
        gatewayReachable: true,
        neonRequestId,
      };
      global._lastNeonTelemetry = telemetry;
      return {
        record,
        totalCount: updated.length,
        storageEngine: 'neon-postgresql',
        neonTelemetry: telemetry,
      };
    } catch {
      // Fallback already persisted to local ledger
    }
  }

  if (config.configured && config.protocolMode === 'neon-data-api-rest-v1') {
    const probe = await probeOrQueryNeonDataApi(config.rawUrl, 'POST', record);
    const telemetry: NeonConnectionTelemetry = {
      configured: true,
      secretKeyUsed: config.secretKeyUsed,
      protocolMode: 'neon-data-api-rest-v1',
      maskedEndpoint: config.maskedEndpoint,
      region: config.region,
      databaseName: config.databaseName,
      gatewayReachable: probe.gatewayReachable,
      neonRequestId: probe.neonRequestId,
    };
    global._lastNeonTelemetry = telemetry;
    return {
      record,
      totalCount: updated.length,
      storageEngine: 'neon-data-api',
      neonTelemetry: telemetry,
    };
  }

  return {
    record,
    totalCount: updated.length,
    storageEngine: 'neon-compatible-local-ledger',
    neonTelemetry: {
      configured: config.configured,
      secretKeyUsed: config.secretKeyUsed,
      protocolMode: config.protocolMode,
      maskedEndpoint: config.maskedEndpoint,
      region: config.region,
      databaseName: config.databaseName,
      gatewayReachable: false,
      neonRequestId: null,
    },
  };
}
