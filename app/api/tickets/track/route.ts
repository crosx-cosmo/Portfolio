import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/admin-auth';
import {
  addClientFollowUpMessage,
  verifyAndLookupPublicTicket,
} from '@/lib/cms-store';

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local-client';
  const rate = checkRateLimit(`public_ticket_track_${ip}`, 30, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before trying again.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      action?: 'lookup' | 'reply';
      ticketNumber?: string;
      trackingToken?: string;
      messageBody?: string;
    };

    const ticketNumber = (body.ticketNumber ?? '').trim().toUpperCase();
    const trackingToken = (body.trackingToken ?? '').trim();

    if (!ticketNumber || !trackingToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Both your Ticket ID (e.g. CROSX-2026-00001) and Security Tracking Token are required.',
        },
        { status: 401 }
      );
    }

    if (body.action === 'reply') {
      const result = await addClientFollowUpMessage({
        ticketNumber,
        trackingToken,
        body: body.messageBody ?? '',
      });
      if (!result.ok || !result.ticket) {
        return NextResponse.json(
          { ok: false, error: result.error || 'Unable to send follow-up message.' },
          { status: result.error?.includes('Unauthorized') ? 401 : 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        ticket: result.ticket,
      });
    }

    const lookup = await verifyAndLookupPublicTicket({
      ticketNumber,
      trackingToken,
    });

    if (!lookup.ok || !lookup.ticket) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lookup.error ||
            'Invalid Ticket ID or Security Tracking Token. Access denied.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      ticket: lookup.ticket,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to process ticket tracking request.' },
      { status: 400 }
    );
  }
}
