import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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

interface RateRow {
  day: string;
  rate: number;
}

interface HeatmapRow {
  day: string;
  slots: number[];
}

interface AbsenteeRow {
  id: string;
  student: string;
  className: string;
  attendance: number;
  consecutive: number;
}

const intensityMap = ['bg-emerald-50', 'bg-amber-100', 'bg-amber-300', 'bg-rose-400'];

const AttendanceAnalyticsPage = () => {
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-attendance', from, to],
    queryFn: eduovaApi.analytics.getAttendance,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load attendance analytics"
        message="Refresh to retry the attendance dashboard feed."
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
        <Button variant="secondary">Export Attendance</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Daily Attendance Rate" description="Daily attendance compared with the 80% threshold.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rate as RateRow[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" />
                <YAxis stroke="#64748B" domain={[60, 100]} />
                <Tooltip />
                <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="6 6" />
                <Line type="monotone" dataKey="rate" stroke="#0F1B3C" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Attendance Heatmap" description="Daily intensity across session periods.">
          <div className="space-y-3">
            {(data.heatmap as HeatmapRow[]).map((row) => (
              <div key={row.day} className="grid grid-cols-[70px_repeat(6,minmax(0,1fr))] items-center gap-2">
                <span className="text-sm font-medium text-slate-600">{row.day}</span>
                {row.slots.map((value, index) => (
                  <div
                    key={`${row.day}-${index}`}
                    className={`h-10 rounded-xl border border-white ${intensityMap[value] || intensityMap[0]}`}
                    title={`Period ${index + 1}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Table<AbsenteeRow>
        title="Chronic Absentees"
        data={data.chronicAbsentees as AbsenteeRow[]}
        columns={[
          { header: 'Student', accessorKey: 'student' },
          { header: 'Class', accessorKey: 'className' },
          { header: 'Attendance', cell: ({ row }) => `${row.original.attendance}%` },
          { header: 'Consecutive Days', accessorKey: 'consecutive' },
          {
            header: 'Status',
            cell: ({ row }) => (
              <Badge variant={row.original.attendance < 70 ? 'danger' : 'warning'}>
                {row.original.attendance < 70 ? 'critical' : 'watch'}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AttendanceAnalyticsPage;
