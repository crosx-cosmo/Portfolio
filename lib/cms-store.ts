import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectCaseStudy } from '@/lib/studio-data';
import type { ProjectInquiryRecord } from '@/lib/inquiry-validator';
import {
  generateTrackingToken,
  hashTrackingToken,
  verifyTrackingTokenConstantTime,
} from '@/lib/admin-auth';
import {
  resolveNeonConfig,
  runNeonSqlIfConfigured,
  type NeonConnectionTelemetry,
} from '@/lib/neon-db';
import {
  ALL_TICKET_STATUSES,
  ALLOWED_FIELD_TYPES,
  buildDefaultFormFields,
  buildDefaultProjects,
  formatTicketNumber,
  sanitizePublicTicketView,
  validateDynamicSubmission,
  validateFormFieldDefinition,
  type CmsProject,
  type DynamicFieldType,
  type DynamicFormField,
  type PublicTicketView,
  type SubmittedFieldSnapshot,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
} from '@/lib/cms-schema';

export {
  ALL_TICKET_STATUSES,
  ALLOWED_FIELD_TYPES,
  buildDefaultFormFields,
  buildDefaultProjects,
  formatTicketNumber,
  sanitizePublicTicketView,
  validateDynamicSubmission,
  validateFormFieldDefinition,
  type CmsProject,
  type DynamicFieldType,
  type DynamicFormField,
  type PublicTicketView,
  type SubmittedFieldSnapshot,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
};

const CMS_STORAGE_FILE = path.join('/tmp', 'crosx-dev-studio-cms.json');
const LEGACY_INQUIRIES_FILE = path.join('/tmp', 'crosx-dev-studio-inquiries.json');

export interface CmsStoreState {
  version: number;
  ticketSequence: number;
  projects: CmsProject[];
  formFields: DynamicFormField[];
  tickets: SupportTicket[];
  updatedAt: string;
}

declare global {
  var _crosxCmsStateMemory: CmsStoreState | undefined;
}

function parseJsonArray<T>(val: unknown, fallback: T[]): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function syncProjectToNeon(project: CmsProject): Promise<void> {
  await runNeonSqlIfConfigured(
    `INSERT INTO studio_projects (
      id, index_number, title, subtitle, category, url, display_url,
      live_screenshot, studio_visual, summary, architecture_overview,
      engineering_highlights, stack, deliverables, layout_span,
      published, featured, sort_order, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11,
      $12::jsonb, $13::jsonb, $14::jsonb, $15,
      $16, $17, $18, $19
    )
    ON CONFLICT (id) DO UPDATE SET
      index_number = EXCLUDED.index_number,
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      category = EXCLUDED.category,
      url = EXCLUDED.url,
      display_url = EXCLUDED.display_url,
      live_screenshot = EXCLUDED.live_screenshot,
      studio_visual = EXCLUDED.studio_visual,
      summary = EXCLUDED.summary,
      architecture_overview = EXCLUDED.architecture_overview,
      engineering_highlights = EXCLUDED.engineering_highlights,
      stack = EXCLUDED.stack,
      deliverables = EXCLUDED.deliverables,
      layout_span = EXCLUDED.layout_span,
      published = EXCLUDED.published,
      featured = EXCLUDED.featured,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;`,
    [
      project.id,
      project.index,
      project.title,
      project.subtitle,
      project.category,
      project.url,
      project.displayUrl,
      project.liveScreenshot,
      project.studioVisual,
      project.summary,
      project.architectureOverview,
      JSON.stringify(project.engineeringHighlights),
      JSON.stringify(project.stack),
      JSON.stringify(project.deliverables),
      project.layoutSpan,
      project.published,
      project.featured,
      project.order,
      project.updatedAt,
    ]
  );
}

async function syncFormFieldToNeon(field: DynamicFormField): Promise<void> {
  await runNeonSqlIfConfigured(
    `INSERT INTO studio_form_fields (
      id, field_key, label, placeholder, field_type,
      required, options, sort_order, enabled, width, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7::jsonb, $8, $9, $10, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      field_key = EXCLUDED.field_key,
      label = EXCLUDED.label,
      placeholder = EXCLUDED.placeholder,
      field_type = EXCLUDED.field_type,
      required = EXCLUDED.required,
      options = EXCLUDED.options,
      sort_order = EXCLUDED.sort_order,
      enabled = EXCLUDED.enabled,
      width = EXCLUDED.width,
      updated_at = NOW();`,
    [
      field.id,
      field.key,
      field.label,
      field.placeholder,
      field.type,
      field.required,
      JSON.stringify(field.options),
      field.order,
      field.enabled,
      field.width,
    ]
  );
}

async function syncTicketToNeon(ticket: SupportTicket): Promise<void> {
  await runNeonSqlIfConfigured(
    `INSERT INTO studio_tickets (
      id, ticket_number, tracking_token_hash, admin_tracking_token_ref,
      client_name, client_email, company, service_scope, timeline,
      project_brief, submitted_fields, status, is_read, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9,
      $10, $11::jsonb, $12, $13, $14, $15
    )
    ON CONFLICT (ticket_number) DO UPDATE SET
      status = EXCLUDED.status,
      is_read = EXCLUDED.is_read,
      updated_at = EXCLUDED.updated_at;`,
    [
      ticket.id,
      ticket.ticketNumber,
      ticket.trackingTokenHash,
      ticket.adminTrackingTokenRef,
      ticket.clientName,
      ticket.clientEmail,
      ticket.company,
      ticket.serviceScope,
      ticket.timeline,
      ticket.projectBrief,
      JSON.stringify(ticket.submittedFields),
      ticket.status,
      ticket.isRead,
      ticket.createdAt,
      ticket.updatedAt,
    ]
  );
}

async function syncTicketMessageToNeon(msg: TicketMessage): Promise<void> {
  await runNeonSqlIfConfigured(
    `INSERT INTO studio_ticket_messages (
      id, ticket_number, sender_role, sender_name, body, is_internal, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING;`,
    [
      msg.id,
      msg.ticketNumber,
      msg.senderRole,
      msg.senderName,
      msg.body,
      msg.isInternal,
      msg.createdAt,
    ]
  );
}

async function hydrateFromNeonIfAvailable(baseState: CmsStoreState): Promise<CmsStoreState> {
  const cfg = resolveNeonConfig();
  if (!cfg.configured || cfg.protocolMode !== 'neon-serverless-sql') {
    return baseState;
  }

  try {
    const [projRes, fieldsRes, ticketsRes, msgsRes] = await Promise.all([
      runNeonSqlIfConfigured<Record<string, unknown>>(
        `SELECT * FROM studio_projects ORDER BY sort_order ASC;`
      ),
      runNeonSqlIfConfigured<Record<string, unknown>>(
        `SELECT * FROM studio_form_fields ORDER BY sort_order ASC;`
      ),
      runNeonSqlIfConfigured<Record<string, unknown>>(
        `SELECT * FROM studio_tickets ORDER BY created_at DESC;`
      ),
      runNeonSqlIfConfigured<Record<string, unknown>>(
        `SELECT * FROM studio_ticket_messages ORDER BY created_at ASC;`
      ),
    ]);

    if (projRes.ok && projRes.rows.length > 0) {
      baseState.projects = projRes.rows.map((r, i) => ({
        id: String(r.id || `proj_${i + 1}`),
        index: String(r.index_number || String(i + 1).padStart(2, '0')),
        title: String(r.title || ''),
        subtitle: String(r.subtitle || r.tagline || ''),
        category:
          r.category === 'Engineering Tooling & SaaS' ||
          r.category === 'Full-Stack Service & Commerce'
            ? r.category
            : 'Enterprise Web Platform',
        url: String(r.url || r.live_url || 'https://crosx.in'),
        displayUrl: String(r.display_url || r.domain_label || 'crosx.in'),
        liveScreenshot: String(r.live_screenshot || r.preview_image || '/screenshots/crosx-live.png'),
        studioVisual: String(r.studio_visual || r.preview_image || '/images/project-crosx.png'),
        summary: String(r.summary || ''),
        architectureOverview: String(r.architecture_overview || r.summary || ''),
        engineeringHighlights: parseJsonArray<string>(
          r.engineering_highlights ?? r.architectural_highlights,
          []
        ),
        stack: parseJsonArray<string>(r.stack, []),
        deliverables: parseJsonArray<string>(r.deliverables, []),
        layoutSpan: r.layout_span === 'wide' ? 'wide' : 'split',
        published: r.published !== undefined ? Boolean(r.published) : true,
        featured: r.featured !== undefined ? Boolean(r.featured) : true,
        order: Number(r.sort_order) || i + 1,
        updatedAt: String(r.updated_at || new Date().toISOString()),
      }));
    }

    if (fieldsRes.ok && fieldsRes.rows.length > 0) {
      baseState.formFields = fieldsRes.rows.map((r, i) => ({
        id: String(r.id || `fld_${i + 1}`),
        key: String(r.field_key || `field_${i + 1}`),
        label: String(r.label || ''),
        placeholder: String(r.placeholder || ''),
        type: (ALLOWED_FIELD_TYPES.includes(r.field_type as DynamicFieldType)
          ? r.field_type
          : 'text') as DynamicFieldType,
        required: Boolean(r.required),
        options: parseJsonArray<string>(r.options, []),
        order: Number(r.sort_order) || i + 1,
        enabled: r.enabled !== undefined ? Boolean(r.enabled) : true,
        width:
          r.width === 'half' || r.width === 'third' ? r.width : 'full',
      }));
    }

    if (ticketsRes.ok && ticketsRes.rows.length > 0) {
      const messagesByTicket = new Map<string, TicketMessage[]>();
      if (msgsRes.ok) {
        for (const m of msgsRes.rows) {
          const tNum = String(m.ticket_number || '');
          if (!tNum) continue;
          const list = messagesByTicket.get(tNum) ?? [];
          list.push({
            id: String(m.id),
            ticketNumber: tNum,
            senderRole: m.sender_role === 'ADMIN' ? 'ADMIN' : 'CLIENT',
            senderName: String(m.sender_name || ''),
            body: String(m.body || ''),
            isInternal: Boolean(m.is_internal),
            createdAt: String(m.created_at || new Date().toISOString()),
          });
          messagesByTicket.set(tNum, list);
        }
      }

      baseState.tickets = ticketsRes.rows.map((r) => {
        const tNum = String(r.ticket_number || '');
        return {
          id: String(r.id),
          ticketNumber: tNum,
          trackingTokenHash: String(r.tracking_token_hash || ''),
          adminTrackingTokenRef: String(r.admin_tracking_token_ref || ''),
          clientName: String(r.client_name || ''),
          clientEmail: String(r.client_email || ''),
          company: String(r.company || 'Independent / Stealth Venture'),
          serviceScope: String(r.service_scope || ''),
          timeline: String(r.timeline || ''),
          projectBrief: String(r.project_brief || ''),
          submittedFields: parseJsonArray<SubmittedFieldSnapshot>(r.submitted_fields, []),
          status: (ALL_TICKET_STATUSES.includes(r.status as TicketStatus)
            ? r.status
            : 'NEW') as TicketStatus,
          isRead: Boolean(r.is_read),
          createdAt: String(r.created_at || new Date().toISOString()),
          updatedAt: String(r.updated_at || new Date().toISOString()),
          messages: messagesByTicket.get(tNum) ?? [],
        };
      });

      baseState.ticketSequence = Math.max(
        baseState.ticketSequence,
        baseState.tickets.length
      );
    }
  } catch {
    // Fallback to local state if Neon tables are unreachable
  }

  return baseState;
}

async function readLegacyInquiriesForMigration(): Promise<ProjectInquiryRecord[]> {
  try {
    const raw = await fs.readFile(LEGACY_INQUIRIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ProjectInquiryRecord[];
  } catch {
    // No legacy file yet
  }
  return [];
}

async function loadCmsState(): Promise<CmsStoreState> {
  if (global._crosxCmsStateMemory) {
    const cfg = resolveNeonConfig();
    const ageMs = Date.now() - new Date(global._crosxCmsStateMemory.updatedAt).getTime();
    if (cfg.configured && cfg.protocolMode === 'neon-serverless-sql' && ageMs > 2000) {
      const refreshed = await hydrateFromNeonIfAvailable(global._crosxCmsStateMemory);
      refreshed.updatedAt = new Date().toISOString();
      global._crosxCmsStateMemory = refreshed;
    }
    return global._crosxCmsStateMemory;
  }

  try {
    const raw = await fs.readFile(CMS_STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as CmsStoreState;
    if (
      parsed &&
      Array.isArray(parsed.projects) &&
      Array.isArray(parsed.formFields) &&
      Array.isArray(parsed.tickets)
    ) {
      const hydrated = await hydrateFromNeonIfAvailable(parsed);
      global._crosxCmsStateMemory = hydrated;
      return hydrated;
    }
  } catch {
    // Initialize fresh state and migrate any existing inquiries
  }

  const legacyInquiries = await readLegacyInquiriesForMigration();
  let seq = 0;
  const migratedTickets: SupportTicket[] = [];

  const chronological = [...legacyInquiries].reverse();
  for (const inq of chronological) {
    seq += 1;
    const ticketNumber = formatTicketNumber(seq, 2026);
    const token = generateTrackingToken();
    const createdAt = inq.createdAt || new Date().toISOString();
    migratedTickets.unshift({
      id: inq.id || `tkt_${seq}`,
      ticketNumber,
      trackingTokenHash: hashTrackingToken(token),
      adminTrackingTokenRef: token,
      clientName: inq.name,
      clientEmail: inq.email,
      company: inq.company || 'Independent / Stealth Venture',
      serviceScope: inq.serviceScope,
      timeline: inq.timeline,
      projectBrief: inq.projectBrief,
      submittedFields: [
        { key: 'name', label: 'Your Name', type: 'text', value: inq.name },
        { key: 'email', label: 'Work Email', type: 'email', value: inq.email },
        { key: 'company', label: 'Company / Venture', type: 'text', value: inq.company },
        { key: 'serviceScope', label: 'Engineering Scope', type: 'select', value: inq.serviceScope },
        { key: 'timeline', label: 'Delivery Horizon', type: 'select', value: inq.timeline },
        {
          key: 'projectBrief',
          label: 'Project Brief & Architectural Objectives',
          type: 'textarea',
          value: inq.projectBrief,
        },
      ],
      status: 'NEW',
      isRead: false,
      createdAt,
      updatedAt: createdAt,
      messages: [
        {
          id: `msg_init_${seq}`,
          ticketNumber,
          senderRole: 'CLIENT',
          senderName: inq.name,
          body: inq.projectBrief,
          isInternal: false,
          createdAt,
        },
      ],
    });
  }

  const initialState: CmsStoreState = {
    version: 1,
    ticketSequence: seq,
    projects: buildDefaultProjects(),
    formFields: buildDefaultFormFields(),
    tickets: migratedTickets,
    updatedAt: new Date().toISOString(),
  };

  const hydrated = await hydrateFromNeonIfAvailable(initialState);
  global._crosxCmsStateMemory = hydrated;
  await saveCmsState(hydrated);
  return hydrated;
}

async function saveCmsState(state: CmsStoreState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  global._crosxCmsStateMemory = state;
  try {
    await fs.writeFile(CMS_STORAGE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Keep in-memory state if /tmp write is restricted
  }
}

export async function listCmsProjects(options?: {
  includeUnpublished?: boolean;
}): Promise<CmsProject[]> {
  const state = await loadCmsState();
  const sorted = [...state.projects].sort((a, b) => a.order - b.order);
  if (options?.includeUnpublished) {
    return sorted;
  }
  return sorted.filter((p) => p.published);
}

export async function upsertCmsProject(
  input: Partial<CmsProject> & { title: string; url: string }
): Promise<{ project: CmsProject; projects: CmsProject[] }> {
  const state = await loadCmsState();
  const now = new Date().toISOString();

  const cleanUrl = input.url.trim();
  let displayUrl = (input.displayUrl ?? '').trim();
  if (!displayUrl) {
    displayUrl = cleanUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }

  const validCategory: ProjectCaseStudy['category'] =
    input.category === 'Enterprise Web Platform' ||
    input.category === 'Engineering Tooling & SaaS' ||
    input.category === 'Full-Stack Service & Commerce'
      ? input.category
      : 'Enterprise Web Platform';

  const existingIdx = input.id
    ? state.projects.findIndex((p) => p.id === input.id)
    : -1;

  if (existingIdx >= 0) {
    const prev = state.projects[existingIdx];
    const updated: CmsProject = {
      ...prev,
      title: input.title.trim() || prev.title,
      subtitle: (input.subtitle ?? prev.subtitle).trim(),
      category: validCategory,
      url: cleanUrl || prev.url,
      displayUrl: displayUrl || prev.displayUrl,
      liveScreenshot:
        (input.liveScreenshot ?? prev.liveScreenshot).trim() || '/screenshots/crosx-live.png',
      studioVisual:
        (input.studioVisual ?? prev.studioVisual).trim() || '/images/project-crosx.png',
      summary: (input.summary ?? prev.summary).trim(),
      architectureOverview: (input.architectureOverview ?? prev.architectureOverview).trim(),
      engineeringHighlights: Array.isArray(input.engineeringHighlights)
        ? input.engineeringHighlights.map((s) => s.trim()).filter(Boolean)
        : prev.engineeringHighlights,
      stack: Array.isArray(input.stack)
        ? input.stack.map((s) => s.trim()).filter(Boolean)
        : prev.stack,
      deliverables: Array.isArray(input.deliverables)
        ? input.deliverables.map((s) => s.trim()).filter(Boolean)
        : prev.deliverables,
      layoutSpan:
        input.layoutSpan === 'wide' || input.layoutSpan === 'split'
          ? input.layoutSpan
          : prev.layoutSpan,
      published: input.published !== undefined ? Boolean(input.published) : prev.published,
      featured: input.featured !== undefined ? Boolean(input.featured) : prev.featured,
      order: typeof input.order === 'number' ? input.order : prev.order,
      updatedAt: now,
    };
    state.projects[existingIdx] = updated;
    state.projects.sort((a, b) => a.order - b.order);
    state.projects.forEach((p, i) => {
      p.order = i + 1;
      p.index = String(i + 1).padStart(2, '0');
    });
    await saveCmsState(state);
    await syncProjectToNeon(updated);
    return { project: updated, projects: state.projects };
  }

  const nextOrder = state.projects.length + 1;
  const slugId =
    (input.id ?? '').trim() ||
    `proj_${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}_${Date.now().toString(36)}`;

  const created: CmsProject = {
    id: slugId,
    index: String(nextOrder).padStart(2, '0'),
    title: input.title.trim(),
    subtitle: (input.subtitle ?? 'Custom Engineered Digital Platform').trim(),
    category: validCategory,
    url: cleanUrl,
    displayUrl,
    liveScreenshot: (input.liveScreenshot ?? '').trim() || '/screenshots/crosx-live.png',
    studioVisual: (input.studioVisual ?? '').trim() || '/images/project-crosx.png',
    summary: (input.summary ?? 'Engineered and shipped by CROSX DEV STUDIO.').trim(),
    architectureOverview: (
      input.architectureOverview ??
      'Modular full-stack TypeScript architecture with responsive dark/light choreography.'
    ).trim(),
    engineeringHighlights:
      Array.isArray(input.engineeringHighlights) && input.engineeringHighlights.length > 0
        ? input.engineeringHighlights.map((s) => s.trim()).filter(Boolean)
        : [
            'High-velocity frontend engineered with Next.js, React, and Tailwind CSS',
            'Type-safe API and relational PostgreSQL data layer',
            'Responsive dual-theme interface verified across desktop and mobile',
          ],
    stack:
      Array.isArray(input.stack) && input.stack.length > 0
        ? input.stack.map((s) => s.trim()).filter(Boolean)
        : ['Next.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL'],
    deliverables:
      Array.isArray(input.deliverables) && input.deliverables.length > 0
        ? input.deliverables.map((s) => s.trim()).filter(Boolean)
        : ['Full-Stack Web Platform', 'Responsive Design System'],
    layoutSpan: input.layoutSpan === 'wide' ? 'wide' : 'split',
    published: input.published !== undefined ? Boolean(input.published) : true,
    featured: input.featured !== undefined ? Boolean(input.featured) : true,
    order: nextOrder,
    updatedAt: now,
  };

  state.projects.push(created);
  state.projects.sort((a, b) => a.order - b.order);
  state.projects.forEach((p, i) => {
    p.order = i + 1;
    p.index = String(i + 1).padStart(2, '0');
  });
  await saveCmsState(state);
  await syncProjectToNeon(created);
  return { project: created, projects: state.projects };
}

export async function deleteCmsProject(id: string): Promise<{
  deleted: boolean;
  projects: CmsProject[];
}> {
  const state = await loadCmsState();
  const before = state.projects.length;
  state.projects = state.projects.filter((p) => p.id !== id);
  if (state.projects.length === before) {
    return { deleted: false, projects: state.projects };
  }
  state.projects.sort((a, b) => a.order - b.order);
  state.projects.forEach((p, i) => {
    p.order = i + 1;
    p.index = String(i + 1).padStart(2, '0');
  });
  await saveCmsState(state);
  await runNeonSqlIfConfigured(`DELETE FROM studio_projects WHERE id = $1;`, [id]);
  return { deleted: true, projects: state.projects };
}

export async function reorderCmsProjects(orderedIds: string[]): Promise<CmsProject[]> {
  const state = await loadCmsState();
  const map = new Map(state.projects.map((p) => [p.id, p]));
  const next: CmsProject[] = [];
  for (const id of orderedIds) {
    const found = map.get(id);
    if (found) {
      next.push(found);
      map.delete(id);
    }
  }
  for (const remaining of map.values()) {
    next.push(remaining);
  }
  next.forEach((p, idx) => {
    p.order = idx + 1;
    p.index = String(idx + 1).padStart(2, '0');
  });
  state.projects = next;
  await saveCmsState(state);
  await Promise.all(state.projects.map((p) => syncProjectToNeon(p)));
  return state.projects;
}

export async function listDynamicFormFields(options?: {
  includeDisabled?: boolean;
}): Promise<DynamicFormField[]> {
  const state = await loadCmsState();
  const sorted = [...state.formFields].sort((a, b) => a.order - b.order);
  if (options?.includeDisabled) {
    return sorted;
  }
  return sorted.filter((f) => f.enabled);
}

export async function upsertDynamicFormField(
  input: Partial<DynamicFormField>
): Promise<{
  ok: boolean;
  error?: string;
  field?: DynamicFormField;
  fields?: DynamicFormField[];
}> {
  const validation = validateFormFieldDefinition(input);
  if (!validation.valid || !validation.sanitized) {
    return { ok: false, error: validation.error || 'Invalid form field configuration.' };
  }

  const state = await loadCmsState();
  const existingIdx = input.id
    ? state.formFields.findIndex((f) => f.id === input.id)
    : -1;

  if (existingIdx >= 0) {
    const prev = state.formFields[existingIdx];
    const updated: DynamicFormField = {
      ...prev,
      ...validation.sanitized,
      id: prev.id,
      order: typeof input.order === 'number' ? input.order : prev.order,
    };
    state.formFields[existingIdx] = updated;
    state.formFields.sort((a, b) => a.order - b.order);
    state.formFields.forEach((f, idx) => {
      f.order = idx + 1;
    });
    await saveCmsState(state);
    await syncFormFieldToNeon(updated);
    return { ok: true, field: updated, fields: state.formFields };
  }

  let uniqueKey = validation.sanitized.key;
  let counter = 1;
  while (state.formFields.some((f) => f.key === uniqueKey)) {
    counter += 1;
    uniqueKey = `${validation.sanitized.key}_${counter}`;
  }

  const created: DynamicFormField = {
    id: `field_${uniqueKey}_${Date.now().toString(36)}`,
    ...validation.sanitized,
    key: uniqueKey,
    order: state.formFields.length + 1,
  };

  state.formFields.push(created);
  state.formFields.sort((a, b) => a.order - b.order);
  state.formFields.forEach((f, idx) => {
    f.order = idx + 1;
  });
  await saveCmsState(state);
  await syncFormFieldToNeon(created);
  return { ok: true, field: created, fields: state.formFields };
}

export async function deleteDynamicFormField(id: string): Promise<{
  deleted: boolean;
  fields: DynamicFormField[];
}> {
  const state = await loadCmsState();
  const before = state.formFields.length;
  state.formFields = state.formFields.filter((f) => f.id !== id);
  if (state.formFields.length === before) {
    return { deleted: false, fields: state.formFields };
  }
  state.formFields.sort((a, b) => a.order - b.order);
  state.formFields.forEach((f, idx) => {
    f.order = idx + 1;
  });
  await saveCmsState(state);
  await runNeonSqlIfConfigured(`DELETE FROM studio_form_fields WHERE id = $1;`, [id]);
  return { deleted: true, fields: state.formFields };
}

export async function reorderDynamicFormFields(
  orderedIds: string[]
): Promise<DynamicFormField[]> {
  const state = await loadCmsState();
  const map = new Map(state.formFields.map((f) => [f.id, f]));
  const next: DynamicFormField[] = [];
  for (const id of orderedIds) {
    const found = map.get(id);
    if (found) {
      next.push(found);
      map.delete(id);
    }
  }
  for (const remaining of map.values()) {
    next.push(remaining);
  }
  next.forEach((f, idx) => {
    f.order = idx + 1;
  });
  state.formFields = next;
  await saveCmsState(state);
  await Promise.all(state.formFields.map((f) => syncFormFieldToNeon(f)));
  return state.formFields;
}

export async function createSupportTicketFromInquiry(input: {
  id?: string;
  clientName: string;
  clientEmail: string;
  company: string;
  serviceScope: string;
  timeline: string;
  projectBrief: string;
  submittedFields: SubmittedFieldSnapshot[];
  createdAt?: string;
}): Promise<{
  ticket: SupportTicket;
  trackingToken: string;
}> {
  const state = await loadCmsState();
  state.ticketSequence += 1;
  const ticketNumber = formatTicketNumber(state.ticketSequence, 2026);
  const trackingToken = generateTrackingToken();
  const trackingTokenHash = hashTrackingToken(trackingToken);
  const now = input.createdAt || new Date().toISOString();

  const initialMessage: TicketMessage = {
    id: `msg_${Date.now().toString(36)}_1`,
    ticketNumber,
    senderRole: 'CLIENT',
    senderName: input.clientName,
    body: input.projectBrief,
    isInternal: false,
    createdAt: now,
  };

  const ticket: SupportTicket = {
    id: input.id || `tkt_${Date.now().toString(36)}`,
    ticketNumber,
    trackingTokenHash,
    adminTrackingTokenRef: trackingToken,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    company: input.company,
    serviceScope: input.serviceScope,
    timeline: input.timeline,
    projectBrief: input.projectBrief,
    submittedFields: input.submittedFields,
    status: 'NEW',
    isRead: false,
    createdAt: now,
    updatedAt: now,
    messages: [initialMessage],
  };

  state.tickets = [ticket, ...state.tickets];
  await saveCmsState(state);
  await syncTicketToNeon(ticket);
  await syncTicketMessageToNeon(initialMessage);

  return { ticket, trackingToken };
}

export async function listSupportTickets(filters?: {
  search?: string;
  status?: TicketStatus | 'ALL';
  sort?: 'newest' | 'oldest';
}): Promise<SupportTicket[]> {
  const state = await loadCmsState();
  let list = [...state.tickets];

  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter((t) => t.status === filters.status);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.clientEmail.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        t.serviceScope.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return filters?.sort === 'oldest' ? ta - tb : tb - ta;
  });

  return list;
}

export async function getSupportTicketByNumber(
  ticketNumber: string
): Promise<SupportTicket | null> {
  const state = await loadCmsState();
  const normalized = ticketNumber.trim().toUpperCase();
  return state.tickets.find((t) => t.ticketNumber.toUpperCase() === normalized) ?? null;
}

export async function updateSupportTicketAdmin(
  ticketNumber: string,
  updates: {
    status?: TicketStatus;
    isRead?: boolean;
  }
): Promise<SupportTicket | null> {
  const state = await loadCmsState();
  const normalized = ticketNumber.trim().toUpperCase();
  const ticket = state.tickets.find((t) => t.ticketNumber.toUpperCase() === normalized);
  if (!ticket) return null;

  if (updates.status && ALL_TICKET_STATUSES.includes(updates.status)) {
    ticket.status = updates.status;
  }
  if (typeof updates.isRead === 'boolean') {
    ticket.isRead = updates.isRead;
  }
  ticket.updatedAt = new Date().toISOString();
  await saveCmsState(state);
  await syncTicketToNeon(ticket);
  return ticket;
}

export async function addAdminTicketMessage(input: {
  ticketNumber: string;
  body: string;
  isInternal: boolean;
  statusAfterReply?: TicketStatus;
}): Promise<SupportTicket | null> {
  const state = await loadCmsState();
  const normalized = input.ticketNumber.trim().toUpperCase();
  const ticket = state.tickets.find((t) => t.ticketNumber.toUpperCase() === normalized);
  if (!ticket) return null;

  const cleanBody = input.body.trim();
  if (!cleanBody) return null;

  const now = new Date().toISOString();
  const msg: TicketMessage = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ticketNumber: ticket.ticketNumber,
    senderRole: 'ADMIN',
    senderName: 'IRON CLAD · CROSX DEV STUDIO',
    body: cleanBody,
    isInternal: Boolean(input.isInternal),
    createdAt: now,
  };

  ticket.messages.push(msg);
  ticket.isRead = true;
  if (input.statusAfterReply && ALL_TICKET_STATUSES.includes(input.statusAfterReply)) {
    ticket.status = input.statusAfterReply;
  } else if (!input.isInternal && ticket.status === 'NEW') {
    ticket.status = 'IN_PROGRESS';
  }
  ticket.updatedAt = now;

  await saveCmsState(state);
  await syncTicketToNeon(ticket);
  await syncTicketMessageToNeon(msg);
  return ticket;
}

export async function deleteSupportTicket(ticketNumber: string): Promise<boolean> {
  const state = await loadCmsState();
  const normalized = ticketNumber.trim().toUpperCase();
  const before = state.tickets.length;
  state.tickets = state.tickets.filter((t) => t.ticketNumber.toUpperCase() !== normalized);
  if (state.tickets.length === before) return false;
  await saveCmsState(state);
  await runNeonSqlIfConfigured(
    `DELETE FROM studio_tickets WHERE UPPER(ticket_number) = $1;`,
    [normalized]
  );
  return true;
}

export async function verifyAndLookupPublicTicket(input: {
  ticketNumber: string;
  trackingToken: string;
}): Promise<{
  ok: boolean;
  error?: string;
  ticket?: PublicTicketView;
}> {
  const normalizedId = (input.ticketNumber ?? '').trim().toUpperCase();
  const providedToken = (input.trackingToken ?? '').trim();

  if (!normalizedId || !providedToken) {
    return {
      ok: false,
      error: 'Both Ticket ID and Security Tracking Token are required.',
    };
  }

  const ticket = await getSupportTicketByNumber(normalizedId);
  if (
    !ticket ||
    !verifyTrackingTokenConstantTime(providedToken, ticket.trackingTokenHash)
  ) {
    return {
      ok: false,
      error:
        'Invalid Ticket ID or Tracking Token. Please verify your credentials from your inquiry confirmation.',
    };
  }

  return {
    ok: true,
    ticket: sanitizePublicTicketView(ticket),
  };
}

export async function addClientFollowUpMessage(input: {
  ticketNumber: string;
  trackingToken: string;
  body: string;
}): Promise<{
  ok: boolean;
  error?: string;
  ticket?: PublicTicketView;
}> {
  const normalizedId = (input.ticketNumber ?? '').trim().toUpperCase();
  const providedToken = (input.trackingToken ?? '').trim();
  const cleanBody = (input.body ?? '').trim();

  if (!normalizedId || !providedToken) {
    return {
      ok: false,
      error: 'Both Ticket ID and Security Tracking Token are required.',
    };
  }

  if (!cleanBody || cleanBody.length < 2) {
    return {
      ok: false,
      error: 'Please enter a message before sending.',
    };
  }
  if (cleanBody.length > 2500) {
    return {
      ok: false,
      error: 'Follow-up message cannot exceed 2500 characters.',
    };
  }

  const state = await loadCmsState();
  const ticket = state.tickets.find((t) => t.ticketNumber.toUpperCase() === normalizedId);

  if (
    !ticket ||
    !verifyTrackingTokenConstantTime(providedToken, ticket.trackingTokenHash)
  ) {
    return {
      ok: false,
      error: 'Unauthorized ticket access. Invalid Ticket ID or Tracking Token.',
    };
  }

  const now = new Date().toISOString();
  const msg: TicketMessage = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ticketNumber: ticket.ticketNumber,
    senderRole: 'CLIENT',
    senderName: ticket.clientName,
    body: cleanBody,
    isInternal: false,
    createdAt: now,
  };

  ticket.messages.push(msg);
  ticket.isRead = false;
  if (ticket.status === 'WAITING_FOR_CLIENT' || ticket.status === 'RESOLVED') {
    ticket.status = 'OPEN';
  }
  ticket.updatedAt = now;

  await saveCmsState(state);
  await syncTicketToNeon(ticket);
  await syncTicketMessageToNeon(msg);

  return {
    ok: true,
    ticket: sanitizePublicTicketView(ticket),
  };
}

export async function getAdminOverviewStats(): Promise<{
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalInquiries: number;
    unreadMessages: number;
    openTickets: number;
    resolvedTickets: number;
  };
  recentActivity: Array<{
    id: string;
    ticketNumber: string;
    clientName: string;
    clientEmail: string;
    serviceScope: string;
    status: TicketStatus;
    isRead: boolean;
    updatedAt: string;
    lastMessagePreview: string;
  }>;
  neonTelemetry: NeonConnectionTelemetry;
}> {
  const state = await loadCmsState();
  const config = resolveNeonConfig();

  const totalProjects = state.projects.length;
  const activeProjects = state.projects.filter((p) => p.published).length;
  const totalInquiries = state.tickets.length;
  const unreadMessages = state.tickets.filter((t) => !t.isRead).length;
  const openTickets = state.tickets.filter(
    (t) =>
      t.status === 'NEW' ||
      t.status === 'OPEN' ||
      t.status === 'IN_PROGRESS' ||
      t.status === 'WAITING_FOR_CLIENT'
  ).length;
  const resolvedTickets = state.tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  ).length;

  const recentActivity = [...state.tickets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)
    .map((t) => {
      const lastMsg = t.messages[t.messages.length - 1];
      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        clientName: t.clientName,
        clientEmail: t.clientEmail,
        serviceScope: t.serviceScope,
        status: t.status,
        isRead: t.isRead,
        updatedAt: t.updatedAt,
        lastMessagePreview: lastMsg ? lastMsg.body.slice(0, 110) : t.projectBrief.slice(0, 110),
      };
    });

  const neonTelemetry: NeonConnectionTelemetry = global._lastNeonTelemetry ?? {
    configured: config.configured,
    secretKeyUsed: config.secretKeyUsed,
    protocolMode: config.protocolMode,
    maskedEndpoint: config.maskedEndpoint,
    region: config.region,
    databaseName: config.databaseName,
    gatewayReachable: config.configured,
    neonRequestId: null,
  };

  return {
    stats: {
      totalProjects,
      activeProjects,
      totalInquiries,
      unreadMessages,
      openTickets,
      resolvedTickets,
    },
    recentActivity,
    neonTelemetry,
  };
}
