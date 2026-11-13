import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  BETTER_AUTH_SESSION_COOKIE,
  checkRateLimit,
  extractSessionCookieFromRequest,
  getAdminSessionFromToken,
  getAuthorizedAdminAllowlist,
  getNeonAuthUpstreamUrl,
  requestNeonAdminVerificationToken,
  resetNeonAdminPasswordWithToken,
  revokeAdminSessionToken,
  signInNeonAdminWithEmailPassword,
  updateAuthenticatedAdminPassword,
  verifyNeonAdminEmailToken,
} from '@/lib/admin-auth';
import { resolveNeonConfig } from '@/lib/neon-db';

export async function GET(request: Request) {
  const token = extractSessionCookieFromRequest(request);
  const { authenticated, user, session } = await getAdminSessionFromToken(token);
  const neonConfig = resolveNeonConfig();
  const allowlist = getAuthorizedAdminAllowlist();

  return NextResponse.json({
    authenticated,
    user,
    session,
    neonAuth: {
      provider: 'Neon Auth (Managed Better Auth)',
      schema: 'neon_auth',
      upstreamConfigured: Boolean(getNeonAuthUpstreamUrl()),
      allowlistEnforced: true,
      allowedAdminsCount: allowlist.length,
    },
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
  const rate = checkRateLimit(`admin_neon_auth_${ip}`, 25, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many authentication requests. Please wait ${rate.retryAfterSeconds}s.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      action?:
        | 'sign-in'
        | 'forgot-password'
        | 'reset-password'
        | 'send-verification'
        | 'verify-email';
      email?: string;
      password?: string;
      rememberMe?: boolean;
      verificationCode?: string;
      newPassword?: string;
    };

    const action = body.action ?? 'sign-in';

    if (action === 'forgot-password' || action === 'send-verification') {
      const result = await requestNeonAdminVerificationToken({
        email: body.email,
        purpose: action === 'forgot-password' ? 'password-reset' : 'email-verification',
      });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        message: result.message,
        verificationCode: result.verificationCode,
        expiresAt: result.expiresAt,
      });
    }

    if (action === 'reset-password') {
      const result = await resetNeonAdminPasswordWithToken({
        email: body.email,
        verificationCode: body.verificationCode,
        newPassword: body.newPassword,
      });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        message: result.message,
      });
    }

    if (action === 'verify-email') {
      const result = await verifyNeonAdminEmailToken({
        email: body.email,
        verificationCode: body.verificationCode,
      });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        message: result.message,
      });
    }

    // Default action: Email + Password Sign-In via Neon Auth (Managed Better Auth)
    const result = await signInNeonAdminWithEmailPassword({
      email: body.email,
      password: body.password,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    if (!result.ok || !result.sessionToken || !result.user) {
      return NextResponse.json(
        {
          ok: false,
          code: result.code,
          error: result.error || 'Authentication failed. Access denied.',
        },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      user: result.user,
      session: result.session,
      message: `Signed in as ${result.user.email} via Neon Auth.`,
    });

    const maxAgeSeconds = body.rememberMe === false ? 60 * 60 * 12 : 60 * 60 * 24 * 30;
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeSeconds,
    };
    response.cookies.set(ADMIN_SESSION_COOKIE, result.sessionToken, cookieOpts);
    response.cookies.set(BETTER_AUTH_SESSION_COOKIE, result.sessionToken, cookieOpts);

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid authentication payload.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const token = extractSessionCookieFromRequest(request);
  const { authenticated, user } = await getAdminSessionFromToken(token);
  if (!authenticated || !user) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Valid Neon Auth admin session required.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const result = await updateAuthenticatedAdminPassword({
      email: user.email,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword ?? '',
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: `Updated Neon Auth password for ${user.email}.`,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to update administrator password.' },
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
    message: 'Neon Auth administrator session terminated.',
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(BETTER_AUTH_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
