import { NextResponse } from 'next/server';
import { isRequestAdminAuthorized } from '@/lib/admin-auth';
import {
  deleteCmsProject,
  listCmsProjects,
  reorderCmsProjects,
  upsertCmsProject,
  type CmsProject,
} from '@/lib/cms-store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeAll = url.searchParams.get('includeAll') === '1';

  let allowUnpublished = false;
  if (includeAll) {
    allowUnpublished = await isRequestAdminAuthorized(request);
  }

  const projects = await listCmsProjects({ includeUnpublished: allowUnpublished });
  return NextResponse.json({
    ok: true,
    count: projects.length,
    projects,
  });
}

export async function POST(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to manage projects.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as Partial<CmsProject> & {
      action?: 'reorder';
      orderedIds?: string[];
    };

    if (body.action === 'reorder' && Array.isArray(body.orderedIds)) {
      const projects = await reorderCmsProjects(body.orderedIds);
      return NextResponse.json({ ok: true, projects });
    }

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Project title is required.' },
        { status: 400 }
      );
    }

    if (!body.url || !body.url.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Project website URL is required.' },
        { status: 400 }
      );
    }

    const { project, projects } = await upsertCmsProject({
      ...body,
      title: body.title,
      url: body.url,
    });

    return NextResponse.json({ ok: true, project, projects }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid project payload.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to update projects.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as Partial<CmsProject> & {
      id?: string;
      title?: string;
      url?: string;
    };

    if (!body.id || !body.title?.trim() || !body.url?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Project ID, title, and URL are required for update.' },
        { status: 400 }
      );
    }

    const { project, projects } = await upsertCmsProject({
      ...body,
      title: body.title,
      url: body.url,
    });

    return NextResponse.json({ ok: true, project, projects });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to update project.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to delete projects.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Project ID is required.' },
      { status: 400 }
    );
  }

  const { deleted, projects } = await deleteCmsProject(id);
  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: 'Project not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, projects });
}
