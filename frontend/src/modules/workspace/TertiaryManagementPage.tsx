import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, GraduationCap, PlusCircle, ScanLine } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { getAcademicStructureLabel, isTertiaryInstitution } from '../../lib/institution';

interface TertiaryOverview {
  faculties: Array<{ id: string; name: string; code: string; dean?: string | null }>;
  departments: Array<{ id: string; name: string; code: string; faculty_id: string; faculty: string }>;
  programs: Array<{
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
      levels: Array<{
        id: string;
        name: string;
        code: string;
        periods: Array<{
          id: string;
          name: string;
          status: string;
          courses: Array<{
            id: string;
            code: string;
            name: string;
            credit_hours: number | null;
          }>;
        }>;
      }>;
    };
  }>;
  progression: string[];
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

const TertiaryManagementPage = () => {
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TertiaryTab>('faculties');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: '', code: '', dean: '' });
  const [departmentForm, setDepartmentForm] = useState({ faculty_id: '', name: '', code: '' });
  const [programForm, setProgramForm] = useState({
    department_id: '',
    name: '',
    code: '',
    credential: 'Degree',
    duration: '4 years',
    calendar: 'semester',
    roadmap_group_ids: [] as string[],
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
    () => ((structure?.groups || []) as AcademicStructureResponse['groups']).filter((item) => item.level_code === 'TR'),
    [structure?.groups]
  );
  const selectedFaculty = faculties.find((faculty: TertiaryOverview['faculties'][number]) => faculty.id === selectedFacultyId) || null;
  const selectedDepartment = departments.find((department: TertiaryOverview['departments'][number]) => department.id === selectedDepartmentId) || null;
  const selectedProgram = programs.find((program: TertiaryOverview['programs'][number]) => program.id === selectedProgramId) || null;
  const facultyDepartments = useMemo(
    () => departments.filter((department: TertiaryOverview['departments'][number]) => department.faculty_id === selectedFacultyId),
    [departments, selectedFacultyId]
  );
  const departmentPrograms = useMemo(
    () => programs.filter((program: TertiaryOverview['programs'][number]) => program.department_id === selectedDepartmentId),
    [programs, selectedDepartmentId]
  );
  const refreshOverview = () =>
    queryClient.invalidateQueries({ queryKey: ['tertiary-overview', activeInstitutionId] });

  const createFaculty = useMutation({
    mutationFn: eduovaApi.tertiary.createFaculty,
    onSuccess: () => {
      toast.success('Faculty created.');
      setFacultyForm({ name: '', code: '', dean: '' });
      setFacultyModalOpen(false);
      void refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to create faculty.')),
  });

  const createDepartment = useMutation({
    mutationFn: eduovaApi.tertiary.createDepartment,
    onSuccess: () => {
      toast.success('Department created.');
      setDepartmentForm({ faculty_id: '', name: '', code: '' });
      setDepartmentModalOpen(false);
      void refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to create department.')),
  });

  const createProgram = useMutation({
    mutationFn: eduovaApi.tertiary.createProgram,
    onSuccess: () => {
      toast.success('Program created.');
      setProgramForm({
        department_id: '',
        name: '',
        code: '',
        credential: 'Degree',
        duration: '4 years',
        calendar: 'semester',
        roadmap_group_ids: [],
      });
      setProgramModalOpen(false);
      void refreshOverview();
      void refreshOverview();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to create program.')),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isTertiaryInstitution(activeInstitution)) {
    return (
      <Card title="Tertiary Setup Unavailable">
        <p className="text-sm text-slate-600">
          This school does not have tertiary education enabled, so faculties, departments, and programs are hidden.
        </p>
      </Card>
    );
  }

  const credentials = data?.credentials || activeInstitution?.settings?.tertiary?.credentials || [];
  const idFormat = data?.id_format || activeInstitution?.settings?.tertiary?.id_format || 'FAC/DEPT/YEAR/SEQ';
  const calendarModel = getAcademicStructureLabel(activeInstitution);
  const openCreateModal = (tab: TertiaryTab) => {
    setActiveTab(tab);
    if (tab === 'faculties') {
      setFacultyModalOpen(true);
      return;
    }
    if (tab === 'departments') {
      setDepartmentForm((current) => ({
        ...current,
        faculty_id: current.faculty_id || selectedFacultyId || faculties[0]?.id || '',
      }));
      setDepartmentModalOpen(true);
      return;
    }
    setProgramForm((current) => ({
      ...current,
      department_id: current.department_id || selectedDepartmentId || departments[0]?.id || '',
    }));
    setProgramModalOpen(true);
  };

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
            value: `${data?.faculties?.length || 0}`,
            helper: 'Top-level academic groupings.',
            icon: Building2,
          },
          {
            label: 'Departments',
            value: `${data?.departments?.length || 0}`,
            helper: 'Department structures and codes.',
            icon: Building2,
          },
          {
            label: 'Programs',
            value: `${data?.programs?.length || 0}`,
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
                  activeTab === tab.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-x-auto">
            {activeTab === 'faculties' ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Faculty', 'Code', 'Dean', 'Departments'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {faculties.map((faculty: TertiaryOverview['faculties'][number]) => (
                    <tr
                      key={faculty.id}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedFacultyId === faculty.id ? 'bg-brand-navy/5' : ''}`}
                      onClick={() => {
                        setSelectedFacultyId(faculty.id);
                        setSelectedDepartmentId('');
                      }}
                    >
                      <td className="px-4 py-3 font-semibold text-brand-navy">{faculty.name}</td>
                      <td className="px-4 py-3">{faculty.code}</td>
                      <td className="px-4 py-3">{faculty.dean || 'Not assigned'}</td>
                      <td className="px-4 py-3">
                        {departments.filter((department: TertiaryOverview['departments'][number]) => department.faculty_id === faculty.id).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {activeTab === 'departments' ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Department', 'Code', 'Faculty', 'Programs'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {departments.map((department: TertiaryOverview['departments'][number]) => (
                    <tr
                      key={department.id}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedDepartmentId === department.id ? 'bg-brand-navy/5' : ''}`}
                      onClick={() => setSelectedDepartmentId(department.id)}
                    >
                      <td className="px-4 py-3 font-semibold text-brand-navy">{department.name}</td>
                      <td className="px-4 py-3">{department.code}</td>
                      <td className="px-4 py-3">{department.faculty}</td>
                      <td className="px-4 py-3">
                        {programs.filter((program: TertiaryOverview['programs'][number]) => program.department_id === department.id).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {activeTab === 'programs' ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Program', 'Credential', 'Duration', 'Calendar'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {programs.map((program: TertiaryOverview['programs'][number]) => (
                    <tr
                      key={program.id}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedProgramId === program.id ? 'bg-brand-navy/5' : ''}`}
                      onClick={() => setSelectedProgramId(program.id)}
                    >
                      <td className="px-4 py-3 font-semibold text-brand-navy">{program.name}</td>
                      <td className="px-4 py-3">{program.credential}</td>
                      <td className="px-4 py-3">{program.duration}</td>
                      <td className="px-4 py-3 capitalize">
                        {program.calendar}
                        {program.roadmap ? ` · ${program.roadmap.level_count} levels` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

          <Card title={activeTab === 'faculties' ? (selectedFaculty?.name || 'Faculty Detail') : activeTab === 'departments' ? (selectedDepartment?.name || 'Department Detail') : 'Progression Rules'}>
            {activeTab === 'faculties' ? (
              selectedFaculty ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{selectedFaculty.name}</p>
                      <p className="text-sm text-slate-500">Dean: {selectedFaculty.dean || 'Not assigned'}</p>
                    </div>
                    <Badge variant="info">{selectedFaculty.code}</Badge>
                  </div>
                  <div className="space-y-3">
                    {facultyDepartments.map((department: TertiaryOverview['departments'][number]) => (
                      <div key={department.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="font-medium text-brand-navy">{department.name}</p>
                        <p className="text-sm text-slate-500">{department.code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Select a faculty to see linked departments.</p>
              )
            ) : null}

            {activeTab === 'departments' ? (
              selectedDepartment ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{selectedDepartment.name}</p>
                      <p className="text-sm text-slate-500">{selectedDepartment.faculty}</p>
                    </div>
                    <Badge variant="info">{selectedDepartment.code}</Badge>
                  </div>
                  <div className="space-y-3">
                    {departmentPrograms.map((program: TertiaryOverview['programs'][number]) => (
                      <div key={program.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-brand-navy">{program.name}</p>
                            <p className="text-sm text-slate-500">{program.duration} · {program.calendar}</p>
                          </div>
                          <Badge variant="pending">{program.credential}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Select a department to see linked programs.</p>
              )
            ) : null}

            {activeTab === 'programs' ? (
              selectedProgram ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{selectedProgram.name}</p>
                      <p className="text-sm text-slate-500">
                        {[selectedProgram.faculty, selectedProgram.department].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Badge variant="info">{selectedProgram.credential}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Duration</p>
                      <p className="mt-2 font-semibold text-brand-navy">{selectedProgram.duration}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Roadmap Coverage</p>
                      <p className="mt-2 font-semibold text-brand-navy">
                        {selectedProgram.roadmap?.level_count || 0} levels · {selectedProgram.roadmap?.total_courses || 0} courses
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedProgram.roadmap?.levels?.length ? (
                      selectedProgram.roadmap.levels.map(
                        (level: NonNullable<NonNullable<TertiaryOverview['programs'][number]['roadmap']>['levels']>[number]) => (
                        <div key={level.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
                            {level.periods.map(
                              (period: NonNullable<NonNullable<TertiaryOverview['programs'][number]['roadmap']>['levels']>[number]['periods'][number]) => (
                              <div key={period.id} className="rounded-2xl bg-white px-3 py-2">
                                <p className="text-sm font-semibold text-brand-navy">{period.name}</p>
                                <p className="text-xs text-slate-500">
                                  {period.courses
                                    .map(
                                      (
                                        course: NonNullable<
                                          NonNullable<
                                            TertiaryOverview['programs'][number]['roadmap']
                                          >['levels']
                                        >[number]['periods'][number]['courses'][number]
                                      ) => course.code
                                    )
                                    .join(', ') || 'No courses mapped'}
                                </p>
                              </div>
                              )
                            )}
                          </div>
                        </div>
                        )
                      )
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <p className="text-sm text-slate-600">
                          Link tertiary levels from Academic Setup when creating the program so the roadmap continues from level to semester to course.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">Supported credentials</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {credentials.map((credential: string) => (
                        <Badge key={credential} variant="info">
                          {credential}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-brand-navy">Progression rules</p>
                    <div className="mt-3 space-y-2">
                      {(data?.progression || []).map((rule: string) => (
                        <p key={rule} className="text-sm text-slate-500">
                          {rule}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : null}
          </Card>
        </div>
      </Card>

      <Modal open={facultyModalOpen} onOpenChange={setFacultyModalOpen} title="Add Faculty" description="Start the tertiary hierarchy with the faculty.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createFaculty.mutate(facultyForm);
          }}
        >
          <Input label="Faculty Name" value={facultyForm.name} onChange={(event) => setFacultyForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Faculty Code" value={facultyForm.code} onChange={(event) => setFacultyForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
          <Input label="Dean" value={facultyForm.dean} onChange={(event) => setFacultyForm((current) => ({ ...current, dean: event.target.value }))} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setFacultyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createFaculty.isPending}>
              Save Faculty
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={departmentModalOpen} onOpenChange={setDepartmentModalOpen} title="Add Department" description="Attach the department to a faculty.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createDepartment.mutate(departmentForm);
          }}
        >
          <Select label="Faculty" value={departmentForm.faculty_id} onChange={(event) => setDepartmentForm((current) => ({ ...current, faculty_id: event.target.value }))}>
            <option value="">Select faculty</option>
            {faculties.map((faculty: TertiaryOverview['faculties'][number]) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </Select>
          <Input label="Department Name" value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Department Code" value={departmentForm.code} onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDepartmentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createDepartment.isPending}>
              Save Department
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={programModalOpen} onOpenChange={setProgramModalOpen} title="Add Program" description="Define the program students will register against.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createProgram.mutate(programForm);
          }}
        >
          <Select label="Department" value={programForm.department_id} onChange={(event) => setProgramForm((current) => ({ ...current, department_id: event.target.value }))}>
            <option value="">Select department</option>
            {departments.map((department: TertiaryOverview['departments'][number]) => (
              <option key={department.id} value={department.id}>
                {department.name} ({department.faculty})
              </option>
            ))}
          </Select>
          <Input label="Program Name" value={programForm.name} onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Program Code" value={programForm.code} onChange={(event) => setProgramForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
          <Input label="Credential" value={programForm.credential} onChange={(event) => setProgramForm((current) => ({ ...current, credential: event.target.value }))} />
          <Input label="Duration" value={programForm.duration} onChange={(event) => setProgramForm((current) => ({ ...current, duration: event.target.value }))} />
          <Select label="Calendar" value={programForm.calendar} onChange={(event) => setProgramForm((current) => ({ ...current, calendar: event.target.value }))}>
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
                    <label key={group.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
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
            <Button type="button" variant="secondary" onClick={() => setProgramModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createProgram.isPending}>
              Save Program
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TertiaryManagementPage;
