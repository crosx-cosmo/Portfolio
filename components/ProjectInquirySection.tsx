'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ALLOWED_SERVICE_SCOPES,
  ALLOWED_TIMELINES,
  type ProjectInquiryRecord,
} from '@/lib/inquiry-validator';
import {
  buildDefaultFormFields,
  validateDynamicSubmission,
  type DynamicFormField,
  type SubmittedFieldSnapshot,
} from '@/lib/cms-schema';
import type { NeonConnectionTelemetry } from '@/lib/neon-db';
import { CustomSelect } from '@/components/CustomSelect';
import { ParallaxSection } from '@/components/ParallaxSection';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  Copy,
  Check,
  Ticket,
  ShieldCheck,
  Clock,
  Download,
  CalendarClock,
  FileCheck2,
} from 'lucide-react';

export interface EstimatorSeedPayload {
  scope: string;
  timeline: string;
  brief: string;
  version: number;
}

interface ProjectInquirySectionProps {
  selectedScopeProp?: string;
  referenceProjectProp?: string;
  estimatorSeed?: EstimatorSeedPayload | null;
}

interface CreatedTicketConfirmation {
  ticketNumber: string;
  trackingToken: string;
  status: string;
  createdAt: string;
  submittedFields: SubmittedFieldSnapshot[];
}

const DRAFT_STORAGE_KEY = 'crosx-inquiry-draft-v1';

const CALL_WINDOWS = [
  'Morning IST / EU (10:00–14:00 IST)',
  'Evening IST / US EST (19:00–22:30 IST)',
  'Async Architecture Review',
] as const;

export const ProjectInquirySection = React.memo(function ProjectInquirySection({
  selectedScopeProp,
  referenceProjectProp,
  estimatorSeed,
}: ProjectInquirySectionProps) {
  const [formFields, setFormFields] = useState<DynamicFormField[]>(() =>
    buildDefaultFormFields()
  );
  const [values, setValues] = useState<Record<string, string | boolean>>({
    name: '',
    email: '',
    company: '',
    serviceScope: selectedScopeProp || ALLOWED_SERVICE_SCOPES[0],
    timeline: ALLOWED_TIMELINES[1],
    projectBrief: referenceProjectProp
      ? `Interested in an architecture similar to ${referenceProjectProp}. Key goals and technical requirements: `
      : '',
  });
  const [callWindow, setCallWindow] = useState<string>(CALL_WINDOWS[2]);
  const [scopeTouched, setScopeTouched] = useState(false);
  const [briefTouched, setBriefTouched] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<ProjectInquiryRecord | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<CreatedTicketConfirmation | null>(null);
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [neonTelemetry, setNeonTelemetry] = useState<NeonConnectionTelemetry | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Hydrate saved draft once on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        values?: Record<string, string | boolean>;
        callWindow?: string;
      };
      if (parsed && parsed.values) {
        const hasAnyInput = Boolean(
          String(parsed.values.name ?? '').trim() ||
            String(parsed.values.email ?? '').trim() ||
            String(parsed.values.projectBrief ?? '').trim()
        );
        if (hasAnyInput) {
          setValues((prev) => ({ ...prev, ...parsed.values }));
          if (parsed.values.serviceScope) setScopeTouched(true);
          if (parsed.values.projectBrief) setBriefTouched(true);
          if (parsed.callWindow && CALL_WINDOWS.includes(parsed.callWindow as (typeof CALL_WINDOWS)[number])) {
            setCallWindow(parsed.callWindow);
          }
          setDraftRestored(true);
        }
      }
    } catch {
      // Ignore corrupt localStorage drafts
    }
  }, []);

  // Fetch CMS dynamic fields & Neon connection health (no public client PII returned)
  useEffect(() => {
    let active = true;
    fetch('/api/inquiries', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.neonTelemetry) {
          setNeonTelemetry(data.neonTelemetry as NeonConnectionTelemetry);
        }
        if (Array.isArray(data.formFields) && data.formFields.length > 0) {
          const remoteFields = data.formFields as DynamicFormField[];
          setFormFields(remoteFields);
          setValues((prev) => {
            const next = { ...prev };
            for (const f of remoteFields) {
              if (next[f.key] === undefined) {
                if (f.type === 'checkbox') {
                  next[f.key] = false;
                } else if (f.type === 'select' || f.type === 'radio') {
                  next[f.key] = f.options[0] ?? '';
                } else {
                  next[f.key] = '';
                }
              }
            }
            return next;
          });
        }
      })
      .catch(() => {
        // Keep defaults on background failure
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync estimator seed when user clicks "Lock Scope into Brief"
  const estimatorVersion = estimatorSeed?.version ?? 0;
  useEffect(() => {
    if (!estimatorSeed || estimatorVersion === 0) return;
    setScopeTouched(true);
    setBriefTouched(true);
    setSubmittedRecord(null);
    setSubmittedTicket(null);
    setValues((prev) => ({
      ...prev,
      serviceScope: estimatorSeed.scope,
      timeline: estimatorSeed.timeline,
      projectBrief: estimatorSeed.brief,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.serviceScope;
      delete next.timeline;
      delete next.projectBrief;
      return next;
    });
  }, [estimatorVersion, estimatorSeed]);

  const effectiveServiceScope =
    !scopeTouched && selectedScopeProp
      ? selectedScopeProp
      : String(values.serviceScope ?? ALLOWED_SERVICE_SCOPES[0]);

  const effectiveProjectBrief =
    !briefTouched && referenceProjectProp && !values.projectBrief
      ? `Interested in an architecture similar to ${referenceProjectProp}. Key goals and technical requirements: `
      : String(values.projectBrief ?? '');

  // Persist form draft to localStorage safely
  useEffect(() => {
    if (submittedRecord) return;
    try {
      const payloadToSave = {
        values: {
          ...values,
          serviceScope: effectiveServiceScope,
          projectBrief: effectiveProjectBrief,
        },
        callWindow,
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payloadToSave));
    } catch {
      // Ignore storage quota errors
    }
  }, [values, callWindow, effectiveServiceScope, effectiveProjectBrief, submittedRecord]);

  const handleFieldChange = (key: string, value: string | boolean) => {
    if (key === 'serviceScope') setScopeTouched(true);
    if (key === 'projectBrief') setBriefTouched(true);
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const trimmedBrief = effectiveProjectBrief.trim();
    const enrichedBrief =
      trimmedBrief.length >= 15 && !trimmedBrief.includes('[Discovery Window:')
        ? `${trimmedBrief}\n\n[Discovery Window: ${callWindow}]`
        : trimmedBrief;

    const payload: Record<string, unknown> = {
      ...values,
      serviceScope: effectiveServiceScope,
      projectBrief: enrichedBrief,
    };

    const validation = validateDynamicSubmission(payload, formFields);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setServerError(data.message || 'Unable to submit inquiry right now.');
        }
        setSubmitting(false);
        return;
      }

      setSubmittedRecord(data.inquiry);
      if (data.ticket) {
        setSubmittedTicket(data.ticket as CreatedTicketConfirmation);
      }
      if (data.neonTelemetry) {
        setNeonTelemetry(data.neonTelemetry as NeonConnectionTelemetry);
      }
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore storage error
      }
      setDraftRestored(false);
      setErrors({});
    } catch {
      setServerError('Network error while submitting your project brief. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRecord(null);
    setSubmittedTicket(null);
    setCopiedCredential(false);
    setScopeTouched(false);
    setBriefTouched(false);
    setDraftRestored(false);
    setCallWindow(CALL_WINDOWS[2]);
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    const resetValues: Record<string, string | boolean> = {};
    for (const f of formFields) {
      if (f.key === 'serviceScope') {
        resetValues[f.key] = ALLOWED_SERVICE_SCOPES[0];
      } else if (f.key === 'timeline') {
        resetValues[f.key] = ALLOWED_TIMELINES[1];
      } else if (f.type === 'checkbox') {
        resetValues[f.key] = false;
      } else if (f.type === 'select' || f.type === 'radio') {
        resetValues[f.key] = f.options[0] ?? '';
      } else {
        resetValues[f.key] = '';
      }
    }
    setValues(resetValues);
    setErrors({});
  };

  const handleCopyTicketCredentials = () => {
    if (!submittedTicket) return;
    const text = `Ticket ID: ${submittedTicket.ticketNumber}\nTracking Token: ${submittedTicket.trackingToken}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedCredential(true);
    setTimeout(() => setCopiedCredential(false), 2500);
  };

  const handleDownloadBriefReceipt = () => {
    if (!submittedRecord || !submittedTicket) return;
    const lines = [
      'CROSX DEV STUDIO® — PROJECT BRIEF & SUPPORT TICKET RECEIPT',
      '==============================================================',
      `Ticket Reference ID : ${submittedTicket.ticketNumber}`,
      `Tracking Token      : ${submittedTicket.trackingToken}`,
      `Ticket Status       : ${submittedTicket.status}`,
      `Submitted At        : ${submittedTicket.createdAt}`,
      `Client Name         : ${submittedRecord.name}`,
      `Company / Venture   : ${submittedRecord.company}`,
      `Engineering Scope   : ${submittedRecord.serviceScope}`,
      `Delivery Horizon    : ${submittedRecord.timeline}`,
      '--------------------------------------------------------------',
      'Submitted Brief:',
      submittedRecord.projectBrief,
      '==============================================================',
      'Track your live ticket updates at /track-ticket',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${submittedTicket.ticketNumber}-receipt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const enabledFields = formFields.filter((f) => f.enabled);

  return (
    <ParallaxSection
      id="contact"
      ariaLabelledBy="contact-heading"
      offsetPx={24}
      className="relative py-24 sm:py-32 bg-[#FAF9F6] dark:bg-[#090909] text-[#171717] dark:text-[#F8F8F8] border-t border-[#E5E2DC] dark:border-[#262626]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Editorial Lead, Client Ticket Portal & Studio Availability SLA */}
          <div className="lg:col-span-5 space-y-7">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FF4B1F] font-semibold mb-3">
                08 — Project Specifications Ledger
              </p>
              <h2
                id="contact-heading"
                className="text-3xl sm:text-5xl font-bold tracking-tight font-display text-[#171717] dark:text-[#F8F8F8] leading-[1.04] [text-wrap:balance]"
              >
                Commission Your Next{' '}
                <span className="font-serif-editorial italic font-normal text-[#FF4B1F]">
                  Digital Flagship.
                </span>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#666666] dark:text-[#A1A1A1] leading-relaxed">
                Whether launching a high-velocity Website, an enterprise SaaS Web App, or a cross-platform React Native + Expo Mobile App, submit your technical brief below. Every commission generates an encrypted support ticket reviewed directly by{' '}
                <strong className="text-[#171717] dark:text-[#F8F8F8] font-semibold">
                  IRON CLAD
                </strong>{' '}
                at{' '}
                <strong className="text-[#171717] dark:text-[#F8F8F8] font-semibold">
                  CROSX DEV STUDIO®
                </strong>
                .
              </p>
            </div>

            {/* Client Ticket Tracking Dedicated Card */}
            <div className="rounded-2xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#FF4B1F] font-semibold">
                  Client Ticket Tracking Portal
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>2-Way Live Sync</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#666666] dark:text-[#A1A1A1] leading-relaxed">
                Already received a <span className="font-mono text-[#171717] dark:text-[#F8F8F8]">CROSX-2026-XXXXX</span> Ticket ID and security token? Inspect real-time status updates and exchange engineering messages with IRON CLAD.
              </p>
              <div>
                <Link
                  href="/track-ticket"
                  className="cta-tactile-secondary inline-flex items-center gap-2.5 rounded-full border border-[#171717] dark:border-[#F8F8F8] bg-[#FAF9F6] dark:bg-[#090909] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold text-[#171717] dark:text-[#F8F8F8] hover:bg-[#FF4B1F] hover:border-[#FF4B1F] hover:text-white dark:hover:bg-[#FF4B1F] dark:hover:border-[#FF4B1F] dark:hover:text-white transition-colors"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  <span>Track Existing Support Ticket</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Privacy-Safe Replacement: Studio Availability & Enterprise SLA */}
            <div
              data-testid="studio-sla-card"
              className="rounded-2xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-[#262626] pb-3">
                <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#171717] dark:text-white">
                  <Clock className="h-3.5 w-3.5 text-[#FF4B1F]" />
                  <span>Studio Availability &amp; SLA</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  ● Onboarding Open
                </span>
              </div>
              <ul className="space-y-2 text-xs text-[#666666] dark:text-[#A1A1A1]">
                <li className="flex items-center gap-2">
                  <FileCheck2 className="h-3.5 w-3.5 text-[#FF4B1F] shrink-0" />
                  <span>24-hour direct architectural &amp; milestone review by IRON CLAD</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#FF4B1F] shrink-0" />
                  <span>Mutual NDA ready &amp; 100% full-stack source IP transfer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-[#FF4B1F] shrink-0" />
                  <span>
                    {neonTelemetry?.configured
                      ? `Encrypted Neon PostgreSQL Ledger (${neonTelemetry.region})`
                      : 'Encrypted Support Ticket Ledger Active'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E5E2DC] dark:border-[#262626]">
              <p className="text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                Production Stack Arsenal
              </p>
              <p className="text-xs font-mono text-[#171717] dark:text-[#E5E5E5] leading-relaxed">
                JavaScript · TypeScript · Vite · TanStack · React · Next.js · NestJS · Node.js · Tailwind CSS · Neon DB · PostgreSQL · React Native + Expo
              </p>
            </div>
          </div>

          {/* Right Column: Dynamic Commission Form */}
          <div className="lg:col-span-7">
            <div className="rounded-[24px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 sm:p-8 lg:p-10 shadow-[0_24px_60px_-20px_rgba(23,23,23,0.08)] dark:shadow-[0_28px_70px_-20px_rgba(0,0,0,0.85)]">
              {submittedRecord ? (
                <div data-testid="inquiry-confirmation" className="space-y-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#FF4B1F] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xl font-bold font-display text-[#171717] dark:text-[#F8F8F8]">
                        Project Brief &amp; Support Ticket Created
                      </h3>
                      <p className="mt-1 text-sm text-[#666666] dark:text-[#A1A1A1]">
                        Thank you,{' '}
                        <span className="text-[#171717] dark:text-[#F8F8F8] font-semibold">
                          {submittedRecord.name}
                        </span>
                        . Your engineering inquiry ({submittedRecord.id}) has been logged and assigned a live support ticket.
                      </p>
                    </div>
                  </div>

                  {submittedTicket && (
                    <div
                      data-testid="ticket-credential-box"
                      className="rounded-2xl border border-[#FF4B1F]/35 bg-[#FF4B1F]/[0.05] dark:bg-[#FF4B1F]/[0.09] p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#FF4B1F]">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Client Support Ticket Credentials</span>
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                          STATUS: {submittedTicket.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909] p-3.5">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                            Ticket Reference ID
                          </span>
                          <span
                            data-testid="generated-ticket-id"
                            className="mt-1 block text-base font-mono font-bold text-[#171717] dark:text-white"
                          >
                            {submittedTicket.ticketNumber}
                          </span>
                        </div>
                        <div className="rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909] p-3.5">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                            Security Tracking Token (Save This)
                          </span>
                          <span
                            data-testid="generated-tracking-token"
                            className="mt-1 block text-sm font-mono font-bold text-[#FF4B1F] break-all"
                          >
                            {submittedTicket.trackingToken}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyTicketCredentials}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-[#2A2A2A] bg-[#FFFFFF] dark:bg-[#171717] px-4 py-2 text-xs font-mono font-medium text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F] cursor-pointer"
                        >
                          {copiedCredential ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Credentials Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Credentials</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          data-testid="download-brief-receipt-btn"
                          onClick={handleDownloadBriefReceipt}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-[#2A2A2A] bg-[#FFFFFF] dark:bg-[#171717] px-4 py-2 text-xs font-mono font-medium text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F] cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5 text-[#FF4B1F]" />
                          <span>Download Receipt (.txt)</span>
                        </button>

                        <Link
                          href={`/track-ticket?ticket=${encodeURIComponent(
                            submittedTicket.ticketNumber
                          )}&token=${encodeURIComponent(submittedTicket.trackingToken)}`}
                          className="cta-tactile-primary inline-flex items-center gap-2 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-5 py-2 text-xs font-mono font-semibold"
                        >
                          <Ticket className="h-3.5 w-3.5" />
                          <span>Open Live Ticket Portal</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] p-4 text-xs">
                    {(submittedTicket?.submittedFields ?? []).map((item) => (
                      <div
                        key={item.key}
                        className={item.type === 'textarea' ? 'sm:col-span-2' : ''}
                      >
                        <span className="text-[#666666] dark:text-[#A1A1A1] font-mono block">
                          {item.label}
                        </span>
                        <span className="font-medium text-[#171717] dark:text-[#F8F8F8] mt-0.5 block break-words">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="cta-tactile-primary group/btn inline-flex items-center gap-2.5 rounded-full bg-[#171717] text-[#FAF9F6] dark:bg-[#FF4B1F] dark:text-white pl-6 pr-4 py-3 text-xs font-mono font-semibold hover:bg-[#FF4B1F] dark:hover:bg-[#F04424] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Submit Another Project Brief</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover/btn:translate-x-0.5">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                  <div className="border-b border-[#E5E2DC] dark:border-[#262626] pb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold font-display text-[#171717] dark:text-[#F8F8F8]">
                        Project Specification &amp; Commission Ledger
                      </h3>
                      <p className="text-xs text-[#666666] dark:text-[#A1A1A1] mt-1">
                        Complete the parameters below to scope your Website, Web App, or React Native Mobile App.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      {draftRestored && (
                        <span className="text-[#FF4B1F] font-semibold">
                          ● Draft Auto-Saved
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>
                          {neonTelemetry?.configured
                            ? `Neon DB Active · ${neonTelemetry.region}`
                            : 'Neon PostgreSQL Ready'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {serverError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2.5 rounded-xl border border-[#F04424] bg-[#F04424]/10 px-4 py-3 text-xs text-[#F04424]"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{serverError}</span>
                    </div>
                  )}

                  {/* Dynamic 6-column responsive grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
                    {enabledFields.map((field) => {
                      const colSpanClass =
                        field.width === 'full' || field.type === 'textarea'
                          ? 'sm:col-span-6'
                          : field.width === 'third'
                          ? 'sm:col-span-2'
                          : 'sm:col-span-3';

                      const fieldId = `inquiry-${field.key}`;
                      const currentVal =
                        field.key === 'serviceScope'
                          ? effectiveServiceScope
                          : field.key === 'projectBrief'
                          ? effectiveProjectBrief
                          : values[field.key] ?? '';

                      const fieldError = errors[field.key];

                      if (field.type === 'select') {
                        return (
                          <div key={field.id} className={colSpanClass}>
                            <CustomSelect
                              id={fieldId}
                              name={field.key}
                              label={field.label}
                              required={field.required}
                              value={String(currentVal || field.options[0] || '')}
                              options={field.options}
                              onChange={(val) => handleFieldChange(field.key, val)}
                              error={fieldError}
                              testId={
                                field.key === 'serviceScope'
                                  ? 'custom-select-scope'
                                  : field.key === 'timeline'
                                  ? 'custom-select-timeline'
                                  : `custom-select-${field.key}`
                              }
                            />
                          </div>
                        );
                      }

                      if (field.type === 'textarea') {
                        return (
                          <div key={field.id} className={colSpanClass}>
                            <label
                              htmlFor={fieldId}
                              className="block text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] mb-2"
                            >
                              {field.label} {field.required ? '*' : ''}
                            </label>
                            <textarea
                              id={fieldId}
                              name={field.key}
                              rows={4}
                              required={field.required}
                              value={String(currentVal)}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              aria-invalid={Boolean(fieldError)}
                              className="w-full rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] px-4 py-3 text-sm text-[#171717] dark:text-[#F8F8F8] placeholder:text-[#A1A1A1] focus:border-[#FF4B1F] focus:outline-none transition-colors"
                            />
                            {fieldError && (
                              <p role="alert" className="mt-1.5 text-xs font-mono text-[#F04424]">
                                {fieldError}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (field.type === 'radio') {
                        return (
                          <div key={field.id} className={colSpanClass}>
                            <fieldset>
                              <legend className="block text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] mb-2">
                                {field.label} {field.required ? '*' : ''}
                              </legend>
                              <div className="flex flex-wrap gap-3">
                                {field.options.map((opt) => (
                                  <label
                                    key={opt}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] px-3.5 py-2.5 text-xs text-[#171717] dark:text-[#F8F8F8] cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name={field.key}
                                      value={opt}
                                      checked={String(currentVal) === opt}
                                      onChange={() => handleFieldChange(field.key, opt)}
                                      className="accent-[#FF4B1F]"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                              {fieldError && (
                                <p role="alert" className="mt-1.5 text-xs font-mono text-[#F04424]">
                                  {fieldError}
                                </p>
                              )}
                            </fieldset>
                          </div>
                        );
                      }

                      if (field.type === 'checkbox') {
                        return (
                          <div key={field.id} className={colSpanClass}>
                            <label
                              htmlFor={fieldId}
                              className="flex items-center gap-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] px-4 py-3 text-xs font-medium text-[#171717] dark:text-[#F8F8F8] cursor-pointer"
                            >
                              <input
                                id={fieldId}
                                name={field.key}
                                type="checkbox"
                                checked={Boolean(currentVal)}
                                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                                className="h-4 w-4 accent-[#FF4B1F]"
                              />
                              <span>
                                {field.label} {field.required ? '*' : ''}
                              </span>
                            </label>
                            {fieldError && (
                              <p role="alert" className="mt-1.5 text-xs font-mono text-[#F04424]">
                                {fieldError}
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={field.id} className={colSpanClass}>
                          <label
                            htmlFor={fieldId}
                            className="block text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] mb-2"
                          >
                            {field.label} {field.required ? '*' : ''}
                          </label>
                          <input
                            id={fieldId}
                            name={field.key}
                            type={field.type}
                            required={field.required}
                            value={String(currentVal)}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            aria-invalid={Boolean(fieldError)}
                            className="w-full rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] px-4 py-3 text-sm text-[#171717] dark:text-[#F8F8F8] placeholder:text-[#A1A1A1] focus:border-[#FF4B1F] focus:outline-none transition-colors"
                          />
                          {fieldError && (
                            <p role="alert" className="mt-1.5 text-xs font-mono text-[#F04424]">
                              {fieldError}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Discovery Call Window Selector */}
                  <div className="space-y-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                      <CalendarClock className="h-3.5 w-3.5 text-[#FF4B1F]" />
                      <span>Preferred Discovery Call Window (Optional)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {CALL_WINDOWS.map((win) => {
                        const selected = callWindow === win;
                        return (
                          <button
                            key={win}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setCallWindow(win)}
                            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#FF4B1F] bg-[#FF4B1F] text-white font-semibold'
                                : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] text-[#666666] dark:text-[#A1A1A1] hover:border-[#FF4B1F]'
                            }`}
                          >
                            {win}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
                    <p className="text-xs font-mono text-[#666666] dark:text-[#A1A1A1]">
                      Direct review by IRON CLAD · Persisted via Neon Serverless PostgreSQL
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="cta-tactile-primary group/submit inline-flex items-center justify-center gap-3 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white pl-7 pr-4 py-3.5 text-xs font-mono uppercase tracking-wider font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{submitting ? 'Dispatching Brief...' : 'Dispatch Project Brief'}</span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover/submit:translate-x-0.5 group-hover/submit:-translate-y-0.5">
                        <Send className="h-3 w-3" />
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </ParallaxSection>
  );
});
