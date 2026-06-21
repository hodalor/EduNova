import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface AttendanceReportRow {
  id: string;
  student: string;
  days: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

const rowClassName = (rate: number) => {
  if (rate < 75) {
    return 'text-rose-600';
  }
  if (rate <= 85) {
    return 'text-amber-600';
  }
  return 'text-emerald-600';
};

const AttendanceReportPage = () => {
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-report'],
    queryFn: eduovaApi.attendance.report,
  });

  const rows = useMemo(() => (data || []) as AttendanceReportRow[], [data]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Report"
        description="Analyze class attendance for the selected range and export printable summaries."
      />

      <Card title="Filters" description="Select class and reporting period.">
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Class">
            <option>SH 2 Science</option>
            <option>PR 5 Gold</option>
          </Select>
          <DatePicker label="From" value={from} onChange={setFrom} />
          <DatePicker label="To" value={to} onChange={setTo} />
          <div className="flex items-end gap-3">
            <Button variant="secondary">Export Excel</Button>
            <Button variant="secondary">Print</Button>
          </div>
        </div>
      </Card>

      <Table<AttendanceReportRow>
        title="Attendance Summary"
        data={rows}
        columns={[
          {
            header: 'Student',
            cell: ({ row }) => <span className={rowClassName(row.original.rate)}>{row.original.student}</span>,
          },
          { header: 'Total Days', accessorKey: 'days' },
          { header: 'Present', accessorKey: 'present' },
          { header: 'Absent', accessorKey: 'absent' },
          { header: 'Late', accessorKey: 'late' },
          {
            header: 'Attendance %',
            cell: ({ row }) => <span className={rowClassName(row.original.rate)}>{row.original.rate}%</span>,
          },
        ]}
      />
    </div>
  );
};

export default AttendanceReportPage;
