import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookCopy, CalendarRange, GraduationCap, Layers3 } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';

interface AcademicGroup {
  id: string;
  name: string;
  code: string;
  group_type: 'class' | 'level';
  level_code: string;
  calendar_type: 'term' | 'semester' | 'trimester' | 'block';
}

interface AcademicPeriod {
  id: string;
  group_id: string;
  name: string;
  sequence: number;
  calendar_type: string;
  status: string;
  registration_open: boolean;
}

interface AcademicOffering {
  id: string;
  group_id: string;
  period_id: string;
  type: 'subject' | 'course';
  code: string;
  name: string;
  credit_hours: number | null;
  is_core: boolean;
  prerequisite_codes: string[];
  next_offering_codes: string[];
}

interface StructureResponse {
  groups: AcademicGroup[];
  periods: AcademicPeriod[];
  offerings: AcademicOffering[];
  progression_rules: string[];
}

const initialGroupForm = {
  name: '',
  code: '',
  group_type: 'level',
  level_code: 'TR',
  calendar_type: 'semester',
};

const initialPeriodForm = {
  group_id: '',
  name: '',
  sequence: '1',
  calendar_type: 'semester',
  status: 'planned',
  registration_open: 'false',
};

const initialOfferingForm = {
  group_id: '',
  period_id: '',
  type: 'course',
  code: '',
  name: '',
  credit_hours: '3',
  prerequisite_codes: '',
  next_offering_codes: '',
};

const AcademicStructurePage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<StructureResponse>({
    queryKey: ['academic-structure'],
    queryFn: eduovaApi.academics.structure,
  });

  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [periodForm, setPeriodForm] = useState(initialPeriodForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);

  const groups: AcademicGroup[] = data?.groups || [];
  const periods: AcademicPeriod[] = data?.periods || [];
  const offerings: AcademicOffering[] = data?.offerings || [];

  const selectedGroupPeriods = useMemo(
    () => periods.filter((item) => item.group_id === offeringForm.group_id),
    [offeringForm.group_id, periods]
  );

  const updateStructureCache = (section: 'groups' | 'periods' | 'offerings', entry: unknown) => {
    queryClient.setQueryData<StructureResponse | undefined>(['academic-structure'], (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [section]: [...current[section], entry],
      };
    });
  };

  const createGroup = useMutation({
    mutationFn: eduovaApi.academics.createGroup,
    onSuccess: (result) => {
      updateStructureCache('groups', result);
      toast.success('Level or class created.');
      setGroupForm(initialGroupForm);
    },
    onError: () => toast.error('Unable to create level or class.'),
  });

  const createPeriod = useMutation({
    mutationFn: eduovaApi.academics.createPeriod,
    onSuccess: (result) => {
      updateStructureCache('periods', result);
      toast.success('Academic period created.');
      setPeriodForm(initialPeriodForm);
    },
    onError: () => toast.error('Unable to create academic period.'),
  });

  const createOffering = useMutation({
    mutationFn: eduovaApi.academics.createOffering,
    onSuccess: (result) => {
      updateStructureCache('offerings', result);
      toast.success('Subject or course created.');
      setOfferingForm(initialOfferingForm);
    },
    onError: () => toast.error('Unable to create subject or course.'),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        description="Create classes or levels, define terms or semesters, and attach subjects or courses so the system knows exactly what belongs to each learner stage."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Classes and Levels',
            value: `${groups.length}`,
            helper: 'Mix K-12 classes and tertiary levels in one structure.',
            icon: Layers3,
          },
          {
            label: 'Terms and Semesters',
            value: `${periods.length}`,
            helper: 'Supports term, semester, trimester, and block calendars.',
            icon: CalendarRange,
          },
          {
            label: 'Subjects and Courses',
            value: `${offerings.length}`,
            helper: 'Attach offerings to the exact class or level period.',
            icon: BookCopy,
          },
          {
            label: 'Tertiary Levels',
            value: `${groups.filter((item) => item.level_code === 'TR').length}`,
            helper: 'Level-based registration for colleges and universities.',
            icon: GraduationCap,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold text-brand-navy">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                </div>
                <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Alert
        title="Flexible structure model"
        message="Use classes with terms for daycare, primary, JHS, and SHS. Use levels with semesters or trimesters for tertiary schools. Every subject or course is attached to the exact academic period."
        variant="info"
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Create Class or Level" description="Define the learner group first.">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createGroup.mutate(groupForm);
            }}
          >
            <Input
              label="Name"
              value={groupForm.name}
              onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Code"
              value={groupForm.code}
              onChange={(event) => setGroupForm((current) => ({ ...current, code: event.target.value }))}
            />
            <Select
              label="Type"
              value={groupForm.group_type}
              onChange={(event) =>
                setGroupForm((current) => ({ ...current, group_type: event.target.value as 'class' | 'level' }))
              }
            >
              <option value="class">Class</option>
              <option value="level">Level</option>
            </Select>
            <Select
              label="Education Level"
              value={groupForm.level_code}
              onChange={(event) => setGroupForm((current) => ({ ...current, level_code: event.target.value }))}
            >
              <option value="DC">Daycare</option>
              <option value="PR">Primary</option>
              <option value="JH">Junior High</option>
              <option value="SH">Senior High</option>
              <option value="TR">Tertiary</option>
            </Select>
            <Select
              label="Calendar Type"
              value={groupForm.calendar_type}
              onChange={(event) =>
                setGroupForm((current) => ({
                  ...current,
                  calendar_type: event.target.value as 'term' | 'semester' | 'trimester' | 'block',
                }))
              }
            >
              <option value="term">Term</option>
              <option value="semester">Semester</option>
              <option value="trimester">Trimester</option>
              <option value="block">Short Course Block</option>
            </Select>
            <Button type="submit" loading={createGroup.isPending}>
              Save Class or Level
            </Button>
          </form>
        </Card>

        <Card title="Create Term or Semester" description="Attach a period to a class or level.">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createPeriod.mutate({
                ...periodForm,
                sequence: Number(periodForm.sequence),
                registration_open: periodForm.registration_open === 'true',
              });
            }}
          >
            <Select
              label="Class or Level"
              value={periodForm.group_id}
              onChange={(event) => setPeriodForm((current) => ({ ...current, group_id: event.target.value }))}
            >
              <option value="">Select group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Input
              label="Period Name"
              value={periodForm.name}
              onChange={(event) => setPeriodForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Sequence"
              type="number"
              value={periodForm.sequence}
              onChange={(event) => setPeriodForm((current) => ({ ...current, sequence: event.target.value }))}
            />
            <Select
              label="Calendar Type"
              value={periodForm.calendar_type}
              onChange={(event) => setPeriodForm((current) => ({ ...current, calendar_type: event.target.value }))}
            >
              <option value="term">Term</option>
              <option value="semester">Semester</option>
              <option value="trimester">Trimester</option>
              <option value="block">Short Course Block</option>
            </Select>
            <Select
              label="Status"
              value={periodForm.status}
              onChange={(event) => setPeriodForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
            <Select
              label="Registration Open"
              value={periodForm.registration_open}
              onChange={(event) => setPeriodForm((current) => ({ ...current, registration_open: event.target.value }))}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
            <Button type="submit" loading={createPeriod.isPending}>
              Save Term or Semester
            </Button>
          </form>
        </Card>

        <Card title="Create Subject or Course" description="Assign offerings to the exact period students belong to.">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createOffering.mutate({
                ...offeringForm,
                credit_hours: offeringForm.credit_hours ? Number(offeringForm.credit_hours) : null,
                prerequisite_codes: offeringForm.prerequisite_codes
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
                next_offering_codes: offeringForm.next_offering_codes
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              });
            }}
          >
            <Select
              label="Class or Level"
              value={offeringForm.group_id}
              onChange={(event) =>
                setOfferingForm((current) => ({ ...current, group_id: event.target.value, period_id: '' }))
              }
            >
              <option value="">Select group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Select
              label="Term or Semester"
              value={offeringForm.period_id}
              onChange={(event) => setOfferingForm((current) => ({ ...current, period_id: event.target.value }))}
            >
              <option value="">Select period</option>
              {selectedGroupPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </Select>
            <Select
              label="Type"
              value={offeringForm.type}
              onChange={(event) =>
                setOfferingForm((current) => ({ ...current, type: event.target.value as 'subject' | 'course' }))
              }
            >
              <option value="subject">Subject</option>
              <option value="course">Course</option>
            </Select>
            <Input
              label="Code"
              value={offeringForm.code}
              onChange={(event) => setOfferingForm((current) => ({ ...current, code: event.target.value }))}
            />
            <Input
              label="Name"
              value={offeringForm.name}
              onChange={(event) => setOfferingForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Credit Hours"
              type="number"
              value={offeringForm.credit_hours}
              onChange={(event) => setOfferingForm((current) => ({ ...current, credit_hours: event.target.value }))}
              helperText="Leave as 0 or blank for class subjects without credit hours."
            />
            <Input
              label="Prerequisites"
              value={offeringForm.prerequisite_codes}
              onChange={(event) =>
                setOfferingForm((current) => ({ ...current, prerequisite_codes: event.target.value }))
              }
              helperText="Separate prerequisite course codes with commas."
            />
            <Input
              label="Next Courses"
              value={offeringForm.next_offering_codes}
              onChange={(event) =>
                setOfferingForm((current) => ({ ...current, next_offering_codes: event.target.value }))
              }
              helperText="Optional progression preview codes."
            />
            <Button type="submit" loading={createOffering.isPending}>
              Save Subject or Course
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Configured Classes and Levels" description="Every learner group and its calendar model.">
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">
                      {group.name} <span className="text-slate-400">({group.code})</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {group.group_type} · {group.level_code} · {group.calendar_type}
                    </p>
                  </div>
                  <Badge variant={group.group_type === 'level' ? 'info' : 'success'}>{group.group_type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Progression Logic" description="How the system decides what students can take next.">
          <div className="space-y-3">
            {(data?.progression_rules || []).map((rule) => (
              <Alert key={rule} title={rule} variant="success" />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Terms, Semesters, Subjects, and Courses" description="Offerings are visible only under the groups and periods they belong to.">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-brand-navy">{group.name}</p>
                  <p className="text-sm text-slate-500">
                    {group.group_type} · {group.calendar_type}
                  </p>
                </div>
                <Badge variant="info">{group.code}</Badge>
              </div>

              <div className="mt-4 space-y-4">
                {periods
                  .filter((period) => period.group_id === group.id)
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((period) => (
                    <div key={period.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-brand-navy">
                          {period.name} <span className="text-sm font-normal text-slate-500">#{period.sequence}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant={period.registration_open ? 'success' : 'inactive'}>
                            {period.registration_open ? 'registration open' : 'registration closed'}
                          </Badge>
                          <Badge variant={period.status === 'active' ? 'info' : 'pending'}>{period.status}</Badge>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {offerings
                          .filter((offering) => offering.group_id === group.id && offering.period_id === period.id)
                          .map((offering) => (
                            <div key={offering.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-brand-navy">
                                    {offering.code} · {offering.name}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {offering.type}
                                    {offering.credit_hours ? ` · ${offering.credit_hours} credits` : ''}
                                  </p>
                                </div>
                                <Badge variant={offering.is_core ? 'success' : 'info'}>
                                  {offering.is_core ? 'core' : 'elective'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AcademicStructurePage;
