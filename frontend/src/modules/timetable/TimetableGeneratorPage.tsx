import { useEffect, useState } from 'react';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { getInstitutionLevels } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import type { EducationLevelCode } from '../../types/auth';
import PageHeader from '../shared/PageHeader';

interface SubjectConfig {
  id: string;
  subject: string;
  teacher: string;
  periods: number;
  room: string;
}

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
  credit_hours?: number | null;
}

interface AcademicStructureResponse {
  groups: AcademicGroup[];
  offerings: AcademicOffering[];
}

const SortableItem = ({ item }: { item: SubjectConfig }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <p className="font-semibold text-brand-navy">{item.subject}</p>
      <p className="mt-1 text-sm text-slate-500">
        {item.teacher} · {item.periods} periods · {item.room}
      </p>
    </div>
  );
};

const TimetableGeneratorPage = () => {
  const [step, setStep] = useState(1);
  const [generated, setGenerated] = useState(false);
  const [groupId, setGroupId] = useState('');
  const sensors = useSensors(useSensor(PointerSensor));
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const allowedLevels = getInstitutionLevels(activeInstitution);
  const { data, isLoading } = useQuery<AcademicStructureResponse>({
    queryKey: ['academic-structure', 'timetable-generator', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const groups = ((data?.groups || []) as AcademicGroup[]).filter(
    (group) => !allowedLevels.length || allowedLevels.includes(group.level_code as EducationLevelCode)
  );

  useEffect(() => {
    if (!groupId && groups[0]?.id) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextSubjects = ((data.offerings || []) as AcademicOffering[])
      .filter((item: AcademicOffering) => !groupId || item.group_id === groupId)
      .map((item: AcademicOffering) => ({
        id: item.id,
        subject: item.name,
        teacher: item.code,
        periods: Number(item.credit_hours || 2),
        room: 'Room pending',
      }));

    setSubjects(nextSubjects);
  }, [data, groupId]);

  const conflicts = generated
    ? subjects.filter((item: SubjectConfig) => item.periods > 4).map((item: SubjectConfig) => `${item.subject} exceeds ideal load.`)
    : [];

  const generatedRows = generated
    ? subjects.map((item, index) => ({
        slot: `Period ${index + 1}`,
        subject: item.subject,
        teacher: item.teacher,
        room: item.room,
      }))
    : [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable Generator"
        description="Use the actual school structure to prepare a timetable draft and reorder teaching load."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              step >= item ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            Step {item}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <Card title="Step 1: Context" description="Select class and term for timetable generation.">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Class or Level" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">Select class or level</option>
              {groups.map((group: AcademicGroup) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </option>
              ))}
            </Select>
            <Select label="Term">
              <option>Term 2</option>
              <option>Term 3</option>
            </Select>
            <div className="flex items-end">
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title="Step 2: Subject Configuration" description="Review assigned teachers and periods per week.">
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const { active, over } = event;
                if (!over || active.id === over.id) {
                  return;
                }
                const oldIndex = subjects.findIndex((item) => item.id === active.id);
                const newIndex = subjects.findIndex((item) => item.id === over.id);
                setSubjects((current) => arrayMove(current, oldIndex, newIndex));
              }}
            >
              <SortableContext items={subjects.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {subjects.map((item) => (
                    <SortableItem key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {!subjects.length ? (
              <Alert
                title="No offerings available"
                message="Create subjects or courses under Academic Setup before generating the timetable."
                variant="info"
              />
            ) : null}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <Card title="Step 3: Generate Timetable" description="Generate a draft schedule and highlight any conflicts.">
            <div className="flex gap-3">
              <Button onClick={() => setGenerated(true)}>Generate Timetable</Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="secondary">Publish</Button>
            </div>
          </Card>

          {conflicts.length ? (
            <Alert
              title="Conflicts detected"
              message={conflicts.join(' ')}
              variant="warning"
            />
          ) : null}

          {generated ? (
            <Card title="Generated Result" description="Review the generated slots and publish when satisfied.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {generatedRows.map((item) => (
                  <div key={item.slot} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.slot}</p>
                    <p className="mt-2 font-semibold text-brand-navy">{item.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.teacher}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.room}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default TimetableGeneratorPage;
