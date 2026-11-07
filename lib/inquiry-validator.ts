export interface ProjectInquiryInput {
  name: string;
  email: string;
  company?: string;
  serviceScope: string;
  timeline: string;
  projectBrief: string;
}

export interface ProjectInquiryRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  serviceScope: string;
  timeline: string;
  projectBrief: string;
  createdAt: string;
  databaseEngine?: string;
  sqlPreview: {
    statement: string;
    params: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ProjectInquiryInput, string>>;
  sanitized?: {
    name: string;
    email: string;
    company: string;
    serviceScope: string;
    timeline: string;
    projectBrief: string;
  };
}

export const ALLOWED_SERVICE_SCOPES = [
  'Website Development (Next.js / Vite / Tailwind)',
  'Full-Stack Web App (React / TanStack / Next.js)',
  'Mobile App (React Native + Expo)',
  'SaaS Platform (Next.js / NestJS / Neon DB & PostgreSQL)',
  'Backend & API Engineering (NestJS / Node.js / Neon DB & PostgreSQL)',
  'Dashboards & Workflow Automation',
] as const;

export const ALLOWED_TIMELINES = [
  'Immediate (2–4 Weeks)',
  'Standard (1–2 Months)',
  'Comprehensive (3+ Months)',
  'Architecture Advisory',
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateInquiryInput(input: Partial<ProjectInquiryInput>): ValidationResult {
  const errors: Partial<Record<keyof ProjectInquiryInput, string>> = {};

  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const company = (input.company ?? '').trim();
  const serviceScope = (input.serviceScope ?? '').trim();
  const timeline = (input.timeline ?? '').trim();
  const projectBrief = (input.projectBrief ?? '').trim();

  if (!name) {
    errors.name = 'Please enter your full name.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (name.length > 120) {
    errors.name = 'Name cannot exceed 120 characters.';
  }

  if (!email) {
    errors.email = 'Please enter a valid work email address.';
  } else if (!EMAIL_REGEX.test(email) || email.length > 180) {
    errors.email = 'Please enter a valid email address (e.g. name@company.com).';
  }

  if (company.length > 140) {
    errors.company = 'Company name cannot exceed 140 characters.';
  }

  if (!serviceScope) {
    errors.serviceScope = 'Please select a primary engineering scope.';
  }

  if (!timeline) {
    errors.timeline = 'Please select an estimated delivery timeline.';
  }

  if (!projectBrief) {
    errors.projectBrief = 'Please describe your project goals, technical stack, or requirements.';
  } else if (projectBrief.length < 15) {
    errors.projectBrief = 'Project brief should be at least 15 characters so we can scope accurately.';
  } else if (projectBrief.length > 2500) {
    errors.projectBrief = 'Project brief cannot exceed 2500 characters.';
  }

  const valid = Object.keys(errors).length === 0;

  if (!valid) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      name,
      email,
      company: company || 'Independent / Stealth Venture',
      serviceScope,
      timeline,
      projectBrief,
    },
  };
}

export function buildPostgresInquiryRecord(
  sanitized: NonNullable<ValidationResult['sanitized']>,
  nowIso: string = new Date().toISOString(),
  id: string = `inq_${Date.now().toString(36)}`
): ProjectInquiryRecord {
  const statement =
    'INSERT INTO studio_project_inquiries (id, client_name, client_email, company_name, service_scope, timeline_window, project_brief, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;';
  const params = [
    id,
    sanitized.name,
    sanitized.email,
    sanitized.company,
    sanitized.serviceScope,
    sanitized.timeline,
    sanitized.projectBrief,
    nowIso,
  ];

  return {
    id,
    name: sanitized.name,
    email: sanitized.email,
    company: sanitized.company,
    serviceScope: sanitized.serviceScope,
    timeline: sanitized.timeline,
    projectBrief: sanitized.projectBrief,
    createdAt: nowIso,
    databaseEngine: 'Neon Serverless PostgreSQL',
    sqlPreview: {
      statement,
      params,
    },
  };
}
