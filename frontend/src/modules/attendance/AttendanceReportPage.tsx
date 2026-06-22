import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { getInstitutionLevels } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import type { EducationLevelCode } from '../../types/auth';
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

interface AcademicGroup {
  id: string;
  name: string;
  code: string;
  level_code: string;
}

interface AcademicStructureResponse {
  groups: AcademicGroup[];
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
  const [groupId, setGroupId] = useState('');
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const allowedLevels = getInstitutionLevels(activeInstitution);
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-report'],
    queryFn: eduovaApi.attendance.report,
  });
  const { data: structure, isLoading: structureLoading } = useQuery<AcademicStructureResponse>({
    queryKey: ['academic-structure', 'attendance-report', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });

  const rows = useMemo(() => (data || []) as AttendanceReportRow[], [data]);
  const groups = ((structure?.groups || []) as AcademicGroup[]).filter(
    (group) => !allowedLevels.length || allowedLevels.includes(group.level_code as EducationLevelCode)
  );

  if (isLoading || structureLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Report"
        description="Analyze attendance for the selected school group and reporting range."
      />

      <Card title="Filters" description="Select class and reporting period.">
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Class or Level" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">All classes or levels</option>
            {groups.map((group: AcademicGroup) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.code})
              </option>
            ))}
          </Select>
          <DatePicker label="From" value={from} onChange={setFrom} />
          <DatePicker label="To" value={to} onChange={setTo} />
          <div className="flex items-end gap-3">
            <Button variant="secondary">Export Excel</Button>
            <Button variant="secondary">Print</Button>
          </div>
        </div>
        {!groups.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No classes or levels are available yet. Open{' '}
            <Link className="font-semibold text-brand-navy underline" to="/academics/structure">
              Academic Setup
            </Link>{' '}
            first.
          </div>
        ) : null}
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
