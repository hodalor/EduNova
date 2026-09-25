import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Eye,
  GraduationCap,
  Pencil,
  PlusCircle,
  ScanLine,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { getAcademicStructureLabel, isTertiaryInstitution } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../shared/PageHeader';

interface FacultyRow {
  id: string;
  name: string;
  code: string;
  dean?: string | null;
}

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  faculty_id: string;
  faculty: string;
}

interface ProgramRoadmapCourse {
  id: string;
  code: string;
  name: string;
  credit_hours: number | null;
}

interface ProgramRoadmapPeriod {
  id: string;
  name: string;
  status: string;
  courses: ProgramRoadmapCourse[];
}

interface ProgramRoadmapLevel {
  id: string;
  name: string;
  code: string;
  periods: ProgramRoadmapPeriod[];
}

interface ProgramRow {
  id: string;
  name: string;
  code?: string;
  credential: string;
  duration: string;
  calendar: string;
  faculty_id: string;
  department_id: string;
  faculty?: string;
  department?: string;
  roadmap_group_ids?: string[];
  roadmap?: {
    level_count: number;
    total_courses: number;
    levels: ProgramRoadmapLevel[];
  };
}

interface TertiaryOverview {
  faculties: FacultyRow[];
  departments: DepartmentRow[];
  programs: ProgramRow[];
  progression: string[];
  progression_policy: {
    allow_carry_over_progression: boolean;
    max_carry_over_courses: number;
    max_carry_over_credits: number;
    allow_manual_overrides: boolean;
  };
  finance_policy: {
    new_student_registration_percent: number;
    returning_student_registration_percent: number;
    midsem_exam_percent: number;
    final_exam_percent: number;
  };
  credentials: string[];
  id_format: string;
}

interface AcademicStructureResponse {
  groups: Array<{
    id: string;
    name: string;
    code: string;
    level_code: string;
  }>;
}

type TertiaryTab = 'faculties' | 'departments' | 'programs';

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
};

const emptyFacultyForm = { name: '', code: '', dean: '' };
const emptyDepartmentForm = { faculty_id: '', name: '', code: '' };
const emptyProgramForm = {
  department_id: '',
  name: '',
  code: '',
  credential: 'Degree',
  duration: '4 years',
  calendar: 'semester',
  roadmap_group_ids: [] as string[],
};

const TertiaryManagementPage = () => {
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TertiaryTab>('faculties');
  const [detailModal, setDetailModal] = useState<{ tab: TertiaryTab; id: string } | null>(null);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [facultyForm, setFacultyForm] = useState(emptyFacultyForm);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [progressionPolicyForm, setProgressionPolicyForm] = useState({
    allow_carry_over_progression: false,
    max_carry_over_courses: '0',
    max_carry_over_credits: '0',
    allow_manual_overrides: true,
  });
  const [financePolicyForm, setFinancePolicyForm] = useState({
    new_student_registration_percent: '50',
    returning_student_registration_percent: '50',
    midsem_exam_percent: '50',
    final_exam_percent: '100',
  });

  const { data, isLoading } = useQuery<TertiaryOverview>({
    queryKey: ['tertiary-overview', activeInstitutionId],
    queryFn: eduovaApi.tertiary.overview,
    enabled: Boolean(activeInstitutionId && isTertiaryInstitution(activeInstitution)),
  });
  const { data: structure } = useQuery<AcademicStructureResponse>({
    queryKey: ['academic-structure', 'tertiary-roadmap', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId && isTertiaryInstitution(activeInstitution)),
  });

  const faculties = useMemo(() => data?.faculties || [], [data?.faculties]);
  const departments = useMemo(() => data?.departments || [], [data?.departments]);
  const programs = useMemo(() => data?.programs || [], [data?.programs]);
  const roadmapGroups = useMemo(
    () => (structure?.groups || []).filter((item) => item.level_code === 'TR'),
    [structure?.groups]
  );
  const credentials = data?.credentials || activeInstitution?.settings?.tertiary?.credentials || [];
  const idFormat = data?.id_format || activeInstitution?.settings?.tertiary?.id_format || 'FAC/DEPT/YEAR/SEQ';
  const calendarModel = getAcademicStructureLabel(activeInstitution);

  const detailFaculty =
    detailModal?.tab === 'faculties'
      ? faculties.find((faculty) => faculty.id === detailModal.id) || null
      : null;
  const detailDepartment =
    detailModal?.tab === 'departments'
      ? departments.find((department) => department.id === detailModal.id) || null
      : null;
  const detailProgram =
    detailModal?.tab === 'programs'
      ? programs.find((program) => program.id === detailModal.id) || null
      : null;

  const facultyDepartments = useMemo(
    () =>
      detailFaculty
        ? departments.filter((department) => department.faculty_id === detailFaculty.id)
        : [],
    [departments, detailFaculty]
  );
  const departmentPrograms = useMemo(
    () =>
      detailDepartment
        ? programs.filter((program) => program.department_id === detailDepartment.id)
        : [],
    [programs, detailDepartment]
  );

  const refreshOverview = () =>
    queryClient.invalidateQueries({ queryKey: ['tertiary-overview', activeInstitutionId] });

  const closeFacultyModal = () => {
    setFacultyModalOpen(false);
    setEditingFacultyId(null);
    setFacultyForm(emptyFacultyForm);
  };

  const closeDepartmentModal = () => {
    setDepartmentModalOpen(false);
    setEditingDepartmentId(null);
    setDepartmentForm(emptyDepartmentForm);
  };

  const closeProgramModal = () => {
    setProgramModalOpen(false);
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  };

  const createFaculty = useMutation({
    mutationFn: eduovaApi.tertiary.createFaculty,
    onSuccess: async () => {
      toast.success('Faculty created.');
      closeFacultyModal();
      await refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to create faculty.')),
  });

  const updateFaculty = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.tertiary.updateFaculty(id, payload),
    onSuccess: async (response: FacultyRow) => {
      toast.success('Faculty updated.');
      closeFacultyModal();
      setDetailModal({ tab: 'faculties', id: response.id });
      await refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to update faculty.')),
  });

  const deleteFaculty = useMutation({
    mutationFn: (id: string) => eduovaApi.tertiary.deleteFaculty(id),
    onSuccess: async () => {
      toast.success('Faculty deleted.');
      setDetailModal(null);
      await refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to delete faculty.')),
  });

  const createDepartment = useMutation({
    mutationFn: eduovaApi.tertiary.createDepartment,
    onSuccess: async () => {
      toast.success('Department created.');
      closeDepartmentModal();
      await refreshOverview();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to create department.')),
  });

  const updateDepartment = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.tertiary.updateDepartment(id, payload),
    onSuccess: async (response: DepartmentRow) => {
      toast.success('Department updated.');
      closeDepartmentModal();
      setDetailModal({ tab: 'departments', id: response.id });
      await refreshOverview();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to update department.')),
  });

  const deleteDepartment = useMutation({
    mutationFn: (id: string) => eduovaApi.tertiary.deleteDepartment(id),
    onSuccess: async () => {
      toast.success('Department deleted.');
      setDetailModal(null);
      await refreshOverview();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to delete department.')),
  });

  const createProgram = useMutation({
    mutationFn: eduovaApi.tertiary.createProgram,
    onSuccess: async () => {
      toast.success('Program created.');
      closeProgramModal();
      await refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to create program.')),
  });

  const updateProgram = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.tertiary.updateProgram(id, payload),
    onSuccess: async (response: ProgramRow) => {
      toast.success('Program updated.');
      closeProgramModal();
      setDetailModal({ tab: 'programs', id: response.id });
      await refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to update program.')),
  });

  const deleteProgram = useMutation({
    mutationFn: (id: string) => eduovaApi.tertiary.deleteProgram(id),
    onSuccess: async () => {
      toast.success('Program deleted.');
      setDetailModal(null);
      await refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to delete program.')),
  });

  const updateProgressionPolicy = useMutation({
    mutationFn: eduovaApi.tertiary.updateProgressionPolicy,
    onSuccess: async () => {
      toast.success('Progression policy updated.');
      await refreshOverview();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to update progression policy.')),
  });

  const updateFinancePolicy = useMutation({
    mutationFn: eduovaApi.tertiary.updateFinancePolicy,
    onSuccess: async () => {
      toast.success('Finance policy updated.');
      await refreshOverview();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to update finance policy.')),
  });

  useEffect(() => {
    if (!data?.progression_policy) {
      return;
    }

    setProgressionPolicyForm({
      allow_carry_over_progression: Boolean(data.progression_policy.allow_carry_over_progression),
      max_carry_over_courses: String(data.progression_policy.max_carry_over_courses ?? 0),
      max_carry_over_credits: String(data.progression_policy.max_carry_over_credits ?? 0),
      allow_manual_overrides: Boolean(data.progression_policy.allow_manual_overrides),
    });
  }, [data?.progression_policy]);

  useEffect(() => {
    if (!data?.finance_policy) {
      return;
    }

    setFinancePolicyForm({
      new_student_registration_percent: String(
        data.finance_policy.new_student_registration_percent ?? 50
      ),
      returning_student_registration_percent: String(
        data.finance_policy.returning_student_registration_percent ?? 50
      ),
      midsem_exam_percent: String(data.finance_policy.midsem_exam_percent ?? 50),
      final_exam_percent: String(data.finance_policy.final_exam_percent ?? 100),
    });
  }, [data?.finance_policy]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isTertiaryInstitution(activeInstitution)) {
    return (
      <Card title="Tertiary Setup Unavailable">
        <p className="text-sm text-slate-600">
          This school does not have tertiary education enabled, so faculties, departments, and
          programs are hidden.
        </p>
      </Card>
    );
  }

  const openCreateModal = (tab: TertiaryTab) => {
    setActiveTab(tab);

    if (tab === 'faculties') {
      setEditingFacultyId(null);
      setFacultyForm(emptyFacultyForm);
      setFacultyModalOpen(true);
      return;
    }

    if (tab === 'departments') {
      setEditingDepartmentId(null);
      setDepartmentForm({
        ...emptyDepartmentForm,
        faculty_id: faculties[0]?.id || '',
      });
      setDepartmentModalOpen(true);
      return;
    }

    setEditingProgramId(null);
    setProgramForm({
      ...emptyProgramForm,
      department_id: departments[0]?.id || '',
    });
    setProgramModalOpen(true);
  };

  const openDetailModal = (tab: TertiaryTab, id: string) => {
    setActiveTab(tab);
    setDetailModal({ tab, id });
  };

  const openEditFaculty = (faculty: FacultyRow) => {
    setFacultyForm({
      name: faculty.name || '',
      code: faculty.code || '',
      dean: faculty.dean || '',
    });
    setEditingFacultyId(faculty.id);
    setFacultyModalOpen(true);
  };

  const openEditDepartment = (department: DepartmentRow) => {
    setDepartmentForm({
      faculty_id: department.faculty_id || faculties[0]?.id || '',
      name: department.name || '',
      code: department.code || '',
    });
    setEditingDepartmentId(department.id);
    setDepartmentModalOpen(true);
  };

  const openEditProgram = (program: ProgramRow) => {
    setProgramForm({
      department_id: program.department_id || departments[0]?.id || '',
      name: program.name || '',
      code: program.code || '',
      credential: program.credential || 'Degree',
      duration: program.duration || '4 years',
      calendar: program.calendar || 'semester',
      roadmap_group_ids: program.roadmap_group_ids || [],
    });
    setEditingProgramId(program.id);
    setProgramModalOpen(true);
  };

  const confirmDelete = (message: string, action: () => void) => {
    if (window.confirm(message)) {
      action();
    }
  };

  const renderEmptyRow = (message: string, colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {message}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tertiary Management"
        description="Run faculties, departments, programs, credentials, calendars, and progression rules for universities, colleges, and short-course institutions."
      />

      <div className="flex flex-wrap gap-3">
        <Link
          to="/academics/structure"
          className="inline-flex rounded-2xl bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
        >
          Manage levels, semesters, and courses
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Faculties',
            value: `${faculties.length}`,
            helper: 'Top-level academic groupings.',
            icon: Building2,
          },
          {
            label: 'Departments',
            value: `${departments.length}`,
            helper: 'Department structures and codes.',
            icon: Building2,
          },
          {
            label: 'Programs',
            value: `${programs.length}`,
            helper: 'Certificate to postgraduate offerings.',
            icon: GraduationCap,
          },
          {
            label: 'ID Format',
            value: idFormat,
            helper: `${calendarModel} calendar model in use.`,
            icon: ScanLine,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold text-brand-navy">{item.value}</p>
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

      <Card
        title="Progression Policy"
        description="Control how many failed courses a tertiary student may carry forward before the system blocks next-semester registration."
        action={
          <Button
            onClick={() =>
              updateProgressionPolicy.mutate({
                allow_carry_over_progression: progressionPolicyForm.allow_carry_over_progression,
                max_carry_over_courses: Number(progressionPolicyForm.max_carry_over_courses || 0),
                max_carry_over_credits: Number(progressionPolicyForm.max_carry_over_credits || 0),
                allow_manual_overrides: progressionPolicyForm.allow_manual_overrides,
              })
            }
            loading={updateProgressionPolicy.isPending}
          >
            Save Policy
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={progressionPolicyForm.allow_carry_over_progression}
              onChange={(event) =>
                setProgressionPolicyForm((current) => ({
                  ...current,
                  allow_carry_over_progression: event.target.checked,
                }))
              }
            />
            <span>Allow next semester progression with carry-over courses</span>
          </label>
          <Input
            label="Maximum Carry-over Courses"
            type="number"
            min="0"
            value={progressionPolicyForm.max_carry_over_courses}
            onChange={(event) =>
              setProgressionPolicyForm((current) => ({
                ...current,
                max_carry_over_courses: event.target.value,
              }))
            }
            helperText="Set `0` to require a full clear before progression."
          />
          <Input
            label="Maximum Carry-over Credits"
            type="number"
            min="0"
            value={progressionPolicyForm.max_carry_over_credits}
            onChange={(event) =>
              setProgressionPolicyForm((current) => ({
                ...current,
                max_carry_over_credits: event.target.value,
              }))
            }
            helperText="Use this when credit load matters more than course count."
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={progressionPolicyForm.allow_manual_overrides}
              onChange={(event) =>
                setProgressionPolicyForm((current) => ({
                  ...current,
                  allow_manual_overrides: event.target.checked,
                }))
              }
            />
            <span>Allow admin manual progression overrides for special cases</span>
          </label>
        </div>
      </Card>

      <Card
        title="Finance Policy"
        description="Set the default payment thresholds that control registration and exam eligibility for tertiary students."
        action={
          <Button
            onClick={() =>
              updateFinancePolicy.mutate({
                new_student_registration_percent: Number(
                  financePolicyForm.new_student_registration_percent || 0
                ),
                returning_student_registration_percent: Number(
                  financePolicyForm.returning_student_registration_percent || 0
                ),
                midsem_exam_percent: Number(financePolicyForm.midsem_exam_percent || 0),
                final_exam_percent: Number(financePolicyForm.final_exam_percent || 0),
              })
            }
            loading={updateFinancePolicy.isPending}
          >
            Save Finance Policy
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label="New Student Registration %"
            type="number"
            min="0"
            max="100"
            value={financePolicyForm.new_student_registration_percent}
            onChange={(event) =>
              setFinancePolicyForm((current) => ({
                ...current,
                new_student_registration_percent: event.target.value,
              }))
            }
          />
          <Input
            label="Existing Student Registration %"
            type="number"
            min="0"
            max="100"
            value={financePolicyForm.returning_student_registration_percent}
            onChange={(event) =>
              setFinancePolicyForm((current) => ({
                ...current,
                returning_student_registration_percent: event.target.value,
              }))
            }
          />
          <Input
            label="Mid-Sem Exam %"
            type="number"
            min="0"
            max="100"
            value={financePolicyForm.midsem_exam_percent}
            onChange={(event) =>
              setFinancePolicyForm((current) => ({
                ...current,
                midsem_exam_percent: event.target.value,
              }))
            }
          />
          <Input
            label="End-Of-Sem Exam %"
            type="number"
            min="0"
            max="100"
            value={financePolicyForm.final_exam_percent}
            onChange={(event) =>
              setFinancePolicyForm((current) => ({
                ...current,
                final_exam_percent: event.target.value,
              }))
            }
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'faculties', label: `Faculties (${faculties.length})` },
              { id: 'departments', label: `Departments (${departments.length})` },
              { id: 'programs', label: `Programs (${programs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TertiaryTab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-brand-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => openCreateModal(activeTab)}>
            Add {activeTab === 'faculties' ? 'Faculty' : activeTab === 'departments' ? 'Department' : 'Program'}
          </Button>
        </div>

        <div className="mt-6 overflow-x-auto">
          {activeTab === 'faculties' ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Faculty', 'Code', 'Dean', 'Departments', 'Actions'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-600"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {faculties.length
                  ? faculties.map((faculty) => (
                      <tr
                        key={faculty.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => openDetailModal('faculties', faculty.id)}
                      >
                        <td className="px-4 py-3 font-semibold text-brand-navy">{faculty.name}</td>
                        <td className="px-4 py-3">{faculty.code}</td>
                        <td className="px-4 py-3">{faculty.dean || 'Not assigned'}</td>
                        <td className="px-4 py-3">
                          {departments.filter((department) => department.faculty_id === faculty.id).length}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Eye className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetailModal('faculties', faculty.id);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Pencil className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditFaculty(faculty);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDelete(
                                  `Delete ${faculty.name}? Remove linked departments first.`,
                                  () => deleteFaculty.mutate(faculty.id)
                                );
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : renderEmptyRow('No faculties created yet.', 5)}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'departments' ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Department', 'Code', 'Faculty', 'Programs', 'Actions'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-600"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {departments.length
                  ? departments.map((department) => (
                      <tr
                        key={department.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => openDetailModal('departments', department.id)}
                      >
                        <td className="px-4 py-3 font-semibold text-brand-navy">{department.name}</td>
                        <td className="px-4 py-3">{department.code}</td>
                        <td className="px-4 py-3">{department.faculty}</td>
                        <td className="px-4 py-3">
                          {programs.filter((program) => program.department_id === department.id).length}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Eye className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetailModal('departments', department.id);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Pencil className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDepartment(department);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDelete(
                                  `Delete ${department.name}? Remove linked programs first.`,
                                  () => deleteDepartment.mutate(department.id)
                                );
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : renderEmptyRow('No departments created yet.', 5)}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'programs' ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Program', 'Department', 'Credential', 'Duration', 'Calendar', 'Actions'].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-600"
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {programs.length
                  ? programs.map((program) => (
                      <tr
                        key={program.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => openDetailModal('programs', program.id)}
                      >
                        <td className="px-4 py-3 font-semibold text-brand-navy">{program.name}</td>
                        <td className="px-4 py-3">{program.department || 'Not linked'}</td>
                        <td className="px-4 py-3">{program.credential}</td>
                        <td className="px-4 py-3">{program.duration}</td>
                        <td className="px-4 py-3 capitalize">
                          {program.calendar}
                          {program.roadmap ? ` · ${program.roadmap.level_count} levels` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Eye className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetailModal('programs', program.id);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Pencil className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditProgram(program);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDelete(`Delete ${program.name}?`, () =>
                                  deleteProgram.mutate(program.id)
                                );
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : renderEmptyRow('No programs created yet.', 6)}
              </tbody>
            </table>
          ) : null}
        </div>
      </Card>

      <Modal
        open={Boolean(detailModal)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailModal(null);
          }
        }}
        title={
          detailFaculty?.name ||
          detailDepartment?.name ||
          detailProgram?.name ||
          'Tertiary Detail'
        }
        description={
          detailModal?.tab === 'faculties'
            ? 'Faculty details and linked departments.'
            : detailModal?.tab === 'departments'
              ? 'Department details and linked programs.'
              : detailModal?.tab === 'programs'
                ? 'Program details and roadmap coverage.'
                : 'Selected tertiary record.'
        }
      >
        {detailFaculty ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Dean</p>
                <p className="font-semibold text-brand-navy">
                  {detailFaculty.dean || 'Not assigned'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{detailFaculty.code}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => {
                    setDetailModal(null);
                    openEditFaculty(detailFaculty);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() =>
                    confirmDelete(
                      `Delete ${detailFaculty.name}? Remove linked departments first.`,
                      () => deleteFaculty.mutate(detailFaculty.id)
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Linked Departments
              </p>
              <div className="mt-3 space-y-3">
                {facultyDepartments.length ? (
                  facultyDepartments.map((department) => (
                    <div
                      key={department.id}
                      className="rounded-2xl bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="font-medium text-brand-navy">{department.name}</p>
                      <p className="text-sm text-slate-500">{department.code}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No departments linked yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {detailDepartment ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Faculty</p>
                <p className="font-semibold text-brand-navy">{detailDepartment.faculty}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{detailDepartment.code}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => {
                    setDetailModal(null);
                    openEditDepartment(detailDepartment);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() =>
                    confirmDelete(
                      `Delete ${detailDepartment.name}? Remove linked programs first.`,
                      () => deleteDepartment.mutate(detailDepartment.id)
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Linked Programs
              </p>
              <div className="mt-3 space-y-3">
                {departmentPrograms.length ? (
                  departmentPrograms.map((program) => (
                    <div key={program.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-brand-navy">{program.name}</p>
                          <p className="text-sm text-slate-500">
                            {program.duration} · {program.calendar}
                          </p>
                        </div>
                        <Badge variant="info">{program.credential}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No programs linked yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {detailProgram ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {[detailProgram.faculty, detailProgram.department].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 font-semibold text-brand-navy">
                  {detailProgram.duration} · {detailProgram.calendar}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{detailProgram.credential}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => {
                    setDetailModal(null);
                    openEditProgram(detailProgram);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() =>
                    confirmDelete(`Delete ${detailProgram.name}?`, () =>
                      deleteProgram.mutate(detailProgram.id)
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Roadmap Coverage
                </p>
                <p className="mt-2 font-semibold text-brand-navy">
                  {detailProgram.roadmap?.level_count || 0} levels ·{' '}
                  {detailProgram.roadmap?.total_courses || 0} courses
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Program Code
                </p>
                <p className="mt-2 font-semibold text-brand-navy">
                  {detailProgram.code || 'Not assigned'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {detailProgram.roadmap?.levels?.length ? (
                detailProgram.roadmap.levels.map((level) => (
                  <div key={level.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-brand-navy">{level.name}</p>
                        <p className="text-sm text-slate-500">{level.code}</p>
                      </div>
                      <Badge variant="inactive">
                        {level.periods.reduce((sum, period) => sum + period.courses.length, 0)} courses
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {level.periods.map((period) => (
                        <div key={period.id} className="rounded-2xl bg-white px-3 py-2">
                          <p className="text-sm font-semibold text-brand-navy">{period.name}</p>
                          <p className="text-xs text-slate-500">
                            {period.courses.map((course) => course.code).join(', ') || 'No courses mapped'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    Link tertiary levels from Academic Setup when creating the program so the
                    roadmap continues from level to semester to course.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {!detailFaculty && !detailDepartment && !detailProgram ? (
          <p className="text-sm text-slate-500">This record is no longer available.</p>
        ) : null}
      </Modal>

      <Modal
        open={facultyModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeFacultyModal();
          }
        }}
        title={editingFacultyId ? 'Edit Faculty' : 'Add Faculty'}
        description="Start the tertiary hierarchy with the faculty."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (editingFacultyId) {
              updateFaculty.mutate({ id: editingFacultyId, payload: facultyForm });
              return;
            }
            createFaculty.mutate(facultyForm);
          }}
        >
          <Input
            label="Faculty Name"
            value={facultyForm.name}
            onChange={(event) =>
              setFacultyForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Input
            label="Faculty Code"
            value={facultyForm.code}
            onChange={(event) =>
              setFacultyForm((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
          />
          <Input
            label="Dean"
            value={facultyForm.dean}
            onChange={(event) =>
              setFacultyForm((current) => ({ ...current, dean: event.target.value }))
            }
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeFacultyModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createFaculty.isPending || updateFaculty.isPending}
            >
              {editingFacultyId ? 'Save Changes' : 'Save Faculty'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={departmentModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDepartmentModal();
          }
        }}
        title={editingDepartmentId ? 'Edit Department' : 'Add Department'}
        description="Attach the department to a faculty."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (editingDepartmentId) {
              updateDepartment.mutate({ id: editingDepartmentId, payload: departmentForm });
              return;
            }
            createDepartment.mutate(departmentForm);
          }}
        >
          <Select
            label="Faculty"
            value={departmentForm.faculty_id}
            onChange={(event) =>
              setDepartmentForm((current) => ({
                ...current,
                faculty_id: event.target.value,
              }))
            }
          >
            <option value="">Select faculty</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </Select>
          <Input
            label="Department Name"
            value={departmentForm.name}
            onChange={(event) =>
              setDepartmentForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Input
            label="Department Code"
            value={departmentForm.code}
            onChange={(event) =>
              setDepartmentForm((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeDepartmentModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createDepartment.isPending || updateDepartment.isPending}
            >
              {editingDepartmentId ? 'Save Changes' : 'Save Department'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={programModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeProgramModal();
          }
        }}
        title={editingProgramId ? 'Edit Program' : 'Add Program'}
        description="Define the program students will register against."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (editingProgramId) {
              updateProgram.mutate({ id: editingProgramId, payload: programForm });
              return;
            }
            createProgram.mutate(programForm);
          }}
        >
          <Select
            label="Department"
            value={programForm.department_id}
            onChange={(event) =>
              setProgramForm((current) => ({
                ...current,
                department_id: event.target.value,
              }))
            }
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name} ({department.faculty})
              </option>
            ))}
          </Select>
          <Input
            label="Program Name"
            value={programForm.name}
            onChange={(event) =>
              setProgramForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Input
            label="Program Code"
            value={programForm.code}
            onChange={(event) =>
              setProgramForm((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
          />
          <Input
            label="Credential"
            value={programForm.credential}
            onChange={(event) =>
              setProgramForm((current) => ({ ...current, credential: event.target.value }))
            }
          />
          <Input
            label="Duration"
            value={programForm.duration}
            onChange={(event) =>
              setProgramForm((current) => ({ ...current, duration: event.target.value }))
            }
          />
          <Select
            label="Calendar"
            value={programForm.calendar}
            onChange={(event) =>
              setProgramForm((current) => ({ ...current, calendar: event.target.value }))
            }
          >
            <option value="semester">Semester</option>
            <option value="trimester">Trimester</option>
            <option value="block">Block</option>
          </Select>
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Roadmap Levels
            </label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {roadmapGroups.length ? (
                roadmapGroups.map((group) => {
                  const checked = programForm.roadmap_group_ids.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setProgramForm((current) => ({
                            ...current,
                            roadmap_group_ids: event.target.checked
                              ? [...current.roadmap_group_ids, group.id]
                              : current.roadmap_group_ids.filter((item) => item !== group.id),
                          }))
                        }
                      />
                      <span>
                        {group.name} ({group.code})
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  No tertiary levels exist yet. Create them in Academic Setup first.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeProgramModal}>
              Cancel
            </Button>
            <Button type="submit" loading={createProgram.isPending || updateProgram.isPending}>
              {editingProgramId ? 'Save Changes' : 'Save Program'}
            </Button>
          </div>
        </form>
      </Modal>

      {!detailProgram && activeTab === 'programs' && credentials.length ? (
        <Card title="Supported Credentials">
          <div className="flex flex-wrap gap-2">
            {credentials.map((credential) => (
              <Badge key={credential} variant="info">
                {credential}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default TertiaryManagementPage;
