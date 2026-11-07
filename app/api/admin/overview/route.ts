import { NextResponse } from 'next/server';
import { isRequestAdminAuthorized } from '@/lib/admin-auth';
import {
  getAdminOverviewStats,
  listCmsProjects,
  listDynamicFormFields,
  listSupportTickets,
} from '@/lib/cms-store';

export async function GET(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized: Admin authentication required to access studio telemetry.',
      },
      { status: 401 }
    );
  }

  const [overview, projects, formFields, tickets] = await Promise.all([
    getAdminOverviewStats(),
    listCmsProjects({ includeUnpublished: true }),
    listDynamicFormFields({ includeDisabled: true }),
    listSupportTickets(),
  ]);

  return NextResponse.json({
    ok: true,
    studio: 'CROSX DEV STUDIO',
    founder: 'IRON CLAD',
    stats: overview.stats,
    recentActivity: overview.recentActivity,
    neonTelemetry: overview.neonTelemetry,
    projects,
    formFields,
    tickets,
  });
}
