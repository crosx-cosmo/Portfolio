import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  authenticateAdmin,
  checkRateLimit,
  extractSessionCookieFromRequest,
  getAdminAuthStatus,
  isRequestAdminAuthorized,
  revokeAdminSessionToken,
  updateAdminPassphrase,
} from '@/lib/admin-auth';
import { resolveNeonConfig } from '@/lib/neon-db';

export async function GET(request: Request) {
  const authenticated = await isRequestAdminAuthorized(request);
  const authStatus = await getAdminAuthStatus();
  const neonConfig = resolveNeonConfig();

  return NextResponse.json({
    authenticated,
    passphraseConfigured: authStatus.passphraseConfigured,
    envSecretAvailable: authStatus.envSecretAvailable,
    studio: 'CROSX DEV STUDIO',
    founder: 'IRON CLAD',
    neonConfigured: neonConfig.configured,
    maskedEndpoint: neonConfig.maskedEndpoint,
    region: neonConfig.region,
  });
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local-client';
  const rate = checkRateLimit(`admin_login_${ip}`, 15, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many authentication attempts. Please wait ${rate.retryAfterSeconds}s.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      credential?: string;
      newPassphrase?: string;
      mode?: 'credential' | 'setup-passphrase' | 'studio-env-handshake';
    };

    const result = await authenticateAdmin({
      credential: body.credential,
      newPassphrase: body.newPassphrase,
      mode: body.mode,
    });

    if (!result.ok || !result.sessionToken) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'Authentication failed. Unauthorized access denied.',
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      message: 'Authenticated with CROSX DEV STUDIO Admin Console.',
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid authentication payload.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Valid admin session required.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { newPassphrase?: string };
    const result = await updateAdminPassphrase(body.newPassphrase ?? '');
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: 'Admin passphrase updated in studio security ledger.',
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to update admin passphrase.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const token = extractSessionCookieFromRequest(request);
  await revokeAdminSessionToken(token);

  const response = NextResponse.json({
    ok: true,
    authenticated: false,
    message: 'Admin session terminated.',
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
