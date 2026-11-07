-- =============================================================================
-- CROSX DEV STUDIO® — NEON SERVERLESS POSTGRESQL PRODUCTION SCHEMA & SEED
-- Engine Compatibility: PostgreSQL 15 / 16 / 17 (Neon Serverless Pooler & Direct)
-- Safe & Backward-Compatible: Uses CREATE TABLE IF NOT EXISTS & ON CONFLICT
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. PUBLIC PROJECT INQUIRIES TABLE (BACKWARD-COMPATIBLE PRESERVATION)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_project_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Independent / Stealth Venture',
  service_scope TEXT NOT NULL,
  timeline TEXT NOT NULL,
  project_brief TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_project_inquiries_email
  ON studio_project_inquiries (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_studio_project_inquiries_created_at
  ON studio_project_inquiries (created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. PORTFOLIO PROJECTS CMS TABLE (studio_projects)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_projects (
  id TEXT PRIMARY KEY,
  index_number TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'Enterprise Web Platform',
      'Engineering Tooling & SaaS',
      'Full-Stack Service & Commerce'
    )
  ),
  url TEXT NOT NULL,
  display_url TEXT NOT NULL,
  live_screenshot TEXT NOT NULL,
  studio_visual TEXT NOT NULL,
  summary TEXT NOT NULL,
  architecture_overview TEXT NOT NULL,
  engineering_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout_span TEXT NOT NULL DEFAULT 'split' CHECK (layout_span IN ('wide', 'split')),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_projects_published_order
  ON studio_projects (published, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_studio_projects_category
  ON studio_projects (category);

DROP TRIGGER IF EXISTS trg_studio_projects_updated_at ON studio_projects;
CREATE TRIGGER trg_studio_projects_updated_at
  BEFORE UPDATE ON studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION set_current_timestamp_updated_at();

-- -----------------------------------------------------------------------------
-- 3. DYNAMIC PROJECT SPECIFICATIONS LEDGER TABLE (studio_form_fields)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_form_fields (
  id TEXT PRIMARY KEY,
  field_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT NOT NULL DEFAULT '',
  field_type TEXT NOT NULL CHECK (
    field_type IN ('text', 'email', 'tel', 'number', 'textarea', 'select', 'radio', 'checkbox', 'date')
  ),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  width TEXT NOT NULL DEFAULT 'full' CHECK (width IN ('half', 'third', 'full')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_form_fields_enabled_order
  ON studio_form_fields (enabled, sort_order ASC);

DROP TRIGGER IF EXISTS trg_studio_form_fields_updated_at ON studio_form_fields;
CREATE TRIGGER trg_studio_form_fields_updated_at
  BEFORE UPDATE ON studio_form_fields
  FOR EACH ROW
  EXECUTE FUNCTION set_current_timestamp_updated_at();

-- -----------------------------------------------------------------------------
-- 4. CLIENT SUPPORT TICKETS TABLE (studio_tickets)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS studio_ticket_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS studio_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  tracking_token_hash TEXT NOT NULL,
  admin_tracking_token_ref TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Independent / Stealth Venture',
  service_scope TEXT NOT NULL,
  timeline TEXT NOT NULL,
  project_brief TEXT NOT NULL,
  submitted_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (
    status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED')
  ),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_tickets_ticket_number
  ON studio_tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_studio_tickets_status_updated
  ON studio_tickets (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_tickets_client_email
  ON studio_tickets (LOWER(client_email));
CREATE INDEX IF NOT EXISTS idx_studio_tickets_unread
  ON studio_tickets (is_read) WHERE is_read = FALSE;

DROP TRIGGER IF EXISTS trg_studio_tickets_updated_at ON studio_tickets;
CREATE TRIGGER trg_studio_tickets_updated_at
  BEFORE UPDATE ON studio_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_current_timestamp_updated_at();

-- -----------------------------------------------------------------------------
-- 5. TWO-WAY TICKET CONVERSATION MESSAGES TABLE (studio_ticket_messages)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES studio_tickets(ticket_number) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('CLIENT', 'ADMIN')),
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_ticket_messages_ticket_created
  ON studio_ticket_messages (ticket_number, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_studio_ticket_messages_public_thread
  ON studio_ticket_messages (ticket_number, is_internal, created_at ASC);

-- -----------------------------------------------------------------------------
-- 6. ADMIN CREDENTIAL & SESSION AUDIT TABLE (studio_admin_auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_admin_auth (
  id TEXT PRIMARY KEY DEFAULT 'primary_admin',
  salt_hex TEXT NOT NULL,
  hash_hex TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 120000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. SEED INITIAL PRODUCTION PROJECTS (PRESERVES EXISTING RECORDS)
-- -----------------------------------------------------------------------------
INSERT INTO studio_projects (
  id,
  index_number,
  title,
  subtitle,
  category,
  url,
  display_url,
  live_screenshot,
  studio_visual,
  summary,
  architecture_overview,
  engineering_highlights,
  stack,
  deliverables,
  layout_span,
  published,
  featured,
  sort_order
)
VALUES
  (
    'crosx-main',
    '01',
    'CrosX',
    'Flagship Digital Ecosystem & Web Platform',
    'Enterprise Web Platform',
    'https://crosx.in',
    'crosx.in',
    '/screenshots/crosx-live.png',
    '/images/project-crosx.png',
    'The primary flagship web platform for the CrosX ecosystem—engineered with precision dark/light UI architecture, instantaneous route transitions, and responsive fluid typography.',
    'Built on a server-first React & Next.js architecture with edge-cached static and dynamic routes, custom design token system, and zero-layout-shift asset delivery.',
    '["Sub-second initial page load with SSR & edge caching","Custom design system with high-contrast dark & daylight themes","Fluid responsive grid engineered for desktop, tablet, and mobile viewports","SEO-hardened semantic markup, OpenGraph pipelines, and structured metadata"]'::jsonb,
    '["Next.js","React","TypeScript","Tailwind CSS","Framer Motion","Node.js"]'::jsonb,
    '["Full-Stack Web Platform","Design System Architecture","Responsive UI/UX","Edge Deployment"]'::jsonb,
    'wide',
    TRUE,
    TRUE,
    1
  ),
  (
    'crosx-rca',
    '02',
    'CrosX RCA',
    'Dedicated Subdomain Web Application & Operations Portal',
    'Engineering Tooling & SaaS',
    'https://rca.crosx.in',
    'rca.crosx.in',
    '/screenshots/rca-live.png',
    '/images/project-rca.png',
    'A specialized web application deployed on the rca.crosx.in subdomain—designed for structured operational workflows, real-time state management, and high-density data interaction.',
    'Multi-tenant subdomain architecture sharing core authentication and design primitives with the main CrosX platform while isolating specialized application state and APIs.',
    '["Isolated subdomain deployment (rca.crosx.in) with unified brand identity","Asynchronous client-state synchronization with TanStack Query & strict TypeScript schemas","High-density interactive interface optimized for rapid operator workflows","Resilient API layer with structured validation and error recovery"]'::jsonb,
    '["React","Next.js","TypeScript","TanStack Query","Tailwind CSS","REST / RPC APIs"]'::jsonb,
    '["Subdomain Web App","State & Data Architecture","Interactive Dashboard UI","API Integration"]'::jsonb,
    'split',
    TRUE,
    TRUE,
    2
  ),
  (
    'sohan-pipeline',
    '03',
    'Sohan Pipelines',
    'Industrial & Infrastructure Digital Web Presence',
    'Full-Stack Service & Commerce',
    'https://sohanpipeline.in',
    'sohanpipeline.in',
    '/screenshots/sohan-live.png',
    '/images/project-sohan.png',
    'A modern commercial and industrial web platform built for Sohan Pipelines—translating heavy infrastructure capabilities, product catalogs, and B2B inquiry flows into a fast, authoritative digital experience.',
    'Performance-tuned web platform featuring structured product categorization, fast mobile field access, and direct client quotation/inquiry pipelines.',
    '["Clear industrial product & specification taxonomy for B2B buyers","Mobile-first performance optimization for field engineers and procurement teams","Direct quotation & contact conversion flows with server-side validation","Search-engine optimized structure for regional and national industrial discovery"]'::jsonb,
    '["Next.js","React","TypeScript","Tailwind CSS","Node.js","PostgreSQL"]'::jsonb,
    '["Corporate Web Platform","Product & Service Catalog","B2B Lead Capture","SEO & Performance Optimization"]'::jsonb,
    'split',
    TRUE,
    TRUE,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. SEED DEFAULT PROJECT SPECIFICATIONS LEDGER FIELDS
-- -----------------------------------------------------------------------------
INSERT INTO studio_form_fields (
  id,
  field_key,
  label,
  placeholder,
  field_type,
  required,
  options,
  sort_order,
  enabled,
  width
)
VALUES
  (
    'fld_name',
    'name',
    'Your Name',
    'Alex Mercer',
    'text',
    TRUE,
    '[]'::jsonb,
    1,
    TRUE,
    'third'
  ),
  (
    'fld_email',
    'email',
    'Work Email',
    'alex@company.com',
    'email',
    TRUE,
    '[]'::jsonb,
    2,
    TRUE,
    'third'
  ),
  (
    'fld_company',
    'company',
    'Company / Venture',
    'Acme Systems Inc.',
    'text',
    FALSE,
    '[]'::jsonb,
    3,
    TRUE,
    'third'
  ),
  (
    'fld_service_scope',
    'serviceScope',
    'Engineering Scope',
    'Select Engineering Scope',
    'select',
    TRUE,
    '["Website Development (Next.js / Vite / Tailwind)","Full-Stack Web App (React / TanStack / Next.js)","Mobile App (React Native + Expo)","Backend & API Engineering (NestJS / Node.js / Neon DB & PostgreSQL)","SaaS Platform (Next.js / NestJS / Neon DB & PostgreSQL)","Complete Digital Product (Web + Mobile + Cloud)"]'::jsonb,
    4,
    TRUE,
    'half'
  ),
  (
    'fld_timeline',
    'timeline',
    'Delivery Horizon',
    'Select Delivery Horizon',
    'select',
    TRUE,
    '["Immediate Sprint (2–4 Weeks)","Standard Production Release (1–2 Months)","Full Platform Architecture (2–4 Months)","Long-Term Engineering Partner"]'::jsonb,
    5,
    TRUE,
    'half'
  ),
  (
    'fld_project_brief',
    'projectBrief',
    'Project Brief & Architectural Objectives',
    'Describe your product vision, target users, required platforms (Web / Mobile / Backend), or reference systems...',
    'textarea',
    TRUE,
    '[]'::jsonb,
    6,
    TRUE,
    'full'
  )
ON CONFLICT (field_key) DO NOTHING;

COMMIT;
