import {
  Bell,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';

const navigationItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Admissions', to: '/admissions', icon: MenuSquare },
  { label: 'Students', to: '/students', icon: GraduationCap },
  { label: 'Staff', to: '/staff', icon: Users },
  { label: 'Academics', to: '/academics', icon: CalendarDays },
  { label: 'Attendance', to: '/attendance', icon: CalendarDays },
  { label: 'Finance', to: '/finance', icon: Bell },
  { label: 'Communication', to: '/communication', icon: Bell },
  { label: 'Timetable', to: '/timetable', icon: CalendarDays },
  { label: 'Discipline', to: '/discipline', icon: MenuSquare },
  { label: 'Transport', to: '/transport', icon: MenuSquare },
  { label: 'Hostel', to: '/hostel', icon: MenuSquare },
  { label: 'Inventory', to: '/inventory', icon: MenuSquare },
  { label: 'Analytics', to: '/analytics', icon: Bell },
];

const AppShell = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-brand-mist text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-800/10 bg-brand-navy px-6 py-8 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-gold">
              EDUOVA
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Admin Portal</h1>
            <p className="mt-2 text-sm text-slate-300">
              Serious, secure and operations-focused school management.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navigationItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-white text-brand-navy shadow-panel'
                      : 'text-slate-200 hover:bg-white/10',
                  ].join(' ')
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="border-b border-brand-line bg-white px-6 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-gold">Operations Control</p>
                <h2 className="text-2xl font-semibold text-brand-navy">
                  Education Management Workspace
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-brand-line bg-brand-mist px-4 py-2 text-right">
                  <p className="text-sm font-semibold text-brand-navy">
                    {user?.name ?? 'Administrator'}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {user?.role ?? 'admin'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
