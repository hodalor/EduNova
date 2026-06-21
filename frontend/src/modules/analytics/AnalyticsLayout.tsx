import { NavLink, Outlet } from 'react-router-dom';

import PageHeader from '../shared/PageHeader';

const links = [
  { label: 'Finance', to: '/analytics/finance' },
  { label: 'Academics', to: '/analytics/academics' },
  { label: 'Attendance', to: '/analytics/attendance' },
  { label: 'Enrollment', to: '/analytics/enrollment' },
  { label: 'Alerts', to: '/analytics/alerts' },
];

const AnalyticsLayout = () => (
  <div className="space-y-6">
    <PageHeader
      title="Analytics"
      description="Executive intelligence dashboards with institution-wide trends and alerts."
    />
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            [
              'rounded-2xl px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-brand-navy text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
            ].join(' ')
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
    <Outlet />
  </div>
);

export default AnalyticsLayout;
