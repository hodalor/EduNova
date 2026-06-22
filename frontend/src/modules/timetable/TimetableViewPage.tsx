import { useEffect, useMemo, useState } from 'react';
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

interface AcademicGroup {
  id: string;
  name: string;
  code: string;
  level_code: string;
}

interface AcademicOffering {
  id: string;
  group_id: string;
  code: string;
  name: string;
}

interface AcademicStructureResponse {
  groups: AcademicGroup[];
  offerings: AcademicOffering[];
}

const TimetableViewPage = () => {
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [groupId, setGroupId] = useState('');
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const allowedLevels = getInstitutionLevels(activeInstitution);
  const { data, isLoading } = useQuery({
    queryKey: ['timetable-grid'],
    queryFn: eduovaApi.timetable.grid,
  });
  const { data: structure, isLoading: structureLoading } = useQuery<AcademicStructureResponse>({
    queryKey: ['academic-structure', 'timetable-view', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });

  const groups = ((structure?.groups || []) as AcademicGroup[]).filter(
    (group) => !allowedLevels.length || allowedLevels.includes(group.level_code as EducationLevelCode)
  );
  const selectedGroup = groups.find((group: AcademicGroup) => group.id === groupId) || null;
  const actualEntries = useMemo(() => (data || []) as TimetableEntry[], [data]);
  const structureEntries = useMemo(() => {
    const offerings = ((structure?.offerings || []) as AcademicOffering[]).filter(
      (offering) => !groupId || offering.group_id === groupId
    );

    return offerings.slice(0, days.length * periods.length).map((offering, index) => ({
      day: days[index % days.length],
      period: periods[Math.floor(index / days.length)] || periods[0],
      subject: offering.name,
      teacher: viewMode === 'teacher' ? offering.code : 'Teacher assignment pending',
      room: selectedGroup?.code || 'Room pending',
    }));
  }, [groupId, selectedGroup?.code, structure?.offerings, viewMode]);
  const entries = structureEntries.length ? structureEntries : actualEntries;

  useEffect(() => {
    if (!groupId && groups[0]?.id) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  if (isLoading || structureLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable View"
        description="Review the weekly timetable using the current school structure."
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

      <Card title="Scope" description="Choose the class or level you want to review.">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Select label="Class or Level" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Select class or level</option>
            {groups.map((group: AcademicGroup) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.code})
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Link
              to="/academics/structure"
              className="inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Academic Setup
            </Link>
          </div>
        </div>
      </Card>

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
                  const item = entries.find((entry: TimetableEntry) => entry.day === day && entry.period === period);
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
