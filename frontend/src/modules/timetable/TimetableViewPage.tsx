import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';

interface TimetableEntry {
  day: string;
  period: string;
  subject: string;
  teacher: string;
  room: string;
}

const colorMap: Record<string, string> = {
  Mathematics: 'bg-blue-50 border-blue-200',
  English: 'bg-amber-50 border-amber-200',
  Physics: 'bg-emerald-50 border-emerald-200',
  ICT: 'bg-violet-50 border-violet-200',
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periods = ['8:00', '9:00', '10:00', '11:00', '12:00'];

const TimetableViewPage = () => {
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const { data, isLoading } = useQuery({
    queryKey: ['timetable-grid'],
    queryFn: eduovaApi.timetable.grid,
  });

  const entries = useMemo(() => (data || []) as TimetableEntry[], [data]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable View"
        description="Review the weekly timetable in class or teacher mode with a print-friendly grid."
        actions={
          <div className="flex gap-3">
            <Button variant={viewMode === 'class' ? 'primary' : 'secondary'} onClick={() => setViewMode('class')}>
              Class View
            </Button>
            <Button variant={viewMode === 'teacher' ? 'primary' : 'secondary'} onClick={() => setViewMode('teacher')}>
              Teacher View
            </Button>
          </div>
        }
      />

      <Card title="Weekly Grid" description={`Currently showing ${viewMode} timetable mode.`}>
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-[120px_repeat(5,minmax(0,1fr))] gap-3">
            <div />
            {days.map((day) => (
              <div key={day} className="rounded-2xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white">
                {day}
              </div>
            ))}
            {periods.map((period) => (
              <>
                <div
                  key={`${period}-label`}
                  className="rounded-2xl bg-slate-100 px-4 py-4 text-sm font-semibold text-slate-600"
                >
                  {period}
                </div>
                {days.map((day) => {
                  const item = entries.find((entry) => entry.day === day && entry.period === period);
                  return (
                    <div
                      key={`${day}-${period}`}
                      className={`min-h-[110px] rounded-2xl border p-4 ${
                        item ? colorMap[item.subject] || 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      {item ? (
                        <>
                          <p className="font-semibold text-brand-navy">{item.subject}</p>
                          <p className="mt-2 text-sm text-slate-600">{item.teacher}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                            {item.room}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">Free</p>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TimetableViewPage;
