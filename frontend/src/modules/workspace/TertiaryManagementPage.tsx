import { useQuery } from '@tanstack/react-query';
import { BookCopy, Building2, GraduationCap, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { getAcademicStructureLabel } from '../../lib/institution';

const TertiaryManagementPage = () => {
  const institution = useAuthStore((state) => state.institution);
  const { data, isLoading } = useQuery({
    queryKey: ['tertiary-overview'],
    queryFn: eduovaApi.tertiary.overview,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const credentials = institution?.settings?.tertiary?.credentials || [];
  const idFormat = institution?.settings?.tertiary?.id_format || 'FAC/DEPT/YEAR/SEQ';
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
        <Card title="Faculty and Department Structure" description="Registrar-level academic hierarchy.">
          <div className="space-y-4">
            {(data?.faculties || []).map((faculty: { id: string; name: string; dean: string; departments: number }) => (
              <div key={faculty.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-brand-navy">{faculty.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Dean: {faculty.dean}</p>
                  </div>
                  <Badge variant="info">{faculty.departments} departments</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data?.departments || [])
                    .filter((department: { faculty: string }) => department.faculty === faculty.name)
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
                {credentials.map((credential) => (
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
    </div>
  );
};

export default TertiaryManagementPage;
