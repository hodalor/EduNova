import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileBadge2, PencilLine } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { formatCurrencyAmount, resolvePrimaryCurrencyCode } from '../../utils/currency';
import PageHeader from '../shared/PageHeader';
import { type StudentDetail, useStudent } from './hooks/useStudent';
import { useUpdateStudent } from './hooks/useUpdateStudent';

const attendanceColor = (value: number) =>
  value > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

interface TranscriptPayload {
  branding?: {
    institution_name?: string;
    tagline?: string;
    logo_url?: string;
    address_line_1?: string;
    address_line_2?: string;
    phone_primary?: string;
    phone_secondary?: string;
    email?: string;
    website?: string;
    registrar_name?: string;
    registrar_title?: string;
    signature_url?: string;
  };
  transcript_title?: string;
  generated_at?: string;
  issued_on?: string;
  degree_awarded?: string;
  total_courses_taken?: number;
  verification_code?: string;
  student?: {
    student_number?: string;
    name?: string;
    program_name?: string;
    department_name?: string;
    faculty_name?: string;
  };
  semesters: Array<Record<string, unknown>>;
  cgpa?: number;
  credit_hours?: number;
  final_classification?: string;
  grading_system?: {
    rules?: Array<{
      min_score: number;
      max_score: number;
      grade: string;
      gp?: number | null;
    }>;
    class_designations?: Array<{
      min_gpa: number;
      max_gpa: number;
      label: string;
    }>;
  };
}

interface TranscriptCourseRow {
  key: string;
  code: string;
  name: string;
  creditHours: number;
  score: number | null;
  grade: string;
  gp: number | null;
  tgp: number | null;
}

interface TranscriptSemesterSection {
  key: string;
  title: string;
  courses: TranscriptCourseRow[];
  courseCount: number;
  totalCreditHours: number;
  sgp: number | null;
  gpa: number | null;
  cgpa: number | null;
}

interface TranscriptGradeRule {
  min_score: number;
  max_score: number;
  grade: string;
  gp?: number | null;
}

interface TranscriptClassDesignation {
  min_gpa: number;
  max_gpa: number;
  label: string;
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const pickText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const formatTranscriptDate = (value?: string) => {
  if (!value) {
    return 'Pending';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const normalizeTranscriptCourse = (value: unknown, index: number): TranscriptCourseRow => {
  const row = asObject(value);
  return {
    key: pickText(row.id, row.code, row.course_code, `course-${index + 1}`),
    code: pickText(row.code, row.course_code, row.subject_code, row.offering_code, `COURSE ${index + 1}`),
    name: pickText(row.name, row.course_name, row.subject_name, row.title, 'Untitled Course'),
    creditHours:
      pickNumber(row.credit_hours, row.creditHours, row.hrs, row.hours, row.credit) ?? 0,
    score: pickNumber(row.score, row.final_score, row.total_score, row.mark, row.marks),
    grade: pickText(row.grade, row.letter_grade, '—') || '—',
    gp: pickNumber(row.gp, row.grade_point),
    tgp: pickNumber(row.tgp, row.total_grade_points, row.sgp),
  };
};

const normalizeTranscriptSemester = (value: unknown, index: number): TranscriptSemesterSection => {
  const row = asObject(value);
  const courseRows = asArray(row.courses).length
    ? asArray(row.courses)
    : asArray(row.results).length
      ? asArray(row.results)
      : asArray(row.offerings).length
        ? asArray(row.offerings)
        : asArray(row.course_rows);
  const courses = courseRows.map(normalizeTranscriptCourse);
  const levelLabel = pickText(row.level_name, row.level, row.group_name, row.class_name);
  const periodLabel = pickText(row.semester, row.term, row.period_name, row.name, `Semester ${index + 1}`);
  const title = [levelLabel, periodLabel].filter(Boolean).join(' - ') || `Semester ${index + 1}`;
  const totalCreditHours =
    pickNumber(row.credit_hours, row.total_credit_hours, row.thrs) ??
    courses.reduce((sum, course) => sum + course.creditHours, 0);
  const sgp =
    pickNumber(row.sgp, row.total_grade_points, row.semester_grade_points) ??
    (courses.some((course) => course.tgp !== null)
      ? Number(
          courses.reduce((sum, course) => sum + Number(course.tgp || 0), 0).toFixed(2)
        )
      : null);

  return {
    key: pickText(row.id, row.semester, row.term, `semester-${index + 1}`),
    title,
    courses,
    courseCount:
      pickNumber(row.course_count, row.completed_courses, row.total_courses) ?? courses.length,
    totalCreditHours,
    sgp,
    gpa: pickNumber(row.gpa, row.semester_gpa),
    cgpa: pickNumber(row.cgpa, row.cumulative_gpa),
  };
};

const StudentDetailPage = () => {
  const { studentId = 'stu-001' } = useParams();
  const location = useLocation();
  const initialTab = location.hash.replace('#', '').trim() || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    allergies: '',
    bloodGroup: '',
    medicalNotes: '',
  });
  const { data, isLoading, isError, refetch } = useStudent(studentId);
  const isTertiaryStudent = Boolean(data && (data.level === 'TR' || data.tertiary));
  const transcriptQuery = useQuery<TranscriptPayload>({
    queryKey: ['student-transcript', studentId],
    queryFn: () => eduovaApi.tertiary.transcript(studentId),
    enabled: Boolean(studentId && isTertiaryStudent),
    retry: false,
  });
  const updateStudent = useUpdateStudent();
  const transcriptSections = useMemo(
    () =>
      ((transcriptQuery.data?.semesters || []) as Array<Record<string, unknown>>).map(
        (semester: Record<string, unknown>, index: number) =>
        normalizeTranscriptSemester(semester, index)
      ),
    [transcriptQuery.data]
  );
  const transcriptTotals = useMemo(() => {
    const totalCourses =
      transcriptQuery.data?.total_courses_taken ||
      transcriptSections.reduce(
        (sum: number, section: TranscriptSemesterSection) => sum + section.courseCount,
        0
      );
    const totalCreditHours =
      Number(transcriptQuery.data?.credit_hours || 0) ||
      transcriptSections.reduce(
        (sum: number, section: TranscriptSemesterSection) => sum + section.totalCreditHours,
        0
      );
    return {
      totalCourses,
      totalCreditHours,
      cgpa: Number(transcriptQuery.data?.cgpa || 0),
    };
  }, [transcriptQuery.data, transcriptSections]);

  useEffect(() => {
    if (!data) return;
    setFormValues({
      fullName: data.name || '',
      guardianName: data.guardian?.name || '',
      guardianPhone: data.guardian?.phone || '',
      guardianRelation: data.guardian?.relation || '',
      allergies: data.medical?.allergies || '',
      bloodGroup: data.medical?.bloodGroup || '',
      medicalNotes: data.medical?.notes || '',
    });
  }, [data]);

  useEffect(() => {
    const nextTab = location.hash.replace('#', '').trim();
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [location.hash]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load student profile"
        message="Refresh the student page to retry."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const outstandingBalance = data.invoices.reduce(
    (sum: number, invoice: StudentDetail['invoices'][number]) => sum + invoice.balance,
    0
  );
  const availableCredit = data.invoices.reduce(
    (max: number, invoice: StudentDetail['invoices'][number]) =>
      Math.max(max, Number(invoice.credit_balance || 0)),
    0
  );
  const netOutstandingBalance = Math.max(outstandingBalance - availableCredit, 0);
  const primaryCurrencyCode = resolvePrimaryCurrencyCode(data.invoices);
  const tertiaryRoadmap = data.tertiary?.roadmap || null;
  const currentLevelId = data.tertiary?.current_level?.id || null;
  const currentPeriodId = data.tertiary?.current_period?.id || null;
  type RoadmapLevel = NonNullable<
    NonNullable<NonNullable<StudentDetail['tertiary']>['roadmap']>['levels']
  >[number];
  type RoadmapPeriod = NonNullable<RoadmapLevel['periods']>[number];
  type RoadmapChartPeriod = RoadmapPeriod & { levelId: string; levelName: string };
  const roadmapPeriods =
    tertiaryRoadmap?.levels.flatMap((level: RoadmapLevel) =>
      level.periods.map((period: RoadmapPeriod) => ({
        ...period,
        levelId: level.id,
        levelName: level.name,
      }))
    ) || [];
  const presentDays = data.attendanceCalendar.filter((item: StudentDetail['attendanceCalendar'][number]) => item.value > 0).length;
  const absentDays = data.attendanceCalendar.filter((item: StudentDetail['attendanceCalendar'][number]) => item.value <= 0).length;
  const attendanceRate = presentDays + absentDays > 0 ? Math.round((presentDays / (presentDays + absentDays)) * 100) : 0;
  const openIncidents = data.discipline.filter((item: StudentDetail['discipline'][number]) => item.status !== 'resolved').length;
  const resolvedIncidents = data.discipline.filter((item: StudentDetail['discipline'][number]) => item.status === 'resolved').length;
  const handleFieldChange = (key: keyof typeof formValues, value: string) =>
    setFormValues((current) => ({ ...current, [key]: value }));
  const handleTranscriptExport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };
  const transcriptVerificationUrl =
    typeof window !== 'undefined' && transcriptQuery.data?.verification_code
      ? `${window.location.origin}/transcript/verify/${encodeURIComponent(
          transcriptQuery.data.verification_code
        )}`
      : '';
  const handleEditSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    try {
      await updateStudent.mutateAsync({
        studentId: data.id,
        full_name: formValues.fullName,
        guardian_name: formValues.guardianName,
        guardian_phone: formValues.guardianPhone,
        guardian_relation: formValues.guardianRelation,
        allergies: formValues.allergies,
        blood_group: formValues.bloodGroup,
        medical_notes: formValues.medicalNotes,
      });
      setIsEditing(false);
    } catch (_error) {
      // Toast feedback is handled in the mutation hook.
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.student_number} · ${data.className} · ${data.level}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to={`/students/${data.id}/id-card`}>
              <Button variant="secondary" leftIcon={<FileBadge2 className="h-4 w-4" />}>
                Generate ID Card
              </Button>
            </Link>
            <Button
              leftIcon={<PencilLine className="h-4 w-4" />}
              onClick={() => {
                void handleEditSave();
              }}
              loading={updateStudent.isPending}
            >
              {isEditing ? 'Save Profile' : 'Edit Profile'}
            </Button>
          </div>
        }
      />

      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={data.name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-brand-navy">{data.name}</h2>
              <Badge variant={data.status === 'active' ? 'success' : 'warning'}>{data.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Guardian: {data.guardian.name} · {data.guardian.phone}
            </p>
          </div>
          <div className="surface-muted p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding Balance</p>
            <p className="mt-2 text-3xl font-bold text-rose-500">
              {formatCurrencyAmount(primaryCurrencyCode, outstandingBalance)}
            </p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          {isTertiaryStudent ? <TabsTrigger value="transcript">Transcript</TabsTrigger> : null}
          <TabsTrigger value="roadmap">Road Map</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Personal Information" description={isEditing ? 'Editing is enabled. Save when you are done.' : 'Locked until you click Edit Profile.'}>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={formValues.fullName}
                  onChange={(event) => handleFieldChange('fullName', event.target.value)}
                  disabled={!isEditing}
                />
                <Input label="Student Number" value={data.student_number} disabled />
                <Input label="Current Class" value={data.className} disabled />
              </div>
            </Card>
            <Card title="Guardian Information" description="Primary guardian and emergency contact.">
              <div className="space-y-4">
                <Input
                  label="Guardian Name"
                  value={formValues.guardianName}
                  onChange={(event) => handleFieldChange('guardianName', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Phone"
                  value={formValues.guardianPhone}
                  onChange={(event) => handleFieldChange('guardianPhone', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Relationship"
                  value={formValues.guardianRelation}
                  onChange={(event) => handleFieldChange('guardianRelation', event.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </Card>
            <Card title="Medical Information" description="Medical alerts, restrictions, and notes.">
              <div className="space-y-4">
                <Input
                  label="Allergies"
                  value={formValues.allergies}
                  onChange={(event) => handleFieldChange('allergies', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Blood Group"
                  value={formValues.bloodGroup}
                  onChange={(event) => handleFieldChange('bloodGroup', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Notes"
                  value={formValues.medicalNotes}
                  onChange={(event) => handleFieldChange('medicalNotes', event.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
              <Card title="GPA Trend" description="Trend across recent academic terms.">
                {data.academicTrend.length === 0 ? (
                  <EmptyState
                    title="No academic records yet"
                    message="This student does not have published results yet, so no academic trend is available."
                  />
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.academicTrend}>
                        <XAxis dataKey="term" stroke="#64748B" />
                        <YAxis stroke="#64748B" domain={[0, 4]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="gpa" stroke="#0F1B3C" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              <Card title="Current Academic Snapshot" description="Overview of the student's current study context.">
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      {data.tertiary?.program_name ? 'Level' : 'Class'}
                    </p>
                    <p className="mt-2 font-semibold text-brand-navy">{data.className}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Academic Status</p>
                    <p className="mt-2">
                      {data.academicTrend.length > 0 ? 'Published records available' : 'Awaiting first published result'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Current GPA</p>
                    <p className="mt-2 font-semibold text-brand-navy">
                      {data.academicTrend[data.academicTrend.length - 1]?.gpa ?? 0}
                    </p>
                  </div>
                  {data.tertiary?.program_name ? (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program</p>
                      <p className="mt-2 font-semibold text-brand-navy">{data.tertiary.program_name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[data.tertiary.faculty_name, data.tertiary.department_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>

          </div>
        </TabsContent>

        <TabsContent value="transcript">
          <div className="space-y-6">
            {!isTertiaryStudent ? null : transcriptQuery.isLoading ? (
              <PageLoader />
            ) : transcriptQuery.isError ? (
              <Alert
                title="Transcript unavailable"
                message="We could not load the transcript record for this tertiary student yet. Confirm the tertiary profile and result history, then try again."
                variant="warning"
                action={<Button onClick={() => transcriptQuery.refetch()}>Retry</Button>}
              />
            ) : transcriptQuery.data ? (
              <Card
                title="Official Transcript"
                description="Letterhead, grading system, and print-ready transcript layout for this tertiary student."
                action={
                  <div className="flex flex-wrap gap-2 print:hidden">
                    {transcriptVerificationUrl ? (
                      <a href={transcriptVerificationUrl} target="_blank" rel="noreferrer">
                        <Button variant="secondary">Open Verification Page</Button>
                      </a>
                    ) : null}
                    <Button
                      variant="secondary"
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={handleTranscriptExport}
                    >
                      Print / Save PDF
                    </Button>
                  </div>
                }
                className="print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
              >
                <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-black print:max-w-none print:rounded-none print:border-0 print:p-0">
                  <div className="relative overflow-hidden rounded-3xl border border-slate-200 p-6 print:rounded-none">
                    {transcriptQuery.data.branding?.logo_url ? (
                      <img
                        src={transcriptQuery.data.branding.logo_url}
                        alt=""
                        className="pointer-events-none absolute inset-0 m-auto h-80 w-80 opacity-[0.04]"
                      />
                    ) : null}

                    <div className="relative space-y-5">
                      <div className="flex items-start gap-4 border-b-2 border-slate-300 pb-5">
                        {transcriptQuery.data.branding?.logo_url ? (
                          <img
                            src={transcriptQuery.data.branding.logo_url}
                            alt="Institution logo"
                            className="h-20 w-20 rounded-2xl object-cover"
                          />
                        ) : null}
                        <div className="flex-1 text-center">
                          <p className="text-2xl font-bold uppercase tracking-[0.12em] text-brand-navy">
                            {transcriptQuery.data.branding?.institution_name || 'Institution'}
                          </p>
                          <p className="mt-1 text-lg font-medium text-slate-600">
                            {transcriptQuery.data.branding?.tagline || 'Official institution transcript'}
                          </p>
                          <p className="mt-4 text-base font-semibold uppercase tracking-[0.18em] text-slate-700">
                            {transcriptQuery.data.transcript_title || 'Official Academic Transcript'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 border-b border-slate-300 pb-4 text-sm md:grid-cols-2">
                        <div className="space-y-1">
                          <p>{transcriptQuery.data.branding?.address_line_1 || '-'}</p>
                          <p>{transcriptQuery.data.branding?.address_line_2 || '-'}</p>
                          <p>{transcriptQuery.data.branding?.website || '-'}</p>
                        </div>
                        <div className="space-y-1 text-left md:text-right">
                          <p>{transcriptQuery.data.branding?.phone_primary || '-'}</p>
                          <p>{transcriptQuery.data.branding?.phone_secondary || '-'}</p>
                          <p>{transcriptQuery.data.branding?.email || '-'}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto]">
                        <div className="space-y-2">
                          <p>
                            <span className="font-semibold uppercase">Student ID Number:</span>{' '}
                            {transcriptQuery.data.student?.student_number || data.student_number}
                          </p>
                          <p>
                            <span className="font-semibold uppercase">Student Name:</span>{' '}
                            {transcriptQuery.data.student?.name || data.name}
                          </p>
                          <p>
                            <span className="font-semibold uppercase">Program:</span>{' '}
                            {transcriptQuery.data.student?.program_name || data.tertiary?.program_name || 'Not assigned'}
                          </p>
                        </div>
                        <div className="space-y-2 text-left md:text-right">
                          <p>
                            <span className="font-semibold uppercase">Issued:</span>{' '}
                            {formatTranscriptDate(transcriptQuery.data.issued_on || transcriptQuery.data.generated_at)}
                          </p>
                          <p>
                            <span className="font-semibold uppercase">Classification:</span>{' '}
                            {transcriptQuery.data.final_classification || 'Pending'}
                          </p>
                          <p>
                            <span className="font-semibold uppercase">Code:</span>{' '}
                            {transcriptQuery.data.verification_code || 'Pending'}
                          </p>
                          {transcriptVerificationUrl ? (
                            <p className="break-all text-xs text-slate-500">
                              <span className="font-semibold uppercase text-slate-700">Verify At:</span>{' '}
                              {transcriptVerificationUrl}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-5">
                        {transcriptSections.map((section: TranscriptSemesterSection) => (
                          <div key={section.key} className="border-t-2 border-slate-300 pt-4">
                            <p className="text-base font-semibold uppercase tracking-[0.1em] text-slate-800">
                              {section.title}
                            </p>
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-300">
                                    {['Course(s)', 'Hrs', 'Score', 'Grade', 'GP', 'TGP'].map((label) => (
                                      <th
                                        key={label}
                                        className="px-3 py-2 text-left font-semibold uppercase text-slate-700"
                                      >
                                        {label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.courses.length ? (
                                    section.courses.map((course: TranscriptCourseRow) => (
                                      <tr key={course.key} className="border-b border-slate-100">
                                        <td className="px-3 py-2">
                                          <span className="font-semibold">{course.code}</span>{' '}
                                          {course.name}
                                        </td>
                                        <td className="px-3 py-2">{course.creditHours}</td>
                                        <td className="px-3 py-2">
                                          {course.score === null ? '—' : course.score}
                                        </td>
                                        <td className="px-3 py-2">{course.grade}</td>
                                        <td className="px-3 py-2">
                                          {course.gp === null ? '—' : course.gp.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2">
                                          {course.tgp === null ? '—' : course.tgp.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td className="px-3 py-4 text-slate-500" colSpan={6}>
                                        No course rows were stored for this semester yet. The transcript summary is still available.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-3 grid gap-3 border-t border-slate-300 pt-3 text-sm font-medium md:grid-cols-4">
                              <p>Course(s) Completed: {section.courseCount}</p>
                              <p>THRS: {section.totalCreditHours}</p>
                              <p>SGP: {section.sgp === null ? '—' : section.sgp.toFixed(2)}</p>
                              <p>GPA: {(section.gpa ?? section.cgpa) === null ? '—' : Number(section.gpa ?? section.cgpa).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-4 border-t-2 border-slate-300 pt-5 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Total Courses Taken
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-brand-navy">
                            {transcriptTotals.totalCourses}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Total Credit Hrs
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-brand-navy">
                            {transcriptTotals.totalCreditHours}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Cumulative GPA
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-brand-navy">
                            {transcriptTotals.cgpa.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-6 border-t border-slate-300 pt-5 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                            Degree Awarded
                          </p>
                          <p className="text-lg font-semibold text-brand-navy">
                            {transcriptQuery.data.degree_awarded || transcriptQuery.data.student?.program_name || 'Pending'}
                          </p>
                          <p className="text-base font-medium text-slate-700">
                            {transcriptQuery.data.final_classification || 'Pending'}
                          </p>
                        </div>
                        <div className="min-w-[240px] space-y-2 text-center">
                          {transcriptQuery.data.branding?.signature_url ? (
                            <img
                              src={transcriptQuery.data.branding.signature_url}
                              alt="Registrar signature"
                              className="mx-auto h-20 object-contain"
                            />
                          ) : (
                            <div className="h-20 border-b border-dashed border-slate-400" />
                          )}
                          <p className="font-semibold uppercase text-slate-700">
                            {transcriptQuery.data.branding?.registrar_name || 'Registrar'}
                          </p>
                          <p className="text-sm uppercase tracking-[0.12em] text-slate-500">
                            {transcriptQuery.data.branding?.registrar_title || 'Office Of Admissions And Records'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 border-t border-slate-300 pt-5 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                            Grading System
                          </p>
                          <div className="mt-3 space-y-2 text-sm">
                            {(
                              (transcriptQuery.data.grading_system?.rules || []) as TranscriptGradeRule[]
                            ).map((rule: TranscriptGradeRule, index: number) => (
                              <div key={`grade-rule-${index}`} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                                <span>
                                  {rule.min_score} - {rule.max_score}%
                                </span>
                                <span className="font-semibold">
                                  {rule.grade}
                                  {rule.gp !== null && rule.gp !== undefined ? ` (${Number(rule.gp).toFixed(2)})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                            Class Designation
                          </p>
                          <div className="mt-3 space-y-2 text-sm">
                            {(
                              (transcriptQuery.data.grading_system?.class_designations || []) as TranscriptClassDesignation[]
                            ).map((item: TranscriptClassDesignation, index: number) => (
                              <div key={`designation-${index}`} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                                <span>
                                  {item.min_gpa.toFixed(2)} - {item.max_gpa.toFixed(2)}
                                </span>
                                <span className="font-semibold">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState
                title="No transcript yet"
                message="This tertiary student does not have a generated transcript record yet."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="roadmap">
          {tertiaryRoadmap ? (
            <div className="space-y-6">
              <Card
                title="Program Road Map"
                description="Follow the student's faculty, department, program, levels, semesters, and courses to graduation."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Faculty</p>
                    <p className="mt-2 font-semibold text-brand-navy">{data.tertiary?.faculty_name || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Department</p>
                    <p className="mt-2 font-semibold text-brand-navy">{data.tertiary?.department_name || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program</p>
                    <p className="mt-2 font-semibold text-brand-navy">{data.tertiary?.program_name || 'Not assigned'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Current Level</p>
                    <p className="mt-2 font-semibold text-brand-navy">{data.tertiary?.current_level?.name || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Current Semester</p>
                    <p className="mt-2 font-semibold text-brand-navy">{data.tertiary?.current_period?.name || 'Not set'}</p>
                  </div>
                </div>
              </Card>

              <Card
                title="Levels And Courses"
                description="Each level shows its semesters and the courses the student is expected to complete."
              >
                <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {roadmapPeriods.map((period: RoadmapChartPeriod) => {
                    const isCurrentPeriod = currentPeriodId === period.id;
                    const isCompleted = Boolean(period.is_completed);

                    return (
                      <div
                        key={`chart-${period.id}`}
                        className={`rounded-3xl border p-4 ${
                          isCompleted
                            ? 'border-emerald-300 bg-emerald-50'
                            : isCurrentPeriod
                              ? 'border-brand-navy bg-brand-navy/[0.03]'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                              {period.levelName}
                            </p>
                            <p className="mt-1 font-semibold text-brand-navy">{period.name}</p>
                          </div>
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                          ) : null}
                        </div>
                        <p className="mt-4 text-3xl font-semibold text-brand-navy">
                          {Number(period.completion_percent || 0)}%
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {Number(period.completed_courses || 0)} of {Number(period.total_courses || 0)} courses cleared
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4">
                  {tertiaryRoadmap.levels.map(
                    (
                      level: NonNullable<
                        NonNullable<NonNullable<StudentDetail['tertiary']>['roadmap']>['levels']
                      >[number]
                    ) => {
                      const isCurrentLevel = currentLevelId === level.id;

                      return (
                      <div
                        key={level.id}
                        className={`rounded-3xl border p-4 ${
                          isCurrentLevel
                            ? 'border-brand-navy bg-brand-navy/[0.03]'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-brand-navy">{level.name}</p>
                              {isCurrentLevel ? <Badge variant="active">Current level</Badge> : null}
                            </div>
                            <p className="text-sm text-slate-500">{level.code}</p>
                          </div>
                          <Badge variant="info">
                            {level.periods.reduce((sum, period) => sum + period.courses.length, 0)} courses
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          {level.periods.map(
                            (
                              period: NonNullable<
                                NonNullable<
                                  NonNullable<NonNullable<StudentDetail['tertiary']>['roadmap']>['levels']
                                >[number]['periods']
                              >[number]
                            ) => {
                              const isCurrentPeriod = currentPeriodId === period.id;

                              return (
                              <div
                                key={period.id}
                                className={`rounded-2xl p-4 ${
                                  isCurrentPeriod
                                    ? 'border border-brand-navy bg-white shadow-sm'
                                    : 'bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-brand-navy">{period.name}</p>
                                    {isCurrentPeriod ? (
                                      <Badge variant="active">Current semester</Badge>
                                    ) : null}
                                  </div>
                                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    {period.status}
                                  </span>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {period.courses.length ? (
                                    period.courses.map(
                                      (
                                        course: NonNullable<
                                          NonNullable<
                                            NonNullable<
                                              NonNullable<
                                                NonNullable<StudentDetail['tertiary']>['roadmap']
                                              >['levels']
                                            >[number]['periods']
                                          >[number]['courses']
                                        >[number]
                                      ) => (
                                        <div
                                          key={course.id}
                                          className={`rounded-2xl border px-3 py-2 ${
                                            course.completed
                                              ? 'border-emerald-200 bg-emerald-50'
                                              : course.outstanding
                                                ? 'border-amber-200 bg-amber-50'
                                                : 'border-slate-200 bg-white'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-semibold text-brand-navy">{course.name}</p>
                                              <p className="text-xs text-slate-500">
                                                {course.code}
                                                {course.credit_hours ? ` · ${course.credit_hours} credits` : ''}
                                              </p>
                                            </div>
                                            {course.completed ? (
                                              <Badge variant="active">Cleared</Badge>
                                            ) : course.outstanding ? (
                                              <Badge variant="info">Carry-over</Badge>
                                            ) : (
                                              <Badge variant="inactive">Pending</Badge>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <p className="text-sm text-slate-500">
                                      No courses mapped yet for this semester.
                                    </p>
                                  )}
                                </div>
                              </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                      );
                    }
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <EmptyState
              title="No road map available yet"
              message="This student does not have a tertiary program roadmap linked yet."
            />
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            <Card title="Attendance Summary" description="Current term attendance performance.">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Present Days</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">{presentDays}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Absent Days</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">{absentDays}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Attendance Rate</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{attendanceRate}%</p>
                </div>
              </div>
            </Card>
            <Card title="Calendar Heatmap" description="Recent attendance markers by date.">
              {data.attendanceCalendar.length === 0 ? (
                <EmptyState
                  title="No attendance records yet"
                  message="Attendance for this student will appear here after the first marked session."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(data.attendanceCalendar as StudentDetail['attendanceCalendar']).map((item) => (
                    <div
                      key={item.date}
                      className={`rounded-2xl p-4 text-sm ${attendanceColor(item.value)}`}
                    >
                      <p className="font-semibold">{item.date}</p>
                      <p className="mt-2">{item.value ? 'Present' : 'Absent'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance">
          <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <Table<StudentDetail['invoices'][number]>
              title="Invoices"
              data={data.invoices}
              columns={[
                { header: 'Invoice', accessorKey: 'invoice_number' },
                {
                  header: 'Total',
                  cell: ({ row }) =>
                    formatCurrencyAmount(row.original.currency_code || primaryCurrencyCode, row.original.total),
                },
                {
                  header: 'Paid',
                  cell: ({ row }) =>
                    formatCurrencyAmount(row.original.currency_code || primaryCurrencyCode, row.original.paid),
                },
                {
                  header: 'Balance',
                  cell: ({ row }) => {
                    const netBalance = Number(row.original.net_balance ?? row.original.balance ?? 0);
                    return formatCurrencyAmount(
                      row.original.currency_code || primaryCurrencyCode,
                      netBalance
                    );
                  },
                },
                {
                  header: 'Status',
                  cell: ({ row }) => (
                    <Badge
                      variant={
                        row.original.status === 'paid'
                          ? 'success'
                          : row.original.status === 'partial'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {row.original.status}
                    </Badge>
                  ),
                },
              ]}
            />
            <Card title="Payment History" description="Most recent payment posture and next steps.">
              <div className="space-y-4">
                <div
                  className={`rounded-2xl p-4 ${
                    netOutstandingBalance > 0 ? 'bg-rose-50' : availableCredit > 0 ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-[0.14em] ${
                      netOutstandingBalance > 0
                        ? 'text-rose-500'
                        : availableCredit > 0
                          ? 'text-emerald-500'
                          : 'text-slate-500'
                    }`}
                  >
                    {netOutstandingBalance > 0 ? 'Outstanding' : availableCredit > 0 ? 'Credit Balance' : 'Finance Position'}
                  </p>
                  <p
                    className={`mt-2 text-3xl font-bold ${
                      netOutstandingBalance > 0
                        ? 'text-rose-600'
                        : availableCredit > 0
                          ? 'text-emerald-600'
                          : 'text-brand-navy'
                    }`}
                  >
                    {formatCurrencyAmount(
                      primaryCurrencyCode,
                      netOutstandingBalance > 0 ? netOutstandingBalance : availableCredit
                    )}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {netOutstandingBalance > 0
                    ? 'Payment reminders are recommended before the next fee checkpoint.'
                    : availableCredit > 0
                      ? 'This learner has a positive finance credit that can offset the next invoice.'
                      : 'No outstanding balance at the moment.'}
                </div>
                <Button>Record Payment</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discipline">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Table<StudentDetail['discipline'][number]>
              title="Incident History"
              data={data.discipline}
              columns={[
                { header: 'Category', accessorKey: 'category' },
                { header: 'Points', accessorKey: 'points' },
                { header: 'Date', accessorKey: 'date' },
                { header: 'Status', accessorKey: 'status' },
              ]}
            />
            <Card title="Behavior Score" description="Current merit and demerit standing.">
              <div className="space-y-3">
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Incidents Logged</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">{data.discipline.length}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Open Cases</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">{openIncidents}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Resolved</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{resolvedIncidents}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Table<StudentDetail['documents'][number]>
              title="Uploaded Documents"
              data={data.documents}
              columns={[
                { header: 'Document Name', accessorKey: 'name' },
                { header: 'Type', accessorKey: 'type' },
                {
                  header: 'Action',
                  cell: () => (
                    <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
                      Download
                    </Button>
                  ),
                },
              ]}
            />
            <Card title="Archives" description="Generate identity assets and maintain records.">
              <div className="space-y-4">
                <Button>Generate ID Card</Button>
                <Button variant="secondary">Open Report Card Archive</Button>
                <FileUpload />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDetailPage;
