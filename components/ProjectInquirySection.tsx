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
} from 'lucide-react';

interface ProjectInquirySectionProps {
  selectedScopeProp?: string;
  referenceProjectProp?: string;
}

interface CreatedTicketConfirmation {
  ticketNumber: string;
  trackingToken: string;
  status: string;
  createdAt: string;
  submittedFields: SubmittedFieldSnapshot[];
}

export const ProjectInquirySection = React.memo(function ProjectInquirySection({
  selectedScopeProp,
  referenceProjectProp,
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
  const [scopeTouched, setScopeTouched] = useState(false);
  const [briefTouched, setBriefTouched] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<ProjectInquiryRecord | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<CreatedTicketConfirmation | null>(null);
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [recentInquiries, setRecentInquiries] = useState<ProjectInquiryRecord[]>([]);
  const [neonTelemetry, setNeonTelemetry] = useState<NeonConnectionTelemetry | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/inquiries', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.neonTelemetry) {
          setNeonTelemetry(data.neonTelemetry as NeonConnectionTelemetry);
        }
        if (Array.isArray(data.inquiries) && data.inquiries.length > 0) {
          setRecentInquiries(data.inquiries as ProjectInquiryRecord[]);
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
        // Ignore background telemetry fetch error
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveServiceScope =
    !scopeTouched && selectedScopeProp
      ? selectedScopeProp
      : String(values.serviceScope ?? ALLOWED_SERVICE_SCOPES[0]);

  const effectiveProjectBrief =
    !briefTouched && referenceProjectProp && !values.projectBrief
      ? `Interested in an architecture similar to ${referenceProjectProp}. Key goals and technical requirements: `
      : String(values.projectBrief ?? '');

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

    const payload: Record<string, unknown> = {
      ...values,
      serviceScope: effectiveServiceScope,
      projectBrief: effectiveProjectBrief,
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
      setRecentInquiries((prev) => {
        const filtered = prev.filter((item) => item.id !== data.inquiry.id);
        return [data.inquiry, ...filtered];
      });
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

  const enabledFields = formFields.filter((f) => f.enabled);

  return (
    <ParallaxSection
      id="contact"
      ariaLabelledBy="contact-heading"
      offsetPx={24}
      className="relative py-20 sm:py-28 bg-[#FDFCF9] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA] border-t border-[#D5D0C5] dark:border-[#1E2231]"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Column: Editorial Lead & Direct Channels */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-3">
                06 — Start a Conversation
              </p>
              <h2
                id="contact-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display text-[#111110] dark:text-[#F4F1EA] leading-[1.06] [text-wrap:balance]"
              >
                Best-in-Class Projects at{' '}
                <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-[#6E88FF]">
                  Affordable Prices.
                </span>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                Whether you need a custom Website, a full-stack SaaS Web App, or a cross-platform React Native + Expo Mobile App, share your objectives below. Every commission generates an encrypted support ticket reviewed directly by IRON CLAD at CROSX DEV STUDIO.
              </p>
            </div>

            <div className="space-y-5 pt-6 border-t border-[#D5D0C5] dark:border-[#1E2231]">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                  Studio Identity
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111110] dark:text-[#F4F1EA]">
                  CROSX DEV STUDIO · Founded by IRON CLAD
                </p>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                  Web, Backend &amp; Mobile Arsenal
                </p>
                <p className="mt-1 text-xs font-mono text-[#2E2D2A] dark:text-[#D5D8E2] leading-relaxed">
                  JavaScript · TypeScript · Vite · TanStack · React · Next.js · NestJS · Node.js · Tailwind CSS · Neon DB · PostgreSQL · React Native + Expo
                </p>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                  Already Have a Ticket ID?
                </p>
                <div className="mt-2">
                  <Link
                    href="/track-ticket"
                    className="cta-tactile-secondary inline-flex items-center gap-2 rounded-full border border-[#C8C2B5] dark:border-[#252C40] bg-[#F5F3EE] dark:bg-[#0D1220] px-4 py-2 text-xs font-mono font-semibold text-[#2544E8] dark:text-[#6E88FF] hover:border-[#2544E8] transition-colors"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    <span>Track Existing Support Ticket</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {neonTelemetry && (
              <div
                data-testid="neon-connection-card"
                className="rounded-xl border border-[#C8C2B5] dark:border-[#1E263B] bg-[#F5F3EE] dark:bg-[#090D18] p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#111110] dark:text-[#F4F1EA]">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        neonTelemetry.configured ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span>
                      {neonTelemetry.configured
                        ? `Neon DB Connected (${neonTelemetry.secretKeyUsed})`
                        : 'Neon Compatible Local Ledger'}
                    </span>
                  </span>
                  <span className="rounded-full bg-[#2544E8]/10 dark:bg-[#2544E8]/20 border border-[#2544E8]/30 px-2.5 py-0.5 text-[10px] font-mono text-[#2544E8] dark:text-[#8BA2FF] whitespace-nowrap shrink-0">
                    {neonTelemetry.region} · {neonTelemetry.databaseName}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#4A4843] dark:text-[#9CA5BA] truncate">
                  Endpoint: {neonTelemetry.maskedEndpoint}
                </p>
                {neonTelemetry.neonRequestId && (
                  <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
                    ✓ Gateway Verified · Request ID: {neonTelemetry.neonRequestId}
                  </p>
                )}
              </div>
            )}

            {recentInquiries.length > 0 && (
              <div
                data-testid="recent-inquiries-log"
                className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-4 space-y-2"
              >
                <p className="text-xs font-mono text-[#2544E8] dark:text-[#6E88FF]">
                  Persisted Studio Inquiries ({recentInquiries.length})
                </p>
                <ul className="space-y-1.5 text-xs text-[#2E2D2A] dark:text-[#D5D8E2]">
                  {recentInquiries.slice(0, 5).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-[#111110] dark:text-[#F4F1EA]">
                        {item.name} · {item.serviceScope}
                      </span>
                      <span className="font-mono text-[#6E6A61] dark:text-[#8E93A6] shrink-0">
                        {item.id}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Form Rendered from Saved Database Schema */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-5 sm:p-8 lg:p-10 shadow-sm">
              {submittedRecord ? (
                <div data-testid="inquiry-confirmation" className="space-y-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#2544E8] dark:text-[#6E88FF] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xl font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                        Project Brief &amp; Support Ticket Created
                      </h3>
                      <p className="mt-1 text-sm text-[#4A4843] dark:text-[#A3A8B8]">
                        Thank you,{' '}
                        <span className="text-[#111110] dark:text-[#F4F1EA] font-semibold">
                          {submittedRecord.name}
                        </span>
                        . Your engineering inquiry ({submittedRecord.id}) has been logged and assigned a live support ticket.
                      </p>
                    </div>
                  </div>

                  {submittedTicket && (
                    <div
                      data-testid="ticket-credential-box"
                      className="rounded-xl border border-[#2544E8]/35 bg-[#2544E8]/[0.06] dark:bg-[#2544E8]/[0.12] p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#2544E8] dark:text-[#8BA2FF]">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Client Support Ticket Credentials</span>
                        </span>
                        <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                          STATUS: {submittedTicket.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#090D18] p-3">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                            Ticket Reference ID
                          </span>
                          <span
                            data-testid="generated-ticket-id"
                            className="mt-1 block text-base font-mono font-bold text-[#111110] dark:text-white"
                          >
                            {submittedTicket.ticketNumber}
                          </span>
                        </div>
                        <div className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#090D18] p-3">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                            Security Tracking Token (Save This)
                          </span>
                          <span
                            data-testid="generated-tracking-token"
                            className="mt-1 block text-sm font-mono font-bold text-[#D94E28] dark:text-[#FF8B6B] break-all"
                          >
                            {submittedTicket.trackingToken}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyTicketCredentials}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8C2B5] dark:border-[#28314A] bg-[#FDFCF9] dark:bg-[#101424] px-3.5 py-2 text-xs font-mono font-medium text-[#111110] dark:text-[#E5E9F2] hover:border-[#2544E8] cursor-pointer"
                        >
                          {copiedCredential ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Credentials Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Ticket ID &amp; Token</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/track-ticket?ticket=${encodeURIComponent(
                            submittedTicket.ticketNumber
                          )}&token=${encodeURIComponent(submittedTicket.trackingToken)}`}
                          className="cta-tactile-primary inline-flex items-center gap-2 rounded-full bg-[#2544E8] text-white px-5 py-2 text-xs font-mono font-semibold hover:bg-[#3B5BFF]"
                        >
                          <Ticket className="h-3.5 w-3.5" />
                          <span>Open Live Ticket Portal</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#10131E] p-4 text-xs">
                    {(submittedTicket?.submittedFields ?? []).map((item) => (
                      <div
                        key={item.key}
                        className={item.type === 'textarea' ? 'sm:col-span-2' : ''}
                      >
                        <span className="text-[#6E6A61] dark:text-[#8E93A6] font-mono block">
                          {item.label}
                        </span>
                        <span className="font-medium text-[#111110] dark:text-[#F4F1EA] mt-0.5 block break-words">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#1E2231] bg-[#080B12] p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#6E88FF]">
                      <span className="inline-flex items-center gap-2">
                        <Database className="h-3.5 w-3.5" />
                        <span>Neon Serverless PostgreSQL · Parameterized Record Commit</span>
                      </span>
                      {neonTelemetry?.configured && (
                        <span className="text-[11px] text-emerald-400">
                          ✓ {neonTelemetry.databaseName} ({neonTelemetry.region})
                        </span>
                      )}
                    </div>
                    <pre className="text-[11px] font-mono text-[#E5E9F2] overflow-x-auto whitespace-pre-wrap">
                      <code>{submittedRecord.sqlPreview.statement}</code>
                    </pre>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="cta-tactile-primary group/btn inline-flex items-center gap-2.5 rounded-full bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white pl-6 pr-4 py-3 text-xs font-mono font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] whitespace-nowrap shrink-0 cursor-pointer"
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
                  <div className="border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                        Project Specification &amp; Affordable Quote Ledger
                      </h3>
                      <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6] mt-1">
                        Complete the parameters below to scope your Website, Web App, or React Native Mobile App.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>
                        {neonTelemetry?.configured
                          ? `Neon DB Active · ${neonTelemetry.region}`
                          : 'Neon PostgreSQL Ready'}
                      </span>
                    </span>
                  </div>

                  {serverError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2.5 rounded-md border border-[#D94E28] bg-[#D94E28]/10 px-4 py-3 text-xs text-[#D94E28]"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{serverError}</span>
                    </div>
                  )}

                  {/* Dynamic 6-column responsive grid rendering saved database fields */}
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
                              className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-2"
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
                              className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#FDFCF9] dark:bg-[#10131E] px-3.5 py-2.5 text-sm text-[#111110] dark:text-[#F4F1EA] placeholder:text-[#8E93A6] focus:border-[#2544E8] dark:focus:border-[#6E88FF] focus:outline-none transition-colors"
                            />
                            {fieldError && (
                              <p role="alert" className="mt-1.5 text-xs font-mono text-[#D94E28]">
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
                              <legend className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-2">
                                {field.label} {field.required ? '*' : ''}
                              </legend>
                              <div className="flex flex-wrap gap-3">
                                {field.options.map((opt) => (
                                  <label
                                    key={opt}
                                    className="inline-flex items-center gap-2 rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#FDFCF9] dark:bg-[#10131E] px-3 py-2 text-xs text-[#111110] dark:text-[#F4F1EA] cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name={field.key}
                                      value={opt}
                                      checked={String(currentVal) === opt}
                                      onChange={() => handleFieldChange(field.key, opt)}
                                      className="accent-[#2544E8]"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                              {fieldError && (
                                <p role="alert" className="mt-1.5 text-xs font-mono text-[#D94E28]">
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
                              className="flex items-center gap-2.5 rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#FDFCF9] dark:bg-[#10131E] px-3.5 py-2.5 text-xs font-medium text-[#111110] dark:text-[#F4F1EA] cursor-pointer"
                            >
                              <input
                                id={fieldId}
                                name={field.key}
                                type="checkbox"
                                checked={Boolean(currentVal)}
                                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                                className="h-4 w-4 accent-[#2544E8]"
                              />
                              <span>
                                {field.label} {field.required ? '*' : ''}
                              </span>
                            </label>
                            {fieldError && (
                              <p role="alert" className="mt-1.5 text-xs font-mono text-[#D94E28]">
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
                            className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-2"
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
                            className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#FDFCF9] dark:bg-[#10131E] px-3.5 py-2.5 text-sm text-[#111110] dark:text-[#F4F1EA] placeholder:text-[#8E93A6] focus:border-[#2544E8] dark:focus:border-[#6E88FF] focus:outline-none transition-colors"
                          />
                          {fieldError && (
                            <p role="alert" className="mt-1.5 text-xs font-mono text-[#D94E28]">
                              {fieldError}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                      Direct review by IRON CLAD · Persisted via Neon Serverless PostgreSQL
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="cta-tactile-primary group/submit inline-flex items-center justify-center gap-3 rounded-full bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white pl-6.5 pr-4 py-3 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] hover:text-white dark:hover:bg-[#3B5BFF] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{submitting ? 'Dispatching Brief...' : 'Dispatch Project Brief'}</span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover/submit:translate-x-0.5 group-hover/submit:-translate-y-0.5">
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
