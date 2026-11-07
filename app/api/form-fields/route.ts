import { NextResponse } from 'next/server';
import { isRequestAdminAuthorized } from '@/lib/admin-auth';
import {
  deleteDynamicFormField,
  listDynamicFormFields,
  reorderDynamicFormFields,
  upsertDynamicFormField,
  type DynamicFormField,
} from '@/lib/cms-store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeAll = url.searchParams.get('includeAll') === '1';

  let includeDisabled = false;
  if (includeAll) {
    includeDisabled = await isRequestAdminAuthorized(request);
  }

  const fields = await listDynamicFormFields({ includeDisabled });
  return NextResponse.json({
    ok: true,
    count: fields.length,
    fields,
  });
}

export async function POST(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to configure form fields.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as Partial<DynamicFormField> & {
      action?: 'reorder';
      orderedIds?: string[];
    };

    if (body.action === 'reorder' && Array.isArray(body.orderedIds)) {
      const fields = await reorderDynamicFormFields(body.orderedIds);
      return NextResponse.json({ ok: true, fields });
    }

    const result = await upsertDynamicFormField(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, field: result.field, fields: result.fields },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid form field configuration payload.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to edit form fields.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as Partial<DynamicFormField>;
    if (!body.id) {
      return NextResponse.json(
        { ok: false, error: 'Field ID is required for update.' },
        { status: 400 }
      );
    }

    const result = await upsertDynamicFormField(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, field: result.field, fields: result.fields });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to update form field.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const authorized = await isRequestAdminAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privilege required to delete form fields.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Field ID is required.' },
      { status: 400 }
    );
  }

  const { deleted, fields } = await deleteDynamicFormField(id);
  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: 'Form field not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, fields });
}
