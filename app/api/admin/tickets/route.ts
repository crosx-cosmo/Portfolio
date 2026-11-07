import { NextResponse } from 'next/server';
import { isRequestAdminAuthorized } from '@/lib/admin-auth';
import {
  addAdminTicketMessage,
  deleteSupportTicket,
  listSupportTickets,
  updateSupportTicketAdmin,
  type TicketStatus,
} from '@/lib/cms-store';

export async function GET(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to view tickets.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? '';
  const status = (url.searchParams.get('status') ?? 'ALL') as TicketStatus | 'ALL';
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'oldest';

  const tickets = await listSupportTickets({ search, status, sort });
  return NextResponse.json({
    ok: true,
    count: tickets.length,
    tickets,
  });
}

export async function PATCH(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to update tickets.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      ticketNumber?: string;
      action?: 'update-meta' | 'reply';
      status?: TicketStatus;
      isRead?: boolean;
      messageBody?: string;
      isInternal?: boolean;
    };

    if (!body.ticketNumber || !body.ticketNumber.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Ticket number is required.' },
        { status: 400 }
      );
    }

    if (body.action === 'reply') {
      if (!body.messageBody || !body.messageBody.trim()) {
        return NextResponse.json(
          { ok: false, error: 'Message content cannot be empty.' },
          { status: 400 }
        );
      }

      const updated = await addAdminTicketMessage({
        ticketNumber: body.ticketNumber,
        body: body.messageBody,
        isInternal: Boolean(body.isInternal),
        statusAfterReply: body.status,
      });

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Ticket not found.' },
          { status: 404 }
        );
      }

      const tickets = await listSupportTickets();
      return NextResponse.json({ ok: true, ticket: updated, tickets });
    }

    const updated = await updateSupportTicketAdmin(body.ticketNumber, {
      status: body.status,
      isRead: body.isRead,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const tickets = await listSupportTickets();
    return NextResponse.json({ ok: true, ticket: updated, tickets });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to update ticket.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to delete tickets.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const ticketNumber = url.searchParams.get('ticketNumber')?.trim();
  if (!ticketNumber) {
    return NextResponse.json(
      { ok: false, error: 'Ticket number is required.' },
      { status: 400 }
    );
  }

  const deleted = await deleteSupportTicket(ticketNumber);
  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: 'Ticket not found.' },
      { status: 404 }
    );
  }

  const tickets = await listSupportTickets();
  return NextResponse.json({ ok: true, tickets });
}
