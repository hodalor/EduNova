import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
  start_date?: string | null;
  end_date?: string | null;
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
type DetailState =
  | { type: 'groups'; id: string }
  | { type: 'periods'; id: string }
  | { type: 'offerings'; id: string }
  | null;
type ModalMode = 'create' | 'edit';

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

const pluralizeLabel = (label: string) => {
  if (label === 'Class') {
    return 'Classes';
  }
  if (label === 'Class or Level') {
    return 'Classes or Levels';
  }
  if (label === 'Term or Semester') {
    return 'Terms or Semesters';
  }
  if (label === 'Subject or Course') {
    return 'Subjects or Courses';
  }
  return `${label}s`;
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
  start_date: '',
  end_date: '',
};

const initialOfferingForm = {
  group_id: '',
  period_id: '',
  type: 'course' as 'subject' | 'course',
  code: '',
  name: '',
  credit_hours: '3',
  is_core: 'true',
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
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [detailState, setDetailState] = useState<DetailState>(null);
  const [groupModalMode, setGroupModalMode] = useState<ModalMode>('create');
  const [periodModalMode, setPeriodModalMode] = useState<ModalMode>('create');
  const [offeringModalMode, setOfferingModalMode] = useState<ModalMode>('create');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [offeringModalOpen, setOfferingModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [periodForm, setPeriodForm] = useState(initialPeriodForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);

  const { data, isLoading } = useQuery<StructureResponse>({
    queryKey: ['academic-structure', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });

  const allowedLevels = useMemo(() => getInstitutionLevels(activeInstitution), [activeInstitution]);
  const levelOptions = useMemo(
    () => allowedLevels.map((code) => ({ code, label: educationLevelLabels[code] })),
    [allowedLevels]
  );
  const groupLabel = getGroupLabel(activeInstitution, role);
  const periodLabel = getPeriodLabel(activeInstitution);
  const offeringLabel = getOfferingLabel(activeInstitution);
  const groupListLabel = pluralizeLabel(groupLabel);
  const periodListLabel = pluralizeLabel(periodLabel);
  const offeringListLabel = pluralizeLabel(offeringLabel);
  const showCourseOption = allowedLevels.includes('TR');

  const groups = useMemo(
    () =>
      ((data?.groups || []) as AcademicGroup[]).filter(
        (group) =>
          !allowedLevels.length || allowedLevels.includes(group.level_code as EducationLevelCode)
      ),
    [allowedLevels, data?.groups]
  );
  const visibleGroupIds = useMemo(() => new Set(groups.map((group) => group.id)), [groups]);
  const periods = useMemo(
    () =>
      ((data?.periods || []) as AcademicPeriod[]).filter((period) =>
        visibleGroupIds.has(period.group_id)
      ),
    [data?.periods, visibleGroupIds]
  );
  const offerings = useMemo(
    () =>
      ((data?.offerings || []) as AcademicOffering[]).filter((offering) =>
        visibleGroupIds.has(offering.group_id)
      ),
    [data?.offerings, visibleGroupIds]
  );

  const groupCounts = useMemo(
    () =>
      groups.reduce<Record<string, { periods: number; offerings: number }>>((accumulator, group) => {
        accumulator[group.id] = {
          periods: periods.filter((period) => period.group_id === group.id).length,
          offerings: offerings.filter((offering) => offering.group_id === group.id).length,
        };
        return accumulator;
      }, {}),
    [groups, offerings, periods]
  );

  const filteredPeriods = useMemo(
    () => (selectedGroupId ? periods.filter((period) => period.group_id === selectedGroupId) : periods),
    [periods, selectedGroupId]
  );
  const filteredOfferings = useMemo(
    () =>
      selectedGroupId
        ? offerings.filter((offering) => offering.group_id === selectedGroupId)
        : offerings,
    [offerings, selectedGroupId]
  );

  const detailGroup =
    detailState?.type === 'groups'
      ? groups.find((group) => group.id === detailState.id) || null
      : null;
  const detailPeriod =
    detailState?.type === 'periods'
      ? periods.find((period) => period.id === detailState.id) || null
      : null;
  const detailOffering =
    detailState?.type === 'offerings'
      ? offerings.find((offering) => offering.id === detailState.id) || null
      : null;

  const invalidateStructure = () =>
    queryClient.invalidateQueries({ queryKey: ['academic-structure', activeInstitutionId] });

  const appendStructureCache = (section: 'groups' | 'periods' | 'offerings', entry: unknown) => {
    queryClient.setQueryData<StructureResponse | undefined>(
      ['academic-structure', activeInstitutionId],
      (current: StructureResponse | undefined) =>
        current
          ? {
              ...current,
              [section]: [...current[section], entry],
            }
          : current
    );
  };

  const replaceStructureCache = (
    section: 'groups' | 'periods' | 'offerings',
    id: string,
    entry: unknown
  ) => {
    queryClient.setQueryData<StructureResponse | undefined>(
      ['academic-structure', activeInstitutionId],
      (current: StructureResponse | undefined) =>
        current
          ? {
              ...current,
              [section]: current[section].map((item: { id: string }) => (item.id === id ? entry : item)),
            }
          : current
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
      const nextGroupType =
        allowedLevels.length === 1 && allowedLevels[0] === 'TR' ? 'level' : current.group_type;
      const nextCalendarType =
        current.level_code === nextLevelCode
          ? current.calendar_type
          : getDefaultCalendarForLevel(nextLevelCode);

      if (
        current.group_type === nextGroupType &&
        current.level_code === nextLevelCode &&
        current.calendar_type === nextCalendarType
      ) {
        return current;
      }

      return {
        ...current,
        group_type: nextGroupType,
        level_code: nextLevelCode,
        calendar_type: nextCalendarType,
      };
    });
  }, [allowedLevels, levelOptions]);

  useEffect(() => {
    if (selectedGroupId && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId('');
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (detailState?.type === 'groups' && !groups.some((group) => group.id === detailState.id)) {
      setDetailState(null);
    }
    if (detailState?.type === 'periods' && !periods.some((period) => period.id === detailState.id)) {
      setDetailState(null);
    }
    if (
      detailState?.type === 'offerings' &&
      !offerings.some((offering) => offering.id === detailState.id)
    ) {
      setDetailState(null);
    }
  }, [detailState, groups, offerings, periods]);

  const resetGroupForm = (levelCode?: string) => {
    const nextLevelCode =
      levelCode ||
      levelOptions[0]?.code ||
      initialGroupForm.level_code;
    setGroupForm({
      ...initialGroupForm,
      group_type:
        allowedLevels.length === 1 && allowedLevels[0] === 'TR' ? 'level' : initialGroupForm.group_type,
      level_code: nextLevelCode,
      calendar_type: getDefaultCalendarForLevel(nextLevelCode),
    });
  };

  const resetPeriodForm = (groupId = '') => {
    const sourceGroup = groups.find((group) => group.id === groupId);
    setPeriodForm({
      ...initialPeriodForm,
      group_id: groupId,
      calendar_type: sourceGroup?.calendar_type || initialPeriodForm.calendar_type,
    });
  };

  const resetOfferingForm = (groupId = '') => {
    const sourcePeriods = periods.filter((period) => period.group_id === groupId);
    setOfferingForm({
      ...initialOfferingForm,
      group_id: groupId,
      period_id: sourcePeriods[0]?.id || '',
      type: showCourseOption ? 'course' : 'subject',
    });
  };

  const createGroup = useMutation({
    mutationFn: eduovaApi.academics.createGroup,
    onSuccess: (result) => {
      const createdGroup = result as AcademicGroup;
      appendStructureCache('groups', createdGroup);
      setSelectedGroupId(createdGroup.id);
      setGroupModalOpen(false);
      resetGroupForm(createdGroup.level_code);
      toast.success(`${groupLabel} created.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to create ${groupLabel.toLowerCase()}.`));
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.academics.updateGroup(id, payload),
    onSuccess: (result) => {
      const updatedGroup = result as AcademicGroup;
      replaceStructureCache('groups', updatedGroup.id, updatedGroup);
      setSelectedGroupId(updatedGroup.id);
      setDetailState({ type: 'groups', id: updatedGroup.id });
      setGroupModalOpen(false);
      toast.success(`${groupLabel} updated.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to update ${groupLabel.toLowerCase()}.`));
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (id: string) => eduovaApi.academics.deleteGroup(id),
    onSuccess: async () => {
      setDetailState(null);
      setSelectedGroupId('');
      await invalidateStructure();
      toast.success(`${groupLabel} deleted.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to delete ${groupLabel.toLowerCase()}.`));
    },
  });

  const createPeriod = useMutation({
    mutationFn: eduovaApi.academics.createPeriod,
    onSuccess: (result) => {
      const createdPeriod = result as AcademicPeriod;
      appendStructureCache('periods', createdPeriod);
      setSelectedGroupId(createdPeriod.group_id);
      setPeriodModalOpen(false);
      resetPeriodForm(createdPeriod.group_id);
      toast.success(`${periodLabel} created.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to create ${periodLabel.toLowerCase()}.`));
    },
  });

  const updatePeriod = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.academics.updatePeriod(id, payload),
    onSuccess: (result) => {
      const updatedPeriod = result as AcademicPeriod;
      replaceStructureCache('periods', updatedPeriod.id, updatedPeriod);
      setSelectedGroupId(updatedPeriod.group_id);
      setDetailState({ type: 'periods', id: updatedPeriod.id });
      setPeriodModalOpen(false);
      toast.success(`${periodLabel} updated.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to update ${periodLabel.toLowerCase()}.`));
    },
  });

  const deletePeriod = useMutation({
    mutationFn: (id: string) => eduovaApi.academics.deletePeriod(id),
    onSuccess: async () => {
      setDetailState(null);
      await invalidateStructure();
      toast.success(`${periodLabel} deleted.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to delete ${periodLabel.toLowerCase()}.`));
    },
  });

  const createOffering = useMutation({
    mutationFn: eduovaApi.academics.createOffering,
    onSuccess: (result) => {
      const createdOffering = result as AcademicOffering;
      appendStructureCache('offerings', createdOffering);
      setSelectedGroupId(createdOffering.group_id);
      setOfferingModalOpen(false);
      resetOfferingForm(createdOffering.group_id);
      toast.success(`${offeringLabel} created.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to create ${offeringLabel.toLowerCase()}.`));
    },
  });

  const updateOffering = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.academics.updateOffering(id, payload),
    onSuccess: (result) => {
      const updatedOffering = result as AcademicOffering;
      replaceStructureCache('offerings', updatedOffering.id, updatedOffering);
      setSelectedGroupId(updatedOffering.group_id);
      setDetailState({ type: 'offerings', id: updatedOffering.id });
      setOfferingModalOpen(false);
      toast.success(`${offeringLabel} updated.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to update ${offeringLabel.toLowerCase()}.`));
    },
  });

  const deleteOffering = useMutation({
    mutationFn: (id: string) => eduovaApi.academics.deleteOffering(id),
    onSuccess: async () => {
      setDetailState(null);
      await invalidateStructure();
      toast.success(`${offeringLabel} deleted.`);
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, `Unable to delete ${offeringLabel.toLowerCase()}.`));
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

  const tabMeta: Array<{ id: StructureTab; label: string; count: number }> = [
    { id: 'groups', label: groupListLabel, count: groups.length },
    { id: 'periods', label: periodListLabel, count: filteredPeriods.length },
    { id: 'offerings', label: offeringListLabel, count: filteredOfferings.length },
  ];

  const openCreateModal = (tab: StructureTab) => {
    setActiveTab(tab);
    if (tab === 'groups') {
      setGroupModalMode('create');
      resetGroupForm(selectedGroupId ? groups.find((group) => group.id === selectedGroupId)?.level_code : undefined);
      setGroupModalOpen(true);
      return;
    }

    if (tab === 'periods') {
      setPeriodModalMode('create');
      resetPeriodForm(selectedGroupId);
      setPeriodModalOpen(true);
      return;
    }

    setOfferingModalMode('create');
    resetOfferingForm(selectedGroupId);
    setOfferingModalOpen(true);
  };

  const openGroupEdit = (group: AcademicGroup) => {
    setDetailState(null);
    setGroupModalMode('edit');
    setGroupForm({
      name: group.name,
      code: group.code,
      group_type: group.group_type,
      level_code: group.level_code,
      calendar_type: group.calendar_type,
    });
    setGroupModalOpen(true);
  };

  const openPeriodEdit = (period: AcademicPeriod) => {
    setDetailState(null);
    setPeriodModalMode('edit');
    setPeriodForm({
      group_id: period.group_id,
      name: period.name,
      sequence: String(period.sequence),
      calendar_type: period.calendar_type,
      status: period.status,
      registration_open: period.registration_open ? 'true' : 'false',
      start_date: period.start_date || '',
      end_date: period.end_date || '',
    });
    setPeriodModalOpen(true);
  };

  const openOfferingEdit = (offering: AcademicOffering) => {
    setDetailState(null);
    setOfferingModalMode('edit');
    setOfferingForm({
      group_id: offering.group_id,
      period_id: offering.period_id,
      type: offering.type,
      code: offering.code,
      name: offering.name,
      credit_hours: offering.credit_hours === null ? '' : String(offering.credit_hours),
      is_core: offering.is_core ? 'true' : 'false',
      prerequisite_codes: offering.prerequisite_codes.join(', '),
      next_offering_codes: offering.next_offering_codes.join(', '),
    });
    setOfferingModalOpen(true);
  };

  const handleDelete = (type: StructureTab, id: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This will remove linked setup records from the current structure.`)) {
      return;
    }

    if (type === 'groups') {
      deleteGroup.mutate(id);
      return;
    }

    if (type === 'periods') {
      deletePeriod.mutate(id);
      return;
    }

    deleteOffering.mutate(id);
  };

  const activeOfferingPeriods = periods
    .filter((period) => period.group_id === offeringForm.group_id)
    .sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        description="Manage levels, semesters, terms, subjects, and courses from one table-first workspace."
        actions={
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => openCreateModal(activeTab)}>
            Add {activeTab === 'groups' ? groupLabel : activeTab === 'periods' ? periodLabel : offeringLabel}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
            <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => openCreateModal(activeTab)}>
              Add {activeTab === 'groups' ? groupLabel : activeTab === 'periods' ? periodLabel : offeringLabel}
            </Button>
          </div>

          {activeTab !== 'groups' ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
              <Select
                label={`${groupLabel} Filter`}
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                helperText={`Leave on "All" to manage every ${groupLabel.toLowerCase()} in one list.`}
              >
                <option value="">All {groupListLabel}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-slate-500">
                Click any row to open details in a modal, then edit or delete without leaving the table.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Click any row to open details in a modal, then edit or delete from the same flow.
            </p>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          {activeTab === 'groups' ? (
            groups.length ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Name', 'Type', 'Education Level', 'Calendar', 'Periods', 'Offerings'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold uppercase text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="cursor-pointer transition hover:bg-slate-50"
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setDetailState({ type: 'groups', id: group.id });
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-brand-navy">{group.name}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">{group.code}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{group.group_type}</td>
                      <td className="px-4 py-3">
                        {educationLevelLabels[group.level_code as EducationLevelCode] || group.level_code}
                      </td>
                      <td className="px-4 py-3">
                        {calendarLabels[group.calendar_type as keyof typeof calendarLabels] || group.calendar_type}
                      </td>
                      <td className="px-4 py-3">{groupCounts[group.id]?.periods || 0}</td>
                      <td className="px-4 py-3">{groupCounts[group.id]?.offerings || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No {groupListLabel.toLowerCase()} added yet.
              </p>
            )
          ) : null}

          {activeTab === 'periods' ? (
            filteredPeriods.length ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[groupLabel, 'Name', 'Sequence', 'Calendar', 'Status', 'Registration'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold uppercase text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPeriods
                    .slice()
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((period) => {
                      const group = groups.find((item) => item.id === period.group_id);
                      return (
                        <tr
                          key={period.id}
                          className="cursor-pointer transition hover:bg-slate-50"
                          onClick={() => {
                            setSelectedGroupId(period.group_id);
                            setDetailState({ type: 'periods', id: period.id });
                          }}
                        >
                          <td className="px-4 py-3">{group?.name || '-'}</td>
                          <td className="px-4 py-3 font-semibold text-brand-navy">{period.name}</td>
                          <td className="px-4 py-3">#{period.sequence}</td>
                          <td className="px-4 py-3">
                            {calendarLabels[period.calendar_type as keyof typeof calendarLabels] || period.calendar_type}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={period.status === 'active' ? 'info' : 'pending'}>{period.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={period.registration_open ? 'success' : 'inactive'}>
                              {period.registration_open ? 'open' : 'closed'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No {periodListLabel.toLowerCase()} found for the current filter yet.
              </p>
            )
          ) : null}

          {activeTab === 'offerings' ? (
            filteredOfferings.length ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[groupLabel, periodLabel, 'Code', 'Name', 'Type', 'Credits', 'Status'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold uppercase text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOfferings.map((offering) => {
                    const group = groups.find((item) => item.id === offering.group_id);
                    const period = periods.find((item) => item.id === offering.period_id);
                    return (
                      <tr
                        key={offering.id}
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => {
                          setSelectedGroupId(offering.group_id);
                          setDetailState({ type: 'offerings', id: offering.id });
                        }}
                      >
                        <td className="px-4 py-3">{group?.name || '-'}</td>
                        <td className="px-4 py-3">{period?.name || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-brand-navy">{offering.code}</td>
                        <td className="px-4 py-3">{offering.name}</td>
                        <td className="px-4 py-3 capitalize">{offering.type}</td>
                        <td className="px-4 py-3">{offering.credit_hours ?? '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={offering.is_core ? 'success' : 'info'}>
                            {offering.is_core ? 'core' : 'elective'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No {offeringListLabel.toLowerCase()} found for the current filter yet.
              </p>
            )
          ) : null}
        </div>
      </Card>

      <Modal
        open={Boolean(detailState)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailState(null);
          }
        }}
        title={
          detailGroup?.name || detailPeriod?.name || detailOffering?.name || detailOffering?.code || 'Details'
        }
        description="Review the record details, then edit or remove it from the same modal."
      >
        {detailGroup ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Code</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{detailGroup.code}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Calendar</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {calendarLabels[detailGroup.calendar_type as keyof typeof calendarLabels] || detailGroup.calendar_type}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type</p>
                <p className="mt-2 text-lg font-semibold capitalize text-brand-navy">{detailGroup.group_type}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Education Level
                </p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {educationLevelLabels[detailGroup.level_code as EducationLevelCode] || detailGroup.level_code}
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{periodLabel}s linked</p>
                <p className="text-2xl font-semibold text-brand-navy">
                  {periods.filter((period) => period.group_id === detailGroup.id).length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{offeringLabel}s linked</p>
                <p className="text-2xl font-semibold text-brand-navy">
                  {offerings.filter((offering) => offering.group_id === detailGroup.id).length}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={() => openGroupEdit(detailGroup)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Trash2 className="h-4 w-4" />}
                loading={deleteGroup.isPending}
                onClick={() => handleDelete('groups', detailGroup.id, detailGroup.name)}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}

        {detailPeriod ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{groupLabel}</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {groups.find((group) => group.id === detailPeriod.group_id)?.name || '-'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sequence</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">#{detailPeriod.sequence}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                <div className="mt-2">
                  <Badge variant={detailPeriod.status === 'active' ? 'info' : 'pending'}>
                    {detailPeriod.status}
                  </Badge>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Registration</p>
                <div className="mt-2">
                  <Badge variant={detailPeriod.registration_open ? 'success' : 'inactive'}>
                    {detailPeriod.registration_open ? 'open' : 'closed'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Dates: {detailPeriod.start_date || 'Not set'} to {detailPeriod.end_date || 'Not set'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Linked {offeringLabel.toLowerCase()}s:{' '}
                {offerings.filter((offering) => offering.period_id === detailPeriod.id).length}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={() => openPeriodEdit(detailPeriod)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Trash2 className="h-4 w-4" />}
                loading={deletePeriod.isPending}
                onClick={() => handleDelete('periods', detailPeriod.id, detailPeriod.name)}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}

        {detailOffering ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{groupLabel}</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {groups.find((group) => group.id === detailOffering.group_id)?.name || '-'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{periodLabel}</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {periods.find((period) => period.id === detailOffering.period_id)?.name || '-'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credits</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{detailOffering.credit_hours ?? '-'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                <div className="mt-2">
                  <Badge variant={detailOffering.is_core ? 'success' : 'info'}>
                    {detailOffering.is_core ? 'core' : 'elective'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
              <p>Prerequisites: {detailOffering.prerequisite_codes.length ? detailOffering.prerequisite_codes.join(', ') : 'None'}</p>
              <p className="mt-2">Next items: {detailOffering.next_offering_codes.length ? detailOffering.next_offering_codes.join(', ') : 'None'}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={() => openOfferingEdit(detailOffering)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Trash2 className="h-4 w-4" />}
                loading={deleteOffering.isPending}
                onClick={() => handleDelete('offerings', detailOffering.id, detailOffering.name)}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={groupModalOpen}
        onOpenChange={(open) => {
          setGroupModalOpen(open);
          if (!open) {
            resetGroupForm();
          }
        }}
        title={`${groupModalMode === 'create' ? 'Add' : 'Edit'} ${groupLabel}`}
        description="Save the learner group before attaching terms, semesters, subjects, or courses."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const payload = { ...groupForm, code: groupForm.code.toUpperCase() };
            if (groupModalMode === 'create') {
              createGroup.mutate(payload);
              return;
            }
            if (detailGroup) {
              updateGroup.mutate({ id: detailGroup.id, payload });
            }
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
            disabled={groupModalMode === 'edit' || (allowedLevels.length === 1 && allowedLevels[0] === 'TR')}
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
            <Button type="submit" loading={createGroup.isPending || updateGroup.isPending}>
              {groupModalMode === 'create' ? 'Save' : 'Update'} {groupLabel}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={periodModalOpen}
        onOpenChange={(open) => {
          setPeriodModalOpen(open);
          if (!open) {
            resetPeriodForm(selectedGroupId);
          }
        }}
        title={`${periodModalMode === 'create' ? 'Add' : 'Edit'} ${periodLabel}`}
        description={`Attach a ${periodLabel.toLowerCase()} to the correct ${groupLabel.toLowerCase()} and manage it from the same workflow.`}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const payload = {
              ...periodForm,
              sequence: Number(periodForm.sequence),
              registration_open: periodForm.registration_open === 'true',
              start_date: periodForm.start_date || null,
              end_date: periodForm.end_date || null,
            };
            if (periodModalMode === 'create') {
              createPeriod.mutate(payload);
              return;
            }
            if (detailPeriod) {
              updatePeriod.mutate({ id: detailPeriod.id, payload });
            }
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
            disabled={periodModalMode === 'edit'}
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
          <Input
            label="Start Date"
            type="date"
            value={periodForm.start_date}
            onChange={(event) => setPeriodForm((current) => ({ ...current, start_date: event.target.value }))}
          />
          <Input
            label="End Date"
            type="date"
            value={periodForm.end_date}
            onChange={(event) => setPeriodForm((current) => ({ ...current, end_date: event.target.value }))}
          />
          <Select
            label="Calendar"
            value={periodForm.calendar_type}
            onChange={(event) => setPeriodForm((current) => ({ ...current, calendar_type: event.target.value }))}
            disabled={periodModalMode === 'edit'}
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
            <Button type="submit" loading={createPeriod.isPending || updatePeriod.isPending}>
              {periodModalMode === 'create' ? 'Save' : 'Update'} {periodLabel}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={offeringModalOpen}
        onOpenChange={(open) => {
          setOfferingModalOpen(open);
          if (!open) {
            resetOfferingForm(selectedGroupId);
          }
        }}
        title={`${offeringModalMode === 'create' ? 'Add' : 'Edit'} ${offeringLabel}`}
        description={`Attach a ${offeringLabel.toLowerCase()} to the right ${periodLabel.toLowerCase()} and manage its dependencies in one place.`}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const payload = {
              ...offeringForm,
              code: offeringForm.code.toUpperCase(),
              credit_hours: offeringForm.credit_hours ? Number(offeringForm.credit_hours) : null,
              is_core: offeringForm.is_core === 'true',
              prerequisite_codes: offeringForm.prerequisite_codes
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              next_offering_codes: offeringForm.next_offering_codes
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            };

            if (offeringModalMode === 'create') {
              createOffering.mutate(payload);
              return;
            }

            if (detailOffering) {
              updateOffering.mutate({ id: detailOffering.id, payload });
            }
          }}
        >
          <Select
            label={groupLabel}
            value={offeringForm.group_id}
            onChange={(event) =>
              setOfferingForm((current) => ({
                ...current,
                group_id: event.target.value,
                period_id: '',
              }))
            }
            disabled={offeringModalMode === 'edit'}
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
            disabled={offeringModalMode === 'edit'}
          >
            <option value="">Select {periodLabel.toLowerCase()}</option>
            {activeOfferingPeriods.map((period) => (
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
            disabled={offeringModalMode === 'edit'}
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
          <Select
            label="Status"
            value={offeringForm.is_core}
            onChange={(event) => setOfferingForm((current) => ({ ...current, is_core: event.target.value }))}
          >
            <option value="true">Core</option>
            <option value="false">Elective</option>
          </Select>
          <Input
            label="Prerequisites"
            value={offeringForm.prerequisite_codes}
            onChange={(event) =>
              setOfferingForm((current) => ({ ...current, prerequisite_codes: event.target.value }))
            }
            helperText="Separate multiple course or subject codes with commas."
          />
          <Input
            label="Next Items"
            value={offeringForm.next_offering_codes}
            onChange={(event) =>
              setOfferingForm((current) => ({ ...current, next_offering_codes: event.target.value }))
            }
            helperText="Use this to keep progression linked for the next period."
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOfferingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createOffering.isPending || updateOffering.isPending}>
              {offeringModalMode === 'create' ? 'Save' : 'Update'} {offeringLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicStructurePage;
