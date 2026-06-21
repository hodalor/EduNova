import { useQuery } from '@tanstack/react-query';
import { BellRing, CreditCard, ShieldCheck, Users2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface StudentDetail {
  name: string;
  className: string;
  student_number: string;
  guardian?: {
    name?: string;
    phone?: string;
  };
  medical?: {
    allergies?: string;
    notes?: string;
  };
}

interface AttendanceRow {
  rate: number;
}

interface InvoiceRow {
  balance: number;
}

const ParentWorkspacePage = () => {
  const user = useAuthStore((state) => state.user);
  const { data: student, isLoading: loadingStudent } = useQuery<StudentDetail>({
    queryKey: ['parent-student-detail'],
    queryFn: () => eduovaApi.students.detail('stu-001'),
  });
  const { data: attendance = [], isLoading: loadingAttendance } = useQuery<AttendanceRow[]>({
    queryKey: ['parent-attendance-report'],
    queryFn: eduovaApi.attendance.report,
  });
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<InvoiceRow[]>({
    queryKey: ['parent-invoices'],
    queryFn: eduovaApi.finance.invoices,
  });

  if (loadingStudent || loadingAttendance || loadingInvoices) {
    return <PageLoader />;
  }

  const outstanding = invoices.reduce(
    (sum: number, item: InvoiceRow) => sum + Number(item.balance || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent Workspace"
        description={`Welcome ${user?.first_name || 'Parent'}. Monitor your child&apos;s attendance, fee status, and school communication from one place.`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active Children',
            value: '1',
            helper: 'Linked learner records in this institution.',
            icon: Users2,
          },
          {
            label: 'Attendance Rate',
            value: `${attendance?.[0]?.rate || 0}%`,
            helper: 'Current attendance performance.',
            icon: ShieldCheck,
          },
          {
            label: 'Outstanding Balance',
            value: `GHS ${outstanding.toLocaleString()}`,
            helper: 'Fees that still require settlement.',
            icon: CreditCard,
          },
          {
            label: 'Unread Notices',
            value: '3',
            helper: 'Announcements and class communication.',
            icon: BellRing,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold text-brand-navy">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                </div>
                <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="Child Snapshot" description="Linked learner profile and guardian view.">
          <div className="rounded-2xl border border-slate-200 px-4 py-4">
            <p className="text-lg font-semibold text-brand-navy">{student?.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {student?.className} · Student No. {student?.student_number}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Guardian
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-navy">
                  {student?.guardian?.name}
                </p>
                <p className="text-sm text-slate-500">{student?.guardian?.phone}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Medical Note
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-navy">
                  {student?.medical?.allergies || 'No allergy recorded'}
                </p>
                <p className="text-sm text-slate-500">{student?.medical?.notes}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions" description="Daily parent self-service tasks.">
          <div className="space-y-3">
            <Link
              to="/communication"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Open school communication
            </Link>
            <Link
              to="/transport"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Check transport and pickup updates
            </Link>
            <Link
              to="/"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Review linked child overview
            </Link>
          </div>
        </Card>
      </div>

      <Card title="Parent Alerts" description="Important operational updates from the institution.">
        <div className="space-y-3">
          <Alert
            title="Fee follow-up"
            message={`Current outstanding balance is GHS ${outstanding.toLocaleString()}.`}
            variant={outstanding > 0 ? 'warning' : 'success'}
          />
          <Alert
            title="Attendance monitor"
            message={`${student?.name} is currently at ${attendance?.[0]?.rate || 0}% attendance.`}
            variant={Number(attendance?.[0]?.rate || 0) < 80 ? 'warning' : 'info'}
          />
        </div>
      </Card>
    </div>
  );
};

export default ParentWorkspacePage;
