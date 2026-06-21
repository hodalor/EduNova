import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, CreditCard, GraduationCap, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { isTertiaryInstitution } from '../../lib/institution';

interface ReportCardRow {
  id: string;
  student: string;
  status: string;
}

interface AttendanceRow {
  id: string;
  rate: number;
}

interface TimetableRow {
  day: string;
  period: string;
  subject: string;
  teacher: string;
  room: string;
}

interface InvoiceRow {
  id: string;
  balance: number;
}

const StudentWorkspacePage = () => {
  const user = useAuthStore((state) => state.user);
  const institution = useAuthStore((state) => state.institution);
  const { data: reportCards = [], isLoading: loadingReports } = useQuery<ReportCardRow[]>({
    queryKey: ['student-report-cards'],
    queryFn: eduovaApi.academics.reportCards,
  });
  const { data: attendance = [], isLoading: loadingAttendance } = useQuery<AttendanceRow[]>({
    queryKey: ['student-attendance-report'],
    queryFn: eduovaApi.attendance.report,
  });
  const { data: timetable = [], isLoading: loadingTimetable } = useQuery<TimetableRow[]>({
    queryKey: ['student-timetable-grid'],
    queryFn: eduovaApi.timetable.grid,
  });
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<InvoiceRow[]>({
    queryKey: ['student-finance-invoices'],
    queryFn: eduovaApi.finance.invoices,
  });

  const stats = useMemo(() => {
    const learnerAttendance = attendance?.[0];
    const outstanding = invoices.reduce(
      (sum: number, item: InvoiceRow) => sum + Number(item.balance || 0),
      0
    );

    return [
      {
        label: 'Attendance Rate',
        value: `${learnerAttendance?.rate || 0}%`,
        helper: 'Presence, lateness, and absence summary.',
        icon: CalendarRange,
      },
      {
        label: 'Published Reports',
        value: `${reportCards.filter((item: ReportCardRow) => item.status !== 'Pending').length}`,
        helper: 'Available report cards and academic updates.',
        icon: GraduationCap,
      },
      {
        label: 'Balance',
        value: `GHS ${outstanding.toLocaleString()}`,
        helper: 'Current invoice balance across fees.',
        icon: CreditCard,
      },
      {
        label: 'Next Lessons',
        value: `${timetable.length}`,
        helper: 'Upcoming timetable slots in your dashboard.',
        icon: ShieldAlert,
      },
    ];
  }, [attendance, invoices, reportCards, timetable]);

  if (loadingReports || loadingAttendance || loadingTimetable || loadingInvoices) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Workspace"
        description={`Welcome ${user?.first_name || 'Student'}. Track your academic progress, attendance, timetable, and fee status from one portal.`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
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
        <Card title="My Academic Record" description="Recent report publication and review status.">
          <div className="space-y-3">
            {reportCards.map((item: ReportCardRow) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-navy">{item.student}</p>
                  <p className="text-sm text-slate-500">Academic record update available.</p>
                </div>
                <Badge variant={item.status === 'Pending' ? 'pending' : 'success'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick Actions" description="Open your main student services.">
          <div className="space-y-3">
            <Link
              to="/student/academics"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              View academic standing and promotion pathway
            </Link>
            {isTertiaryInstitution(institution) ? (
              <Link
                to="/student/course-registration"
                className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
              >
                Register semester courses for your current level
              </Link>
            ) : null}
            <Link
              to="/student/attendance"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Review attendance and punctuality
            </Link>
            <Link
              to="/student/finance"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Check invoices and payment status
            </Link>
            <Link
              to="/communication"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Follow school messages and notices
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Upcoming Timetable" description="Next subjects and room allocations.">
          <div className="space-y-3">
            {timetable.map((item: TimetableRow, index: number) => (
              <div
                key={`${item.day}-${item.period}-${index}`}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">{item.subject}</p>
                    <p className="text-sm text-slate-500">
                      {item.day} at {item.period} · {item.room}
                    </p>
                  </div>
                  <Badge variant="info">{item.teacher}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Attention Items" description="Important updates requiring action.">
          <div className="space-y-3">
            <Alert
              title="Attendance standing"
              message={`Current tracked attendance is ${attendance?.[0]?.rate || 0}%. Keep it above the promotion threshold.`}
              variant={Number(attendance?.[0]?.rate || 0) < 80 ? 'warning' : 'success'}
            />
            <Alert
              title="Finance status"
              message={`Outstanding fee balance is GHS ${invoices
                .reduce(
                  (sum: number, item: InvoiceRow) => sum + Number(item.balance || 0),
                  0
                )
                .toLocaleString()}.`}
              variant="info"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentWorkspacePage;
