import { NextResponse } from 'next/server';
import { buildPostgresInquiryRecord } from '@/lib/inquiry-validator';
import { listStudioInquiries, persistStudioInquiry } from '@/lib/neon-db';
import {
  createSupportTicketFromInquiry,
  listDynamicFormFields,
  validateDynamicSubmission,
} from '@/lib/cms-store';

export async function GET() {
  const [{ inquiries, storageEngine, neonTelemetry }, formFields] = await Promise.all([
    listStudioInquiries(),
    listDynamicFormFields({ includeDisabled: false }),
  ]);

  return NextResponse.json({
    studio: 'CROSX DEV STUDIO',
    founder: 'IRON CLAD',
    databaseEngine: 'Neon Serverless PostgreSQL (PostgreSQL 16)',
    storageEngine,
    neonTelemetry,
    count: inquiries.length,
    inquiries,
    formFields,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const activeFields = await listDynamicFormFields({ includeDisabled: false });

    const validation = validateDynamicSubmission(body, activeFields);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          errors: validation.errors,
          message: 'Please check the highlighted fields and try again.',
        },
        { status: 400 }
      );
    }

    const record = buildPostgresInquiryRecord(validation.extractedCore);
    const { totalCount, storageEngine, neonTelemetry } = await persistStudioInquiry(record);

    const { ticket, trackingToken } = await createSupportTicketFromInquiry({
      id: record.id,
      clientName: validation.extractedCore.name,
      clientEmail: validation.extractedCore.email,
      company: validation.extractedCore.company,
      serviceScope: validation.extractedCore.serviceScope,
      timeline: validation.extractedCore.timeline,
      projectBrief: validation.extractedCore.projectBrief,
      submittedFields: validation.submittedFields,
      createdAt: record.createdAt,
    });

    return NextResponse.json(
      {
        ok: true,
        inquiry: record,
        ticket: {
          ticketNumber: ticket.ticketNumber,
          trackingToken,
          status: ticket.status,
          createdAt: ticket.createdAt,
          submittedFields: ticket.submittedFields,
        },
        databaseEngine: 'Neon Serverless PostgreSQL',
        storageEngine,
        neonTelemetry,
        totalCount,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Unable to process project inquiry payload.',
      },
      { status: 400 }
    );
  }
}
