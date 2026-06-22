import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { getInstitutionLevels } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import type { EducationLevelCode, InstitutionSummary, UserRole } from '../../types/auth';
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

type StructureTab = 'groups' | 'periods' | 'offerings';

const educationLevelLabels: Record<EducationLevelCode, string> = {
  DC: 'Daycare',
  PR: 'Primary',
  JH: 'Junior High',
  SH: 'Senior High',
  TR: 'Tertiary',
};

const calendarLabels = {
  term: 'Term',
  semester: 'Semester',
  trimester: 'Trimester',
  block: 'Block',
};

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }

    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
};

const getDefaultCalendarForLevel = (levelCode: string) => (levelCode === 'TR' ? 'semester' : 'term');

const getGroupLabel = (institution: InstitutionSummary | null, role: UserRole | null) => {
  const levels = getInstitutionLevels(institution);
  if (role === 'super_admin' && !institution) {
    return 'Class or Level';
  }
  if (levels.length === 1 && levels[0] === 'TR') {
    return 'Level';
  }
  if (levels.length > 0 && !levels.includes('TR')) {
    return 'Class';
  }
  return 'Class or Level';
};

const getPeriodLabel = (institution: InstitutionSummary | null) => {
  const levels = getInstitutionLevels(institution);
  if (levels.length === 1 && levels[0] === 'TR') {
    return 'Semester';
  }
  if (levels.length > 0 && !levels.includes('TR')) {
    return 'Term';
  }
  return 'Term or Semester';
};

const getOfferingLabel = (institution: InstitutionSummary | null) => {
  const levels = getInstitutionLevels(institution);
  if (levels.length === 1 && levels[0] === 'TR') {
    return 'Course';
  }
  if (levels.length > 0 && !levels.includes('TR')) {
    return 'Subject';
  }
  return 'Subject or Course';
};

const initialGroupForm = {
  name: '',
  code: '',
  group_type: 'class' as 'class' | 'level',
  level_code: 'PR',
  calendar_type: 'term' as 'term' | 'semester' | 'trimester' | 'block',
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
  const role = useAuthStore((state) => state.role);
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StructureTab>('groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [offeringModalOpen, setOfferingModalOpen] = useState(false);
  const { data, isLoading } = useQuery<StructureResponse>({
    queryKey: ['academic-structure', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });

  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [periodForm, setPeriodForm] = useState(initialPeriodForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);

  const allowedLevels = getInstitutionLevels(activeInstitution);
  const groupLabel = getGroupLabel(activeInstitution, role);
  const periodLabel = getPeriodLabel(activeInstitution);
  const offeringLabel = getOfferingLabel(activeInstitution);
  const levelOptions = allowedLevels.map((code) => ({ code, label: educationLevelLabels[code] }));
  const showCourseOption = allowedLevels.includes('TR');
  const groups: AcademicGroup[] = (data?.groups || []).filter(
    (group: AcademicGroup) =>
      !allowedLevels.length || allowedLevels.includes(group.level_code as EducationLevelCode)
  );
  const periods: AcademicPeriod[] = useMemo(() => data?.periods || [], [data?.periods]);
  const offerings: AcademicOffering[] = useMemo(() => data?.offerings || [], [data?.offerings]);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;

  const selectedGroupPeriods: AcademicPeriod[] = useMemo(() => {
    const currentGroupId = offeringForm.group_id || selectedGroupId;
    return periods
      .filter((item) => item.group_id === currentGroupId)
      .sort((a, b) => a.sequence - b.sequence);
  }, [offeringForm.group_id, periods, selectedGroupId]);

  const selectedGroupOfferings = useMemo(
    () => offerings.filter((item) => item.group_id === selectedGroupId),
    [offerings, selectedGroupId]
  );

  const updateStructureCache = (section: 'groups' | 'periods' | 'offerings', entry: unknown) => {
    queryClient.setQueryData<StructureResponse | undefined>(
      ['academic-structure', activeInstitutionId],
      (current: StructureResponse | undefined) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [section]: [...current[section], entry],
        };
      }
    );
  };

  useEffect(() => {
    if (!levelOptions.length) {
      return;
    }

    setGroupForm((current) => {
      const nextLevelCode = levelOptions.some((item) => item.code === current.level_code)
        ? current.level_code
        : levelOptions[0].code;

      return {
        ...current,
        group_type:
          allowedLevels.length === 1 && allowedLevels[0] === 'TR'
            ? 'level'
            : current.group_type,
        level_code: nextLevelCode,
        calendar_type: current.calendar_type || getDefaultCalendarForLevel(nextLevelCode),
      };
    });
  }, [allowedLevels, levelOptions]);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId('');
      return;
    }

    if (!selectedGroupId || !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setPeriodForm((current) => ({ ...current, group_id: '' }));
      setOfferingForm((current) => ({ ...current, group_id: '', period_id: '' }));
      return;
    }

    setPeriodForm((current) => ({ ...current, group_id: current.group_id || selectedGroupId }));
    setOfferingForm((current) => ({ ...current, group_id: current.group_id || selectedGroupId }));
  }, [selectedGroupId]);

  const createGroup = useMutation({
    mutationFn: eduovaApi.academics.createGroup,
    onSuccess: (result) => {
      const createdGroup = result as AcademicGroup;
      updateStructureCache('groups', createdGroup);
      setSelectedGroupId(createdGroup.id);
      setGroupModalOpen(false);
      setGroupForm({
        ...initialGroupForm,
        group_type: allowedLevels.length === 1 && allowedLevels[0] === 'TR' ? 'level' : initialGroupForm.group_type,
        level_code: createdGroup.level_code,
        calendar_type: getDefaultCalendarForLevel(createdGroup.level_code),
      });
      toast.success(`${groupLabel} created.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to create ${groupLabel.toLowerCase()}.`));
    },
  });

  const createPeriod = useMutation({
    mutationFn: eduovaApi.academics.createPeriod,
    onSuccess: (result) => {
      const createdPeriod = result as AcademicPeriod;
      updateStructureCache('periods', createdPeriod);
      setSelectedGroupId(createdPeriod.group_id);
      setPeriodModalOpen(false);
      setPeriodForm({
        ...initialPeriodForm,
        group_id: createdPeriod.group_id,
        calendar_type: createdPeriod.calendar_type,
      });
      toast.success(`${periodLabel} created.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to create ${periodLabel.toLowerCase()}.`));
    },
  });

  const createOffering = useMutation({
    mutationFn: eduovaApi.academics.createOffering,
    onSuccess: (result) => {
      const createdOffering = result as AcademicOffering;
      updateStructureCache('offerings', createdOffering);
      setSelectedGroupId(createdOffering.group_id);
      setOfferingModalOpen(false);
      setOfferingForm({
        ...initialOfferingForm,
        group_id: createdOffering.group_id,
        period_id: createdOffering.period_id,
        type: createdOffering.type,
      });
      toast.success(`${offeringLabel} created.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to create ${offeringLabel.toLowerCase()}.`));
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (role === 'super_admin' && !tenantContext) {
    return (
      <Card title="Select A School Scope">
        <p className="text-sm text-slate-600">
          Choose a school from the institutions page before creating classes, terms, subjects, or courses.
        </p>
      </Card>
    );
  }

  const openCreateModal = (tab: StructureTab) => {
    setActiveTab(tab);

    if (tab === 'groups') {
      setGroupModalOpen(true);
      return;
    }

    if (tab === 'periods') {
      if (selectedGroupId) {
        setPeriodForm((current) => ({
          ...current,
          group_id: selectedGroupId,
          calendar_type: selectedGroup?.calendar_type || current.calendar_type,
        }));
      }
      setPeriodModalOpen(true);
      return;
    }

    if (selectedGroupId) {
      setOfferingForm((current) => ({
        ...current,
        group_id: selectedGroupId,
        period_id:
          current.period_id ||
          periods.find((period) => period.group_id === selectedGroupId)?.id ||
          '',
      }));
    }
    setOfferingModalOpen(true);
  };

  const tabMeta: Array<{ id: StructureTab; label: string; count: number }> = [
    { id: 'groups', label: `${groupLabel}s`, count: groups.length },
    {
      id: 'periods',
      label: `${periodLabel}${periodLabel === 'Term or Semester' ? 's' : 's'}`,
      count: selectedGroupId ? periods.filter((period) => period.group_id === selectedGroupId).length : periods.length,
    },
    {
      id: 'offerings',
      label: `${offeringLabel}${offeringLabel === 'Subject or Course' ? 's' : 's'}`,
      count: selectedGroupId
        ? offerings.filter((offering) => offering.group_id === selectedGroupId).length
        : offerings.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        description="Manage the school structure in one place."
        actions={
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => openCreateModal(activeTab)}>
            Add {activeTab === 'groups' ? groupLabel : activeTab === 'periods' ? periodLabel : offeringLabel}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap gap-2">
            {tabMeta.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-brand-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <Button
            leftIcon={<PlusCircle className="h-4 w-4" />}
            onClick={() => openCreateModal(activeTab)}
            disabled={(activeTab === 'periods' || activeTab === 'offerings') && !selectedGroupId}
          >
            Add {activeTab === 'groups' ? groupLabel : activeTab === 'periods' ? periodLabel : offeringLabel}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-x-auto">
            {activeTab === 'groups' ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Name', 'Type', 'Education Level', 'Calendar', 'Periods', 'Offerings'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        selectedGroupId === group.id ? 'bg-brand-navy/5' : ''
                      }`}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-brand-navy">{group.name}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">{group.code}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{group.group_type}</td>
                      <td className="px-4 py-3">{educationLevelLabels[group.level_code as EducationLevelCode] || group.level_code}</td>
                      <td className="px-4 py-3 capitalize">{calendarLabels[group.calendar_type] || group.calendar_type}</td>
                      <td className="px-4 py-3">{periods.filter((period) => period.group_id === group.id).length}</td>
                      <td className="px-4 py-3">{offerings.filter((offering) => offering.group_id === group.id).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {activeTab === 'periods' ? (
              selectedGroup ? (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Name', 'Sequence', 'Calendar', 'Status', 'Registration'].map((label) => (
                        <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedGroupPeriods.map((period) => (
                      <tr key={period.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-brand-navy">{period.name}</td>
                        <td className="px-4 py-3">#{period.sequence}</td>
                        <td className="px-4 py-3 capitalize">{calendarLabels[period.calendar_type as keyof typeof calendarLabels] || period.calendar_type}</td>
                        <td className="px-4 py-3 capitalize">{period.status}</td>
                        <td className="px-4 py-3">{period.registration_open ? 'Open' : 'Closed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Select a {groupLabel.toLowerCase()} first.
                </p>
              )
            ) : null}

            {activeTab === 'offerings' ? (
              selectedGroup ? (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Code', 'Name', 'Type', periodLabel, 'Credits', 'Status'].map((label) => (
                        <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedGroupOfferings.map((offering) => {
                      const offeringPeriod = periods.find((period) => period.id === offering.period_id);
                      return (
                        <tr key={offering.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-brand-navy">{offering.code}</td>
                          <td className="px-4 py-3">{offering.name}</td>
                          <td className="px-4 py-3 capitalize">{offering.type}</td>
                          <td className="px-4 py-3">{offeringPeriod?.name || '-'}</td>
                          <td className="px-4 py-3">{offering.credit_hours ?? '-'}</td>
                          <td className="px-4 py-3">{offering.is_core ? 'Core' : 'Elective'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Select a {groupLabel.toLowerCase()} first.
                </p>
              )
            ) : null}
          </div>

          <Card title={selectedGroup ? selectedGroup.name : `Select A ${groupLabel}`}>
            {selectedGroup ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">{selectedGroup.name}</p>
                    <p className="text-sm text-slate-500">
                      {selectedGroup.group_type} ·{' '}
                      {educationLevelLabels[selectedGroup.level_code as EducationLevelCode] || selectedGroup.level_code}
                    </p>
                  </div>
                  <Badge variant="info">{selectedGroup.code}</Badge>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {periodLabel}s
                  </p>
                  <div className="mt-3 space-y-3">
                    {selectedGroupPeriods.length ? (
                      selectedGroupPeriods.map((period) => (
                        <div key={period.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-brand-navy">
                              {period.name} <span className="text-slate-400">#{period.sequence}</span>
                            </p>
                            <div className="flex gap-2">
                              <Badge variant={period.registration_open ? 'success' : 'inactive'}>
                                {period.registration_open ? 'open' : 'closed'}
                              </Badge>
                              <Badge variant={period.status === 'active' ? 'info' : 'pending'}>{period.status}</Badge>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {selectedGroupOfferings
                              .filter((offering) => offering.period_id === period.id)
                              .map((offering) => (
                                <div key={offering.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                                  <div>
                                    <p className="font-medium text-brand-navy">
                                      {offering.code} · {offering.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {offering.type}
                                      {offering.credit_hours ? ` · ${offering.credit_hours} credits` : ''}
                                    </p>
                                  </div>
                                  <Badge variant={offering.is_core ? 'success' : 'info'}>
                                    {offering.is_core ? 'core' : 'elective'}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No {periodLabel.toLowerCase()} added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Click a {groupLabel.toLowerCase()} row to see the linked {periodLabel.toLowerCase()}s and {offeringLabel.toLowerCase()}s.
              </p>
            )}
          </Card>
        </div>
      </Card>

      <Modal
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        title={`Add ${groupLabel}`}
        description="Save the learner group before attaching terms or subjects."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createGroup.mutate(groupForm);
          }}
        >
          <Input
            label={`${groupLabel} Name`}
            value={groupForm.name}
            onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label={`${groupLabel} Code`}
            value={groupForm.code}
            onChange={(event) => setGroupForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
          />
          <Select
            label="Type"
            value={groupForm.group_type}
            onChange={(event) =>
              setGroupForm((current) => ({ ...current, group_type: event.target.value as 'class' | 'level' }))
            }
            disabled={allowedLevels.length === 1 && allowedLevels[0] === 'TR'}
          >
            <option value="class">Class</option>
            <option value="level">Level</option>
          </Select>
          <Select
            label="Education Level"
            value={groupForm.level_code}
            onChange={(event) =>
              setGroupForm((current) => ({
                ...current,
                level_code: event.target.value,
                calendar_type: getDefaultCalendarForLevel(event.target.value),
              }))
            }
          >
            {levelOptions.map((level) => (
              <option key={level.code} value={level.code}>
                {level.label}
              </option>
            ))}
          </Select>
          <Select
            label="Calendar"
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
            <option value="block">Block</option>
          </Select>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createGroup.isPending}>
              Save {groupLabel}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={periodModalOpen}
        onOpenChange={setPeriodModalOpen}
        title={`Add ${periodLabel}`}
        description={`Attach a ${periodLabel.toLowerCase()} to the selected ${groupLabel.toLowerCase()}.`}
      >
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
            label={groupLabel}
            value={periodForm.group_id}
            onChange={(event) => {
              const nextGroup = groups.find((group) => group.id === event.target.value);
              setPeriodForm((current) => ({
                ...current,
                group_id: event.target.value,
                calendar_type: nextGroup?.calendar_type || current.calendar_type,
              }));
            }}
          >
            <option value="">Select {groupLabel.toLowerCase()}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
          <Input
            label={`${periodLabel} Name`}
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
            label="Calendar"
            value={periodForm.calendar_type}
            onChange={(event) => setPeriodForm((current) => ({ ...current, calendar_type: event.target.value }))}
          >
            <option value="term">Term</option>
            <option value="semester">Semester</option>
            <option value="trimester">Trimester</option>
            <option value="block">Block</option>
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
            label="Registration"
            value={periodForm.registration_open}
            onChange={(event) => setPeriodForm((current) => ({ ...current, registration_open: event.target.value }))}
          >
            <option value="false">Closed</option>
            <option value="true">Open</option>
          </Select>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setPeriodModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createPeriod.isPending}>
              Save {periodLabel}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={offeringModalOpen}
        onOpenChange={setOfferingModalOpen}
        title={`Add ${offeringLabel}`}
        description={`Attach a ${offeringLabel.toLowerCase()} to the right ${periodLabel.toLowerCase()}.`}
      >
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
            label={groupLabel}
            value={offeringForm.group_id}
            onChange={(event) =>
              setOfferingForm((current) => ({ ...current, group_id: event.target.value, period_id: '' }))
            }
          >
            <option value="">Select {groupLabel.toLowerCase()}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
          <Select
            label={periodLabel}
            value={offeringForm.period_id}
            onChange={(event) => setOfferingForm((current) => ({ ...current, period_id: event.target.value }))}
          >
            <option value="">Select {periodLabel.toLowerCase()}</option>
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
            {showCourseOption ? <option value="course">Course</option> : null}
          </Select>
          <Input
            label={`${offeringLabel} Code`}
            value={offeringForm.code}
            onChange={(event) => setOfferingForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
          />
          <Input
            label={`${offeringLabel} Name`}
            value={offeringForm.name}
            onChange={(event) => setOfferingForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Credit Hours"
            type="number"
            value={offeringForm.credit_hours}
            onChange={(event) => setOfferingForm((current) => ({ ...current, credit_hours: event.target.value }))}
          />
          <Input
            label="Prerequisites"
            value={offeringForm.prerequisite_codes}
            onChange={(event) =>
              setOfferingForm((current) => ({ ...current, prerequisite_codes: event.target.value }))
            }
          />
          <Input
            label="Next Items"
            value={offeringForm.next_offering_codes}
            onChange={(event) =>
              setOfferingForm((current) => ({ ...current, next_offering_codes: event.target.value }))
            }
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOfferingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createOffering.isPending}>
              Save {offeringLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicStructurePage;
