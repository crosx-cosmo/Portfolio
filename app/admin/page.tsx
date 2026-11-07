'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ALL_TICKET_STATUSES,
  ALLOWED_FIELD_TYPES,
  buildDefaultFormFields,
  buildDefaultProjects,
  getTicketStatusBadgeClass as getStatusBadgeClasses,
  type CmsProject,
  type DynamicFieldType,
  type DynamicFormField,
  type SupportTicket,
  type TicketStatus,
} from '@/lib/cms-schema';
import { useStudioTheme } from '@/lib/use-studio-theme';
import type { NeonConnectionTelemetry } from '@/lib/neon-db';
import {
  LayoutDashboard,
  FolderKanban,
  Sliders,
  MessageSquare,
  Settings,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
  Send,
  Lock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Sun,
  Moon,
  Mail,
  MailOpen,
  Upload,
  X,
  Database,
  Clock,
  User,
  FileText,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'projects' | 'ledger' | 'tickets' | 'settings';

export default function CrosxAdminDashboardPage() {
  const { isDark, toggleTheme } = useStudioTheme();

  // Auth State
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passphraseConfigured, setPassphraseConfigured] = useState(false);
  const [envSecretAvailable, setEnvSecretAvailable] = useState(false);
  const [credentialInput, setCredentialInput] = useState('');
  const [initialPassphraseInput, setInitialPassphraseInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Dashboard & CMS Data
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 3,
    activeProjects: 3,
    totalInquiries: 0,
    unreadMessages: 0,
    openTickets: 0,
    resolvedTickets: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      ticketNumber: string;
      clientName: string;
      clientEmail: string;
      serviceScope: string;
      status: TicketStatus;
      isRead: boolean;
      updatedAt: string;
      lastMessagePreview: string;
    }>
  >([]);
  const [neonTelemetry, setNeonTelemetry] = useState<NeonConnectionTelemetry | null>(null);
  const [projects, setProjects] = useState<CmsProject[]>(() => buildDefaultProjects());
  const [formFields, setFormFields] = useState<DynamicFormField[]>(() =>
    buildDefaultFormFields()
  );
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Project Modal State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<CmsProject> | null>(null);
  const [stackText, setStackText] = useState('');
  const [highlightsText, setHighlightsText] = useState('');
  const [deliverablesText, setDeliverablesText] = useState('');
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<CmsProject | null>(null);

  // Dynamic Form Field Modal State
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Partial<DynamicFormField> | null>(null);
  const [fieldOptionsText, setFieldOptionsText] = useState('');
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<DynamicFormField | null>(null);

  // Ticket Inbox State
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [ticketSort, setTicketSort] = useState<'newest' | 'oldest'>('newest');
  const [ticketPage, setTicketPage] = useState(1);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyIsInternal, setReplyIsInternal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<SupportTicket | null>(null);

  // Settings Passphrase Update
  const [newPassphraseSetting, setNewPassphraseSetting] = useState('');
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const fetchAdminOverview = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoadingData(true);
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (res.ok && data.ok) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
        setNeonTelemetry(data.neonTelemetry || null);
        setProjects(data.projects || []);
        setFormFields(data.formFields || []);
        setTickets(data.tickets || []);
      }
    } catch {
      if (!silent) {
        showToast('error', 'Failed to synchronize studio telemetry.');
      }
    } finally {
      if (!silent) setLoadingData(false);
    }
  }, [showToast]);

  // Initial Auth Session Check
  useEffect(() => {
    let active = true;
    fetch('/api/admin/auth', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setAuthenticated(Boolean(data.authenticated));
        setPassphraseConfigured(Boolean(data.passphraseConfigured));
        setEnvSecretAvailable(Boolean(data.envSecretAvailable));
        setAuthChecking(false);
        if (data.authenticated) {
          void fetchAdminOverview(false);
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthChecking(false);
      });
    return () => {
      active = false;
    };
  }, [fetchAdminOverview]);

  // Real-time background sync every 6 seconds when authenticated
  useEffect(() => {
    if (!authenticated || !realtimeEnabled) return;
    const interval = window.setInterval(() => {
      void fetchAdminOverview(true);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [authenticated, realtimeEnabled, fetchAdminOverview]);

  const handleAdminLogin = async (
    e: React.FormEvent,
    mode: 'credential' | 'setup-passphrase' | 'studio-env-handshake' = 'credential'
  ) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          credential: credentialInput,
          newPassphrase: initialPassphraseInput || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Authentication failed. Access denied.');
        setAuthSubmitting(false);
        return;
      }

      setAuthenticated(true);
      setCredentialInput('');
      setInitialPassphraseInput('');
      showToast('success', 'Authenticated into CROSX DEV STUDIO Admin Console.');
      await fetchAdminOverview(false);
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
    setSelectedTicketNumber(null);
    showToast('success', 'Logged out of CROSX DEV STUDIO Admin Console.');
  };

  /* ============================================================================
   * PROJECT MANAGEMENT CMS HANDLERS
   * ========================================================================== */

  const openAddProjectModal = () => {
    setEditingProject({
      title: '',
      subtitle: '',
      category: 'Enterprise Web Platform',
      url: 'https://',
      displayUrl: '',
      liveScreenshot: '/projects/crosx-live.png',
      studioVisual: '/projects/crosx-studio.jpg',
      summary: '',
      architectureOverview: '',
      published: true,
      featured: true,
      layoutSpan: 'split',
    });
    setStackText('Next.js, TypeScript, Tailwind CSS, Neon DB, PostgreSQL');
    setHighlightsText(
      'High-conversion responsive architecture with dual dark/light mode\nServer-side validated API and relational PostgreSQL persistence\nOptimized Core Web Vitals and 60fps tactile motion'
    );
    setDeliverablesText('Full-Stack Web Platform\nBrand Design System');
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: CmsProject) => {
    setEditingProject({ ...proj });
    setStackText(proj.stack.join(', '));
    setHighlightsText(proj.engineeringHighlights.join('\n'));
    setDeliverablesText(proj.deliverables.join('\n'));
    setProjectModalOpen(true);
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'liveScreenshot' | 'studioVisual'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingProject((prev) => (prev ? { ...prev, [field]: reader.result as string } : prev));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject?.title?.trim() || !editingProject?.url?.trim()) {
      showToast('error', 'Project title and website URL are required.');
      return;
    }

    const payload = {
      ...editingProject,
      stack: stackText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      engineeringHighlights: highlightsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      deliverables: deliverablesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const isUpdate = Boolean(editingProject.id);
    const res = await fetch('/api/projects', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      showToast('error', data.error || 'Failed to save project.');
      return;
    }

    setProjects(data.projects);
    setProjectModalOpen(false);
    setEditingProject(null);
    showToast(
      'success',
      isUpdate
        ? `Updated project "${payload.title}" on public portfolio.`
        : `Added project "${payload.title}" to public portfolio.`
    );
    void fetchAdminOverview(true);
  };

  const handleToggleProjectFlag = async (
    proj: CmsProject,
    flag: 'published' | 'featured'
  ) => {
    const res = await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...proj,
        [flag]: !proj[flag],
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setProjects(data.projects);
      showToast(
        'success',
        `Project "${proj.title}" ${flag} set to ${!proj[flag] ? 'enabled' : 'disabled'}.`
      );
      void fetchAdminOverview(true);
    }
  };

  const handleMoveProject = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= projects.length) return;
    const next = [...projects];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        orderedIds: next.map((p) => p.id),
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setProjects(data.projects);
      showToast('success', 'Project portfolio ordering updated.');
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteProjectTarget) return;
    const res = await fetch(
      `/api/projects?id=${encodeURIComponent(deleteProjectTarget.id)}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (res.ok && data.ok) {
      setProjects(data.projects);
      showToast('success', `Deleted project "${deleteProjectTarget.title}".`);
      setDeleteProjectTarget(null);
      void fetchAdminOverview(true);
    } else {
      showToast('error', data.error || 'Failed to delete project.');
    }
  };

  /* ============================================================================
   * DYNAMIC SPECIFICATIONS LEDGER (FORM BUILDER) HANDLERS
   * ========================================================================== */

  const openAddFieldModal = () => {
    setEditingField({
      label: '',
      key: '',
      placeholder: '',
      type: 'text',
      required: false,
      enabled: true,
      width: 'half',
      options: [],
    });
    setFieldOptionsText('');
    setFieldModalOpen(true);
  };

  const openEditFieldModal = (field: DynamicFormField) => {
    setEditingField({ ...field });
    setFieldOptionsText(field.options.join('\n'));
    setFieldModalOpen(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField?.label?.trim()) {
      showToast('error', 'Field label is required.');
      return;
    }

    const payload = {
      ...editingField,
      options: fieldOptionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const isUpdate = Boolean(editingField.id);
    const res = await fetch('/api/form-fields', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      showToast('error', data.error || 'Failed to save form field configuration.');
      return;
    }

    setFormFields(data.fields);
    setFieldModalOpen(false);
    setEditingField(null);
    showToast(
      'success',
      isUpdate
        ? `Updated field "${payload.label}" in Project Specifications Ledger.`
        : `Added field "${payload.label}" to public Project Specification form.`
    );
  };

  const handleToggleFieldFlag = async (
    field: DynamicFormField,
    flag: 'enabled' | 'required'
  ) => {
    const res = await fetch('/api/form-fields', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...field,
        [flag]: !field[flag],
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setFormFields(data.fields);
      showToast(
        'success',
        `Field "${field.label}" ${flag} updated.`
      );
    }
  };

  const handleMoveField = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= formFields.length) return;
    const next = [...formFields];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);

    const res = await fetch('/api/form-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        orderedIds: next.map((f) => f.id),
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setFormFields(data.fields);
      showToast('success', 'Form field sequence updated.');
    }
  };

  const handleConfirmDeleteField = async () => {
    if (!deleteFieldTarget) return;
    const res = await fetch(
      `/api/form-fields?id=${encodeURIComponent(deleteFieldTarget.id)}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (res.ok && data.ok) {
      setFormFields(data.fields);
      showToast('success', `Deleted form field "${deleteFieldTarget.label}".`);
      setDeleteFieldTarget(null);
    } else {
      showToast('error', data.error || 'Failed to delete form field.');
    }
  };

  /* ============================================================================
   * TICKET & CLIENT MESSAGING HANDLERS
   * ========================================================================== */

  const filteredTickets = tickets
    .filter((t) => {
      if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) {
        return false;
      }
      if (ticketSearch.trim()) {
        const q = ticketSearch.trim().toLowerCase();
        return (
          t.ticketNumber.toLowerCase().includes(q) ||
          t.clientName.toLowerCase().includes(q) ||
          t.clientEmail.toLowerCase().includes(q) ||
          t.company.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return ticketSort === 'oldest' ? ta - tb : tb - ta;
    });

  const TICKETS_PER_PAGE = 8;
  const totalTicketPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const paginatedTickets = filteredTickets.slice(
    (ticketPage - 1) * TICKETS_PER_PAGE,
    ticketPage * TICKETS_PER_PAGE
  );

  const selectedTicket =
    tickets.find((t) => t.ticketNumber === selectedTicketNumber) ??
    paginatedTickets[0] ??
    null;

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicketNumber(ticket.ticketNumber);
    if (!ticket.isRead) {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          action: 'update-meta',
          isRead: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTickets(data.tickets);
        void fetchAdminOverview(true);
      }
    }
  };

  const handleToggleTicketRead = async (ticket: SupportTicket) => {
    const res = await fetch('/api/admin/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        action: 'update-meta',
        isRead: !ticket.isRead,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setTickets(data.tickets);
      showToast(
        'success',
        `Marked ${ticket.ticketNumber} as ${!ticket.isRead ? 'read' : 'unread'}.`
      );
      void fetchAdminOverview(true);
    }
  };

  const handleUpdateTicketStatus = async (
    ticketNumber: string,
    nextStatus: TicketStatus
  ) => {
    const res = await fetch('/api/admin/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketNumber,
        action: 'update-meta',
        status: nextStatus,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setTickets(data.tickets);
      showToast('success', `Ticket ${ticketNumber} status updated to ${nextStatus}.`);
      void fetchAdminOverview(true);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyBody.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: selectedTicket.ticketNumber,
          action: 'reply',
          messageBody: replyBody.trim(),
          isInternal: replyIsInternal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast('error', data.error || 'Failed to send message.');
        return;
      }
      setTickets(data.tickets);
      setReplyBody('');
      showToast(
        'success',
        replyIsInternal
          ? `Added private internal note to ${selectedTicket.ticketNumber}.`
          : `Sent reply to ${selectedTicket.clientName} (${selectedTicket.ticketNumber}).`
      );
      void fetchAdminOverview(true);
    } finally {
      setSendingReply(false);
    }
  };

  const handleConfirmDeleteTicket = async () => {
    if (!deleteTicketTarget) return;
    const res = await fetch(
      `/api/admin/tickets?ticketNumber=${encodeURIComponent(
        deleteTicketTarget.ticketNumber
      )}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (res.ok && data.ok) {
      setTickets(data.tickets);
      if (selectedTicketNumber === deleteTicketTarget.ticketNumber) {
        setSelectedTicketNumber(null);
      }
      showToast('success', `Deleted ticket ${deleteTicketTarget.ticketNumber}.`);
      setDeleteTicketTarget(null);
      void fetchAdminOverview(true);
    }
  };

  const handleUpdatePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassphraseSetting.trim().length < 8) {
      showToast('error', 'New admin passphrase must be at least 8 characters.');
      return;
    }
    const res = await fetch('/api/admin/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassphrase: newPassphraseSetting.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setPassphraseConfigured(true);
      setNewPassphraseSetting('');
      showToast('success', 'Admin security passphrase updated.');
    } else {
      showToast('error', data.error || 'Failed to update passphrase.');
    }
  };

  /* ============================================================================
   * RENDER: UNAUTHENTICATED SECURITY GATE
   * ========================================================================== */

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EE] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#2544E8] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
            Verifying CROSX DEV STUDIO® Admin Session...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F5F3EE] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA] p-5 sm:p-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-extrabold font-display tracking-tight"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2544E8]/40 bg-[#2544E8]/10 text-xs font-mono font-bold text-[#2544E8] dark:text-indigo-300">
              IC
            </span>
            <span>CROSX DEV STUDIO®</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C8C2B5] dark:border-[#252C40] bg-[#FDFCF9] dark:bg-[#101424] cursor-pointer"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div
          data-testid="admin-login-gate"
          className="mx-auto w-full max-w-md rounded-2xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 sm:p-8 shadow-lg space-y-6"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#2544E8]/30 bg-[#2544E8]/10 px-2.5 py-1 text-[11px] font-mono text-[#2544E8] dark:text-[#8BA2FF]">
              <Lock className="h-3.5 w-3.5" />
              <span>PROTECTED STUDIO ROUTE · /ADMIN</span>
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight">
              CROSX DEV STUDIO® Admin Console
            </h1>
            <p className="text-xs text-[#5C5952] dark:text-[#9CA5BA] leading-relaxed">
              Authorized access only (IRON CLAD · Senior Project Developer). All administrative operations are verified server-side. No public registration is permitted.
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              data-testid="admin-auth-error"
              className="flex items-start gap-2.5 rounded-lg border border-[#D94E28] bg-[#D94E28]/10 p-3.5 text-xs font-mono text-[#D94E28]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form
            onSubmit={(e) =>
              handleAdminLogin(
                e,
                !passphraseConfigured && initialPassphraseInput.trim().length >= 8
                  ? 'setup-passphrase'
                  : 'credential'
              )
            }
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="admin-credential-input"
                className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-1.5"
              >
                {passphraseConfigured
                  ? 'Admin Passphrase or Studio Environment Secret'
                  : 'Studio Environment Secret (NEON_AUTH_TOKEN / NEON_DATABASE_URL)'}
              </label>
              <input
                id="admin-credential-input"
                type="password"
                value={credentialInput}
                onChange={(e) => setCredentialInput(e.target.value)}
                placeholder="Enter studio token or admin passphrase..."
                className="w-full rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3.5 py-2.5 text-sm font-mono text-[#111110] dark:text-[#F4F1EA] focus:border-[#2544E8] focus:outline-none"
              />
            </div>

            {!passphraseConfigured && (
              <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE]/60 dark:bg-[#101422] p-3.5 space-y-2">
                <label
                  htmlFor="admin-initial-passphrase"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#2544E8] dark:text-[#8BA2FF]"
                >
                  Or Initialize Studio Owner Passphrase (Min 8 chars)
                </label>
                <input
                  id="admin-initial-passphrase"
                  type="password"
                  value={initialPassphraseInput}
                  onChange={(e) => setInitialPassphraseInput(e.target.value)}
                  placeholder="Set your admin passphrase..."
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#FDFCF9] dark:bg-[#0B0E17] px-3 py-2 text-xs font-mono text-[#111110] dark:text-[#F4F1EA] focus:border-[#2544E8] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="cta-tactile-primary w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{authSubmitting ? 'Authorizing...' : 'Authorize Admin Session'}</span>
            </button>
          </form>

          {!passphraseConfigured && envSecretAvailable && (
            <div className="pt-3 border-t border-[#D5D0C5] dark:border-[#1E2231]">
              <button
                type="button"
                disabled={authSubmitting}
                onClick={(e) => handleAdminLogin(e, 'studio-env-handshake')}
                data-testid="studio-env-handshake-btn"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Verify via Active Neon Environment Secret</span>
              </button>
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-6xl text-center text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
          CROSX DEV STUDIO® · Founded by IRON CLAD · Server-Side Authorized Endpoint
        </div>
      </div>
    );
  }

  /* ============================================================================
   * RENDER: AUTHENTICATED ENTERPRISE ADMIN WORKSPACE
   * ========================================================================== */

  return (
    <div
      data-testid="admin-dashboard-shell"
      className="min-h-screen flex flex-col lg:flex-row bg-[#F5F3EE] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA]"
    >
      {/* Left Navigation Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[#D5D0C5] dark:border-[#1E2231] bg-[#ECE8DF] dark:bg-[#080B14] flex flex-col justify-between lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2544E8]/40 bg-[#2544E8]/15 text-xs font-mono font-bold text-[#2544E8] dark:text-indigo-300">
                IC
              </span>
              <div>
                <span className="block text-sm font-extrabold font-display tracking-tight">
                  CROSX ADMIN
                </span>
                <span className="block text-[10px] font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                  IRON CLAD · CMS v2.6
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#101424] cursor-pointer"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          <nav aria-label="Admin Console Navigation" className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
              {
                id: 'projects',
                label: 'Projects',
                icon: FolderKanban,
                badge: stats.totalProjects,
              },
              {
                id: 'ledger',
                label: 'Specifications Ledger',
                icon: Sliders,
                badge: formFields.length,
              },
              {
                id: 'tickets',
                label: 'Messages & Tickets',
                icon: MessageSquare,
                badge: stats.unreadMessages > 0 ? stats.unreadMessages : stats.totalInquiries,
                highlightBadge: stats.unreadMessages > 0,
              },
              { id: 'settings', label: 'Settings', icon: Settings, badge: null },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`flex items-center justify-between gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#111110] text-white dark:bg-[#2544E8] dark:text-white font-semibold'
                      : 'text-[#4A4843] dark:text-[#A3A8B8] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#111110] dark:hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== null && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                        item.highlightBadge
                          ? 'bg-[#D94E28] text-white font-bold'
                          : active
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 dark:bg-white/10 text-[#4A4843] dark:text-[#9CA5BA]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-5 border-t border-[#D5D0C5] dark:border-[#1E2231] space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#6E6A61] dark:text-[#8E93A6]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Neon DB Sync</span>
            </span>
            <span>{neonTelemetry?.region || 'Active'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#101424] px-3 py-2 text-xs font-mono text-[#111110] dark:text-[#E5E9F2] hover:border-[#2544E8]"
            >
              <span>Live Site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              data-testid="admin-logout-btn"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D94E28]/40 bg-[#D94E28]/10 px-3 py-2 text-xs font-mono text-[#D94E28] hover:bg-[#D94E28] hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Bar */}
        <header className="sticky top-0 z-20 border-b border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE]/95 dark:bg-[#05060B]/95 backdrop-blur-md px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight">
              {activeTab === 'dashboard' && 'Executive Overview & Live Studio Telemetry'}
              {activeTab === 'projects' && 'Project Portfolio Management CMS'}
              {activeTab === 'ledger' && 'Dynamic Project Specifications Ledger (Form Builder)'}
              {activeTab === 'tickets' && 'Client Inquiries, Support Tickets & Two-Way Messaging'}
              {activeTab === 'settings' && 'Studio Security & Neon Database Configuration'}
            </h1>
            <p className="text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
              CROSX DEV STUDIO® · Founded by IRON CLAD · Real-time state synchronization active
            </p>
          </div>

          <div className="flex items-center gap-3">
            {toast && (
              <div
                role="status"
                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-mono ${
                  toast.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-[#D94E28] bg-[#D94E28]/15 text-[#D94E28]'
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchAdminOverview(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#101424] px-3 py-2 text-xs font-mono text-[#111110] dark:text-[#E5E9F2] hover:border-[#2544E8] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 space-y-8">
          {/* ====================================================================
           * TAB 1: DASHBOARD OVERVIEW
           * ================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* 6 KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  {
                    label: 'Total Projects',
                    value: stats.totalProjects,
                    sub: 'Portfolio CMS',
                    testId: 'stat-total-projects',
                  },
                  {
                    label: 'Active Projects',
                    value: stats.activeProjects,
                    sub: 'Live on Public Site',
                    testId: 'stat-active-projects',
                  },
                  {
                    label: 'Total Inquiries',
                    value: stats.totalInquiries,
                    sub: 'All-time Submissions',
                    testId: 'stat-total-inquiries',
                  },
                  {
                    label: 'Unread Messages',
                    value: stats.unreadMessages,
                    sub: 'Awaiting Review',
                    accent: stats.unreadMessages > 0,
                    testId: 'stat-unread-messages',
                  },
                  {
                    label: 'Open Tickets',
                    value: stats.openTickets,
                    sub: 'Active Engineering',
                    testId: 'stat-open-tickets',
                  },
                  {
                    label: 'Resolved Tickets',
                    value: stats.resolvedTickets,
                    sub: 'Completed / Closed',
                    testId: 'stat-resolved-tickets',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    data-testid={kpi.testId}
                    className={`rounded-xl border p-4 space-y-2 ${
                      kpi.accent
                        ? 'border-[#D94E28]/50 bg-[#D94E28]/[0.06] dark:bg-[#D94E28]/[0.1]'
                        : 'border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17]'
                    }`}
                  >
                    <span className="block text-[11px] font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                      {kpi.label}
                    </span>
                    <span className="block text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#111110] dark:text-white">
                      {kpi.value}
                    </span>
                    <span className="block text-[11px] font-mono text-[#2544E8] dark:text-[#6E88FF]">
                      {kpi.sub}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent Client Activity & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4">
                    <div>
                      <h2 className="text-base font-bold font-display">
                        Recent Client Activity &amp; Support Tickets
                      </h2>
                      <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                        Click any ticket row to inspect specification details and send a reply.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="text-xs font-mono text-[#2544E8] dark:text-[#6E88FF] hover:underline cursor-pointer"
                    >
                      Open Full Inbox →
                    </button>
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <MessageSquare className="h-7 w-7 text-[#6E6A61] mx-auto" />
                      <p className="text-sm font-medium">No client tickets logged yet</p>
                      <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                        New inquiries submitted on the public Project Specification form will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#D5D0C5] dark:border-[#1E2231] font-mono uppercase text-[10px] text-[#6E6A61] dark:text-[#8E93A6]">
                            <th className="py-2.5 pr-3">Ticket ID</th>
                            <th className="py-2.5 px-3">Client</th>
                            <th className="py-2.5 px-3">Scope</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 pl-3 text-right">Updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2DDD2] dark:divide-[#181D2C]">
                          {recentActivity.map((act) => (
                            <tr
                              key={act.ticketNumber}
                              onClick={() => {
                                setSelectedTicketNumber(act.ticketNumber);
                                setActiveTab('tickets');
                              }}
                              className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                            >
                              <td className="py-3 pr-3 font-mono font-bold text-[#2544E8] dark:text-[#8BA2FF] whitespace-nowrap">
                                {!act.isRead && (
                                  <span
                                    title="Unread"
                                    className="inline-block h-2 w-2 rounded-full bg-[#D94E28] mr-1.5"
                                  />
                                )}
                                {act.ticketNumber}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-[#111110] dark:text-white">
                                  {act.clientName}
                                </div>
                                <div className="font-mono text-[11px] text-[#6E6A61] dark:text-[#8E93A6]">
                                  {act.clientEmail}
                                </div>
                              </td>
                              <td className="py-3 px-3 max-w-[180px] truncate text-[#4A4843] dark:text-[#B8C0D4]">
                                {act.serviceScope}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-block rounded border px-2 py-0.5 text-[10px] font-mono font-semibold ${getStatusBadgeClasses(
                                    act.status
                                  )}`}
                                >
                                  {act.status}
                                </span>
                              </td>
                              <td className="py-3 pl-3 text-right font-mono text-[11px] tabular-nums text-[#6E6A61] dark:text-[#8E93A6] whitespace-nowrap">
                                {new Date(act.updatedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right Column: Quick Studio Controls */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-5 space-y-4">
                    <h3 className="text-sm font-bold font-display">
                      Quick Studio Operations
                    </h3>
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('projects');
                          openAddProjectModal();
                        }}
                        className="w-full flex items-center justify-between rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101422] px-4 py-3 text-xs font-mono font-semibold hover:border-[#2544E8] cursor-pointer"
                      >
                        <span>+ Add Portfolio Project</span>
                        <FolderKanban className="h-4 w-4 text-[#2544E8] dark:text-[#6E88FF]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('ledger');
                          openAddFieldModal();
                        }}
                        className="w-full flex items-center justify-between rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101422] px-4 py-3 text-xs font-mono font-semibold hover:border-[#2544E8] cursor-pointer"
                      >
                        <span>+ Add Specification Form Field</span>
                        <Sliders className="h-4 w-4 text-[#D94E28]" />
                      </button>

                      <Link
                        href="/track-ticket"
                        className="w-full flex items-center justify-between rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101422] px-4 py-3 text-xs font-mono font-semibold hover:border-[#2544E8]"
                      >
                        <span>Open Public Ticket Portal</span>
                        <ExternalLink className="h-4 w-4 text-[#2544E8] dark:text-[#6E88FF]" />
                      </Link>
                    </div>
                  </div>

                  {neonTelemetry && (
                    <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-[#111110] dark:text-white">
                          Database Backend
                        </span>
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          {neonTelemetry.protocolMode}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6] truncate">
                        {neonTelemetry.maskedEndpoint}
                      </p>
                      <p className="text-[11px] font-mono text-[#2544E8] dark:text-[#6E88FF]">
                        Region: {neonTelemetry.region} · DB: {neonTelemetry.databaseName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
           * TAB 2: PROJECT MANAGEMENT CMS
           * ================================================================== */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold font-display">
                    Production Portfolio Projects ({projects.length})
                  </h2>
                  <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                    Every change here immediately updates the public Selected Work exhibition on CROSX DEV STUDIO®.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddProjectModal}
                  data-testid="add-project-btn"
                  className="cta-tactile-primary inline-flex items-center gap-2 rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Project</span>
                </button>
              </div>

              <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#101422] font-mono uppercase text-[10px] text-[#6E6A61] dark:text-[#8E93A6]">
                        <th className="py-3 px-4">Order</th>
                        <th className="py-3 px-4">Project &amp; Subtitle</th>
                        <th className="py-3 px-4">Category &amp; Domain</th>
                        <th className="py-3 px-4">Technology Stack</th>
                        <th className="py-3 px-4">Visibility</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DDD2] dark:divide-[#181D2C]">
                      {projects.map((proj, idx) => (
                        <tr key={proj.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#2544E8] dark:text-[#8BA2FF]">
                                {proj.index}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveProject(idx, -1)}
                                  aria-label={`Move ${proj.title} up`}
                                  className="p-0.5 text-[#6E6A61] hover:text-[#111110] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === projects.length - 1}
                                  onClick={() => handleMoveProject(idx, 1)}
                                  aria-label={`Move ${proj.title} down`}
                                  className="p-0.5 text-[#6E6A61] hover:text-[#111110] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={proj.liveScreenshot}
                                alt={proj.title}
                                className="h-10 w-16 rounded border border-[#C8C2B5] dark:border-[#242C42] object-cover shrink-0"
                              />
                              <div>
                                <div className="font-bold text-sm text-[#111110] dark:text-white">
                                  {proj.title}
                                </div>
                                <div className="text-[#5C5952] dark:text-[#9CA5BA] max-w-xs truncate">
                                  {proj.subtitle}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="block font-medium text-[#111110] dark:text-[#E5E9F2]">
                              {proj.category}
                            </span>
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-[#2544E8] dark:text-[#6E88FF] hover:underline"
                            >
                              <span>{proj.displayUrl}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {proj.stack.slice(0, 4).map((t) => (
                                <span
                                  key={t}
                                  className="rounded border border-[#D5D0C5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101424] px-2 py-0.5 font-mono text-[10px]"
                                >
                                  {t}
                                </span>
                              ))}
                              {proj.stack.length > 4 && (
                                <span className="font-mono text-[10px] text-[#6E6A61]">
                                  +{proj.stack.length - 4}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleProjectFlag(proj, 'published')}
                                className={`inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold cursor-pointer ${
                                  proj.published
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                    : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                                }`}
                              >
                                {proj.published ? (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>Published</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3 w-3" />
                                    <span>Draft</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleProjectFlag(proj, 'featured')}
                                aria-label={`Toggle featured for ${proj.title}`}
                                className={`p-1 rounded border cursor-pointer ${
                                  proj.featured
                                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-500'
                                    : 'border-[#D5D0C5] dark:border-[#242C42] text-[#6E6A61]'
                                }`}
                              >
                                <Star className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProjectModal(proj)}
                                aria-label={`Edit ${proj.title}`}
                                className="inline-flex items-center gap-1 rounded-md border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101424] px-2.5 py-1.5 font-mono text-[11px] hover:border-[#2544E8] cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteProjectTarget(proj)}
                                aria-label={`Delete ${proj.title}`}
                                className="inline-flex items-center gap-1 rounded-md border border-[#D94E28]/40 bg-[#D94E28]/10 px-2.5 py-1.5 font-mono text-[11px] text-[#D94E28] hover:bg-[#D94E28] hover:text-white cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
           * TAB 3: DYNAMIC PROJECT SPECIFICATIONS LEDGER (FORM BUILDER)
           * ================================================================== */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold font-display">
                    Dynamic Project Specification Form Schema ({formFields.length} Fields)
                  </h2>
                  <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                    Configure fields rendered on the public Project Specification form. Historical submissions preserve their original field snapshots.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddFieldModal}
                  data-testid="add-form-field-btn"
                  className="cta-tactile-primary inline-flex items-center gap-2 rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Form Field</span>
                </button>
              </div>

              <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#101422] font-mono uppercase text-[10px] text-[#6E6A61] dark:text-[#8E93A6]">
                        <th className="py-3 px-4">Order</th>
                        <th className="py-3 px-4">Field Label &amp; Key</th>
                        <th className="py-3 px-4">Input Type</th>
                        <th className="py-3 px-4">Placeholder / Options</th>
                        <th className="py-3 px-4">Validation</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DDD2] dark:divide-[#181D2C]">
                      {formFields.map((field, idx) => (
                        <tr key={field.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#2544E8] dark:text-[#8BA2FF]">
                                {String(field.order).padStart(2, '0')}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveField(idx, -1)}
                                  aria-label={`Move ${field.label} up`}
                                  className="p-0.5 text-[#6E6A61] hover:text-[#111110] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formFields.length - 1}
                                  onClick={() => handleMoveField(idx, 1)}
                                  aria-label={`Move ${field.label} down`}
                                  className="p-0.5 text-[#6E6A61] hover:text-[#111110] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#111110] dark:text-white">
                              {field.label}
                            </div>
                            <div className="font-mono text-[11px] text-[#6E6A61] dark:text-[#8E93A6]">
                              key: {field.key}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="rounded border border-[#2544E8]/30 bg-[#2544E8]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2544E8] dark:text-[#8BA2FF] uppercase">
                              {field.type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            {field.options.length > 0 ? (
                              <span className="font-mono text-[11px] text-[#4A4843] dark:text-[#B8C0D4] line-clamp-1">
                                Options ({field.options.length}): {field.options.join(' · ')}
                              </span>
                            ) : (
                              <span className="text-[#6E6A61] dark:text-[#8E93A6] truncate block">
                                {field.placeholder || '—'}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldFlag(field, 'required')}
                              className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold cursor-pointer ${
                                field.required
                                  ? 'bg-[#D94E28]/15 text-[#D94E28] border border-[#D94E28]/30'
                                  : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                              }`}
                            >
                              {field.required ? 'Required *' : 'Optional'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldFlag(field, 'enabled')}
                              className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold cursor-pointer ${
                                field.enabled
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                              }`}
                            >
                              {field.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditFieldModal(field)}
                                aria-label={`Edit field ${field.label}`}
                                className="inline-flex items-center gap-1 rounded-md border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101424] px-2.5 py-1.5 font-mono text-[11px] hover:border-[#2544E8] cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteFieldTarget(field)}
                                aria-label={`Delete field ${field.label}`}
                                className="inline-flex items-center gap-1 rounded-md border border-[#D94E28]/40 bg-[#D94E28]/10 px-2.5 py-1.5 font-mono text-[11px] text-[#D94E28] hover:bg-[#D94E28] hover:text-white cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
           * TAB 4: CLIENT MESSAGE & TICKET MANAGEMENT + TWO-WAY MESSAGING
           * ================================================================== */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* Search, Status Filter & Sort Bar */}
              <div className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="h-4 w-4 text-[#6E6A61] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => {
                      setTicketSearch(e.target.value);
                      setTicketPage(1);
                    }}
                    placeholder="Search by Ticket ID (CROSX-2026-...), client name, email, or company..."
                    aria-label="Search tickets"
                    className="w-full rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] pl-9 pr-3.5 py-2 text-xs text-[#111110] dark:text-[#F4F1EA] focus:border-[#2544E8] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter tickets by status"
                    value={ticketStatusFilter}
                    onChange={(e) => {
                      setTicketStatusFilter(e.target.value as TicketStatus | 'ALL');
                      setTicketPage(1);
                    }}
                    className="rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs font-mono text-[#111110] dark:text-[#F4F1EA]"
                  >
                    <option value="ALL">All Statuses ({tickets.length})</option>
                    {ALL_TICKET_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Sort tickets by date"
                    value={ticketSort}
                    onChange={(e) => setTicketSort(e.target.value as 'newest' | 'oldest')}
                    className="rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs font-mono text-[#111110] dark:text-[#F4F1EA]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Master-Detail Split View: Left Ticket List, Right Conversation & Dossier */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (5 cols): Ticket Inbox List */}
                <div className="lg:col-span-5 rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] overflow-hidden">
                  <div className="border-b border-[#D5D0C5] dark:border-[#1E2231] px-4 py-3 flex items-center justify-between text-xs font-mono">
                    <span>Tickets ({filteredTickets.length})</span>
                    <span>
                      Page {ticketPage} of {totalTicketPages}
                    </span>
                  </div>

                  {paginatedTickets.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <MessageSquare className="h-7 w-7 text-[#6E6A61] mx-auto" />
                      <p className="text-sm font-medium">No matching support tickets</p>
                      <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                        Submit an inquiry on the public form or clear your active search filters.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2DDD2] dark:divide-[#181D2C]">
                      {paginatedTickets.map((tkt) => {
                        const isSelected = selectedTicket?.ticketNumber === tkt.ticketNumber;
                        return (
                          <div
                            key={tkt.ticketNumber}
                            onClick={() => handleSelectTicket(tkt)}
                            className={`p-4 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#2544E8]/[0.08] dark:bg-[#2544E8]/[0.16] border-l-4 border-l-[#2544E8]'
                                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-[#2544E8] dark:text-[#8BA2FF] flex items-center gap-1.5">
                                {!tkt.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-[#D94E28]" />
                                )}
                                <span>{tkt.ticketNumber}</span>
                              </span>
                              <span
                                className={`rounded border px-2 py-0.5 text-[10px] font-mono font-semibold ${getStatusBadgeClasses(
                                  tkt.status
                                )}`}
                              >
                                {tkt.status}
                              </span>
                            </div>

                            <div className="font-semibold text-sm text-[#111110] dark:text-white">
                              {tkt.clientName}{' '}
                              <span className="font-normal text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                                · {tkt.company}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-[#6E6A61] dark:text-[#8E93A6] truncate">
                              {tkt.clientEmail}
                            </div>
                            <p className="mt-1.5 text-xs text-[#4A4843] dark:text-[#A3A8B8] line-clamp-2">
                              {tkt.projectBrief}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {totalTicketPages > 1 && (
                    <div className="border-t border-[#D5D0C5] dark:border-[#1E2231] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                      <button
                        type="button"
                        disabled={ticketPage <= 1}
                        onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded border border-[#C8C2B5] dark:border-[#242C42] disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={ticketPage >= totalTicketPages}
                        onClick={() => setTicketPage((p) => Math.min(totalTicketPages, p + 1))}
                        className="px-2.5 py-1 rounded border border-[#C8C2B5] dark:border-[#242C42] disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column (7 cols): Active Ticket Dossier & Two-Way Messaging */}
                <div className="lg:col-span-7">
                  {selectedTicket ? (
                    <div
                      data-testid="admin-ticket-detail"
                      className="rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-6"
                    >
                      {/* Top Header & Actions */}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-mono font-bold text-[#111110] dark:text-white">
                              {selectedTicket.ticketNumber}
                            </h3>
                            <span
                              className={`rounded border px-2.5 py-0.5 text-xs font-mono font-semibold ${getStatusBadgeClasses(
                                selectedTicket.status
                              )}`}
                            >
                              {selectedTicket.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                            {selectedTicket.clientName} ({selectedTicket.clientEmail}) ·{' '}
                            {selectedTicket.company}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label="Update ticket status"
                            value={selectedTicket.status}
                            onChange={(e) =>
                              handleUpdateTicketStatus(
                                selectedTicket.ticketNumber,
                                e.target.value as TicketStatus
                              )
                            }
                            className="rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-1.5 text-xs font-mono font-semibold text-[#111110] dark:text-[#F4F1EA]"
                          >
                            {ALL_TICKET_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                Status: {st}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleTicketRead(selectedTicket)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101424] px-2.5 py-1.5 text-xs font-mono cursor-pointer"
                          >
                            {selectedTicket.isRead ? (
                              <>
                                <Mail className="h-3.5 w-3.5" />
                                <span>Mark Unread</span>
                              </>
                            ) : (
                              <>
                                <MailOpen className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Mark Read</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTicketTarget(selectedTicket)}
                            aria-label={`Delete ticket ${selectedTicket.ticketNumber}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D94E28]/40 bg-[#D94E28]/10 px-2.5 py-1.5 text-xs font-mono text-[#D94E28] hover:bg-[#D94E28] hover:text-white cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Submitted Form Snapshot & Tracking Credentials */}
                      <div className="rounded-xl border border-[#E2DDD2] dark:border-[#181D2C] bg-[#F5F3EE] dark:bg-[#101422] p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-mono uppercase tracking-wider text-[#2544E8] dark:text-[#6E88FF] font-semibold flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Submitted Specification Snapshot (Historical Record)</span>
                          </span>
                          <Link
                            href={`/track-ticket?ticket=${encodeURIComponent(
                              selectedTicket.ticketNumber
                            )}&token=${encodeURIComponent(
                              selectedTicket.adminTrackingTokenRef
                            )}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#D94E28] hover:underline"
                          >
                            <span>Client Tracking Link ({selectedTicket.adminTrackingTokenRef})</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {selectedTicket.submittedFields.map((sf) => (
                            <div
                              key={sf.key}
                              className={
                                sf.type === 'textarea'
                                  ? 'sm:col-span-2 rounded-lg border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-2.5'
                                  : 'rounded-lg border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-2.5'
                              }
                            >
                              <span className="block font-mono text-[10px] uppercase text-[#6E6A61] dark:text-[#8E93A6]">
                                {sf.label}
                              </span>
                              <span className="mt-0.5 block font-medium text-[#111110] dark:text-[#F4F1EA] break-words">
                                {sf.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conversation Thread (Including Internal Admin Notes) */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6]">
                          Conversation History &amp; Internal Notes ({selectedTicket.messages.length})
                        </h4>

                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {selectedTicket.messages.map((msg) => {
                            const isInternal = msg.isInternal;
                            const isAdmin = msg.senderRole === 'ADMIN';
                            return (
                              <div
                                key={msg.id}
                                className={`rounded-xl border p-3.5 text-xs ${
                                  isInternal
                                    ? 'border-amber-500/45 bg-amber-500/[0.08] dark:bg-amber-500/[0.12]'
                                    : isAdmin
                                    ? 'border-[#2544E8]/35 bg-[#2544E8]/[0.06] dark:bg-[#2544E8]/[0.12]'
                                    : 'border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#101422]'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                  <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#111110] dark:text-white">
                                    {isAdmin ? (
                                      <ShieldCheck className="h-3.5 w-3.5 text-[#2544E8] dark:text-[#6E88FF]" />
                                    ) : (
                                      <User className="h-3.5 w-3.5 text-[#D94E28]" />
                                    )}
                                    <span>{msg.senderName}</span>
                                    {isInternal ? (
                                      <span className="rounded bg-amber-500 text-black px-1.5 py-0.5 text-[10px] font-mono font-bold">
                                        INTERNAL NOTE · HIDDEN FROM CLIENT
                                      </span>
                                    ) : (
                                      <span className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">
                                        {msg.senderRole}
                                      </span>
                                    )}
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#6E6A61] dark:text-[#8E93A6]">
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
                      </div>

                      {/* Reply / Internal Note Composer */}
                      <form
                        onSubmit={handleSendAdminReply}
                        className="border-t border-[#D5D0C5] dark:border-[#1E2231] pt-4 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyIsInternal(false)}
                            className={`rounded-md px-3 py-1.5 text-xs font-mono font-semibold cursor-pointer ${
                              !replyIsInternal
                                ? 'bg-[#2544E8] text-white'
                                : 'border border-[#C8C2B5] dark:border-[#242C42] text-[#6E6A61]'
                            }`}
                          >
                            Public Reply to Client
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyIsInternal(true)}
                            className={`rounded-md px-3 py-1.5 text-xs font-mono font-semibold cursor-pointer ${
                              replyIsInternal
                                ? 'bg-amber-500 text-black'
                                : 'border border-[#C8C2B5] dark:border-[#242C42] text-[#6E6A61]'
                            }`}
                          >
                            Internal Admin Note (Private)
                          </button>
                        </div>

                        <textarea
                          rows={3}
                          required
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={
                            replyIsInternal
                              ? 'Write an internal note visible only to CROSX DEV STUDIO admins...'
                              : `Write a response to ${selectedTicket.clientName}...`
                          }
                          aria-label={
                            replyIsInternal ? 'Internal admin note' : 'Public reply to client'
                          }
                          className="w-full rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3.5 py-2.5 text-sm text-[#111110] dark:text-[#F4F1EA] focus:border-[#2544E8] focus:outline-none"
                        />

                        <div className="flex items-center justify-end">
                          <button
                            type="submit"
                            disabled={sendingReply || !replyBody.trim()}
                            className="cta-tactile-primary inline-flex items-center gap-2 rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] disabled:opacity-50 cursor-pointer"
                          >
                            <span>
                              {sendingReply
                                ? 'Saving...'
                                : replyIsInternal
                                ? 'Save Internal Note'
                                : 'Send Client Reply'}
                            </span>
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#C8C2B5] dark:border-[#242C42] p-12 text-center space-y-2">
                      <MessageSquare className="h-8 w-8 text-[#6E6A61] mx-auto" />
                      <p className="text-sm font-bold font-display">
                        Select a Ticket to View Conversation
                      </p>
                      <p className="text-xs text-[#6E6A61] dark:text-[#8E93A6]">
                        Choose any inquiry from the left inbox to inspect its specification snapshot or reply.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
           * TAB 5: SETTINGS
           * ================================================================== */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-5">
                <h2 className="text-base font-bold font-display">
                  Admin Passphrase &amp; Session Security
                </h2>
                <p className="text-xs text-[#5C5952] dark:text-[#9CA5BA] leading-relaxed">
                  Configure or rotate your encrypted PBKDF2-SHA256 admin passphrase. You can always authenticate using either your saved passphrase or your configured Neon Studio Environment Secret.
                </p>

                <form onSubmit={handleUpdatePassphrase} className="space-y-4">
                  <div>
                    <label
                      htmlFor="settings-new-passphrase"
                      className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-1.5"
                    >
                      New Admin Passphrase (Min 8 Characters)
                    </label>
                    <input
                      id="settings-new-passphrase"
                      type="password"
                      required
                      minLength={8}
                      value={newPassphraseSetting}
                      onChange={(e) => setNewPassphraseSetting(e.target.value)}
                      placeholder="Enter new admin passphrase..."
                      className="w-full rounded-lg border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3.5 py-2.5 text-sm font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="cta-tactile-primary inline-flex items-center gap-2 rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Update Admin Passphrase</span>
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-5">
                <h2 className="text-base font-bold font-display">
                  Database &amp; Real-Time Telemetry Configuration
                </h2>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between py-2 border-b border-[#E2DDD2] dark:border-[#181D2C]">
                    <span className="text-[#6E6A61] dark:text-[#8E93A6]">Studio Identity</span>
                    <span className="font-bold">CROSX DEV STUDIO® (IRON CLAD)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#E2DDD2] dark:divide-[#181D2C]">
                    <span className="text-[#6E6A61] dark:text-[#8E93A6]">Database Secret</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {neonTelemetry?.secretKeyUsed || 'NEON_DATABASE_URL'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#E2DDD2] dark:border-[#181D2C]">
                    <span className="text-[#6E6A61] dark:text-[#8E93A6]">Endpoint</span>
                    <span className="truncate max-w-[240px]">
                      {neonTelemetry?.maskedEndpoint || 'Neon Cloud'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#6E6A61] dark:text-[#8E93A6]">
                      Real-Time Ticket Sync (6s)
                    </span>
                    <button
                      type="button"
                      onClick={() => setRealtimeEnabled((v) => !v)}
                      className={`rounded px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                        realtimeEnabled
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-500/15 text-zinc-500'
                      }`}
                    >
                      {realtimeEnabled ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================
       * MODAL 1: ADD / EDIT PROJECT
       * ====================================================================== */}
      {projectModalOpen && editingProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Project CMS Editor"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[#D5D0C5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 sm:p-8 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4">
              <h3 className="text-lg font-bold font-display">
                {editingProject.id ? `Edit Project: ${editingProject.title}` : 'Add New Portfolio Project'}
              </h3>
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                aria-label="Close project modal"
                className="p-1.5 rounded-lg border border-[#C8C2B5] dark:border-[#242C42] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proj-title" className="block font-mono uppercase mb-1">
                    Project Title *
                  </label>
                  <input
                    id="proj-title"
                    type="text"
                    required
                    value={editingProject.title ?? ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, title: e.target.value })
                    }
                    placeholder="e.g. CrosX Cloud"
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="proj-category" className="block font-mono uppercase mb-1">
                    Category *
                  </label>
                  <select
                    id="proj-category"
                    value={editingProject.category ?? 'Enterprise Web Platform'}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        category: e.target.value as CmsProject['category'],
                      })
                    }
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                  >
                    <option value="Enterprise Web Platform">Enterprise Web Platform</option>
                    <option value="Engineering Tooling & SaaS">Engineering Tooling &amp; SaaS</option>
                    <option value="Full-Stack Service & Commerce">Full-Stack Service &amp; Commerce</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="proj-subtitle" className="block font-mono uppercase mb-1">
                  Subtitle / Tagline *
                </label>
                <input
                  id="proj-subtitle"
                  type="text"
                  required
                  value={editingProject.subtitle ?? ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, subtitle: e.target.value })
                  }
                  placeholder="Enterprise Performance & Digital Growth Platform"
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proj-url" className="block font-mono uppercase mb-1">
                    Live Website URL *
                  </label>
                  <input
                    id="proj-url"
                    type="url"
                    required
                    value={editingProject.url ?? ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, url: e.target.value })
                    }
                    placeholder="https://crosx.in"
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="proj-display-url" className="block font-mono uppercase mb-1">
                    Display Domain
                  </label>
                  <input
                    id="proj-display-url"
                    type="text"
                    value={editingProject.displayUrl ?? ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, displayUrl: e.target.value })
                    }
                    placeholder="crosx.in"
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Screenshot URL + Image File Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proj-screenshot" className="block font-mono uppercase mb-1">
                    Primary Live Screenshot (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="proj-screenshot"
                      type="text"
                      value={editingProject.liveScreenshot ?? ''}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          liveScreenshot: e.target.value,
                        })
                      }
                      className="flex-1 rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs font-mono"
                    />
                    <label className="inline-flex items-center gap-1 rounded-md border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101424] px-2.5 py-2 cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'liveScreenshot')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="proj-studio-visual" className="block font-mono uppercase mb-1">
                    Secondary Studio Visual (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="proj-studio-visual"
                      type="text"
                      value={editingProject.studioVisual ?? ''}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          studioVisual: e.target.value,
                        })
                      }
                      className="flex-1 rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs font-mono"
                    />
                    <label className="inline-flex items-center gap-1 rounded-md border border-[#C8C2B5] dark:border-[#242C42] bg-[#F5F3EE] dark:bg-[#101424] px-2.5 py-2 cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'studioVisual')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="proj-summary" className="block font-mono uppercase mb-1">
                  Executive Summary *
                </label>
                <textarea
                  id="proj-summary"
                  rows={2}
                  required
                  value={editingProject.summary ?? ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, summary: e.target.value })
                  }
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="proj-arch" className="block font-mono uppercase mb-1">
                  Architecture Overview
                </label>
                <textarea
                  id="proj-arch"
                  rows={2}
                  value={editingProject.architectureOverview ?? ''}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      architectureOverview: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="proj-stack" className="block font-mono uppercase mb-1">
                  Technology Stack (Comma separated)
                </label>
                <input
                  id="proj-stack"
                  type="text"
                  value={stackText}
                  onChange={(e) => setStackText(e.target.value)}
                  placeholder="Next.js, React, TypeScript, Tailwind CSS, Neon DB"
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label htmlFor="proj-highlights" className="block font-mono uppercase mb-1">
                  Engineering Highlights (One per line)
                </label>
                <textarea
                  id="proj-highlights"
                  rows={3}
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProject.published)}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, published: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#2544E8]"
                  />
                  <span className="font-mono">Published on Live Portfolio</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProject.featured)}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, featured: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#2544E8]"
                  />
                  <span className="font-mono">Featured Project</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#D5D0C5] dark:border-[#1E2231] pt-4">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] px-4 py-2 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-tactile-primary rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2 font-mono text-xs font-semibold cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
       * MODAL 2: ADD / EDIT DYNAMIC FORM FIELD
       * ====================================================================== */}
      {fieldModalOpen && editingField && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Specification Form Field Editor"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#D5D0C5] dark:border-[#242C42] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#D5D0C5] dark:border-[#1E2231] pb-4">
              <h3 className="text-lg font-bold font-display">
                {editingField.id
                  ? `Edit Form Field: ${editingField.label}`
                  : 'Add Specification Form Field'}
              </h3>
              <button
                type="button"
                onClick={() => setFieldModalOpen(false)}
                aria-label="Close field modal"
                className="p-1.5 rounded-lg border border-[#C8C2B5] dark:border-[#242C42] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-4 text-xs">
              <div>
                <label htmlFor="field-label" className="block font-mono uppercase mb-1">
                  Field Label *
                </label>
                <input
                  id="field-label"
                  type="text"
                  required
                  value={editingField.label ?? ''}
                  onChange={(e) =>
                    setEditingField({ ...editingField, label: e.target.value })
                  }
                  placeholder="e.g. Estimated Budget Range"
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field-type" className="block font-mono uppercase mb-1">
                    Input Type *
                  </label>
                  <select
                    id="field-type"
                    value={editingField.type ?? 'text'}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        type: e.target.value as DynamicFieldType,
                      })
                    }
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm font-mono"
                  >
                    {ALLOWED_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="field-width" className="block font-mono uppercase mb-1">
                    Layout Column Span
                  </label>
                  <select
                    id="field-width"
                    value={editingField.width ?? 'half'}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        width: e.target.value as DynamicFormField['width'],
                      })
                    }
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm font-mono"
                  >
                    <option value="half">Half Width (50%)</option>
                    <option value="third">Third Width (33%)</option>
                    <option value="full">Full Width (100%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="field-placeholder" className="block font-mono uppercase mb-1">
                  Placeholder Text
                </label>
                <input
                  id="field-placeholder"
                  type="text"
                  value={editingField.placeholder ?? ''}
                  onChange={(e) =>
                    setEditingField({ ...editingField, placeholder: e.target.value })
                  }
                  placeholder="Enter helpful placeholder prompt..."
                  className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-sm"
                />
              </div>

              {(editingField.type === 'select' || editingField.type === 'radio') && (
                <div>
                  <label htmlFor="field-options" className="block font-mono uppercase mb-1">
                    Dropdown / Radio Options (One option per line) *
                  </label>
                  <textarea
                    id="field-options"
                    rows={4}
                    required
                    value={fieldOptionsText}
                    onChange={(e) => setFieldOptionsText(e.target.value)}
                    placeholder={'$2,500 – $5,000\n$5,000 – $15,000\n$15,000+ Enterprise'}
                    className="w-full rounded-md border border-[#C8C2B5] dark:border-[#282B3A] bg-[#F5F3EE] dark:bg-[#10131E] px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingField.required)}
                    onChange={(e) =>
                      setEditingField({ ...editingField, required: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#2544E8]"
                  />
                  <span className="font-mono">Required Field</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingField.enabled)}
                    onChange={(e) =>
                      setEditingField({ ...editingField, enabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#2544E8]"
                  />
                  <span className="font-mono">Enabled on Public Form</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#D5D0C5] dark:border-[#1E2231] pt-4">
                <button
                  type="button"
                  onClick={() => setFieldModalOpen(false)}
                  className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] px-4 py-2 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-tactile-primary rounded-lg bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2 font-mono text-xs font-semibold cursor-pointer"
                >
                  Save Form Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
       * MODAL 3: DELETE CONFIRMATION DIALOGS
       * ====================================================================== */}
      {deleteProjectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Project"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#D94E28] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-4">
            <h3 className="text-base font-bold font-display text-[#D94E28]">
              Confirm Delete Project
            </h3>
            <p className="text-xs text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-[#111110] dark:text-white">
                {deleteProjectTarget.title}
              </strong>{' '}
              from the portfolio?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProjectTarget(null)}
                className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] px-4 py-2 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProject}
                className="rounded-lg bg-[#D94E28] text-white px-4 py-2 text-xs font-mono font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFieldTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Form Field"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#D94E28] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-4">
            <h3 className="text-base font-bold font-display text-[#D94E28]">
              Confirm Delete Form Field
            </h3>
            <p className="text-xs text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
              Remove field{' '}
              <strong className="text-[#111110] dark:text-white">
                {deleteFieldTarget.label}
              </strong>{' '}
              from future Project Specification submissions? Historical tickets will retain their saved values.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteFieldTarget(null)}
                className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] px-4 py-2 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteField}
                className="rounded-lg bg-[#D94E28] text-white px-4 py-2 text-xs font-mono font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTicketTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Support Ticket"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#D94E28] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 space-y-4">
            <h3 className="text-base font-bold font-display text-[#D94E28]">
              Confirm Delete Ticket {deleteTicketTarget.ticketNumber}
            </h3>
            <p className="text-xs text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
              Permanently delete ticket{' '}
              <strong className="font-mono text-[#111110] dark:text-white">
                {deleteTicketTarget.ticketNumber}
              </strong>{' '}
              ({deleteTicketTarget.clientName}) and its conversation thread?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTicketTarget(null)}
                className="rounded-lg border border-[#C8C2B5] dark:border-[#242C42] px-4 py-2 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTicket}
                className="rounded-lg bg-[#D94E28] text-white px-4 py-2 text-xs font-mono font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
