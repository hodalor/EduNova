import { Suspense, type ReactNode } from 'react';
import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users2,
  Bell,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { cn } from '../../lib/cn';
import {
  getRoleHomeTitle,
  getWorkspaceLabel,
  hasLevel,
  isDaycareInstitution,
  isTertiaryInstitution,
} from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { InstitutionSummary, UserRole } from '../../types/auth';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Dropdown from '../ui/Dropdown';
import PageLoader from '../ui/PageLoader';

type NavItem = {
  name: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
  visible?: (institution: InstitutionSummary | null) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const supportsAcademics = (institution: InstitutionSummary | null) =>
  hasLevel(institution, 'PR') ||
  hasLevel(institution, 'JH') ||
  hasLevel(institution, 'SH') ||
  hasLevel(institution, 'TR');

const institutionNavGroups: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { name: 'Overview', to: '/', icon: LayoutDashboard },
      {
        name: 'Students',
        to: '/students',
        icon: GraduationCap,
        roles: ['institution_admin', 'teacher', 'librarian'],
      },
      {
        name: 'Staff Access',
        to: '/staff/users',
        icon: Users2,
        roles: ['institution_admin'],
      },
    ],
  },
  {
    label: 'Setup',
    items: [
      {
        name: 'Academic Setup',
        to: '/academics/structure',
        icon: Layers3,
        roles: ['institution_admin'],
        visible: supportsAcademics,
      },
      {
        name: 'Daycare Setup',
        to: '/daycare',
        icon: Baby,
        roles: ['institution_admin'],
        visible: isDaycareInstitution,
      },
      {
        name: 'Tertiary Setup',
        to: '/tertiary',
        icon: Building2,
        roles: ['institution_admin'],
        visible: isTertiaryInstitution,
      },
    ],
  },
  {
    label: 'Workflows',
    items: [
      {
        name: 'Results Entry',
        to: '/academics/results-entry',
        icon: BookOpen,
        roles: ['institution_admin', 'teacher'],
        visible: supportsAcademics,
      },
      {
        name: 'Attendance',
        to: '/attendance/taking',
        icon: ClipboardCheck,
        roles: ['institution_admin', 'teacher'],
      },
      {
        name: 'Finance',
        to: '/finance',
        icon: CreditCard,
        roles: ['institution_admin', 'accountant'],
      },
    ],
  },
  {
    label: 'Student',
    items: [
      {
        name: 'My Academics',
        to: '/student/academics',
        icon: BookOpen,
        roles: ['student'],
        visible: supportsAcademics,
      },
      {
        name: 'Course Registration',
        to: '/student/course-registration',
        icon: Layers3,
        roles: ['student'],
        visible: isTertiaryInstitution,
      },
      {
        name: 'My Attendance',
        to: '/student/attendance',
        icon: ClipboardCheck,
        roles: ['student'],
      },
      {
        name: 'My Finance',
        to: '/student/finance',
        icon: CreditCard,
        roles: ['student'],
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        name: 'Analytics',
        to: '/analytics/finance',
        icon: FileBarChart2,
        roles: ['institution_admin', 'accountant'],
      },
      {
        name: 'Settings',
        to: '/settings',
        icon: Settings,
        roles: ['institution_admin'],
      },
    ],
  },
];

const superAdminNavGroups = [
  { label: 'Control Plane', items: [{ name: 'Overview', to: '/super-admin', icon: ShieldCheck }] },
  { label: 'Platform Users', items: [{ name: 'Users', to: '/super-admin/users', icon: Users2 }] },
  { label: 'Institutions', items: [{ name: 'Institutions', to: '/super-admin/institutions', icon: GraduationCap }] },
  { label: 'Analytics', items: [{ name: 'Platform KPIs', to: '/super-admin/analytics', icon: FileBarChart2 }] },
  { label: 'Audit', items: [{ name: 'Audit Trail', to: '/super-admin/audit-logs', icon: BriefcaseBusiness }] },
];

const buildNavGroups = (
  role: UserRole | null,
  institution: InstitutionSummary | null,
  tenantContext: InstitutionSummary | null
): NavGroup[] => {
  const activeInstitution = tenantContext || institution;

  if (role === 'super_admin') {
    const tenantGroups = institutionNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => (item.visible ? item.visible(activeInstitution) : true)),
      }))
      .filter((group) => group.items.length > 0);

    return [
      ...superAdminNavGroups,
      { label: 'School Workspaces', items: [{ name: 'School Menus', to: '/', icon: LayoutDashboard }] },
      ...tenantGroups,
    ];
  }

  return institutionNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const matchesRole = !item.roles?.length || (role ? item.roles.includes(role) : false);
        const visible = item.visible ? item.visible(activeInstitution) : true;
        return matchesRole && visible;
      }),
    }))
    .filter((group) => group.items.length > 0);
};

export const Sidebar = () => {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const role = useAuthStore((state) => state.role);
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const groups = buildNavGroups(role, institution, tenantContext);
  const workspaceLabel = getWorkspaceLabel(activeInstitution);

  return (
    <aside
      className={cn(
        'hidden h-screen border-r border-slate-800/10 bg-brand-navy text-white lg:flex lg:flex-col lg:overflow-hidden',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="shrink-0 border-b border-white/10 px-4 py-5">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <span className="h-5 w-5 rounded-lg bg-brand-gold" />
          </span>
          {!collapsed ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-brand-gold">
                EDUOVA
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {activeInstitution?.name || 'Education Platform'}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                {role === 'super_admin' && tenantContext
                  ? `Platform Master · ${tenantContext.name}`
                  : role === 'super_admin'
                    ? 'Platform Master'
                    : workspaceLabel}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="scrollbar-hidden flex-1 overflow-y-auto px-2 py-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-r-2xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10',
                        isActive ? 'nav-active text-white' : ''
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed ? <span>{item.name}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export const Topbar = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const setTenantContext = useAuthStore((state) => state.setTenantContext);
  const logout = useAuthStore((state) => state.logout);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const notificationBadgeCount = useUiStore((state) => state.notificationBadgeCount);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const activeInstitution = tenantContext || institution;
  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, ' '));

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="app-container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 lg:inline-flex"
            onClick={toggleSidebar}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span>Workspace</span>
              {crumbs.map((crumb) => (
                <span key={crumb} className="inline-flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{crumb}</span>
                </span>
              ))}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-brand-navy">
              {getRoleHomeTitle(role, activeInstitution)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeInstitution?.name || 'EDUOVA'} · {getWorkspaceLabel(activeInstitution)}
            </p>
            {role === 'super_admin' && tenantContext ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-gold">
                School scope active
              </p>
            ) : role === 'super_admin' ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                No school scope selected
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-gold" />
          </button>
          <Badge variant="info">{notificationBadgeCount} alerts</Badge>
          <Dropdown
            trigger={
              <button type="button" className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
                <Avatar
                  name={[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Admin User'}
                  src={user?.profile_photo}
                />
                <div className="text-left">
                  <p className="text-sm font-semibold text-brand-navy">
                    {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'EDUOVA Admin'}
                  </p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    {user?.role || 'guest'}
                  </p>
                </div>
              </button>
            }
            items={[
              { label: 'My Profile' },
              { label: role === 'super_admin' ? 'Platform Settings' : 'Institution Settings' },
              ...(role === 'super_admin' && tenantContext
                ? [{ label: 'Clear School Scope', onSelect: () => setTenantContext(null) }]
                : []),
              { label: 'Logout', onSelect: logout, destructive: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
};

export const AppShell = () => (
  <div className="h-screen overflow-hidden bg-slate-50">
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="app-container py-6"><PageLoader /></div>}>
            <main className="app-container py-6">
              <Outlet />
            </main>
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);

export interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export const AuthLayout = ({ title, description, children }: AuthLayoutProps) => (
  <div className="flex min-h-screen items-center justify-center bg-brand-navy px-4 py-10">
    <div className="grid w-full max-w-5xl gap-8 overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden bg-brand-navy px-10 py-12 text-white lg:block">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-gold">EDUOVA</p>
        <h1 className="mt-8 text-4xl font-semibold leading-tight">
          Trustworthy administration for education leaders.
        </h1>
        <p className="mt-4 max-w-md text-slate-300">
          Manage admissions, finance, attendance, academics, and analytics from one
          serious, operations-focused command center.
        </p>
      </div>
      <div className="px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-gold">
            Secure Access
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-brand-navy">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  </div>
);
