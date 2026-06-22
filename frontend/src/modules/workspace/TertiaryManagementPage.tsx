import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookCopy, Building2, GraduationCap, ScanLine } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { getAcademicStructureLabel } from '../../lib/institution';

interface TertiaryOverview {
  faculties: Array<{ id: string; name: string; code: string; dean?: string | null }>;
  departments: Array<{ id: string; name: string; code: string; faculty_id: string; faculty: string }>;
  programs: Array<{
    id: string;
    name: string;
    credential: string;
    duration: string;
    calendar: string;
    faculty_id: string;
    department_id: string;
  }>;
  progression: string[];
  credentials: string[];
  id_format: string;
}

const TertiaryManagementPage = () => {
  const institution = useAuthStore((state) => state.institution);
  const queryClient = useQueryClient();
  const [facultyForm, setFacultyForm] = useState({ name: '', code: '', dean: '' });
  const [departmentForm, setDepartmentForm] = useState({ faculty_id: '', name: '', code: '' });
  const [programForm, setProgramForm] = useState({
    department_id: '',
    name: '',
    code: '',
    credential: 'Degree',
    duration: '4 years',
    calendar: 'semester',
  });
  const { data, isLoading } = useQuery<TertiaryOverview>({
    queryKey: ['tertiary-overview'],
    queryFn: eduovaApi.tertiary.overview,
  });
  const faculties = data?.faculties || [];
  const departments = data?.departments || [];
  const refreshOverview = () =>
    queryClient.invalidateQueries({ queryKey: ['tertiary-overview'] });

  const createFaculty = useMutation({
    mutationFn: eduovaApi.tertiary.createFaculty,
    onSuccess: () => {
      toast.success('Faculty created.');
      setFacultyForm({ name: '', code: '', dean: '' });
      void refreshOverview();
    },
    onError: () => toast.error('Unable to create faculty.'),
  });

  const createDepartment = useMutation({
    mutationFn: eduovaApi.tertiary.createDepartment,
    onSuccess: () => {
      toast.success('Department created.');
      setDepartmentForm({ faculty_id: '', name: '', code: '' });
      void refreshOverview();
    },
    onError: () => toast.error('Unable to create department.'),
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
      });
      void refreshOverview();
    },
    onError: () => toast.error('Unable to create program.'),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const credentials = data?.credentials || institution?.settings?.tertiary?.credentials || [];
  const idFormat = data?.id_format || institution?.settings?.tertiary?.id_format || 'FAC/DEPT/YEAR/SEQ';
  const calendarModel = getAcademicStructureLabel(institution);

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
            icon: BookCopy,
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

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Create Faculty" description="Start the tertiary hierarchy with the faculty.">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createFaculty.mutate(facultyForm);
            }}
          >
            <Input
              label="Faculty Name"
              value={facultyForm.name}
              onChange={(event) => setFacultyForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Faculty Code"
              value={facultyForm.code}
              onChange={(event) => setFacultyForm((current) => ({ ...current, code: event.target.value }))}
            />
            <Input
              label="Dean"
              value={facultyForm.dean}
              onChange={(event) => setFacultyForm((current) => ({ ...current, dean: event.target.value }))}
            />
            <Button type="submit" loading={createFaculty.isPending}>
              Save Faculty
            </Button>
          </form>
        </Card>

        <Card title="Create Department" description="Attach departments to the right faculty.">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createDepartment.mutate(departmentForm);
            }}
          >
            <Select
              label="Faculty"
              value={departmentForm.faculty_id}
              onChange={(event) =>
                setDepartmentForm((current) => ({ ...current, faculty_id: event.target.value }))
              }
            >
              <option value="">Select faculty</option>
              {faculties.map((faculty: { id: string; name: string }) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </Select>
            <Input
              label="Department Name"
              value={departmentForm.name}
              onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Department Code"
              value={departmentForm.code}
              onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value }))}
            />
            <Button type="submit" loading={createDepartment.isPending}>
              Save Department
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Create Program" description="Define the roadmap students will register against.">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createProgram.mutate(programForm);
            }}
          >
            <Select
              label="Department"
              value={programForm.department_id}
              onChange={(event) =>
                setProgramForm((current) => ({ ...current, department_id: event.target.value }))
              }
            >
              <option value="">Select department</option>
              {departments.map((department: { id: string; name: string; faculty: string }) => (
                <option key={department.id} value={department.id}>
                  {department.name} ({department.faculty})
                </option>
              ))}
            </Select>
            <Input
              label="Program Name"
              value={programForm.name}
              onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Program Code"
              value={programForm.code}
              onChange={(event) => setProgramForm((current) => ({ ...current, code: event.target.value }))}
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
              onChange={(event) => setProgramForm((current) => ({ ...current, duration: event.target.value }))}
            />
            <Select
              label="Calendar"
              value={programForm.calendar}
              onChange={(event) => setProgramForm((current) => ({ ...current, calendar: event.target.value }))}
            >
              <option value="semester">Semester</option>
              <option value="trimester">Trimester</option>
              <option value="block">Block</option>
            </Select>
            <Button type="submit" loading={createProgram.isPending}>
              Save Program
            </Button>
          </form>
        </Card>

        <Card title="Faculty and Department Structure" description="Registrar-level academic hierarchy.">
          <div className="space-y-4">
            {(data?.faculties || []).map((faculty: { id: string; name: string; dean?: string | null }) => (
              <div key={faculty.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-brand-navy">{faculty.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Dean: {faculty.dean || 'Not assigned yet'}</p>
                  </div>
                  <Badge variant="info">
                    {(data?.departments || []).filter((department: { faculty_id: string }) => department.faculty_id === faculty.id).length} departments
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data?.departments || [])
                    .filter((department: { faculty_id: string }) => department.faculty_id === faculty.id)
                    .map((department: { id: string; name: string; code: string }) => (
                      <Badge key={department.id} variant="success">
                        {department.code} · {department.name}
                      </Badge>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Programs and Progression Rules" description="Credential types, duration, and promotion logic.">
          <div className="space-y-3">
            {(data?.programs || []).map(
              (program: {
                id: string;
                name: string;
                credential: string;
                duration: string;
                calendar: string;
              }) => (
                <div
                  key={program.id}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{program.name}</p>
                      <p className="text-sm text-slate-500">
                        {program.duration} · {program.calendar}
                      </p>
                    </div>
                    <Badge variant="pending">{program.credential}</Badge>
                  </div>
                </div>
              )
            )}

            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-brand-navy">Supported credentials</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {credentials.map((credential: string) => (
                  <Badge key={credential} variant="info">
                    {credential}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {(data?.progression || []).map((rule: string) => (
                  <p key={rule} className="text-sm text-slate-500">
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          </div>
      </Card>
    </div>
  );
};

export default TertiaryManagementPage;
