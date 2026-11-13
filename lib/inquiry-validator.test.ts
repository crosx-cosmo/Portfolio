import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInquiryInput, buildPostgresInquiryRecord } from './inquiry-validator';
import { normalizeNeonSecret, resolveNeonConfig } from './neon-db';
import {
  computeCardTilt,
  WEIGHTLESS_TILT_SPRING,
  getSectionParallaxKeyframes,
} from './tilt-math';
import {
  STUDIO_BRAND,
  SELECTED_PROJECTS,
  EXPERTISE_DOMAINS,
  PROCESS_STAGES,
  TECH_STACK_ARSENAL,
  BUILDABLE_CATEGORIES,
} from './studio-data';

test('computeCardTilt and WEIGHTLESS_TILT_SPRING provide tuned weightless 60fps 3D tilt parameters', () => {
  assert.equal(WEIGHTLESS_TILT_SPRING.stiffness, 150);
  assert.equal(WEIGHTLESS_TILT_SPRING.damping, 20);
  assert.equal(WEIGHTLESS_TILT_SPRING.mass, 0.4);

  // Critical damping ratio zeta = c / (2 * sqrt(k * m)) should be near 1.0 (overdamped/critically damped, no bounce)
  const zeta =
    WEIGHTLESS_TILT_SPRING.damping /
    (2 * Math.sqrt(WEIGHTLESS_TILT_SPRING.stiffness * WEIGHTLESS_TILT_SPRING.mass));
  assert.ok(zeta >= 0.95 && zeta <= 1.35);

  const rect = { left: 100, top: 200, width: 800, height: 500 };

  // Center of card -> 0deg tilt and 0px parallax
  const center = computeCardTilt(500, 450, rect, 3.6, 4);
  assert.equal(center.rotateX, 0);
  assert.equal(center.rotateY, 0);
  assert.equal(center.parallaxX, 0);
  assert.equal(center.parallaxY, 0);
  assert.equal(center.glareX, 50);
  assert.equal(center.glareY, 50);

  // Top-right corner -> positive rotateX (tilts back at top), positive rotateY (tilts right), and clamped parallax
  const topRight = computeCardTilt(900, 200, rect, 3.6, 4);
  assert.equal(topRight.rotateX, 3.6);
  assert.equal(topRight.rotateY, 3.6);
  assert.equal(topRight.parallaxX, 4);
  assert.equal(topRight.parallaxY, -4);
  assert.equal(topRight.glareX, 100);
  assert.equal(topRight.glareY, 0);
});

test('getSectionParallaxKeyframes provides smooth entry/exit curves and respects prefers-reduced-motion', () => {
  const standard = getSectionParallaxKeyframes(false, 28);
  assert.deepEqual(standard.inputRange, [0, 0.22, 0.82, 1]);
  assert.deepEqual(standard.yRange, [28, 0, 0, -13]);
  assert.deepEqual(standard.scaleRange, [0.988, 1, 1, 0.995]);
  assert.deepEqual(standard.opacityRange, [0.86, 1, 1, 0.94]);

  const reduced = getSectionParallaxKeyframes(true, 28);
  assert.deepEqual(reduced.yRange, [0, 0, 0, 0]);
  assert.deepEqual(reduced.scaleRange, [1, 1, 1, 1]);
  assert.deepEqual(reduced.opacityRange, [1, 1, 1, 1]);
});

test('STUDIO_BRAND and TECH_STACK_ARSENAL enforce CROSX DEV STUDIO, IRON CLAD, and full Web + Mobile stack', () => {
  assert.equal(STUDIO_BRAND.name, 'CROSX DEV STUDIO');
  assert.equal(STUDIO_BRAND.founder, 'IRON CLAD');
  assert.equal(
    STUDIO_BRAND.headline,
    'We Build Digital Experiences That Move Businesses Forward.'
  );
  assert.equal(SELECTED_PROJECTS.length, 3);
  assert.deepEqual(
    SELECTED_PROJECTS.map((p) => p.url),
    ['https://crosx.in', 'https://rca.crosx.in', 'https://sohanpipeline.in']
  );
  assert.equal(EXPERTISE_DOMAINS.length, 7);
  assert.equal(TECH_STACK_ARSENAL.length, 3);
  assert.equal(BUILDABLE_CATEGORIES.length, 4);
  assert.deepEqual(
    PROCESS_STAGES.map((s) => s.name),
    ['Discover', 'Plan', 'Design', 'Develop', 'Launch']
  );
});

test('validateInquiryInput rejects empty or invalid inputs with field-specific errors', () => {
  const emptyResult = validateInquiryInput({});
  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.errors.name);
  assert.ok(emptyResult.errors.email);
  assert.ok(emptyResult.errors.serviceScope);
  assert.ok(emptyResult.errors.timeline);
  assert.ok(emptyResult.errors.projectBrief);

  const badEmailAndShortBrief = validateInquiryInput({
    name: 'Alex Mercer',
    email: 'invalid-email',
    serviceScope: 'Mobile App (React Native + Expo)',
    timeline: 'Standard (1–2 Months)',
    projectBrief: 'Too short',
  });
  assert.equal(badEmailAndShortBrief.valid, false);
  assert.ok(badEmailAndShortBrief.errors.email);
  assert.ok(badEmailAndShortBrief.errors.projectBrief);
});

test('validateInquiryInput sanitizes valid input and builds parameterized PostgreSQL record', () => {
  const validResult = validateInquiryInput({
    name: '  Elena Rostova  ',
    email: '  ELENA@VANGUARD.IO ',
    company: '',
    serviceScope: 'Mobile App (React Native + Expo)',
    timeline: 'Standard (1–2 Months)',
    projectBrief: 'We need a cross-platform React Native + Expo mobile app and NestJS PostgreSQL backend.',
  });

  assert.equal(validResult.valid, true);
  assert.ok(validResult.sanitized);
  assert.equal(validResult.sanitized.name, 'Elena Rostova');
  assert.equal(validResult.sanitized.email, 'elena@vanguard.io');
  assert.equal(validResult.sanitized.company, 'Independent / Stealth Venture');

  const record = buildPostgresInquiryRecord(
    validResult.sanitized,
    '2026-11-05T18:00:00.000Z',
    'inq_test_01'
  );
  assert.equal(record.id, 'inq_test_01');
  assert.equal(record.databaseEngine, 'Neon Serverless PostgreSQL');
  assert.equal(record.sqlPreview.params.length, 8);
  assert.ok(record.sqlPreview.statement.includes('INSERT INTO studio_project_inquiries'));

  const backendStack = TECH_STACK_ARSENAL.find((s) => s.id === 'backend-systems');
  assert.ok(backendStack);
  assert.ok(backendStack.technologies.some((t) => t.name.includes('Neon DB')));
});

test('resolveNeonConfig recognizes both Neon Data API REST v1 HTTPS URLs and PostgreSQL connection strings', () => {
  const prev = process.env.NEON_DATABASE_URL;
  try {
    process.env.NEON_DATABASE_URL =
      'https://ep-steep-boa-a1b2c3d4.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
    const dataApiCfg = resolveNeonConfig();
    assert.equal(dataApiCfg.configured, true);
    assert.equal(dataApiCfg.protocolMode, 'neon-data-api-rest-v1');
    assert.equal(dataApiCfg.region, 'ap-southeast-1');
    assert.equal(dataApiCfg.databaseName, 'neondb');
    assert.ok(dataApiCfg.maskedEndpoint.startsWith('ep-steep-boa-••••'));

    process.env.NEON_DATABASE_URL =
      "psql 'postgresql://neondb_owner:secret@ep-cool-sky-998877.us-east-2.aws.neon.tech/neondb?sslmode=require'";
    assert.ok(normalizeNeonSecret(process.env.NEON_DATABASE_URL).startsWith('postgresql://'));
    const sqlCfg = resolveNeonConfig();
    assert.equal(sqlCfg.configured, true);
    assert.equal(sqlCfg.protocolMode, 'neon-serverless-sql');
    assert.equal(sqlCfg.region, 'us-east-2');
    assert.equal(sqlCfg.databaseName, 'neondb');
  } finally {
    process.env.NEON_DATABASE_URL = prev;
  }
});

test('CMS ticket numbering, tracking token verification, dynamic form validation, and internal note filtering', async () => {
  const {
    formatTicketNumber,
    buildDefaultFormFields,
    validateFormFieldDefinition,
    validateDynamicSubmission,
    sanitizePublicTicketView,
  } = await import('./cms-schema');
  const {
    generateTrackingToken,
    hashTrackingToken,
    verifyTrackingTokenConstantTime,
  } = await import('./admin-auth');

  // 1. Readable Ticket ID format "CROSX-2026-00001"
  assert.equal(formatTicketNumber(1, 2026), 'CROSX-2026-00001');
  assert.equal(formatTicketNumber(42, 2026), 'CROSX-2026-00042');

  // 2. Tracking token generation and constant-time hash verification
  const token = generateTrackingToken();
  assert.ok(token.startsWith('trk_'));
  const hash = hashTrackingToken(token);
  assert.equal(verifyTrackingTokenConstantTime(token, hash), true);
  assert.equal(verifyTrackingTokenConstantTime('trk_wrong_token', hash), false);

  // 3. Dynamic form field definition validation
  const badSelect = validateFormFieldDefinition({
    label: 'Budget Tier',
    type: 'select',
    options: [],
  });
  assert.equal(badSelect.valid, false);

  const validSelect = validateFormFieldDefinition({
    label: 'Budget Tier',
    type: 'select',
    required: true,
    options: ['$2k - $5k', '$5k - $15k'],
  });
  assert.equal(validSelect.valid, true);
  assert.equal(validSelect.sanitized?.key, 'Budget_Tier');

  // 4. Dynamic form submission validation & historical snapshot preservation
  const fields = buildDefaultFormFields();
  const subResult = validateDynamicSubmission(
    {
      name: 'Rohan Mehta',
      email: 'rohan@crosx.in',
      company: 'CrosX Ventures',
      serviceScope: 'Website Development (Next.js / Vite / Tailwind)',
      timeline: 'Immediate (2–4 Weeks)',
      projectBrief: 'Need an enterprise SaaS portal with real-time telemetry and admin CMS.',
    },
    fields
  );
  assert.equal(subResult.valid, true);
  assert.equal(subResult.submittedFields.length, 6);

  // 5. Internal admin notes must be strictly stripped from public ticket view
  const publicView = sanitizePublicTicketView({
    id: 'tkt_1',
    ticketNumber: 'CROSX-2026-00001',
    trackingTokenHash: hash,
    adminTrackingTokenRef: token,
    clientName: 'Rohan Mehta',
    clientEmail: 'rohan@crosx.in',
    company: 'CrosX Ventures',
    serviceScope: 'Website Development (Next.js / Vite / Tailwind)',
    timeline: 'Immediate (2–4 Weeks)',
    projectBrief: 'Need an enterprise SaaS portal.',
    submittedFields: subResult.submittedFields,
    status: 'IN_PROGRESS',
    isRead: true,
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T10:05:00.000Z',
    messages: [
      {
        id: 'm1',
        ticketNumber: 'CROSX-2026-00001',
        senderRole: 'CLIENT',
        senderName: 'Rohan Mehta',
        body: 'Initial inquiry message',
        isInternal: false,
        createdAt: '2026-11-06T10:00:00.000Z',
      },
      {
        id: 'm2',
        ticketNumber: 'CROSX-2026-00001',
        senderRole: 'ADMIN',
        senderName: 'IRON CLAD · CROSX DEV STUDIO',
        body: 'SECRET INTERNAL NOTE: Margin calculation 45%',
        isInternal: true,
        createdAt: '2026-11-06T10:02:00.000Z',
      },
      {
        id: 'm3',
        ticketNumber: 'CROSX-2026-00001',
        senderRole: 'ADMIN',
        senderName: 'IRON CLAD · CROSX DEV STUDIO',
        body: 'Public reply: We have reviewed your architecture brief.',
        isInternal: false,
        createdAt: '2026-11-06T10:05:00.000Z',
      },
    ],
  });

  assert.equal(publicView.messages.length, 2);
  assert.ok(
    !publicView.messages.some((m) => m.body.includes('SECRET INTERNAL NOTE'))
  );
  assert.equal('trackingTokenHash' in publicView, false);
  assert.equal('adminTrackingTokenRef' in publicView, false);
});

test('Neon Auth (Managed Better Auth) enforces admin allowlist, rejects invalid passwords, supports password reset, and manages sessions', async () => {
  const {
    isEmailAuthorizedAdmin,
    signInNeonAdminWithEmailPassword,
    requestNeonAdminVerificationToken,
    resetNeonAdminPasswordWithToken,
    getAdminSessionFromToken,
    revokeAdminSessionToken,
  } = await import('./admin-auth');

  // 1. Allowlist verification
  assert.equal(isEmailAuthorizedAdmin('admin@crosx.in'), true);
  assert.equal(isEmailAuthorizedAdmin('taskwalaconnect@gmail.com'), true);
  assert.equal(isEmailAuthorizedAdmin('unauthorized-user@example.com'), false);

  // 2. Unauthorized user rejection (403)
  const unauthorizedAttempt = await signInNeonAdminWithEmailPassword({
    email: 'intruder@example.com',
    password: 'SomePassword123!',
  });
  assert.equal(unauthorizedAttempt.ok, false);
  assert.equal(unauthorizedAttempt.status, 403);
  assert.equal(unauthorizedAttempt.code, 'UNAUTHORIZED_ADMIN_EMAIL');

  // 3. Invalid password rejection for allowlisted admin (401)
  const wrongPassAttempt = await signInNeonAdminWithEmailPassword({
    email: 'admin@crosx.in',
    password: 'DefinitelyWrongPassword999!',
  });
  assert.equal(wrongPassAttempt.ok, false);
  assert.equal(wrongPassAttempt.status, 401);
  assert.equal(wrongPassAttempt.code, 'INVALID_CREDENTIALS');

  // 4. Password reset flow via neon_auth.verification
  const resetReq = await requestNeonAdminVerificationToken({
    email: 'admin@crosx.in',
    purpose: 'password-reset',
  });
  assert.equal(resetReq.ok, true);
  assert.ok(resetReq.verificationCode?.startsWith('NATH-'));

  const resetComplete = await resetNeonAdminPasswordWithToken({
    email: 'admin@crosx.in',
    verificationCode: resetReq.verificationCode,
    newPassword: 'CrosxNeonAdmin#2026',
  });
  assert.equal(resetComplete.ok, true);

  // 5. Authorized admin login with verified password
  const validLogin = await signInNeonAdminWithEmailPassword({
    email: 'admin@crosx.in',
    password: 'CrosxNeonAdmin#2026',
  });
  assert.equal(validLogin.ok, true);
  assert.equal(validLogin.status, 200);
  assert.ok(validLogin.sessionToken);
  assert.equal(validLogin.user?.email, 'admin@crosx.in');
  assert.equal(validLogin.user?.role, 'admin');

  // 6. Session persistence verification & logout revocation
  const activeSession = await getAdminSessionFromToken(validLogin.sessionToken);
  assert.equal(activeSession.authenticated, true);
  assert.equal(activeSession.user?.email, 'admin@crosx.in');

  await revokeAdminSessionToken(validLogin.sessionToken);
  const afterLogout = await getAdminSessionFromToken(validLogin.sessionToken);
  assert.equal(afterLogout.authenticated, false);
});

test('Carousel engine computes circular indices, steps seamlessly, resolves horizontal swipes, and gates autoplay', async () => {
  const {
    computeCarouselIndices,
    stepCarouselIndex,
    resolveSwipeAction,
    shouldCarouselAutoplayRun,
    HERO_ENTRANCE_CHOREOGRAPHY,
    CAROUSEL_SWIPE_TRANSITION_SEC,
    CAROUSEL_SWIPE_EASING,
    CAROUSEL_SWIPE_OFFSET_PX,
    DEFAULT_SWIPE_THRESHOLD_PX,
  } = await import('./carousel-engine');

  // 0. Responsive 350ms ease-out swipe animation parameters
  assert.equal(CAROUSEL_SWIPE_TRANSITION_SEC, 0.35);
  assert.equal(CAROUSEL_SWIPE_EASING, 'easeOut');
  assert.equal(CAROUSEL_SWIPE_OFFSET_PX, 20);
  assert.equal(DEFAULT_SWIPE_THRESHOLD_PX, 28);

  // 1. Circular 3-project index calculation
  assert.deepEqual(computeCarouselIndices(0, 3), {
    prevIndex: 2,
    activeIndex: 0,
    nextIndex: 1,
    total: 3,
  });
  assert.deepEqual(computeCarouselIndices(2, 3), {
    prevIndex: 1,
    activeIndex: 2,
    nextIndex: 0,
    total: 3,
  });

  // 2. Seamless forward and backward stepping
  assert.deepEqual(stepCarouselIndex(2, 1, 3), { nextActiveIndex: 0, direction: 1 });
  assert.deepEqual(stepCarouselIndex(0, -1, 3), { nextActiveIndex: 2, direction: -1 });

  // 3. Swipe gesture resolution (fast 28px default threshold, never hijacks vertical scroll)
  assert.equal(resolveSwipeAction(-32, 6), 'next');
  assert.equal(resolveSwipeAction(34, 8), 'prev');
  assert.equal(resolveSwipeAction(-60, 90), 'none'); // predominantly vertical scroll
  assert.equal(resolveSwipeAction(-18, 2), 'none'); // below threshold

  // 4. Intelligent autoplay pause/resume state machine
  const baseGate = {
    isManuallyPaused: false,
    isHovered: false,
    isFocusWithin: false,
    isDragging: false,
    isInViewport: true,
    prefersReducedMotion: false,
    isModalOpen: false,
  };
  assert.equal(shouldCarouselAutoplayRun(baseGate), true);
  assert.equal(shouldCarouselAutoplayRun({ ...baseGate, isHovered: true }), false);
  assert.equal(shouldCarouselAutoplayRun({ ...baseGate, isFocusWithin: true }), false);
  assert.equal(shouldCarouselAutoplayRun({ ...baseGate, isManuallyPaused: true }), false);
  assert.equal(shouldCarouselAutoplayRun({ ...baseGate, isInViewport: false }), false);
  assert.equal(shouldCarouselAutoplayRun({ ...baseGate, prefersReducedMotion: true }), false);
  assert.equal(shouldCarouselAutoplayRun({ ...baseGate, isModalOpen: true }), false);

  // 5. Hero entrance choreography stages
  assert.equal(HERO_ENTRANCE_CHOREOGRAPHY.length, 7);
  assert.ok(HERO_ENTRANCE_CHOREOGRAPHY.every((s) => s.durationSec <= 0.75));
});

test('Scope estimator computes deterministic timeline ranges, USD bounds, and mapped commission scopes', async () => {
  const { estimateProjectScope } = await import('./scope-estimator');

  const websiteSprint = estimateProjectScope({
    platformId: 'website',
    moduleIds: [],
    cadenceId: 'sprint',
  });
  assert.equal(websiteSprint.mappedServiceScope, 'Website Development (Next.js / Vite / Tailwind)');
  assert.equal(websiteSprint.mappedTimeline, 'Immediate (2–4 Weeks)');
  assert.equal(websiteSprint.estimatedWeeksMin, 2);
  assert.ok(websiteSprint.estimatedWeeksMax >= 3);
  assert.ok(websiteSprint.estimatedBudgetMaxUsd > websiteSprint.estimatedBudgetMinUsd);

  const ecosystemWithModules = estimateProjectScope({
    platformId: 'ecosystem',
    moduleIds: ['neon-postgres', 'auth-rbac', 'admin-cms'],
    cadenceId: 'comprehensive',
  });
  assert.equal(
    ecosystemWithModules.mappedServiceScope,
    'Full-Stack Web App (React / TanStack / Next.js)'
  );
  assert.equal(ecosystemWithModules.mappedTimeline, 'Comprehensive (3+ Months)');
  assert.ok(ecosystemWithModules.estimatedWeeksMin > websiteSprint.estimatedWeeksMin);
  assert.ok(ecosystemWithModules.estimatedBudgetMinUsd > websiteSprint.estimatedBudgetMinUsd);
  assert.ok(ecosystemWithModules.recommendedStack.includes('Managed Auth · RBAC'));
  assert.ok(ecosystemWithModules.formattedBrief.includes('[Scope Estimator Configuration]'));
});





