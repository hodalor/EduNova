import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import PageLoader from '../../components/ui/PageLoader';

interface TrendRow {
  month: string;
  enrolled: number;
}

interface DistributionRow {
  name: string;
  value: number;
}

interface CapacityRow {
  className: string;
  capacity: number;
  enrolled: number;
}

const colors = ['#0F1B3C', '#F5A623', '#3B82F6', '#22C55E', '#8B5CF6'];

const EnrollmentAnalyticsPage = () => {
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-enrollment', from, to],
    queryFn: eduovaApi.analytics.getEnrollment,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load enrollment analytics"
        message="Refresh to retry the enrollment trend data."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-muted grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <DatePicker label="From" value={from} onChange={setFrom} />
        <DatePicker label="To" value={to} onChange={setTo} />
        <Button variant="secondary">Compare Terms</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Monthly Enrollment Trend" description="New enrollments recorded per month.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend as TrendRow[]}>
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Line type="monotone" dataKey="enrolled" stroke="#0F1B3C" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Level Distribution" description="Active enrollment distribution by level.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.levelDistribution as DistributionRow[]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                >
                  {(data.levelDistribution as DistributionRow[]).map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Class Capacity vs Enrollment" description="Current seat utilization by class.">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.capacity as CapacityRow[]}>
              <XAxis dataKey="className" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Bar dataKey="capacity" fill="#CBD5E1" radius={[10, 10, 0, 0]} />
              <Bar dataKey="enrolled" fill="#0F1B3C" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default EnrollmentAnalyticsPage;
