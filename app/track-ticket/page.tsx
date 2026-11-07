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

  // Check URL query parameters on mount (`?ticket=CROSX-2026-00001&token=trk_...`)
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

  // Real-time background polling when a ticket is open
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
    <div className="min-h-screen flex flex-col bg-[#F5F3EE] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE]/95 dark:bg-[#05060B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-[#4A4843] dark:text-[#9CA5BA] hover:text-[#2544E8] dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to CROSX DEV STUDIO®</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8C2B5] dark:border-[#252C40] bg-[#FDFCF9] dark:bg-[#101424] text-[#111110] dark:text-[#F4F1EA] cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-2">
            CLIENT SUPPORT &amp; SPECIFICATION TRACKING PORTAL
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight">
            Track Your Project Ticket &amp; Conversation
          </h1>
          <p className="mt-2 text-sm text-[#4A4843] dark:text-[#A3A8B8] max-w-2xl">
            Enter your unique Ticket ID (<span className="font-mono">CROSX-2026-XXXXX</span>) and your Security Tracking Token (<span className="font-mono">trk_...</span>) to inspect live status updates and exchange messages directly with IRON CLAD.
          </p>
        </div>

        {/* Credential Verification Bar */}
        <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-5 sm:p-6 shadow-sm mb-8">
          <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label
                htmlFor="track-ticket-id"
                className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-1.5"
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
                className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3.5 py-2.5 text-sm font-mono text-[#111110] dark:text-[#F4F1EA] placeholder:text-[#8E93A6] focus:border-[#2544E8] focus:outline-none"
              />
            </div>

            <div className="md:col-span-5">
              <label
                htmlFor="track-ticket-token"
                className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-1.5"
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
                className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3.5 py-2.5 text-sm font-mono text-[#111110] dark:text-[#F4F1EA] placeholder:text-[#8E93A6] focus:border-[#2544E8] focus:outline-none"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="cta-tactile-primary w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] disabled:opacity-50 cursor-pointer"
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
              className="mt-4 flex items-center gap-2.5 rounded-lg border border-[#D94E28] bg-[#D94E28]/10 px-4 py-3 text-xs font-mono text-[#D94E28]"
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
              <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4">
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                      Authorized Ticket
                    </span>
                    <h2 className="text-xl font-mono font-bold text-[#111110] dark:text-white">
                      {ticket.ticketNumber}
                    </h2>
                  </div>
                  <span
                    data-testid="tracked-ticket-status"
                    className={`rounded-md border px-2.5 py-1 text-xs font-mono font-semibold ${getStatusBadgeStyle(
                      ticket.status
                    )}`}
                  >
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#6E6A61] dark:text-[#8E93A6]">Client</span>
                    <span className="font-semibold text-[#111110] dark:text-white">
                      {ticket.clientName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#6E6A61] dark:text-[#8E93A6]">Organization</span>
                    <span className="font-medium text-[#111110] dark:text-[#D5DBE8]">
                      {ticket.company}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#6E6A61] dark:text-[#8E93A6]">Submitted</span>
                    <span className="font-mono text-[#111110] dark:text-[#D5DBE8]">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#6E6A61] dark:text-[#8E93A6]">Last Updated</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#D5D0C5] dark:border-[#1E2231] pt-4 space-y-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#2544E8] dark:text-[#6E88FF] font-semibold">
                    Submitted Project Specification Snapshot
                  </p>
                  <div className="space-y-2.5">
                    {ticket.submittedFields.map((field) => (
                      <div
                        key={field.key}
                        className="rounded-lg border border-[#E2DDD2] dark:border-[#181D2C] bg-[#F5F3EE] dark:bg-[#0F1320] p-3 text-xs"
                      >
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                          {field.label}
                        </span>
                        <span className="mt-1 block font-medium text-[#111110] dark:text-[#F4F1EA] break-words">
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
              <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#2544E8] dark:text-[#6E88FF]" />
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
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#C8C2B5] dark:border-[#242C42] px-2.5 py-1 text-[11px] font-mono text-[#4A4843] dark:text-[#9CA5BA] hover:text-[#2544E8] cursor-pointer"
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
                        className={`rounded-xl border p-4 ${
                          isAdmin
                            ? 'border-[#2544E8]/35 bg-[#2544E8]/[0.06] dark:bg-[#2544E8]/[0.12]'
                            : 'border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#101422]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#111110] dark:text-white">
                            {isAdmin ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-[#2544E8] dark:text-[#6E88FF]" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-[#D94E28]" />
                            )}
                            <span>{msg.senderName}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                isAdmin
                                  ? 'bg-[#2544E8] text-white'
                                  : 'bg-black/10 dark:bg-white/10 text-[#4A4843] dark:text-[#B8C0D4]'
                              }`}
                            >
                              {msg.senderRole}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </span>
                        </div>
                        <p className="text-sm text-[#111110] dark:text-[#E5E9F2] whitespace-pre-wrap leading-relaxed">
                          {msg.body}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Follow-Up Reply Form */}
                <form
                  onSubmit={handleSendFollowUp}
                  className="border-t border-[#D5D0C5] dark:border-[#1E2231] pt-5 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="client-followup-input"
                      className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-2"
                    >
                      Send Follow-Up Message to CROSX DEV STUDIO
                    </label>
                    <textarea
                      id="client-followup-input"
                      rows={3}
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Add architectural details, clarify requirements, or reply to IRON CLAD..."
                      className="w-full rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3.5 py-2.5 text-sm text-[#111110] dark:text-[#F4F1EA] placeholder:text-[#8E93A6] focus:border-[#2544E8] focus:outline-none"
                    />
                  </div>

                  {replySuccess && (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{replySuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                      End-to-end verified session · Auto-syncing every 6s
                    </span>
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="cta-tactile-primary inline-flex items-center gap-2 rounded-full bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] disabled:opacity-50 cursor-pointer"
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
          <div className="rounded-xl border border-dashed border-[#C8C2B5] dark:border-[#242C42] bg-[#FDFCF9]/60 dark:bg-[#0B0E17]/60 p-10 text-center space-y-3">
            <Ticket className="h-8 w-8 text-[#2544E8] dark:text-[#6E88FF] mx-auto" />
            <h2 className="text-lg font-bold font-display">
              Enter Your Ticket ID &amp; Tracking Token Above
            </h2>
            <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6] max-w-md mx-auto leading-relaxed">
              For your security, ticket IDs alone never grant access to conversation history. Provide both credentials received when you submitted your Project Specification Brief.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
