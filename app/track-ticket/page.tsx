'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getTicketStatusBadgeClass as getStatusBadgeStyle,
  type PublicTicketView,
} from '@/lib/cms-schema';
import { useStudioTheme } from '@/lib/use-studio-theme';
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  Ticket,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Sun,
  Moon,
  Lock,
  MessageSquare,
  User,
  Sparkles,
} from 'lucide-react';

export default function TrackTicketPage() {
  const { isDark, toggleTheme } = useStudioTheme();

  const [ticketNumberInput, setTicketNumberInput] = useState('');
  const [trackingTokenInput, setTrackingTokenInput] = useState('');
  const [activeCredentials, setActiveCredentials] = useState<{
    ticketNumber: string;
    trackingToken: string;
  } | null>(null);

  const [ticket, setTicket] = useState<PublicTicketView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  const performLookup = useCallback(
    async (tNum: string, tToken: string, silent: boolean = false, syncInputs: boolean = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      if (syncInputs) {
        setTicketNumberInput(tNum.trim().toUpperCase());
        setTrackingTokenInput(tToken.trim());
      }
      try {
        const res = await fetch('/api/tickets/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'lookup',
            ticketNumber: tNum.trim().toUpperCase(),
            trackingToken: tToken.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (!silent) {
            setError(
              data.error ||
                'Unable to verify ticket credentials. Both Ticket ID and Tracking Token are required.'
            );
            setTicket(null);
          }
          return;
        }
        setTicket(data.ticket as PublicTicketView);
        setActiveCredentials({
          ticketNumber: tNum.trim().toUpperCase(),
          trackingToken: tToken.trim(),
        });
      } catch {
        if (!silent) {
          setError('Network error while verifying ticket credentials.');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const qTicket = params.get('ticket')?.trim().toUpperCase() ?? '';
    const qToken = params.get('token')?.trim() ?? '';
    if (!qTicket || !qToken) return;

    fetch('/api/tickets/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'lookup',
        ticketNumber: qTicket,
        trackingToken: qToken,
      }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        setTicketNumberInput(qTicket);
        setTrackingTokenInput(qToken);
        if (ok && data.ok && data.ticket) {
          setTicket(data.ticket as PublicTicketView);
          setActiveCredentials({
            ticketNumber: qTicket,
            trackingToken: qToken,
          });
        } else {
          setError(data.error || 'Unable to verify ticket credentials.');
        }
      })
      .catch(() => {
        // Ignore initial auto-lookup error
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeCredentials) return;
    const interval = window.setInterval(() => {
      void performLookup(
        activeCredentials.ticketNumber,
        activeCredentials.trackingToken,
        true
      );
    }, 6000);
    return () => window.clearInterval(interval);
  }, [activeCredentials, performLookup]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumberInput.trim() || !trackingTokenInput.trim()) {
      setError('Both your Ticket ID and Security Tracking Token are required.');
      return;
    }
    void performLookup(ticketNumberInput, trackingTokenInput, false);
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCredentials) return;
    if (!replyText.trim()) return;

    setSendingReply(true);
    setError(null);
    setReplySuccess(null);

    try {
      const res = await fetch('/api/tickets/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          ticketNumber: activeCredentials.ticketNumber,
          trackingToken: activeCredentials.trackingToken,
          messageBody: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to send follow-up message.');
        return;
      }
      setTicket(data.ticket as PublicTicketView);
      setReplyText('');
      setReplySuccess('Follow-up message delivered to IRON CLAD · CROSX DEV STUDIO.');
      setTimeout(() => setReplySuccess(null), 4000);
    } catch {
      setError('Network error while sending follow-up message.');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#090909] text-[#171717] dark:text-[#F8F8F8] editorial-grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6]/90 dark:bg-[#090909]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-[#666666] dark:text-[#A1A1A1] hover:text-[#FF4B1F] dark:hover:text-[#FF4B1F] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to CROSX DEV STUDIO®</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[11px] font-mono text-[#666666] dark:text-[#A1A1A1]">
              FOUNDED BY IRON CLAD
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#171717] text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F] transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4 text-[#FF4B1F]" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4B1F]/30 bg-[#FF4B1F]/10 px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-[#FF4B1F] mb-4">
            <Sparkles className="h-3 w-3" />
            <span>CLIENT SUPPORT &amp; SPECIFICATION TRACKING PORTAL</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-display tracking-tight leading-[1.06]">
            Track Your Project Ticket &amp;{' '}
            <span className="font-serif-editorial italic font-normal text-[#FF4B1F]">
              Live Conversation.
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#666666] dark:text-[#A1A1A1] max-w-2xl leading-relaxed">
            Enter your unique Ticket ID (<span className="font-mono text-[#171717] dark:text-[#F8F8F8]">CROSX-2026-XXXXX</span>) and your Security Tracking Token (<span className="font-mono text-[#FF4B1F]">trk_...</span>) to inspect live status updates and exchange messages directly with IRON CLAD.
          </p>
        </div>

        {/* Credential Verification Bar */}
        <div className="rounded-[24px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 sm:p-8 shadow-sm mb-10">
          <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            <div className="md:col-span-4">
              <label
                htmlFor="track-ticket-id"
                className="block text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] mb-2"
              >
                Ticket Reference ID *
              </label>
              <input
                id="track-ticket-id"
                type="text"
                required
                value={ticketNumberInput}
                onChange={(e) => setTicketNumberInput(e.target.value.toUpperCase())}
                placeholder="CROSX-2026-00001"
                className="w-full rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909] px-4 py-3 text-sm font-mono text-[#171717] dark:text-[#F8F8F8] placeholder:text-[#A1A1A1] focus:border-[#FF4B1F] focus:outline-none transition-colors"
              />
            </div>

            <div className="md:col-span-5">
              <label
                htmlFor="track-ticket-token"
                className="block text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] mb-2"
              >
                Security Tracking Token *
              </label>
              <input
                id="track-ticket-token"
                type="text"
                required
                value={trackingTokenInput}
                onChange={(e) => setTrackingTokenInput(e.target.value)}
                placeholder="trk_..."
                className="w-full rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909] px-4 py-3 text-sm font-mono text-[#171717] dark:text-[#F8F8F8] placeholder:text-[#A1A1A1] focus:border-[#FF4B1F] focus:outline-none transition-colors"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="cta-tactile-primary w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-6 py-3 text-xs font-mono uppercase tracking-wider font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{loading ? 'Verifying...' : 'Verify & Open'}</span>
              </button>
            </div>
          </form>

          {error && (
            <div
              role="alert"
              data-testid="track-ticket-error"
              className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#F04424] bg-[#F04424]/10 px-4 py-3 text-xs font-mono text-[#F04424]"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Authenticated Ticket Workspace */}
        {ticket ? (
          <div data-testid="tracked-ticket-view" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Ticket Metadata & Original Specification Snapshot */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-[24px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-[#262626] pb-4">
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                      Authorized Ticket
                    </span>
                    <h2 className="text-xl font-mono font-bold text-[#171717] dark:text-white">
                      {ticket.ticketNumber}
                    </h2>
                  </div>
                  <span
                    data-testid="tracked-ticket-status"
                    className={`rounded-full border px-3 py-1 text-xs font-mono font-semibold ${getStatusBadgeStyle(
                      ticket.status
                    )}`}
                  >
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#666666] dark:text-[#A1A1A1]">Client</span>
                    <span className="font-semibold text-[#171717] dark:text-white">
                      {ticket.clientName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#666666] dark:text-[#A1A1A1]">Organization</span>
                    <span className="font-medium text-[#171717] dark:text-[#E5E5E5]">
                      {ticket.company}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#666666] dark:text-[#A1A1A1]">Submitted</span>
                    <span className="font-mono text-[#171717] dark:text-[#E5E5E5]">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#666666] dark:text-[#A1A1A1]">Last Updated</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#E5E2DC] dark:border-[#262626] pt-4 space-y-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#FF4B1F] font-semibold">
                    Submitted Project Specification Snapshot
                  </p>
                  <div className="space-y-2.5">
                    {ticket.submittedFields.map((field) => (
                      <div
                        key={field.key}
                        className="rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909] p-3 text-xs"
                      >
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                          {field.label}
                        </span>
                        <span className="mt-1 block font-medium text-[#171717] dark:text-[#F8F8F8] break-words">
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Chronological Two-Way Conversation Thread */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-[24px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-[#262626] pb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#FF4B1F]" />
                    <h3 className="text-base font-bold font-display">
                      Conversation History ({ticket.messages.length})
                    </h3>
                  </div>

                  {activeCredentials && (
                    <button
                      type="button"
                      onClick={() =>
                        performLookup(
                          activeCredentials.ticketNumber,
                          activeCredentials.trackingToken,
                          false
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-[#262626] px-3 py-1 text-[11px] font-mono text-[#666666] dark:text-[#A1A1A1] hover:text-[#FF4B1F] cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Sync Live</span>
                    </button>
                  )}
                </div>

                {/* Messages List */}
                <div
                  data-testid="public-conversation-thread"
                  className="space-y-4 max-h-[460px] overflow-y-auto pr-1"
                >
                  {ticket.messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'ADMIN';
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-2xl border p-4 ${
                          isAdmin
                            ? 'border-[#FF4B1F]/35 bg-[#FF4B1F]/[0.05] dark:bg-[#FF4B1F]/[0.1]'
                            : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#171717] dark:text-white">
                            {isAdmin ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-[#FF4B1F]" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-[#666666] dark:text-[#A1A1A1]" />
                            )}
                            <span>{msg.senderName}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                                isAdmin
                                  ? 'bg-[#FF4B1F] text-white'
                                  : 'bg-black/10 dark:bg-white/10 text-[#666666] dark:text-[#A1A1A1]'
                              }`}
                            >
                              {msg.senderRole}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#666666] dark:text-[#A1A1A1]">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </span>
                        </div>
                        <p className="text-sm text-[#171717] dark:text-[#E5E5E5] whitespace-pre-wrap leading-relaxed">
                          {msg.body}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Follow-Up Reply Form */}
                <form
                  onSubmit={handleSendFollowUp}
                  className="border-t border-[#E5E2DC] dark:border-[#262626] pt-5 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="client-followup-input"
                      className="block text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] mb-2"
                    >
                      Send Follow-Up Message to CROSX DEV STUDIO®
                    </label>
                    <textarea
                      id="client-followup-input"
                      rows={3}
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Add architectural details, clarify requirements, or reply to IRON CLAD..."
                      className="w-full rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#090909] px-4 py-3 text-sm text-[#171717] dark:text-[#F8F8F8] placeholder:text-[#A1A1A1] focus:border-[#FF4B1F] focus:outline-none"
                    />
                  </div>

                  {replySuccess && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{replySuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono text-[#666666] dark:text-[#A1A1A1]">
                      End-to-end verified session · Auto-syncing every 6s
                    </span>
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="cta-tactile-primary inline-flex items-center gap-2 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-6 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF]/70 dark:bg-[#141414]/70 p-12 text-center space-y-3">
            <Ticket className="h-8 w-8 text-[#FF4B1F] mx-auto" />
            <h2 className="text-lg font-bold font-display">
              Enter Your Ticket ID &amp; Tracking Token Above
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] dark:text-[#A1A1A1] max-w-md mx-auto leading-relaxed">
              For your security, ticket IDs alone never grant access to conversation history. Provide both credentials received when you submitted your Project Specification Brief.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
