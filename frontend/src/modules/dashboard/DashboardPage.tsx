import { useQuery } from '@tanstack/react-query';
import { BellRing, FileText, Receipt, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Stat from '../../components/ui/Stat';
import Table from '../../components/ui/Table';
import { isTertiaryInstitution } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../shared/PageHeader';
import ParentWorkspacePage from '../workspace/ParentWorkspacePage';
import StudentWorkspacePage from '../workspace/StudentWorkspacePage';
import TeacherWorkspacePage from '../workspace/TeacherWorkspacePage';

interface DashboardStat {
  id: string;
  label: string;
  value: string;
  icon: string;
  trend: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
}

interface RecentPaymentRow {
  id: string;
  student: string;
  className: string;
  amount: number;
  method: string;
  receivedAt: string;
  status: string;
}

interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const institution = useAuthStore((state) => state.tenantContext || state.institution);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: eduovaApi.analytics.getOverview,
  });

  if (role === 'teacher') {
    return <TeacherWorkspacePage />;
  }

  if (role === 'student') {
    return <StudentWorkspacePage />;
  }

  if (role === 'parent') {
    return <ParentWorkspacePage />;
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load dashboard"
        message="Try refreshing the dashboard data."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Institution performance at a glance across finance, academics, attendance, and daily operations."
      />
      <div className="grid gap-5 xl:grid-cols-4">
        {(data.stats as DashboardStat[]).map((item) => (
          <Stat key={item.id} item={item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card title="Revenue Trend" description="Monthly billed versus collected revenue.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#0F1B3C" strokeWidth={3} />
                <Line type="monotone" dataKey="billed" stroke="#F5A623" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Enrollment by Level" description="Current distribution of students across education levels.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.enrollmentByLevel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="level" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="count" fill="#0F1B3C" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Table<RecentPaymentRow>
          title="Recent Payments"
          data={data.recentPayments as RecentPaymentRow[]}
          columns={[
            { header: 'Student', accessorKey: 'student' },
            { header: 'Class', accessorKey: 'className' },
            { header: 'Method', accessorKey: 'method' },
            { header: 'Amount', cell: ({ row }) => `GHS ${row.original.amount.toLocaleString()}` },
            { header: 'Received', accessorKey: 'receivedAt' },
            { header: 'Status', accessorKey: 'status' },
          ]}
        />
        <Card title="Active Alerts" description="Rule-based alerts requiring operational attention.">
          <div className="space-y-3">
            {(data.alerts as DashboardAlert[]).map((alert) => (
              <Alert
                key={alert.id}
                title={alert.title}
                message={alert.description}
                variant={alert.severity}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Quick Actions" description="Launch the most common administrative workflows.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Button
            variant="secondary"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => navigate('/students/enroll')}
          >
            New Student
          </Button>
          <Button
            variant="secondary"
            leftIcon={<FileText className="h-4 w-4" />}
            onClick={() => navigate('/staff/users')}
          >
            Create User
          </Button>
          <Button
            variant="secondary"
            leftIcon={<BellRing className="h-4 w-4" />}
            onClick={() => navigate('/academics/structure')}
          >
            Academic Setup
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Receipt className="h-4 w-4" />}
            onClick={() => navigate(isTertiaryInstitution(institution) ? '/tertiary' : '/finance')}
          >
            {isTertiaryInstitution(institution) ? 'Tertiary Setup' : 'Finance'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
