import {
  SELECTED_PROJECTS,
  type ProjectCaseStudy,
} from '@/lib/studio-data';
import {
  ALLOWED_SERVICE_SCOPES,
  ALLOWED_TIMELINES,
} from '@/lib/inquiry-validator';

export type TicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CLIENT'
  | 'RESOLVED'
  | 'CLOSED';

export const ALL_TICKET_STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CLIENT',
  'RESOLVED',
  'CLOSED',
];

export function getTicketStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'NEW':
      return 'bg-[#2544E8]/15 text-[#2544E8] dark:text-[#8BA2FF] border-[#2544E8]/35';
    case 'OPEN':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35';
    case 'IN_PROGRESS':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35';
    case 'WAITING_FOR_CLIENT':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/35';
    case 'RESOLVED':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35';
    case 'CLOSED':
      return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/35';
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/35';
  }
}

export type DynamicFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date';

export const ALLOWED_FIELD_TYPES: DynamicFieldType[] = [
  'text',
  'email',
  'tel',
  'number',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'date',
];

export interface CmsProject extends ProjectCaseStudy {
  published: boolean;
  featured: boolean;
  order: number;
  updatedAt: string;
}

export interface DynamicFormField {
  id: string;
  key: string;
  label: string;
  placeholder: string;
  type: DynamicFieldType;
  required: boolean;
  options: string[];
  order: number;
  enabled: boolean;
  width: 'half' | 'third' | 'full';
}

export interface SubmittedFieldSnapshot {
  key: string;
  label: string;
  type: DynamicFieldType;
  value: string;
}

export interface TicketMessage {
  id: string;
  ticketNumber: string;
  senderRole: 'CLIENT' | 'ADMIN';
  senderName: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  trackingTokenHash: string;
  adminTrackingTokenRef: string;
  clientName: string;
  clientEmail: string;
  company: string;
  serviceScope: string;
  timeline: string;
  projectBrief: string;
  submittedFields: SubmittedFieldSnapshot[];
  status: TicketStatus;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface PublicTicketView {
  ticketNumber: string;
  clientName: string;
  company: string;
  serviceScope: string;
  timeline: string;
  projectBrief: string;
  submittedFields: SubmittedFieldSnapshot[];
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    senderRole: 'CLIENT' | 'ADMIN';
    senderName: string;
    body: string;
    createdAt: string;
  }>;
}

export function formatTicketNumber(sequence: number, year: number = 2026): string {
  const safeSeq = Math.max(1, Math.floor(sequence));
  return `CROSX-${year}-${String(safeSeq).padStart(5, '0')}`;
}

export function buildDefaultProjects(): CmsProject[] {
  const now = '2026-01-15T00:00:00.000Z';
  return SELECTED_PROJECTS.map((proj, idx) => ({
    ...proj,
    index: String(idx + 1).padStart(2, '0'),
    published: true,
    featured: true,
    order: idx + 1,
    updatedAt: now,
  }));
}

export function buildDefaultFormFields(): DynamicFormField[] {
  return [
    {
      id: 'field_name',
      key: 'name',
      label: 'Your Name',
      placeholder: 'e.g. Vikram Sen',
      type: 'text',
      required: true,
      options: [],
      order: 1,
      enabled: true,
      width: 'half',
    },
    {
      id: 'field_email',
      key: 'email',
      label: 'Work Email',
      placeholder: 'name@company.com',
      type: 'email',
      required: true,
      options: [],
      order: 2,
      enabled: true,
      width: 'half',
    },
    {
      id: 'field_company',
      key: 'company',
      label: 'Company / Venture',
      placeholder: 'Company or Venture',
      type: 'text',
      required: false,
      options: [],
      order: 3,
      enabled: true,
      width: 'third',
    },
    {
      id: 'field_service_scope',
      key: 'serviceScope',
      label: 'Engineering Scope',
      placeholder: 'Select primary engineering scope',
      type: 'select',
      required: true,
      options: [...ALLOWED_SERVICE_SCOPES],
      order: 4,
      enabled: true,
      width: 'third',
    },
    {
      id: 'field_timeline',
      key: 'timeline',
      label: 'Delivery Horizon',
      placeholder: 'Select estimated delivery timeline',
      type: 'select',
      required: true,
      options: [...ALLOWED_TIMELINES],
      order: 5,
      enabled: true,
      width: 'third',
    },
    {
      id: 'field_project_brief',
      key: 'projectBrief',
      label: 'Project Brief & Architectural Objectives',
      placeholder:
        'Describe the Website, Web App, or React Native + Expo Mobile App you want to build, core workflows, and target timeline...',
      type: 'textarea',
      required: true,
      options: [],
      order: 6,
      enabled: true,
      width: 'full',
    },
  ];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateFormFieldDefinition(input: Partial<DynamicFormField>): {
  valid: boolean;
  error?: string;
  sanitized?: Omit<DynamicFormField, 'id' | 'order'>;
} {
  const label = (input.label ?? '').trim();
  if (!label || label.length < 2 || label.length > 90) {
    return { valid: false, error: 'Field label must be between 2 and 90 characters.' };
  }

  const rawKey = (input.key ?? label)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!rawKey) {
    return { valid: false, error: 'Field key must contain alphanumeric characters.' };
  }

  const type = input.type ?? 'text';
  if (!ALLOWED_FIELD_TYPES.includes(type)) {
    return { valid: false, error: `Unsupported field input type: ${type}` };
  }

  const placeholder = (input.placeholder ?? '').trim().slice(0, 180);
  const required = Boolean(input.required);
  const enabled = input.enabled !== undefined ? Boolean(input.enabled) : true;
  const width: 'half' | 'third' | 'full' =
    input.width === 'half' || input.width === 'third' || input.width === 'full'
      ? input.width
      : type === 'textarea'
      ? 'full'
      : 'half';

  const options = Array.isArray(input.options)
    ? input.options.map((o) => String(o).trim()).filter(Boolean)
    : [];

  if ((type === 'select' || type === 'radio') && options.length === 0) {
    return {
      valid: false,
      error: `Fields of type "${type}" require at least one option.`,
    };
  }

  return {
    valid: true,
    sanitized: {
      key: rawKey,
      label,
      placeholder,
      type,
      required,
      options,
      enabled,
      width,
    },
  };
}

export function validateDynamicSubmission(
  payload: Record<string, unknown>,
  fields: DynamicFormField[]
): {
  valid: boolean;
  errors: Record<string, string>;
  extractedCore: {
    name: string;
    email: string;
    company: string;
    serviceScope: string;
    timeline: string;
    projectBrief: string;
  };
  submittedFields: SubmittedFieldSnapshot[];
} {
  const errors: Record<string, string> = {};
  const enabledFields = [...fields]
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  const submittedFields: SubmittedFieldSnapshot[] = [];

  for (const field of enabledFields) {
    const rawVal = payload[field.key];
    const strVal =
      typeof rawVal === 'boolean'
        ? rawVal
          ? 'Yes'
          : 'No'
        : rawVal === null || rawVal === undefined
        ? ''
        : String(rawVal).trim();

    if (field.required) {
      if (field.type === 'checkbox') {
        const checked = rawVal === true || strVal.toLowerCase() === 'true' || strVal === 'Yes';
        if (!checked) {
          errors[field.key] = `Please check "${field.label}".`;
          continue;
        }
      } else if (!strVal) {
        errors[field.key] = `${field.label} is required.`;
        continue;
      }
    }

    if (strVal) {
      if (field.type === 'email' && (!EMAIL_REGEX.test(strVal) || strVal.length > 180)) {
        errors[field.key] = 'Please enter a valid email address (e.g. name@company.com).';
        continue;
      }
      if (field.type === 'number' && Number.isNaN(Number(strVal))) {
        errors[field.key] = `${field.label} must be a valid number.`;
        continue;
      }
      if (field.type === 'tel' && strVal.length < 6) {
        errors[field.key] = `Please enter a valid phone/telephone number.`;
        continue;
      }
      if (field.type === 'textarea' && field.key === 'projectBrief' && strVal.length < 15) {
        errors[field.key] =
          'Project brief should be at least 15 characters so we can scope accurately.';
        continue;
      }
      if (
        (field.type === 'select' || field.type === 'radio') &&
        field.options.length > 0 &&
        !field.options.includes(strVal)
      ) {
        errors[field.key] = `Please select a valid option for ${field.label}.`;
        continue;
      }
    }

    submittedFields.push({
      key: field.key,
      label: field.label,
      type: field.type,
      value:
        field.type === 'checkbox'
          ? rawVal === true || strVal.toLowerCase() === 'true' || strVal === 'Yes'
            ? 'Yes'
            : 'No'
          : strVal || '—',
    });
  }

  const rawName = String(payload.name ?? '').trim();
  const rawEmail = String(payload.email ?? '').trim().toLowerCase();
  const rawCompany = String(payload.company ?? '').trim();
  const rawScope = String(payload.serviceScope ?? '').trim();
  const rawTimeline = String(payload.timeline ?? '').trim();
  const rawBrief = String(payload.projectBrief ?? '').trim();

  const firstTextSnap = submittedFields.find((s) => s.type === 'text' && s.value !== '—');
  const firstEmailSnap = submittedFields.find((s) => s.type === 'email' && s.value !== '—');
  const firstAreaSnap = submittedFields.find((s) => s.type === 'textarea' && s.value !== '—');

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    extractedCore: {
      name: rawName || firstTextSnap?.value || 'Studio Client',
      email: rawEmail || firstEmailSnap?.value || 'client@crosx.in',
      company: rawCompany || 'Independent / Venture',
      serviceScope: rawScope || ALLOWED_SERVICE_SCOPES[0],
      timeline: rawTimeline || ALLOWED_TIMELINES[1],
      projectBrief: rawBrief || firstAreaSnap?.value || 'Submitted via Project Specifications Ledger.',
    },
    submittedFields,
  };
}

export function sanitizePublicTicketView(ticket: SupportTicket): PublicTicketView {
  return {
    ticketNumber: ticket.ticketNumber,
    clientName: ticket.clientName,
    company: ticket.company,
    serviceScope: ticket.serviceScope,
    timeline: ticket.timeline,
    projectBrief: ticket.projectBrief,
    submittedFields: ticket.submittedFields,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    messages: ticket.messages
      .filter((m) => !m.isInternal)
      .map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt,
      })),
  };
}
