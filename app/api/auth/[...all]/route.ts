import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  BETTER_AUTH_SESSION_COOKIE,
  checkRateLimit,
  extractSessionCookieFromRequest,
  getAdminSessionFromToken,
  requestNeonAdminVerificationToken,
  resetNeonAdminPasswordWithToken,
  revokeAdminSessionToken,
  signInNeonAdminWithEmailPassword,
  verifyNeonAdminEmailToken,
} from '@/lib/admin-auth';

/**
 * Official Better Auth / Neon Auth catch-all route handler (/api/auth/[...all]).
 * Enforces server-side administrator email allowlist and synchronizes with
 * the `neon_auth` schema in the existing Neon Serverless PostgreSQL branch.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ all: string[] }> }
) {
  const { all } = await context.params;
  const subPath = (all || []).join('/');

  if (subPath === 'get-session' || subPath === 'session') {
    const token = extractSessionCookieFromRequest(request);
    const { authenticated, user, session } = await getAdminSessionFromToken(token);
    if (!authenticated || !user || !session) {
      return NextResponse.json(null, { status: 200 });
    }
    return NextResponse.json({
      user,
      session,
    });
  }

  return NextResponse.json(
    { ok: true, provider: 'Neon Auth (Managed Better Auth)', schema: 'neon_auth' },
    { status: 200 }
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ all: string[] }> }
) {
  const { all } = await context.params;
  const subPath = (all || []).join('/');
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local-client';

  // Disable public sign-up (private administrative console)
  if (subPath === 'sign-up/email' || subPath === 'sign-up') {
    return NextResponse.json(
      {
        code: 'PUBLIC_SIGNUP_DISABLED',
        message:
          'Public registration is disabled. CROSX DEV STUDIO Admin Console is restricted to allowlisted studio administrators.',
      },
      { status: 403 }
    );
  }

  if (subPath === 'sign-in/email') {
    const rate = checkRateLimit(`neon_auth_signin_${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many sign-in attempts. Please wait ${rate.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const result = await signInNeonAdminWithEmailPassword({
      email: body.email,
      password: body.password,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    if (!result.ok || !result.sessionToken || !result.user) {
      return NextResponse.json(
        {
          code: result.code || 'AUTH_FAILED',
          message: result.error || 'Authentication failed.',
        },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      token: result.sessionToken,
      user: result.user,
      session: result.session,
    });

    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 12,
    };
    response.cookies.set(ADMIN_SESSION_COOKIE, result.sessionToken, cookieOpts);
    response.cookies.set(BETTER_AUTH_SESSION_COOKIE, result.sessionToken, cookieOpts);
    return response;
  }

  if (subPath === 'sign-out') {
    const token = extractSessionCookieFromRequest(request);
    await revokeAdminSessionToken(token);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    response.cookies.set(BETTER_AUTH_SESSION_COOKIE, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    return response;
  }

  if (subPath === 'forget-password') {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const result = await requestNeonAdminVerificationToken({
      email: body.email,
      purpose: 'password-reset',
    });
    if (!result.ok) {
      return NextResponse.json(
        { message: result.error || 'Unable to initiate password reset.' },
        { status: result.status }
      );
    }
    return NextResponse.json(result);
  }

  if (subPath === 'reset-password') {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      token?: string;
      verificationCode?: string;
      newPassword?: string;
    };
    const result = await resetNeonAdminPasswordWithToken({
      email: body.email,
      verificationCode: body.verificationCode || body.token,
      newPassword: body.newPassword,
    });
    if (!result.ok) {
      return NextResponse.json(
        { message: result.error || 'Unable to reset password.' },
        { status: result.status }
      );
    }
    return NextResponse.json(result);
  }

  if (subPath === 'verify-email') {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      token?: string;
      verificationCode?: string;
    };
    const result = await verifyNeonAdminEmailToken({
      email: body.email,
      verificationCode: body.verificationCode || body.token,
    });
    if (!result.ok) {
      return NextResponse.json(
        { message: result.error || 'Unable to verify email.' },
        { status: result.status }
      );
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ message: 'Unsupported Neon Auth action.' }, { status: 404 });
}
