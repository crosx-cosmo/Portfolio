'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALL_TICKET_STATUSES,
  ALLOWED_FIELD_TYPES,
  buildDefaultFormFields,
  buildDefaultProjects,
  type CmsProject,
  type DynamicFieldType,
  type DynamicFormField,
  type SupportTicket,
  type TicketStatus,
} from '@/lib/cms-schema';
import { useStudioTheme } from '@/lib/use-studio-theme';
import type { NeonConnectionTelemetry } from '@/lib/neon-db';
import {
  AdminCustomDropdown,
  type AdminDropdownOption,
} from '@/components/admin/AdminCustomDropdown';
import { AdminActionMenu } from '@/components/admin/AdminActionMenu';
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
  KeyRound,
  ArrowLeft,
  Sparkles,
  Layers,
  Activity,
  Check,
  Menu,
  Grid,
  List,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

interface NeonAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

type AdminTab = 'dashboard' | 'projects' | 'ledger' | 'tickets' | 'settings';
type AuthViewMode = 'sign-in' | 'forgot-password' | 'reset-password' | 'verify-email';

const TAB_BREADCRUMBS: Record<AdminTab, { section: string; title: string; subtitle: string }> = {
  dashboard: {
    section: 'Executive Telemetry',
    title: 'Studio Command & Operations',
    subtitle:
      'Real-time portfolio performance, client support velocity, and Neon PostgreSQL telemetry',
  },
  projects: {
    section: 'Portfolio CMS',
    title: 'Selected Work & Case Studies',
    subtitle:
      'Curate production case studies, architecture highlights, and live exhibition sequence',
  },
  ledger: {
    section: 'Specifications Ledger',
    title: 'Dynamic Inquiry Schema Builder',
    subtitle:
      'Configure public project specification fields while preserving historical ticket snapshots',
  },
  tickets: {
    section: 'Client Support Desk',
    title: 'Inquiries, Tickets & Two-Way Threads',
    subtitle:
      'Inspect client specifications, update workflow statuses, and dispatch replies or internal notes',
  },
  settings: {
    section: 'Security & Infrastructure',
    title: 'Neon Auth & Studio Configuration',
    subtitle:
      'Managed Better Auth administrator credentials, server-side allowlist, and theme preferences',
  },
};

function getVioletTicketStatusClasses(status: TicketStatus): string {
  switch (status) {
    case 'OPEN':
      return 'border-[#7545E8]/40 bg-[#7545E8]/12 text-[#7545E8] dark:border-[#9B63F5]/45 dark:bg-[#7545E8]/25 dark:text-[#DCC7FF]';
    case 'IN_PROGRESS':
      return 'border-[#9B63F5]/45 bg-[#9B63F5]/15 text-[#6432DF] dark:border-[#DCC7FF]/40 dark:bg-[#9B63F5]/25 dark:text-[#EADFFF]';
    case 'WAITING_FOR_CLIENT':
      return 'border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300';
    case 'RESOLVED':
      return 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
    case 'CLOSED':
      return 'border-[#89839A]/40 bg-[#89839A]/12 text-[#89839A] dark:text-[#B5AED0]';
    default:
      return 'border-[#7545E8]/35 bg-[#7545E8]/10 text-[#7545E8] dark:text-[#DCC7FF]';
  }
}

function getTicketStatusDotColor(status: TicketStatus | 'ALL'): string {
  switch (status) {
    case 'OPEN':
      return 'bg-[#7545E8]';
    case 'IN_PROGRESS':
      return 'bg-[#9B63F5]';
    case 'WAITING_FOR_CLIENT':
      return 'bg-amber-500';
    case 'RESOLVED':
      return 'bg-emerald-500';
    case 'CLOSED':
      return 'bg-[#89839A]';
    default:
      return 'bg-[#7545E8]';
  }
}

export default function CrosxAdminDashboardPage() {
  const { isDark, toggleTheme } = useStudioTheme();

  // Neon Auth (Managed Better Auth) State
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<NeonAdminUser | null>(null);
  const [authViewMode, setAuthViewMode] = useState<AuthViewMode>('sign-in');

  // Sign-In / Reset / Verify Form State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [dispatchedCodePreview, setDispatchedCodePreview] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Active Navigation Tab & Mobile Drawer
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

  // Projects Module Filter & View Mode State
  const [projectSearch, setProjectSearch] = useState('');
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<string>('ALL');
  const [projectViewMode, setProjectViewMode] = useState<'table' | 'cards'>('table');

  // Project Modal State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<CmsProject> | null>(null);
  const [stackText, setStackText] = useState('');
  const [highlightsText, setHighlightsText] = useState('');
  const [deliverablesText, setDeliverablesText] = useState('');
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<CmsProject | null>(null);

  // Dynamic Form Field Filter & Modal State
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>('ALL');
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

  // Settings Password Rotation
  const [currentPasswordSetting, setCurrentPasswordSetting] = useState('');
  const [newPasswordSetting, setNewPasswordSetting] = useState('');
  const [showSettingsPassword, setShowSettingsPassword] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const fetchAdminOverview = useCallback(
    async (silent: boolean = false) => {
      if (!silent) setLoadingData(true);
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' });
        if (res.status === 401) {
          setAuthenticated(false);
          setAdminUser(null);
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
    },
    [showToast]
  );

  // Initial Neon Auth Session Check
  useEffect(() => {
    let active = true;
    fetch('/api/admin/auth', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setAuthenticated(Boolean(data.authenticated));
        setAdminUser(data.user || null);
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

  /* ============================================================================
   * NEON AUTH (MANAGED BETTER AUTH) HANDLERS
   * ========================================================================== */

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign-in',
          email: emailInput.trim(),
          password: passwordInput,
          rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Authentication failed. Access denied.');
        setAuthSubmitting(false);
        return;
      }

      setAuthenticated(true);
      setAdminUser(data.user || null);
      setPasswordInput('');
      setDispatchedCodePreview(null);
      showToast('success', `Authenticated as ${data.user?.email || emailInput.trim()}.`);
      await fetchAdminOverview(false);
    } catch {
      setAuthError('Network error while contacting Neon Auth endpoint.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRequestPasswordResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setDispatchedCodePreview(null);
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forgot-password',
          email: emailInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Unable to initiate password reset.');
        return;
      }

      if (data.verificationCode) {
        setDispatchedCodePreview(data.verificationCode);
        setVerificationCodeInput(data.verificationCode);
      }
      setAuthNotice(
        data.message ||
          'Verification code generated in Neon Auth. Enter it below to set your new password.'
      );
      setAuthViewMode('reset-password');
    } catch {
      setAuthError('Network error while requesting password reset.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    if (confirmPasswordInput && confirmPasswordInput !== newPasswordInput) {
      setAuthError('New password and confirmation password do not match.');
      return;
    }

    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          email: emailInput.trim(),
          verificationCode: verificationCodeInput.trim(),
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Unable to reset password.');
        return;
      }

      setPasswordInput(newPasswordInput);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setVerificationCodeInput('');
      setDispatchedCodePreview(null);
      setAuthNotice(
        data.message || 'Password updated in Neon Auth. Sign in below with your new password.'
      );
      setAuthViewMode('sign-in');
    } catch {
      setAuthError('Network error while resetting password.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setDispatchedCodePreview(null);
    if (!emailInput.trim()) {
      setAuthError('Enter your administrator email address first.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-verification',
          email: emailInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Unable to generate verification code.');
        return;
      }
      if (data.verificationCode) {
        setDispatchedCodePreview(data.verificationCode);
        setVerificationCodeInput(data.verificationCode);
      }
      setAuthNotice(data.message || 'Verification code generated.');
      setAuthViewMode('verify-email');
    } catch {
      setAuthError('Network error while requesting verification code.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleConfirmEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-email',
          email: emailInput.trim(),
          verificationCode: verificationCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Verification failed.');
        return;
      }
      setVerificationCodeInput('');
      setDispatchedCodePreview(null);
      setAuthNotice(data.message || 'Administrator email verified in Neon Auth.');
      setAuthViewMode('sign-in');
    } catch {
      setAuthError('Network error during email verification.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
    setAdminUser(null);
    setPasswordInput('');
    setMobileDrawerOpen(false);
    showToast('success', 'Signed out of Neon Auth administrator session.');
  };

  /* ============================================================================
   * PROJECT CMS CRUD HANDLERS
   * ========================================================================== */

  const openAddProjectModal = () => {
    setEditingProject({
      title: '',
      subtitle: '',
      category: 'Enterprise Web Platform',
      url: 'https://',
      displayUrl: '',
      liveScreenshot: '/projects/crosx-live.png',
      studioVisual: '/projects/crosx-arch.jpg',
      summary: '',
      architectureOverview: '',
      published: true,
      featured: false,
    });
    setStackText('Next.js, React, TypeScript, Tailwind CSS, Neon DB');
    setHighlightsText(
      'Sub-second server rendering & edge caching\nModular API & Neon PostgreSQL persistence'
    );
    setDeliverablesText('Full-Stack Web Platform\nCloud Deployment');
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
    if (file.size > 2.5 * 1024 * 1024) {
      showToast('error', 'Image file exceeds 2.5MB limit. Please compress or use a URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingProject((prev) =>
          prev ? { ...prev, [field]: reader.result as string } : prev
        );
        showToast('success', 'Image loaded into project preview.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject?.title?.trim() || !editingProject?.url?.trim()) {
      showToast('error', 'Project title and URL are required.');
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
      showToast('success', `Field "${field.label}" ${flag} updated.`);
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

  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (projectCategoryFilter !== 'ALL' && proj.category !== projectCategoryFilter) {
        return false;
      }
      if (projectSearch.trim()) {
        const q = projectSearch.trim().toLowerCase();
        return (
          proj.title.toLowerCase().includes(q) ||
          proj.subtitle.toLowerCase().includes(q) ||
          proj.displayUrl.toLowerCase().includes(q) ||
          proj.stack.some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projects, projectCategoryFilter, projectSearch]);

  const filteredFormFields = useMemo(() => {
    return formFields.filter((f) => {
      if (fieldTypeFilter !== 'ALL' && f.type !== fieldTypeFilter) {
        return false;
      }
      if (fieldSearch.trim()) {
        const q = fieldSearch.trim().toLowerCase();
        return (
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.placeholder.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [formFields, fieldTypeFilter, fieldSearch]);

  const filteredTickets = useMemo(() => {
    return tickets
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
  }, [tickets, ticketStatusFilter, ticketSearch, ticketSort]);

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordSetting.trim().length < 8) {
      showToast('error', 'New administrator password must be at least 8 characters.');
      return;
    }
    const res = await fetch('/api/admin/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPasswordSetting || undefined,
        newPassword: newPasswordSetting.trim(),
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setCurrentPasswordSetting('');
      setNewPasswordSetting('');
      showToast('success', data.message || 'Neon Auth administrator password updated.');
    } else {
      showToast('error', data.error || 'Failed to update password.');
    }
  };

  /* ============================================================================
   * CUSTOM DROPDOWN OPTIONS MEMOS
   * ========================================================================== */

  const ticketStatusFilterOptions: AdminDropdownOption<TicketStatus | 'ALL'>[] = useMemo(
    () => [
      {
        value: 'ALL',
        label: 'All Statuses',
        badge: String(tickets.length),
        dotColorClass: 'bg-[#7545E8]',
      },
      ...ALL_TICKET_STATUSES.map((st) => ({
        value: st,
        label: st.replace(/_/g, ' '),
        badge: String(tickets.filter((t) => t.status === st).length),
        dotColorClass: getTicketStatusDotColor(st),
      })),
    ],
    [tickets]
  );

  const ticketSortOptions: AdminDropdownOption<'newest' | 'oldest'>[] = useMemo(
    () => [
      { value: 'newest', label: 'Newest First', sublabel: 'Most recent submissions at top' },
      { value: 'oldest', label: 'Oldest First', sublabel: 'Chronological queue order' },
    ],
    []
  );

  const activeTicketStatusOptions: AdminDropdownOption<TicketStatus>[] = useMemo(
    () =>
      ALL_TICKET_STATUSES.map((st) => ({
        value: st,
        label: st.replace(/_/g, ' '),
        dotColorClass: getTicketStatusDotColor(st),
      })),
    []
  );

  const projectCategoryFilterOptions: AdminDropdownOption<string>[] = useMemo(
    () => [
      { value: 'ALL', label: 'All Categories', badge: String(projects.length) },
      { value: 'Enterprise Web Platform', label: 'Enterprise Web Platform' },
      { value: 'Engineering Tooling & SaaS', label: 'Engineering Tooling & SaaS' },
      { value: 'Full-Stack Service & Commerce', label: 'Full-Stack Service & Commerce' },
    ],
    [projects.length]
  );

  const projectCategoryModalOptions: AdminDropdownOption<CmsProject['category']>[] = useMemo(
    () => [
      {
        value: 'Enterprise Web Platform',
        label: 'Enterprise Web Platform',
        sublabel: 'High-conversion marketing & corporate web architecture',
      },
      {
        value: 'Engineering Tooling & SaaS',
        label: 'Engineering Tooling & SaaS',
        sublabel: 'Multi-tenant dashboards, telemetry & developer tools',
      },
      {
        value: 'Full-Stack Service & Commerce',
        label: 'Full-Stack Service & Commerce',
        sublabel: 'End-to-end transactional & industrial workflows',
      },
    ],
    []
  );

  const fieldTypeFilterOptions: AdminDropdownOption<string>[] = useMemo(
    () => [
      { value: 'ALL', label: 'All Input Types', badge: String(formFields.length) },
      ...ALLOWED_FIELD_TYPES.map((t) => ({
        value: t,
        label: t.toUpperCase(),
      })),
    ],
    [formFields.length]
  );

  const fieldTypeModalOptions: AdminDropdownOption<DynamicFieldType>[] = useMemo(
    () =>
      ALLOWED_FIELD_TYPES.map((t) => ({
        value: t,
        label: t.toUpperCase(),
        sublabel:
          t === 'select' || t === 'radio'
            ? 'Requires selectable options list'
            : `Standard HTML5 ${t} input control`,
      })),
    []
  );

  const fieldWidthModalOptions: AdminDropdownOption<DynamicFormField['width']>[] = useMemo(
    () => [
      { value: 'half', label: 'Half Width (50%)', sublabel: '2 columns on desktop' },
      { value: 'third', label: 'Third Width (33%)', sublabel: '3 columns on desktop' },
      { value: 'full', label: 'Full Width (100%)', sublabel: 'Spans full form row' },
    ],
    []
  );

  /* ============================================================================
   * RENDER: LOADING SESSION CHECK
   * ========================================================================== */

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5FC] dark:bg-[#17132D] text-[#211B35] dark:text-[#F7F5FC]">
        <div className="text-center space-y-4 p-8 rounded-3xl border border-[#E4DCF7] dark:border-[#302554] bg-white/90 dark:bg-[#21183D]/90 shadow-[0_20px_50px_-15px_rgba(117,69,232,0.2)]">
          <div className="h-10 w-10 rounded-full border-2 border-[#7545E8] border-t-transparent animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold font-display text-[#211B35] dark:text-white">
              CROSX DEV STUDIO®
            </p>
            <p className="text-xs font-mono text-[#89839A] dark:text-[#B5AED0]">
              Verifying Neon Auth Session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================================
   * RENDER: REDESIGNED NEON AUTH LOGIN / PASSWORD RESET / VERIFY EXPERIENCE
   * ========================================================================== */

  if (!authenticated) {
    return (
      <div className="relative min-h-screen flex flex-col justify-between bg-[#F7F5FC] dark:bg-[#17132D] text-[#211B35] dark:text-[#F7F5FC] p-4 sm:p-8 overflow-x-hidden selection:bg-[#7545E8] selection:text-white">
        {/* Decorative Atmospheric Violet & Lavender Illumination */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[440px] w-[780px] rounded-full bg-gradient-to-br from-[#7545E8]/20 via-[#9B63F5]/14 to-[#DCC7FF]/10 blur-3xl" />
          <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[460px] rounded-full bg-gradient-to-tr from-[#9B63F5]/15 via-[#7545E8]/10 to-transparent blur-3xl" />
        </div>

        {/* Top Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7545E8] to-[#9B63F5] text-white font-mono text-xs font-bold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)]">
              IC
            </span>
            <div>
              <span className="block text-sm sm:text-base font-extrabold font-display tracking-tight text-[#211B35] dark:text-white">
                CROSX DEV STUDIO®
              </span>
              <span className="block text-[11px] font-mono text-[#89839A] dark:text-[#B5AED0]">
                IRON CLAD · Founder &amp; Principal Architect
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-white/90 dark:bg-[#21183D]/90 px-3.5 py-2 text-xs font-semibold text-[#211B35] dark:text-[#F3EEFF] hover:border-[#7545E8] dark:hover:border-[#9B63F5] transition-all shadow-[0_4px_14px_-4px_rgba(117,69,232,0.12)] whitespace-nowrap"
            >
              <span>Return to Website</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#7545E8] dark:text-[#DCC7FF]" />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-white/90 dark:bg-[#21183D]/90 text-[#211B35] dark:text-[#DCC7FF] hover:border-[#7545E8] transition-colors cursor-pointer shrink-0 shadow-[0_4px_14px_-4px_rgba(117,69,232,0.12)]"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-[#7545E8]" />
              )}
            </button>
          </div>
        </header>

        {/* Central Branded Login Architecture */}
        <main className="relative z-10 mx-auto w-full max-w-5xl my-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[#E2D9F3] dark:border-[#332758] bg-white dark:bg-[#1C1535] shadow-[0_28px_70px_-18px_rgba(117,69,232,0.22)] dark:shadow-[0_32px_80px_-16px_rgba(7,5,18,0.85)] overflow-hidden">
            {/* Left Architectural Brand Column (5 cols on desktop) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#21183D] via-[#1B1433] to-[#17132D] text-white p-6 sm:p-9 flex flex-col justify-between relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#7545E8]/35 to-[#9B63F5]/10 blur-2xl"
              />
              <div className="relative space-y-5">
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#9B63F5]/35 bg-[#7545E8]/20 px-3 py-1.5 text-[11px] font-mono text-[#DCC7FF]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#9B63F5]" />
                  <span>NEON AUTH · MANAGED BETTER AUTH</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#DCC7FF]/80">
                    CROSX DEV STUDIO®
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white leading-tight">
                    Executive Studio Administration.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#CFC7E8] leading-relaxed">
                    Founded by <strong className="text-white">IRON CLAD</strong>. Manage live portfolio case studies, dynamic specification schemas, and client support threads from a single command surface.
                  </p>
                </div>
              </div>

              <div className="relative mt-8 pt-6 border-t border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[#CFC7E8]">
                  <span className="font-mono text-[11px] text-[#DCC7FF]">Auth Schema</span>
                  <span className="font-mono font-semibold text-white">
                    public + neon_auth
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#CFC7E8]">
                  <span className="font-mono text-[11px] text-[#DCC7FF]">Access Policy</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    Allowlisted Admins Only
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#CFC7E8]">
                  <span className="font-mono text-[11px] text-[#DCC7FF]">Founder Identity</span>
                  <span className="font-mono font-semibold text-[#DCC7FF]">
                    IRON CLAD · Principal
                  </span>
                </div>
              </div>
            </div>

            {/* Right Authentication Form Surface (7 cols on desktop) */}
            <div
              data-testid="admin-login-gate"
              className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-6 bg-white dark:bg-[#1C1535]"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#7545E8] dark:text-[#DCC7FF]">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Private Administrator Gateway</span>
                  </span>
                  <span className="text-[#89839A] dark:text-[#A59EC0]">
                    schema: neon_auth
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[#211B35] dark:text-white">
                  {authViewMode === 'sign-in' && 'Sign In to Admin Console'}
                  {authViewMode === 'forgot-password' && 'Reset Administrator Password'}
                  {authViewMode === 'reset-password' && 'Verify & Set New Password'}
                  {authViewMode === 'verify-email' && 'Verify Administrator Email'}
                </h1>

                <p className="text-xs sm:text-sm text-[#89839A] dark:text-[#B5AED0] leading-relaxed">
                  {authViewMode === 'sign-in' &&
                    'Authenticate with your allowlisted CROSX DEV STUDIO administrator email and password. Public registration is permanently disabled.'}
                  {authViewMode === 'forgot-password' &&
                    'Enter your allowlisted administrator email to generate a time-limited Neon Auth verification code.'}
                  {authViewMode === 'reset-password' &&
                    'Enter your Neon Auth verification code and choose a new strong password (minimum 8 characters).'}
                  {authViewMode === 'verify-email' &&
                    'Enter the verification code issued by Neon Auth to confirm your administrator email.'}
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  data-testid="admin-auth-error"
                  className="flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{authError}</span>
                </div>
              )}

              {authNotice && (
                <div
                  role="status"
                  data-testid="admin-auth-notice"
                  className="flex items-start gap-2.5 rounded-2xl border border-[#7545E8]/40 bg-[#F4EEFF] dark:bg-[#2A1F4D] p-4 text-xs text-[#211B35] dark:text-[#F3EEFF]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#7545E8] dark:text-[#DCC7FF]" />
                  <div className="space-y-1">
                    <p>{authNotice}</p>
                    {dispatchedCodePreview && (
                      <p
                        data-testid="neon-auth-verification-code"
                        className="font-mono font-bold text-[#7545E8] dark:text-[#DCC7FF]"
                      >
                        Verification Code: {dispatchedCodePreview}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 1: EMAIL & PASSWORD SIGN IN */}
              {authViewMode === 'sign-in' && (
                <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="admin-email-input"
                      className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                    >
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-[#89839A] dark:text-[#A59EC0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-email-input"
                        data-testid="admin-login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="admin@crosx.in"
                        className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] pl-10 pr-4 py-3 text-sm text-[#211B35] dark:text-white placeholder:text-[#89839A] focus:border-[#7545E8] focus:ring-2 focus:ring-[#7545E8]/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="admin-password-input"
                        className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA]"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        data-testid="admin-forgot-password-trigger"
                        onClick={() => {
                          setAuthError(null);
                          setAuthNotice(null);
                          setAuthViewMode('forgot-password');
                        }}
                        className="text-xs font-semibold text-[#7545E8] dark:text-[#DCC7FF] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 text-[#89839A] dark:text-[#A59EC0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-password-input"
                        data-testid="admin-login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter your administrator password"
                        className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] pl-10 pr-11 py-3 text-sm text-[#211B35] dark:text-white placeholder:text-[#89839A] focus:border-[#7545E8] focus:ring-2 focus:ring-[#7545E8]/20 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        data-testid="toggle-login-password"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#89839A] dark:text-[#B5AED0] hover:text-[#7545E8] dark:hover:text-white cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Session Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={rememberMe}
                        data-testid="admin-remember-session"
                        onClick={() => setRememberMe((v) => !v)}
                        className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          rememberMe
                            ? 'border-[#7545E8] bg-gradient-to-br from-[#7545E8] to-[#9B63F5] text-white'
                            : 'border-[#CFC5E8] dark:border-[#3A2D63] bg-[#F7F5FC] dark:bg-[#17132D]'
                        }`}
                      >
                        {rememberMe && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>
                      <span className="text-xs font-medium text-[#211B35] dark:text-[#D8D0F0]">
                        Remember administrator session (30 days)
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    data-testid="admin-signin-submit"
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7545E8] via-[#8652EE] to-[#9B63F5] text-white px-5 py-3 text-xs sm:text-sm font-semibold shadow-[0_12px_28px_-6px_rgba(117,69,232,0.55)] hover:shadow-[0_16px_34px_-6px_rgba(117,69,232,0.7)] hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {authSubmitting
                        ? 'Authenticating with Neon Auth...'
                        : 'Authorize & Enter Admin Console'}
                    </span>
                  </button>

                  <div className="pt-4 border-t border-[#ECE6F8] dark:border-[#2C214D] flex flex-wrap items-center justify-between gap-2 text-xs text-[#89839A] dark:text-[#A59EC0]">
                    <span>First time or rotating credentials?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthNotice(null);
                        setAuthViewMode('forgot-password');
                      }}
                      className="font-semibold text-[#7545E8] dark:text-[#DCC7FF] hover:underline cursor-pointer"
                    >
                      Provision / Reset Password →
                    </button>
                  </div>
                </form>
              )}

              {/* VIEW 2: FORGOT PASSWORD REQUEST */}
              {authViewMode === 'forgot-password' && (
                <form onSubmit={handleRequestPasswordResetCode} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reset-email-input"
                      className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                    >
                      Allowlisted Administrator Email
                    </label>
                    <input
                      id="reset-email-input"
                      data-testid="admin-forgot-email"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="admin@crosx.in"
                      className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    data-testid="request-reset-code-btn"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-3 text-xs sm:text-sm font-semibold shadow-[0_12px_28px_-6px_rgba(117,69,232,0.5)] hover:brightness-105 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {authSubmitting ? 'Generating Code...' : 'Send Password Reset Code'}
                    </span>
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthNotice(null);
                        setAuthViewMode('sign-in');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#89839A] dark:text-[#B5AED0] hover:text-[#7545E8] dark:hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Sign In</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRequestEmailVerification}
                      className="text-xs font-semibold text-[#7545E8] dark:text-[#DCC7FF] hover:underline cursor-pointer"
                    >
                      Verify Email Only
                    </button>
                  </div>
                </form>
              )}

              {/* VIEW 3: COMPLETE PASSWORD RESET */}
              {authViewMode === 'reset-password' && (
                <form onSubmit={handleCompletePasswordReset} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reset-verify-code"
                      className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                    >
                      Verification Code (from neon_auth.verification)
                    </label>
                    <input
                      id="reset-verify-code"
                      data-testid="admin-reset-token"
                      type="text"
                      required
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value)}
                      placeholder="NATH-123456"
                      className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3 text-sm font-mono text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="reset-new-password"
                        className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                      >
                        New Password (Min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          id="reset-new-password"
                          data-testid="admin-reset-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="New strong password"
                          className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] pl-3.5 pr-10 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={
                            showNewPassword ? 'Hide new password' : 'Show new password'
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#89839A] hover:text-[#7545E8] cursor-pointer"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="reset-confirm-password"
                        className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                      >
                        Confirm Password
                      </label>
                      <input
                        id="reset-confirm-password"
                        data-testid="admin-reset-confirm-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    data-testid="complete-password-reset-btn"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-3 text-xs sm:text-sm font-semibold shadow-[0_12px_28px_-6px_rgba(117,69,232,0.5)] hover:brightness-105 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{authSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthViewMode('sign-in')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#89839A] hover:text-[#7545E8] cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              )}

              {/* VIEW 4: EMAIL VERIFICATION */}
              {authViewMode === 'verify-email' && (
                <form onSubmit={handleConfirmEmailVerification} className="space-y-4">
                  <div>
                    <label
                      htmlFor="verify-email-code"
                      className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                    >
                      Email Verification Code
                    </label>
                    <input
                      id="verify-email-code"
                      type="text"
                      required
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value)}
                      placeholder="NATH-123456"
                      className="w-full rounded-xl border border-[#DFD6F2] dark:border-[#34285A] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3 text-sm font-mono text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-3 text-xs sm:text-sm font-semibold shadow-[0_12px_28px_-6px_rgba(117,69,232,0.5)] cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{authSubmitting ? 'Verifying...' : 'Confirm Email Verification'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthViewMode('sign-in')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#89839A] hover:text-[#7545E8] cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-10 mx-auto w-full max-w-6xl text-center text-xs text-[#89839A] dark:text-[#A59EC0]">
          CROSX DEV STUDIO® · Founded by IRON CLAD · Protected by Neon Auth (Managed Better Auth)
        </footer>
      </div>
    );
  }

  /* ============================================================================
   * RENDER: AUTHENTICATED PREMIUM SAAS ADMIN CONSOLE
   * ========================================================================== */

  const activeBreadcrumb = TAB_BREADCRUMBS[activeTab];

  const navigationItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number | null;
    highlight?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, count: null },
    {
      id: 'projects',
      label: 'Projects CMS',
      icon: FolderKanban,
      count: stats.totalProjects,
    },
    {
      id: 'ledger',
      label: 'Specifications Ledger',
      icon: Sliders,
      count: formFields.length,
    },
    {
      id: 'tickets',
      label: 'Messages & Tickets',
      icon: MessageSquare,
      count: stats.unreadMessages > 0 ? stats.unreadMessages : stats.totalInquiries,
      highlight: stats.unreadMessages > 0,
    },
    { id: 'settings', label: 'Admin Settings', icon: Settings, count: null },
  ];

  return (
    <div
      data-testid="admin-dashboard-shell"
      className="min-h-screen flex flex-col lg:flex-row bg-[#F7F5FC] dark:bg-[#17132D] text-[#211B35] dark:text-[#F7F5FC] overflow-x-hidden selection:bg-[#7545E8] selection:text-white"
    >
      {/* ========================================================================
       * DEEP INDIGO / MIDNIGHT SIDEBAR (#21183D)
       * ====================================================================== */}
      <aside className="w-full lg:w-72 shrink-0 bg-gradient-to-b from-[#21183D] via-[#1C1435] to-[#17132D] text-white border-b lg:border-b-0 lg:border-r border-[#34275B] flex flex-col justify-between lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
        <div className="p-4 sm:p-6 space-y-5">
          {/* Brand Identity & Mobile Bar */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7545E8] to-[#9B63F5] text-xs font-mono font-bold text-white shadow-[0_8px_20px_-4px_rgba(117,69,232,0.65)] shrink-0">
                IC
              </span>
              <div className="min-w-0">
                <span className="block text-sm font-extrabold font-display tracking-tight text-white truncate">
                  CROSX DEV STUDIO®
                </span>
                <span className="block text-[11px] font-mono text-[#DCC7FF]/80 truncate">
                  IRON CLAD · Admin Console
                </span>
              </div>
            </Link>

            {/* Mobile Top Controls */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[#DCC7FF] cursor-pointer"
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-300" />
                ) : (
                  <Moon className="h-4 w-4 text-[#DCC7FF]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen((v) => !v)}
                aria-label="Toggle mobile navigation drawer"
                aria-expanded={mobileDrawerOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white cursor-pointer"
              >
                {mobileDrawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Expandable Drawer */}
          {mobileDrawerOpen && (
            <div className="lg:hidden rounded-2xl border border-white/12 bg-[#17132D]/95 p-3 space-y-3">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white shadow-[0_8px_20px_-4px_rgba(117,69,232,0.55)]'
                          : 'text-[#D6CEF0] hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.count !== null && (
                        <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-[10px]">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs font-semibold text-white"
                >
                  <span>Live Website</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-200 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Navigation (Horizontal Touch Strip on Mobile, Vertical Stack on Desktop) */}
          <div className="space-y-2">
            <p className="hidden lg:block px-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[#DCC7FF]/60">
              Administration Modules
            </p>
            <nav
              aria-label="Admin Console Navigation"
              className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar"
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`admin-nav-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white shadow-[0_10px_24px_-6px_rgba(117,69,232,0.65)]'
                        : 'text-[#CFC7E8] hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-white' : 'text-[#DCC7FF]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== null && (
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                          item.highlight
                            ? 'bg-amber-400 text-[#17132D] font-bold'
                            : active
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-[#DCC7FF]'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Desktop Sidebar Footer: Authenticated Administrator Card & Session Controls */}
        <div className="hidden lg:block p-5 border-t border-white/10 space-y-4 bg-[#17132D]/60">
          <div className="rounded-2xl border border-[#9B63F5]/30 bg-gradient-to-br from-[#2A1F4D] to-[#1D1538] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#DCC7FF]">
                <Sparkles className="h-3 w-3 text-[#9B63F5]" />
                <span>Verified Admin</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-xs font-bold text-white truncate">
              {adminUser?.name || 'IRON CLAD · Principal Architect'}
            </div>
            <div
              data-testid="authenticated-admin-email"
              className="text-[11px] font-mono text-[#DCC7FF]/85 truncate"
            >
              {adminUser?.email || 'admin@crosx.in'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-xs font-semibold text-white hover:border-[#9B63F5] hover:bg-white/12 transition-colors whitespace-nowrap"
            >
              <span>Live Site</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#DCC7FF]" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              data-testid="admin-logout-btn"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/35 bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================
       * MAIN CONTENT VIEWPORT
       * ====================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Elegant Top Navigation Bar */}
        <header className="sticky top-0 z-20 border-b border-[#E5DDF7] dark:border-[#2E2352] bg-white/90 dark:bg-[#1B1534]/90 backdrop-blur-xl px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-[#89839A] dark:text-[#A89FC4]">
              <span>CROSX Admin</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#7545E8] dark:text-[#DCC7FF] font-semibold">
                {activeBreadcrumb.section}
              </span>
            </div>
            <h1 className="mt-0.5 text-lg sm:text-2xl font-extrabold font-display tracking-tight text-[#211B35] dark:text-white truncate">
              {activeBreadcrumb.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {toast && (
              <div
                role="status"
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm ${
                  toast.type === 'success'
                    ? 'border-[#7545E8]/40 bg-[#F4EEFF] dark:bg-[#2B2050] text-[#7545E8] dark:text-[#DCC7FF]'
                    : 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300'
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="max-w-xs truncate">{toast.message}</span>
              </div>
            )}

            {/* Custom Floating Quick Actions Menu */}
            <AdminActionMenu
              testId="admin-quick-actions-menu"
              triggerLabel="Quick Actions"
              triggerIcon={<Sparkles className="h-3.5 w-3.5" />}
              items={[
                {
                  id: 'new-project',
                  label: 'New Portfolio Project',
                  description: 'Add a live case study to Selected Work',
                  icon: <FolderKanban className="h-4 w-4 text-[#7545E8] dark:text-[#DCC7FF]" />,
                  tone: 'violet',
                  onSelect: () => {
                    setActiveTab('projects');
                    openAddProjectModal();
                  },
                },
                {
                  id: 'new-field',
                  label: 'New Specification Field',
                  description: 'Extend the public Project Inquiry schema',
                  icon: <Sliders className="h-4 w-4 text-[#9B63F5]" />,
                  onSelect: () => {
                    setActiveTab('ledger');
                    openAddFieldModal();
                  },
                },
                {
                  id: 'open-tickets',
                  label: 'Review Support Queue',
                  description: `${stats.openTickets} open · ${stats.unreadMessages} unread`,
                  icon: <MessageSquare className="h-4 w-4 text-emerald-500" />,
                  onSelect: () => setActiveTab('tickets'),
                },
                {
                  id: 'sign-out',
                  label: 'Sign Out of Admin Console',
                  description: 'Revoke active Neon Auth session token',
                  icon: <LogOut className="h-4 w-4" />,
                  tone: 'danger',
                  onSelect: handleLogout,
                },
              ]}
            />

            <button
              type="button"
              onClick={() => fetchAdminOverview(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D9F3] dark:border-[#312655] bg-white dark:bg-[#1D1636] px-3.5 py-2 text-xs font-semibold text-[#211B35] dark:text-[#F4F0FF] hover:border-[#7545E8] dark:hover:border-[#9B63F5] transition-colors cursor-pointer whitespace-nowrap shadow-[0_2px_10px_-3px_rgba(33,24,61,0.06)]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#7545E8] dark:text-[#DCC7FF] ${
                  loadingData ? 'animate-spin' : ''
                }`}
              />
              <span>Sync Data</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              data-testid="admin-theme-toggle"
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2D9F3] dark:border-[#312655] bg-white dark:bg-[#1D1636] text-[#211B35] dark:text-[#DCC7FF] hover:border-[#7545E8] transition-colors cursor-pointer shadow-[0_2px_10px_-3px_rgba(33,24,61,0.06)]"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-[#7545E8]" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-[1440px] w-full mx-auto">
          {/* ====================================================================
           * TAB 1: DASHBOARD OVERVIEW
           * ================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Welcome & Executive Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-[#DFD4F7] dark:border-[#372A61] bg-gradient-to-r from-[#21183D] via-[#2C1E56] to-[#7545E8] text-white p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(117,69,232,0.35)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -bottom-16 h-64 w-64 rounded-full bg-[#DCC7FF]/20 blur-3xl"
                />
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-mono text-[#DCC7FF]">
                      <Sparkles className="h-3.5 w-3.5 text-[#DCC7FF]" />
                      <span>CROSX DEV STUDIO® · EXECUTIVE COMMAND</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
                      Welcome back, {adminUser?.name?.split('·')[0]?.trim() || 'IRON CLAD'}.
                    </h2>
                    <p className="text-xs sm:text-sm text-[#E5DDF7] leading-relaxed">
                      All portfolio records, dynamic specification fields, and client support tickets are synchronized with your Neon PostgreSQL database branch.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('projects');
                        openAddProjectModal();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-[#21183D] px-4 py-2.5 text-xs font-bold shadow-md hover:bg-[#F3EEFF] transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-[#7545E8]" />
                      <span>Add Portfolio Project</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 text-white px-4 py-2.5 text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 text-[#DCC7FF]" />
                      <span>Open Ticket Queue ({stats.totalInquiries})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 6 Premium Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-4">
                {[
                  {
                    label: 'Total Projects',
                    value: stats.totalProjects,
                    sub: 'Portfolio CMS',
                    icon: FolderKanban,
                    testId: 'stat-total-projects',
                  },
                  {
                    label: 'Active Projects',
                    value: stats.activeProjects,
                    sub: 'Live on Website',
                    icon: Eye,
                    testId: 'stat-active-projects',
                  },
                  {
                    label: 'Total Inquiries',
                    value: stats.totalInquiries,
                    sub: 'All Submissions',
                    icon: FileText,
                    testId: 'stat-total-inquiries',
                  },
                  {
                    label: 'Unread Messages',
                    value: stats.unreadMessages,
                    sub: 'Needs Attention',
                    icon: Mail,
                    accent: stats.unreadMessages > 0,
                    testId: 'stat-unread-messages',
                  },
                  {
                    label: 'Open Tickets',
                    value: stats.openTickets,
                    sub: 'Active Queue',
                    icon: Activity,
                    testId: 'stat-open-tickets',
                  },
                  {
                    label: 'Resolved Tickets',
                    value: stats.resolvedTickets,
                    sub: 'Completed',
                    icon: CheckCircle2,
                    testId: 'stat-resolved-tickets',
                  },
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={kpi.label}
                      data-testid={kpi.testId}
                      className={`rounded-2xl border p-4 sm:p-5 space-y-2.5 transition-all ${
                        kpi.accent
                          ? 'border-[#7545E8] bg-gradient-to-br from-[#F4EEFF] to-white dark:from-[#2C1F55] dark:to-[#1E1738] shadow-[0_12px_28px_-8px_rgba(117,69,232,0.28)]'
                          : 'border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] shadow-[0_6px_20px_-6px_rgba(33,24,61,0.07)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] sm:text-xs font-semibold text-[#89839A] dark:text-[#B5AED0] leading-snug">
                          {kpi.label}
                        </span>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3EEFF] dark:bg-[#2B2050] text-[#7545E8] dark:text-[#DCC7FF] shrink-0">
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <span className="block text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#211B35] dark:text-white">
                        {kpi.value}
                      </span>
                      <span className="block text-[11px] font-semibold text-[#7545E8] dark:text-[#DCC7FF]">
                        {kpi.sub}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Middle Row: Recent Client Activity & Quick Operations + Database Status */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Recent Client Activity Table (8 cols) */}
                <div className="lg:col-span-8 rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-5 sm:p-6 space-y-5 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFEAF9] dark:border-[#2D2250] pb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold font-display text-[#211B35] dark:text-white">
                        Recent Client Activity &amp; Support Queue
                      </h2>
                      <p className="text-xs text-[#89839A] dark:text-[#A9A1C4]">
                        Select any ticket row to inspect submitted specifications and reply.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4EEFF] dark:bg-[#2B2050] px-3.5 py-2 text-xs font-semibold text-[#7545E8] dark:text-[#DCC7FF] hover:bg-[#7545E8] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Open Ticket Inbox</span>
                      <span>→</span>
                    </button>
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="py-12 text-center space-y-2 rounded-2xl bg-[#F7F5FC] dark:bg-[#17132D]/60 border border-dashed border-[#DFD4F7] dark:border-[#34285A]">
                      <MessageSquare className="h-8 w-8 text-[#7545E8] dark:text-[#DCC7FF] mx-auto" />
                      <p className="text-sm font-bold text-[#211B35] dark:text-white">
                        No client tickets logged yet
                      </p>
                      <p className="text-xs text-[#89839A] dark:text-[#A9A1C4] max-w-md mx-auto">
                        New inquiries submitted on the public Project Specification form appear here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#EFEAF9] dark:border-[#2D2250] text-[11px] font-semibold text-[#89839A] dark:text-[#A9A1C4]">
                            <th className="py-3 pr-3">Ticket ID</th>
                            <th className="py-3 px-3">Client</th>
                            <th className="py-3 px-3">Engineering Scope</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 pl-3 text-right">Updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2EEF9] dark:divide-[#281E47]">
                          {recentActivity.map((act) => (
                            <tr
                              key={act.ticketNumber}
                              onClick={() => {
                                setSelectedTicketNumber(act.ticketNumber);
                                setActiveTab('tickets');
                              }}
                              className="hover:bg-[#F7F5FC] dark:hover:bg-[#251C44] cursor-pointer transition-colors"
                            >
                              <td className="py-3.5 pr-3 font-mono font-bold text-[#7545E8] dark:text-[#DCC7FF] whitespace-nowrap">
                                {act.ticketNumber}
                                {!act.isRead && (
                                  <span className="ml-1.5 rounded-full bg-[#7545E8] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    NEW
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-semibold text-[#211B35] dark:text-white">
                                  {act.clientName}
                                </div>
                                <div className="font-mono text-[11px] text-[#89839A] dark:text-[#A9A1C4]">
                                  {act.clientEmail}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 max-w-[180px] truncate text-[#211B35] dark:text-[#DDD6F3]">
                                {act.serviceScope}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex rounded-lg border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${getVioletTicketStatusClasses(
                                    act.status
                                  )}`}
                                >
                                  {act.status}
                                </span>
                              </td>
                              <td className="py-3.5 pl-3 text-right font-mono text-[11px] tabular-nums text-[#89839A] dark:text-[#A9A1C4] whitespace-nowrap">
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

                {/* Right Column (4 cols): Quick Actions & Database Telemetry */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-5 sm:p-6 space-y-4 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold font-display text-[#211B35] dark:text-white">
                        Quick Studio Operations
                      </h3>
                      <Layers className="h-4 w-4 text-[#7545E8] dark:text-[#DCC7FF]" />
                    </div>
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('projects');
                          openAddProjectModal();
                        }}
                        className="w-full flex items-center justify-between rounded-xl border border-[#E5DDF7] dark:border-[#322657] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3 text-xs font-semibold text-[#211B35] dark:text-white hover:border-[#7545E8] dark:hover:border-[#9B63F5] transition-colors cursor-pointer"
                      >
                        <span>Add Portfolio Project</span>
                        <FolderKanban className="h-4 w-4 text-[#7545E8] dark:text-[#DCC7FF]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('ledger');
                          openAddFieldModal();
                        }}
                        className="w-full flex items-center justify-between rounded-xl border border-[#E5DDF7] dark:border-[#322657] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3 text-xs font-semibold text-[#211B35] dark:text-white hover:border-[#7545E8] dark:hover:border-[#9B63F5] transition-colors cursor-pointer"
                      >
                        <span>Add Specification Form Field</span>
                        <Sliders className="h-4 w-4 text-[#9B63F5]" />
                      </button>

                      <Link
                        href="/track-ticket"
                        className="w-full flex items-center justify-between rounded-xl border border-[#E5DDF7] dark:border-[#322657] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3 text-xs font-semibold text-[#211B35] dark:text-white hover:border-[#7545E8] dark:hover:border-[#9B63F5] transition-colors"
                      >
                        <span>Open Public Ticket Portal</span>
                        <ExternalLink className="h-4 w-4 text-[#7545E8] dark:text-[#DCC7FF]" />
                      </Link>
                    </div>
                  </div>

                  {/* Neon Database & Auth Branch Telemetry Card */}
                  <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-5 sm:p-6 space-y-3 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-[#211B35] dark:text-white">
                        <Database className="h-4 w-4 text-[#7545E8] dark:text-[#DCC7FF]" />
                        <span>Neon Database &amp; Auth Branch</span>
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                        {neonTelemetry?.protocolMode || 'neon-serverless-sql'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#7545E8] dark:text-[#DCC7FF] truncate">
                      {neonTelemetry?.maskedEndpoint || 'Neon Serverless PostgreSQL'}
                    </p>
                    <div className="pt-2 border-t border-[#EFEAF9] dark:border-[#2D2250] flex items-center justify-between text-[11px] text-[#89839A] dark:text-[#B5AED0]">
                      <span>
                        Schemas: <strong className="font-mono">public, neon_auth</strong>
                      </span>
                      <span className="font-mono">
                        {neonTelemetry?.region || 'ap-southeast-1'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Portfolio Project Overview Cards Strip */}
              <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-5 sm:p-6 space-y-4 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold font-display text-[#211B35] dark:text-white">
                      Live Portfolio Exhibition Overview ({projects.length})
                    </h3>
                    <p className="text-xs text-[#89839A] dark:text-[#A9A1C4]">
                      Active case studies synchronized with the public website.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className="text-xs font-semibold text-[#7545E8] dark:text-[#DCC7FF] hover:underline cursor-pointer"
                  >
                    Manage All Projects →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {projects.slice(0, 3).map((proj) => (
                    <div
                      key={proj.id}
                      className="group rounded-2xl border border-[#E5DDF7] dark:border-[#322657] bg-[#F7F5FC] dark:bg-[#17132D] overflow-hidden flex flex-col justify-between transition-all hover:border-[#7545E8]"
                    >
                      <div className="relative h-36 bg-[#21183D] overflow-hidden">
                        <img
                          src={proj.liveScreenshot}
                          alt={proj.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="rounded-lg bg-[#17132D]/85 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] font-bold text-[#DCC7FF]">
                            {proj.index}
                          </span>
                          <span
                            className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
                              proj.published
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-zinc-700/90 text-zinc-200'
                            }`}
                          >
                            {proj.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="font-bold text-sm text-[#211B35] dark:text-white truncate">
                          {proj.title}
                        </div>
                        <p className="text-xs text-[#89839A] dark:text-[#A9A1C4] line-clamp-1">
                          {proj.subtitle}
                        </p>
                        <div className="pt-2 flex items-center justify-between border-t border-[#E5DDF7] dark:border-[#2B2050]">
                          <span className="font-mono text-[11px] text-[#7545E8] dark:text-[#DCC7FF]">
                            {proj.displayUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditProjectModal(proj)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#211B35] dark:text-white hover:text-[#7545E8] dark:hover:text-[#DCC7FF] cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
           * TAB 2: PROJECT MANAGEMENT CMS
           * ================================================================== */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {/* Filter & Controls Bar */}
              <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_6px_20px_-6px_rgba(33,24,61,0.06)]">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-[#89839A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects by title, domain, or stack..."
                      aria-label="Search portfolio projects"
                      className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#211B35] dark:text-white placeholder:text-[#89839A] focus:border-[#7545E8] focus:outline-none"
                    />
                  </div>

                  <AdminCustomDropdown
                    ariaLabel="Filter projects by category"
                    testId="project-category-dropdown"
                    value={projectCategoryFilter}
                    options={projectCategoryFilterOptions}
                    onChange={setProjectCategoryFilter}
                    icon={<Filter className="h-3.5 w-3.5" />}
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  {/* View Switcher: Table vs Cards */}
                  <div className="inline-flex rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] p-1">
                    <button
                      type="button"
                      onClick={() => setProjectViewMode('table')}
                      aria-label="Table view"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        projectViewMode === 'table'
                          ? 'bg-[#7545E8] text-white'
                          : 'text-[#89839A] hover:text-[#211B35] dark:hover:text-white'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectViewMode('cards')}
                      aria-label="Cards view"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        projectViewMode === 'cards'
                          ? 'bg-[#7545E8] text-white'
                          : 'text-[#89839A] hover:text-[#211B35] dark:hover:text-white'
                      }`}
                    >
                      <Grid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={openAddProjectModal}
                    data-testid="add-project-btn"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-4 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)] hover:brightness-105 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Project</span>
                  </button>
                </div>
              </div>

              {projectViewMode === 'table' ? (
                <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] overflow-hidden shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E5DDF7] dark:border-[#2F2454] bg-[#F7F5FC] dark:bg-[#17132D] text-[11px] font-semibold text-[#89839A] dark:text-[#A9A1C4]">
                          <th className="py-3.5 px-4">Order</th>
                          <th className="py-3.5 px-4">Project &amp; Subtitle</th>
                          <th className="py-3.5 px-4">Category &amp; Domain</th>
                          <th className="py-3.5 px-4">Technology Stack</th>
                          <th className="py-3.5 px-4">Publication State</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EBF9] dark:divide-[#281E47]">
                        {filteredProjects.map((proj, idx) => (
                          <tr
                            key={proj.id}
                            className="hover:bg-[#F7F5FC] dark:hover:bg-[#241B42] transition-colors"
                          >
                            <td className="py-4 px-4 font-mono tabular-nums whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#7545E8] dark:text-[#DCC7FF]">
                                  {proj.index}
                                </span>
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveProject(idx, -1)}
                                    aria-label={`Move ${proj.title} up`}
                                    className="p-0.5 text-[#89839A] hover:text-[#7545E8] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === filteredProjects.length - 1}
                                    onClick={() => handleMoveProject(idx, 1)}
                                    aria-label={`Move ${proj.title} down`}
                                    className="p-0.5 text-[#89839A] hover:text-[#7545E8] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3.5">
                                <img
                                  src={proj.liveScreenshot}
                                  alt={proj.title}
                                  referrerPolicy="no-referrer"
                                  className="h-11 w-18 rounded-lg border border-[#E2D9F3] dark:border-[#34285A] object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-[#211B35] dark:text-white truncate">
                                    {proj.title}
                                  </div>
                                  <div className="text-[#89839A] dark:text-[#B5AED0] max-w-xs truncate">
                                    {proj.subtitle}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="block font-semibold text-[#211B35] dark:text-[#EDE8FA]">
                                {proj.category}
                              </span>
                              <a
                                href={proj.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#7545E8] dark:text-[#DCC7FF] hover:underline"
                              >
                                <span>{proj.displayUrl}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </td>

                            <td className="py-4 px-4 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {proj.stack.slice(0, 4).map((tech) => (
                                  <span
                                    key={tech}
                                    className="rounded-md bg-[#F4EEFF] dark:bg-[#2B2050] px-2 py-0.5 font-mono text-[10px] font-medium text-[#7545E8] dark:text-[#DCC7FF]"
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProjectFlag(proj, 'published')}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
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
                                  className={`p-1.5 rounded-lg border cursor-pointer ${
                                    proj.featured
                                      ? 'border-amber-400/40 bg-amber-400/15 text-amber-500'
                                      : 'border-[#E2D9F3] dark:border-[#322656] text-[#89839A]'
                                  }`}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditProjectModal(proj)}
                                  aria-label={`Edit ${proj.title}`}
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-1.5 text-xs font-semibold text-[#211B35] dark:text-white hover:border-[#7545E8] cursor-pointer"
                                >
                                  <Edit3 className="h-3 w-3 text-[#7545E8] dark:text-[#DCC7FF]" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteProjectTarget(proj)}
                                  aria-label={`Delete ${proj.title}`}
                                  className="inline-flex items-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-300 hover:bg-rose-500 hover:text-white cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] overflow-hidden flex flex-col justify-between shadow-[0_10px_28px_-8px_rgba(33,24,61,0.08)]"
                    >
                      <div>
                        <div className="relative h-44 bg-[#21183D] overflow-hidden">
                          <img
                            src={proj.liveScreenshot}
                            alt={proj.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <span className="rounded-lg bg-[#17132D]/90 px-2.5 py-1 font-mono text-xs font-bold text-[#DCC7FF]">
                              {proj.index}
                            </span>
                            <span className="rounded-lg bg-[#7545E8]/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                              {proj.category}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-3">
                          <div>
                            <h3 className="text-base font-bold font-display text-[#211B35] dark:text-white">
                              {proj.title}
                            </h3>
                            <p className="text-xs text-[#89839A] dark:text-[#B5AED0]">
                              {proj.subtitle}
                            </p>
                          </div>

                          <p className="text-xs text-[#211B35]/85 dark:text-[#E2DCF5] line-clamp-2 leading-relaxed">
                            {proj.summary}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {proj.stack.map((tech) => (
                              <span
                                key={tech}
                                className="rounded-md bg-[#F4EEFF] dark:bg-[#2B2050] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#7545E8] dark:text-[#DCC7FF]"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-3.5 border-t border-[#EFEAF9] dark:border-[#2C214D] flex items-center justify-between gap-2 bg-[#F7F5FC]/60 dark:bg-[#17132D]/50">
                        <button
                          type="button"
                          onClick={() => handleToggleProjectFlag(proj, 'published')}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                            proj.published
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-zinc-500/15 text-zinc-500'
                          }`}
                        >
                          {proj.published ? 'Published' : 'Draft'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditProjectModal(proj)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-white dark:bg-[#1E1738] px-3 py-1.5 text-xs font-semibold hover:border-[#7545E8] cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3 text-[#7545E8] dark:text-[#DCC7FF]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteProjectTarget(proj)}
                            aria-label={`Delete ${proj.title}`}
                            className="inline-flex items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 p-1.5 text-rose-500 hover:bg-rose-500 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====================================================================
           * TAB 3: DYNAMIC PROJECT SPECIFICATIONS LEDGER (FORM BUILDER)
           * ================================================================== */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              {/* Top Filter & Action Bar */}
              <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_6px_20px_-6px_rgba(33,24,61,0.06)]">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-[#89839A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      placeholder="Search specification fields by label or key..."
                      aria-label="Search specification fields"
                      className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#211B35] dark:text-white placeholder:text-[#89839A] focus:border-[#7545E8] focus:outline-none"
                    />
                  </div>

                  <AdminCustomDropdown
                    ariaLabel="Filter specification fields by input type"
                    testId="field-type-filter-dropdown"
                    value={fieldTypeFilter}
                    options={fieldTypeFilterOptions}
                    onChange={setFieldTypeFilter}
                    icon={<Sliders className="h-3.5 w-3.5" />}
                  />
                </div>

                <button
                  type="button"
                  onClick={openAddFieldModal}
                  data-testid="add-form-field-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-4 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)] hover:brightness-105 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Form Field</span>
                </button>
              </div>

              {/* Specification Fields Table */}
              <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] overflow-hidden shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5DDF7] dark:border-[#2F2454] bg-[#F7F5FC] dark:bg-[#17132D] text-[11px] font-semibold text-[#89839A] dark:text-[#A9A1C4]">
                        <th className="py-3.5 px-4">Order</th>
                        <th className="py-3.5 px-4">Field Label &amp; Key</th>
                        <th className="py-3.5 px-4">Input Type</th>
                        <th className="py-3.5 px-4">Placeholder / Options</th>
                        <th className="py-3.5 px-4">Requirement</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBF9] dark:divide-[#281E47]">
                      {filteredFormFields.map((field, idx) => (
                        <tr
                          key={field.id}
                          className="hover:bg-[#F7F5FC] dark:hover:bg-[#241B42] transition-colors"
                        >
                          <td className="py-4 px-4 font-mono tabular-nums whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#7545E8] dark:text-[#DCC7FF]">
                                {String(field.order).padStart(2, '0')}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveField(idx, -1)}
                                  aria-label={`Move ${field.label} up`}
                                  className="p-0.5 text-[#89839A] hover:text-[#7545E8] disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === filteredFormFields.length - 1}
                                  onClick={() => handleMoveField(idx, 1)}
                                  aria-label={`Move ${field.label} down`}
                                  className="p-0.5 text-[#89839A] hover:text-[#7545E8] disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-bold text-[#211B35] dark:text-white">
                              {field.label}
                            </div>
                            <div className="font-mono text-[11px] text-[#89839A] dark:text-[#B5AED0]">
                              {field.key} · {field.width} width
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="rounded-lg bg-[#F4EEFF] dark:bg-[#2B2050] px-2.5 py-1 font-mono text-[11px] font-bold text-[#7545E8] dark:text-[#DCC7FF]">
                              {field.type.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-4 px-4 max-w-xs">
                            {field.options.length > 0 ? (
                              <span className="font-mono text-[11px] text-[#211B35] dark:text-[#DDD6F3] line-clamp-1">
                                Options ({field.options.length}): {field.options.join(' · ')}
                              </span>
                            ) : (
                              <span className="text-[#89839A] dark:text-[#B5AED0] truncate block">
                                {field.placeholder || '—'}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldFlag(field, 'required')}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                                field.required
                                  ? 'bg-[#7545E8]/15 text-[#7545E8] dark:text-[#DCC7FF] border border-[#7545E8]/35'
                                  : 'bg-zinc-500/15 text-[#89839A] border border-zinc-500/25'
                              }`}
                            >
                              {field.required ? 'Required' : 'Optional'}
                            </button>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldFlag(field, 'enabled')}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                                field.enabled
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                              }`}
                            >
                              {field.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditFieldModal(field)}
                                aria-label={`Edit field ${field.label}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-1.5 text-xs font-semibold text-[#211B35] dark:text-white hover:border-[#7545E8] cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3 text-[#7545E8] dark:text-[#DCC7FF]" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteFieldTarget(field)}
                                aria-label={`Delete field ${field.label}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-300 hover:bg-rose-500 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
              {/* Search, Custom Status Filter & Custom Sort Bar */}
              <div className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_6px_20px_-6px_rgba(33,24,61,0.06)]">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-4 w-4 text-[#89839A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => {
                      setTicketSearch(e.target.value);
                      setTicketPage(1);
                    }}
                    placeholder="Search by Ticket ID (CROSX-2026-...), client name, email, or company..."
                    aria-label="Search tickets"
                    className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#211B35] dark:text-white placeholder:text-[#89839A] focus:border-[#7545E8] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <AdminCustomDropdown
                    ariaLabel="Filter tickets by status"
                    testId="ticket-status-filter-dropdown"
                    prefixLabel="Status"
                    value={ticketStatusFilter}
                    options={ticketStatusFilterOptions}
                    onChange={(nextStatus) => {
                      setTicketStatusFilter(nextStatus);
                      setTicketPage(1);
                    }}
                  />

                  <AdminCustomDropdown
                    ariaLabel="Sort tickets by date"
                    testId="ticket-sort-dropdown"
                    prefixLabel="Order"
                    value={ticketSort}
                    options={ticketSortOptions}
                    onChange={setTicketSort}
                    icon={<ArrowUpDown className="h-3.5 w-3.5" />}
                    align="right"
                  />
                </div>
              </div>

              {/* Master-Detail Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (5 cols): Ticket Inbox List */}
                <div className="lg:col-span-5 rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] overflow-hidden shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                  <div className="border-b border-[#EFEAF9] dark:border-[#2D2250] bg-[#F7F5FC] dark:bg-[#17132D] px-4 py-3.5 flex items-center justify-between text-xs font-mono font-semibold text-[#211B35] dark:text-[#DCC7FF]">
                    <span>Support Queue ({filteredTickets.length})</span>
                    <span>
                      Page {ticketPage} of {totalTicketPages}
                    </span>
                  </div>

                  {paginatedTickets.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <MessageSquare className="h-8 w-8 text-[#7545E8] dark:text-[#DCC7FF] mx-auto" />
                      <p className="text-sm font-bold text-[#211B35] dark:text-white">
                        No matching support tickets
                      </p>
                      <p className="text-xs text-[#89839A] dark:text-[#B5AED0]">
                        Submit an inquiry on the public form or clear your active search filters.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F0EBF9] dark:divide-[#281E47]">
                      {paginatedTickets.map((tkt) => {
                        const isSelected =
                          selectedTicket?.ticketNumber === tkt.ticketNumber;
                        return (
                          <div
                            key={tkt.ticketNumber}
                            onClick={() => handleSelectTicket(tkt)}
                            className={`p-4 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#7545E8]/12 via-[#9B63F5]/8 to-transparent border-l-4 border-l-[#7545E8]'
                                : 'hover:bg-[#F7F5FC] dark:hover:bg-[#241B42]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-mono text-xs font-bold text-[#7545E8] dark:text-[#DCC7FF]">
                                {tkt.ticketNumber}
                                {!tkt.isRead && (
                                  <span className="ml-1.5 rounded-full bg-[#7545E8] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    UNREAD
                                  </span>
                                )}
                              </span>
                              <span
                                className={`rounded-lg border px-2 py-0.5 text-[10px] font-mono font-semibold ${getVioletTicketStatusClasses(
                                  tkt.status
                                )}`}
                              >
                                {tkt.status}
                              </span>
                            </div>

                            <div className="font-bold text-sm text-[#211B35] dark:text-white">
                              {tkt.clientName}{' '}
                              <span className="font-normal text-xs text-[#89839A] dark:text-[#B5AED0]">
                                · {tkt.company}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-[#89839A] dark:text-[#B5AED0] truncate">
                              {tkt.clientEmail}
                            </div>
                            <p className="mt-1.5 text-xs text-[#211B35]/80 dark:text-[#D7CFF0] line-clamp-2">
                              {tkt.projectBrief}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {totalTicketPages > 1 && (
                    <div className="border-t border-[#EFEAF9] dark:border-[#2D2250] px-4 py-3 flex items-center justify-between text-xs font-mono">
                      <button
                        type="button"
                        disabled={ticketPage <= 1}
                        onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-xl border border-[#E2D9F3] dark:border-[#322656] disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={ticketPage >= totalTicketPages}
                        onClick={() =>
                          setTicketPage((p) => Math.min(totalTicketPages, p + 1))
                        }
                        className="px-3 py-1.5 rounded-xl border border-[#E2D9F3] dark:border-[#322656] disabled:opacity-40 cursor-pointer"
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
                      className="rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-5 sm:p-6 space-y-6 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]"
                    >
                      {/* Top Header & Custom Status Dropdown */}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFEAF9] dark:border-[#2D2250] pb-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-xl font-mono font-extrabold text-[#211B35] dark:text-white">
                              {selectedTicket.ticketNumber}
                            </h3>
                            <span
                              className={`rounded-lg border px-2.5 py-0.5 text-xs font-mono font-semibold ${getVioletTicketStatusClasses(
                                selectedTicket.status
                              )}`}
                            >
                              {selectedTicket.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#89839A] dark:text-[#B5AED0]">
                            {selectedTicket.clientName} ({selectedTicket.clientEmail}) ·{' '}
                            {selectedTicket.company}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <AdminCustomDropdown
                            ariaLabel="Update ticket status"
                            testId="active-ticket-status-dropdown"
                            size="sm"
                            prefixLabel="Status"
                            value={selectedTicket.status}
                            options={activeTicketStatusOptions}
                            onChange={(nextStatus) =>
                              handleUpdateTicketStatus(
                                selectedTicket.ticketNumber,
                                nextStatus
                              )
                            }
                            align="right"
                          />

                          <button
                            type="button"
                            onClick={() => handleToggleTicketRead(selectedTicket)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            {selectedTicket.isRead ? (
                              <>
                                <Mail className="h-3.5 w-3.5 text-[#7545E8] dark:text-[#DCC7FF]" />
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
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-600 dark:text-rose-300 hover:bg-rose-500 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Submitted Form Snapshot & Tracking Credentials */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#7545E8] dark:text-[#DCC7FF] flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Submitted Specification Snapshot</span>
                          </span>
                          <Link
                            href={`/track-ticket?ticket=${encodeURIComponent(
                              selectedTicket.ticketNumber
                            )}&token=${encodeURIComponent(
                              selectedTicket.adminTrackingTokenRef
                            )}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#7545E8] dark:text-[#DCC7FF] hover:underline"
                          >
                            <span>
                              Client Tracking Link ({selectedTicket.adminTrackingTokenRef})
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs rounded-2xl border border-[#EFEAF9] dark:border-[#2D2250] bg-[#F7F5FC] dark:bg-[#17132D] p-4">
                          {selectedTicket.submittedFields.map((sf) => (
                            <div
                              key={sf.key}
                              className={sf.type === 'textarea' ? 'sm:col-span-2' : ''}
                            >
                              <span className="block text-[11px] font-medium text-[#89839A] dark:text-[#A9A1C4]">
                                {sf.label}
                              </span>
                              <span className="mt-0.5 block font-semibold text-[#211B35] dark:text-white break-words">
                                {sf.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conversation Thread */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[#89839A] dark:text-[#B5AED0]">
                          Conversation Thread &amp; Internal Notes (
                          {selectedTicket.messages.length})
                        </h4>

                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {selectedTicket.messages.map((msg) => {
                            const isInternal = msg.isInternal;
                            const isAdmin = msg.senderRole === 'ADMIN';
                            return (
                              <div
                                key={msg.id}
                                className={`rounded-2xl border p-4 text-xs ${
                                  isInternal
                                    ? 'border-amber-500/45 bg-amber-500/[0.08] dark:bg-amber-500/[0.12]'
                                    : isAdmin
                                    ? 'border-[#7545E8]/40 bg-[#F4EEFF] dark:bg-[#2A1F4D]'
                                    : 'border-[#E5DDF7] dark:border-[#322657] bg-[#F7F5FC] dark:bg-[#17132D]'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                  <span className="inline-flex items-center gap-1.5 font-bold text-[#211B35] dark:text-white">
                                    {isAdmin ? (
                                      <ShieldCheck className="h-3.5 w-3.5 text-[#7545E8] dark:text-[#DCC7FF]" />
                                    ) : (
                                      <User className="h-3.5 w-3.5 text-[#9B63F5]" />
                                    )}
                                    <span>{msg.senderName}</span>
                                    <span className="text-[#89839A] dark:text-[#B5AED0] font-mono text-[11px]">
                                      ·{' '}
                                      {isInternal
                                        ? 'INTERNAL NOTE (PRIVATE)'
                                        : msg.senderRole}
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-[#89839A] dark:text-[#B5AED0]">
                                    <Clock className="h-3 w-3" />
                                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                                  </span>
                                </div>
                                <p className="text-sm text-[#211B35] dark:text-[#EDE8FA] whitespace-pre-wrap leading-relaxed">
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
                        className="border-t border-[#EFEAF9] dark:border-[#2D2250] pt-4 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyIsInternal(false)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                              !replyIsInternal
                                ? 'bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white shadow-sm'
                                : 'border border-[#E2D9F3] dark:border-[#322656] text-[#89839A]'
                            }`}
                          >
                            Public Reply to Client
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyIsInternal(true)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                              replyIsInternal
                                ? 'bg-amber-500 text-[#17132D]'
                                : 'border border-[#E2D9F3] dark:border-[#322656] text-[#89839A]'
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
                          className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                        />

                        <div className="flex items-center justify-end">
                          <button
                            type="submit"
                            disabled={sendingReply || !replyBody.trim()}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)] hover:brightness-105 disabled:opacity-50 cursor-pointer"
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
                    <div className="rounded-2xl border border-dashed border-[#DFD4F7] dark:border-[#34285A] bg-white/70 dark:bg-[#1E1738]/70 p-12 text-center space-y-2">
                      <MessageSquare className="h-8 w-8 text-[#7545E8] dark:text-[#DCC7FF] mx-auto" />
                      <p className="text-sm font-bold font-display text-[#211B35] dark:text-white">
                        Select a Ticket to View Conversation
                      </p>
                      <p className="text-xs text-[#89839A] dark:text-[#B5AED0]">
                        Choose any inquiry from the left inbox to inspect its specification snapshot or reply.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
           * TAB 5: SETTINGS (NEON AUTH & STUDIO THEME CONFIGURATION)
           * ================================================================== */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Password Rotation Card */}
              <div className="lg:col-span-6 rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-6 space-y-5 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                <div>
                  <h2 className="text-base font-bold font-display text-[#211B35] dark:text-white">
                    Neon Auth (Managed Better Auth) Password Rotation
                  </h2>
                  <p className="mt-1 text-xs text-[#89839A] dark:text-[#B5AED0] leading-relaxed">
                    Update the salted PBKDF2-SHA256 credential stored in{' '}
                    <span className="font-mono text-[#7545E8] dark:text-[#DCC7FF]">
                      neon_auth.account
                    </span>{' '}
                    for{' '}
                    <span className="font-mono font-semibold text-[#211B35] dark:text-white">
                      {adminUser?.email || 'admin@crosx.in'}
                    </span>
                    .
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label
                      htmlFor="settings-current-password"
                      className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                    >
                      Current Password (Optional if rotating within active session)
                    </label>
                    <input
                      id="settings-current-password"
                      type={showSettingsPassword ? 'text' : 'password'}
                      value={currentPasswordSetting}
                      onChange={(e) => setCurrentPasswordSetting(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="settings-new-password"
                      className="block text-xs font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                    >
                      New Administrator Password (Min 8 Characters)
                    </label>
                    <div className="relative">
                      <input
                        id="settings-new-password"
                        type={showSettingsPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={newPasswordSetting}
                        onChange={(e) => setNewPasswordSetting(e.target.value)}
                        placeholder="Enter new strong password..."
                        className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] pl-3.5 pr-10 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSettingsPassword((v) => !v)}
                        aria-label={showSettingsPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#89839A] hover:text-[#7545E8] cursor-pointer"
                      >
                        {showSettingsPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)] hover:brightness-105 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Update Neon Auth Password</span>
                  </button>
                </form>
              </div>

              {/* Telemetry & Theme Preferences Card */}
              <div className="lg:col-span-6 rounded-2xl border border-[#E5DDF7] dark:border-[#2F2454] bg-white dark:bg-[#1E1738] p-6 space-y-5 shadow-[0_8px_26px_-8px_rgba(33,24,61,0.07)]">
                <h2 className="text-base font-bold font-display text-[#211B35] dark:text-white">
                  Administrator Identity, Theme &amp; Branch Telemetry
                </h2>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between py-2 border-b border-[#EFEAF9] dark:border-[#2D2250]">
                    <span className="text-[#89839A] dark:text-[#B5AED0]">Auth Provider</span>
                    <span className="font-bold text-[#7545E8] dark:text-[#DCC7FF]">
                      Neon Auth (Managed Better Auth)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#EFEAF9] dark:border-[#2D2250]">
                    <span className="text-[#89839A] dark:text-[#B5AED0]">Signed-In Admin</span>
                    <span className="font-bold text-[#211B35] dark:text-white">
                      {adminUser?.email || 'admin@crosx.in'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#EFEAF9] dark:border-[#2D2250]">
                    <span className="text-[#89839A] dark:text-[#B5AED0]">Email Verified</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {adminUser?.emailVerified !== false ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#EFEAF9] dark:border-[#2D2250]">
                    <span className="text-[#89839A] dark:text-[#B5AED0]">Database Endpoint</span>
                    <span className="truncate max-w-[240px] text-[#211B35] dark:text-[#DCC7FF]">
                      {neonTelemetry?.maskedEndpoint || 'Neon Cloud'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#EFEAF9] dark:border-[#2D2250]">
                    <span className="text-[#89839A] dark:text-[#B5AED0]">Interface Theme</span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#F4EEFF] dark:bg-[#2B2050] px-3 py-1 text-[11px] font-bold text-[#7545E8] dark:text-[#DCC7FF] cursor-pointer"
                    >
                      {isDark ? (
                        <>
                          <Moon className="h-3 w-3" />
                          <span>Midnight Navy (Dark)</span>
                        </>
                      ) : (
                        <>
                          <Sun className="h-3 w-3" />
                          <span>Lavender Surface (Light)</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#89839A] dark:text-[#B5AED0]">
                      Real-Time Ticket Sync (6s)
                    </span>
                    <button
                      type="button"
                      onClick={() => setRealtimeEnabled((v) => !v)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
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
       * MODAL 1: ADD / EDIT PROJECT (WITH CUSTOM DROPDOWN)
       * ====================================================================== */}
      {projectModalOpen && editingProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Project CMS Editor"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17132D]/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-[#DFD4F7] dark:border-[#392C63] bg-white dark:bg-[#1E1738] p-6 sm:p-8 shadow-[0_28px_70px_-15px_rgba(23,19,45,0.5)] space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFEAF9] dark:border-[#2D2250] pb-4">
              <h3 className="text-lg font-extrabold font-display text-[#211B35] dark:text-white">
                {editingProject.id
                  ? `Edit Project: ${editingProject.title}`
                  : 'Add New Portfolio Project'}
              </h3>
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                aria-label="Close project modal"
                className="p-2 rounded-xl border border-[#E2D9F3] dark:border-[#322656] text-[#89839A] hover:text-[#7545E8] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="proj-title"
                    className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                  >
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
                    className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                  />
                </div>

                <div>
                  <span className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5">
                    Category *
                  </span>
                  <AdminCustomDropdown
                    ariaLabel="Select project category"
                    testId="modal-project-category-dropdown"
                    fullWidth
                    value={editingProject.category ?? 'Enterprise Web Platform'}
                    options={projectCategoryModalOptions}
                    onChange={(nextCategory) =>
                      setEditingProject({
                        ...editingProject,
                        category: nextCategory,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="proj-subtitle"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
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
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="proj-url"
                    className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                  >
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
                    className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm font-mono text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="proj-display-url"
                    className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                  >
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
                    className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm font-mono text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                  />
                </div>
              </div>

              {/* Screenshot URL + Image File Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="proj-screenshot"
                    className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                  >
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
                      className="flex-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-2 text-xs font-mono text-[#211B35] dark:text-white"
                    />
                    <label className="inline-flex items-center gap-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-2 text-[#7545E8] dark:text-[#DCC7FF] cursor-pointer">
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
                  <label
                    htmlFor="proj-studio-visual"
                    className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                  >
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
                      className="flex-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-2 text-xs font-mono text-[#211B35] dark:text-white"
                    />
                    <label className="inline-flex items-center gap-1 rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3 py-2 text-[#7545E8] dark:text-[#DCC7FF] cursor-pointer">
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
                <label
                  htmlFor="proj-summary"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
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
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-arch"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
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
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-stack"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
                  Technology Stack (Comma separated)
                </label>
                <input
                  id="proj-stack"
                  type="text"
                  value={stackText}
                  onChange={(e) => setStackText(e.target.value)}
                  placeholder="Next.js, React, TypeScript, Tailwind CSS, Neon DB"
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-xs font-mono text-[#211B35] dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-highlights"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
                  Engineering Highlights (One per line)
                </label>
                <textarea
                  id="proj-highlights"
                  rows={3}
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-xs text-[#211B35] dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProject.published)}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, published: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#7545E8]"
                  />
                  <span>Published on Live Portfolio</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProject.featured)}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, featured: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#7545E8]"
                  />
                  <span>Featured Project</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#EFEAF9] dark:border-[#2D2250] pt-4">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="rounded-xl border border-[#E2D9F3] dark:border-[#322656] px-4 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)] cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
       * MODAL 2: ADD / EDIT DYNAMIC FORM FIELD (WITH CUSTOM DROPDOWNS)
       * ====================================================================== */}
      {fieldModalOpen && editingField && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Specification Form Field Editor"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17132D]/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg rounded-3xl border border-[#DFD4F7] dark:border-[#392C63] bg-white dark:bg-[#1E1738] p-6 sm:p-8 shadow-[0_28px_70px_-15px_rgba(23,19,45,0.5)] space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFEAF9] dark:border-[#2D2250] pb-4">
              <h3 className="text-lg font-extrabold font-display text-[#211B35] dark:text-white">
                {editingField.id
                  ? `Edit Form Field: ${editingField.label}`
                  : 'Add Specification Form Field'}
              </h3>
              <button
                type="button"
                onClick={() => setFieldModalOpen(false)}
                aria-label="Close field modal"
                className="p-2 rounded-xl border border-[#E2D9F3] dark:border-[#322656] text-[#89839A] hover:text-[#7545E8] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-4 text-xs">
              <div>
                <label
                  htmlFor="field-label"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
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
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5">
                    Input Type *
                  </span>
                  <AdminCustomDropdown
                    ariaLabel="Select field input type"
                    testId="modal-field-type-dropdown"
                    fullWidth
                    value={editingField.type ?? 'text'}
                    options={fieldTypeModalOptions}
                    onChange={(nextType) =>
                      setEditingField({
                        ...editingField,
                        type: nextType,
                      })
                    }
                  />
                </div>

                <div>
                  <span className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5">
                    Layout Column Span
                  </span>
                  <AdminCustomDropdown
                    ariaLabel="Select field layout width"
                    testId="modal-field-width-dropdown"
                    fullWidth
                    value={editingField.width ?? 'half'}
                    options={fieldWidthModalOptions}
                    onChange={(nextWidth) =>
                      setEditingField({
                        ...editingField,
                        width: nextWidth,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="field-placeholder"
                  className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                >
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
                  className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-sm text-[#211B35] dark:text-white focus:border-[#7545E8] focus:outline-none"
                />
              </div>

              {(editingField.type === 'select' || editingField.type === 'radio') && (
                <div>
                  <label
                    htmlFor="field-options"
                    className="block font-semibold text-[#211B35] dark:text-[#EDE8FA] mb-1.5"
                  >
                    Dropdown / Radio Options (One option per line) *
                  </label>
                  <textarea
                    id="field-options"
                    rows={4}
                    required
                    value={fieldOptionsText}
                    onChange={(e) => setFieldOptionsText(e.target.value)}
                    placeholder={'$2,500 – $5,000\n$5,000 – $15,000\n$15,000+ Enterprise'}
                    className="w-full rounded-xl border border-[#E2D9F3] dark:border-[#322656] bg-[#F7F5FC] dark:bg-[#17132D] px-3.5 py-2.5 text-xs font-mono text-[#211B35] dark:text-white"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingField.required)}
                    onChange={(e) =>
                      setEditingField({ ...editingField, required: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#7545E8]"
                  />
                  <span>Required Field</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingField.enabled)}
                    onChange={(e) =>
                      setEditingField({ ...editingField, enabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#7545E8]"
                  />
                  <span>Enabled on Public Form</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#EFEAF9] dark:border-[#2D2250] pt-4">
                <button
                  type="button"
                  onClick={() => setFieldModalOpen(false)}
                  className="rounded-xl border border-[#E2D9F3] dark:border-[#322656] px-4 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white px-5 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-4px_rgba(117,69,232,0.5)] cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17132D]/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-white dark:bg-[#1E1738] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold font-display text-rose-600 dark:text-rose-400">
              Confirm Delete Project
            </h3>
            <p className="text-xs text-[#89839A] dark:text-[#B5AED0] leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-[#211B35] dark:text-white">
                {deleteProjectTarget.title}
              </strong>{' '}
              from the portfolio?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProjectTarget(null)}
                className="rounded-xl border border-[#E2D9F3] dark:border-[#322656] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProject}
                className="rounded-xl bg-rose-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17132D]/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-white dark:bg-[#1E1738] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold font-display text-rose-600 dark:text-rose-400">
              Confirm Delete Form Field
            </h3>
            <p className="text-xs text-[#89839A] dark:text-[#B5AED0] leading-relaxed">
              Remove field{' '}
              <strong className="text-[#211B35] dark:text-white">
                {deleteFieldTarget.label}
              </strong>{' '}
              from future Project Specification submissions? Historical tickets will retain their saved values.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteFieldTarget(null)}
                className="rounded-xl border border-[#E2D9F3] dark:border-[#322656] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteField}
                className="rounded-xl bg-rose-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17132D]/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-white dark:bg-[#1E1738] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold font-display text-rose-600 dark:text-rose-400">
              Confirm Delete Ticket {deleteTicketTarget.ticketNumber}
            </h3>
            <p className="text-xs text-[#89839A] dark:text-[#B5AED0] leading-relaxed">
              Permanently delete ticket{' '}
              <strong className="font-mono text-[#211B35] dark:text-white">
                {deleteTicketTarget.ticketNumber}
              </strong>{' '}
              ({deleteTicketTarget.clientName}) and its conversation thread?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTicketTarget(null)}
                className="rounded-xl border border-[#E2D9F3] dark:border-[#322656] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTicket}
                className="rounded-xl bg-rose-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
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
