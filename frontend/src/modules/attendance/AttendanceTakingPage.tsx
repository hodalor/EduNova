import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';

interface AttendanceRow {
  id: string;
  student: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

const statuses: Array<AttendanceRow['status']> = ['present', 'absent', 'late', 'excused'];

const AttendanceTakingPage = () => {
  const [sessionType, setSessionType] = useState('Morning');
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-taking'],
    queryFn: eduovaApi.attendance.taking,
  });

  const [rows, setRows] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    if (data && rows.length === 0) {
      setRows(data as AttendanceRow[]);
    }
  }, [data, rows.length]);

  if (isLoading) {
    return <PageLoader />;
  }

  const markAllPresent = () =>
    setRows((current) => current.map((item) => ({ ...item, status: 'present' })));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Taking"
        description="Load the class roster, mark statuses quickly, and submit the session record."
      />

      <Card title="Session Setup" description="Choose class and session context before marking attendance.">
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Class">
            <option>SH 2 Science</option>
            <option>PR 5 Gold</option>
            <option>JH 2 Blue</option>
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
                <p className="text-sm text-slate-500">{sessionType} session</p>
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
