import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';

interface AverageGradeRow {
  className: string;
  average: number;
  benchmark: number;
}

interface PassRateRow {
  subject: string;
  rate: number;
}

interface AtRiskRow {
  id: string;
  student: string;
  className: string;
  average: number;
  attendance: number;
  risk: 'high' | 'medium' | 'low';
}

const AcademicsAnalyticsPage = () => {
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-academics', from, to],
    queryFn: eduovaApi.analytics.getAcademics,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load academic analytics"
        message="Refresh the report to fetch the current academic performance trends."
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
        <Button variant="secondary">Share Report</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Average Grades per Class" description="Comparison against the benchmark target.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.averageGrades as AverageGradeRow[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="className" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="average" fill="#0F1B3C" radius={[10, 10, 0, 0]} />
                <Bar dataKey="benchmark" fill="#F5A623" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Pass Rate per Subject" description="Horizontal comparison across major subjects.">
          <div className="space-y-4">
            {(data.passRates as PassRateRow[]).map((row) => (
              <div key={row.subject}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{row.subject}</span>
                  <span className="font-semibold text-brand-navy">{row.rate}%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-brand-gold"
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Table<AtRiskRow>
        title="At-Risk Students"
        data={data.atRisk as AtRiskRow[]}
        columns={[
          { header: 'Student', accessorKey: 'student' },
          { header: 'Class', accessorKey: 'className' },
          { header: 'Average Grade', cell: ({ row }) => `${row.original.average}%` },
          { header: 'Attendance', cell: ({ row }) => `${row.original.attendance}%` },
          {
            header: 'Risk Level',
            cell: ({ row }) => (
              <Badge
                variant={
                  row.original.risk === 'high'
                    ? 'danger'
                    : row.original.risk === 'medium'
                      ? 'warning'
                      : 'success'
                }
              >
                {row.original.risk}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AcademicsAnalyticsPage;
