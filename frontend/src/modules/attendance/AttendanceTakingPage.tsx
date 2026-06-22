import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { getInstitutionLevels } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import type { EducationLevelCode } from '../../types/auth';
import PageHeader from '../shared/PageHeader';

interface AttendanceRow {
  id: string;
  student: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

const statuses: Array<AttendanceRow['status']> = ['present', 'absent', 'late', 'excused'];

interface AcademicGroup {
  id: string;
  name: string;
  code: string;
  level_code: string;
}

interface AcademicStructureResponse {
  groups: AcademicGroup[];
}

const AttendanceTakingPage = () => {
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const allowedLevels = getInstitutionLevels(activeInstitution);
  const [sessionType, setSessionType] = useState('Morning');
  const [groupId, setGroupId] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-taking'],
    queryFn: eduovaApi.attendance.taking,
  });
  const { data: structure, isLoading: structureLoading } = useQuery<AcademicStructureResponse>({
    queryKey: ['academic-structure', 'attendance-taking', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const groups = (structure?.groups || []).filter(
    (group: AcademicGroup) =>
      !allowedLevels.length || allowedLevels.includes(group.level_code as EducationLevelCode)
  );
  const selectedGroup = groups.find((group: AcademicGroup) => group.id === groupId) || null;

  useEffect(() => {
    if (data && rows.length === 0) {
      setRows(data as AttendanceRow[]);
    }
  }, [data, rows.length]);

  useEffect(() => {
    if (!groupId && groups[0]?.id) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  if (isLoading || structureLoading) {
    return <PageLoader />;
  }

  const markAllPresent = () =>
    setRows((current) => current.map((item) => ({ ...item, status: 'present' })));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Taking"
        description="Load the real school structure, mark statuses quickly, and submit the session record."
      />

      <Card title="Session Setup" description="Choose class and session context before marking attendance.">
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Class or Level" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Select class or level</option>
            {groups.map((group: AcademicGroup) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.code})
              </option>
            ))}
          </Select>
          <Select label="Session Type" value={sessionType} onChange={(event) => setSessionType(event.target.value)}>
            <option>Morning</option>
            <option>Midday</option>
            <option>Prep</option>
          </Select>
          <div className="flex items-end">
            <Button variant="secondary" onClick={markAllPresent}>
              Mark All Present
            </Button>
          </div>
        </div>
        {!groups.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No classes or levels are available yet. Set up the academic structure first from{' '}
            <Link className="font-semibold text-brand-navy underline" to="/academics/structure">
              Academic Setup
            </Link>
            .
          </div>
        ) : null}
      </Card>

      <Card title="Student List" description="Toggle each student to the appropriate attendance status.">
        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-brand-navy">{row.student}</p>
                <p className="text-sm text-slate-500">
                  {selectedGroup?.name || 'Unassigned group'} · {sessionType} session
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={row.status === status ? 'primary' : 'secondary'}
                    onClick={() =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id ? { ...item, status } : item
                        )
                      )
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button>Submit Attendance</Button>
    </div>
  );
};

export default AttendanceTakingPage;
