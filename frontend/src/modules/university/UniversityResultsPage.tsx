import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

type ResultKind = 'quiz' | 'test' | 'coursework' | 'pre_mock' | 'mock' | 'midsem' | 'final_exam';

interface CourseResult {
  student_id: string;
  student_name?: string;
  course_code: string;
  course_name: string;
  period_id?: string | null;
  period_name: string;
  score: number;
  grade: string;
  gp: number | null;
  remark: string;
  failed: boolean;
}

interface SemesterSummary {
  student_id: string;
  period_id?: string | null;
  period_name: string;
  total_gp: number;
  gpa: number;
  courses: CourseResult[];
}

interface ResultsPayload {
  weights: Record<string, number>;
  students: Array<{ student_id: string; name: string; program_id?: string | null }>;
  courses: Array<{
    id: string;
    code: string;
    name: string;
    period_id?: string | null;
    period_name: string;
    program_id?: string | null;
  }>;
  summary: SemesterSummary[];
  current: CourseResult[];
  rewrites: CourseResult[];
}

interface PreviewRow {
  student_number: string;
  student_name: string;
  score: number | null;
  ok: boolean;
  reason: string;
}

interface PreviewPayload {
  ready: boolean;
  saved?: boolean;
  rows: PreviewRow[];
}

const TABS = [
  { id: 'coursework', label: 'Quizzes, tests and coursework' },
  { id: 'pre_mock', label: 'Pre-mock' },
  { id: 'mock', label: 'Mock' },
  { id: 'exams', label: 'Exams' },
  { id: 'current', label: 'Current grade' },
  { id: 'summary', label: 'Summary' },
] as const;

const kindForTab = (tab: string): ResultKind[] => {
  if (tab === 'coursework') return ['quiz', 'test', 'coursework'];
  if (tab === 'pre_mock') return ['pre_mock'];
  if (tab === 'mock') return ['mock'];
  if (tab === 'exams') return ['midsem', 'final_exam'];
  return [];
};

const UniversityResultsPage = () => {
  const role = useAuthStore((state) => state.role);
  const canEnter = role === 'institution_admin' || role === 'teacher' || role === 'super_admin';
  const canEditWeights = role === 'institution_admin' || role === 'super_admin';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('coursework');
  const [openSemester, setOpenSemester] = useState<string>('');
  const [form, setForm] = useState({
    student_id: '',
    offering_id: '',
    kind: 'quiz' as ResultKind,
    assessment_name: '',
    score: '',
    is_resit: false,
  });
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [sheetText, setSheetText] = useState('');
  const resultsQuery = useQuery<ResultsPayload>({
    queryKey: ['university-results'],
    queryFn: eduovaApi.university.results,
  });
  const data = resultsQuery.data as ResultsPayload | undefined;
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const activeWeights = weights || data?.weights || {};

  const selectedCourse = (data?.courses || []).find((course) => course.id === form.offering_id);
  const recordResult = useMutation({
    mutationFn: () =>
      eduovaApi.university.recordResult({
        student_id: form.student_id,
        offering_id: selectedCourse?.id,
        course_code: selectedCourse?.code,
        course_name: selectedCourse?.name,
        period_id: selectedCourse?.period_id,
        period_name: selectedCourse?.period_name,
        program_id: selectedCourse?.program_id,
        kind: form.kind,
        assessment_name: form.assessment_name,
        score: Number(form.score),
        max_score: 100,
        is_resit: form.is_resit,
      }),
    onSuccess: () => {
      toast.success(form.is_resit ? 'Resit recorded. The summary now uses this score.' : 'Result recorded.');
      setForm((current) => ({ ...current, score: '' }));
      queryClient.invalidateQueries({ queryKey: ['university-results'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to save this result.')),
  });
  const saveWeights = useMutation({
    mutationFn: () => eduovaApi.university.updateWeights(activeWeights),
    onSuccess: () => {
      toast.success('Assessment percentages saved.');
      queryClient.invalidateQueries({ queryKey: ['university-results'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to save the percentages.')),
  });
  const previewSheet = useMutation({
    mutationFn: () =>
      eduovaApi.university.previewResults({
        offering_id: form.offering_id,
        kind: form.kind,
        assessment_name: form.assessment_name,
        csv: sheetText,
      }),
    onSuccess: (result: PreviewPayload) => setPreview(result),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to read this file.')),
  });
  const commitSheet = useMutation({
    mutationFn: () =>
      eduovaApi.university.commitResults({
        offering_id: form.offering_id,
        kind: form.kind,
        assessment_name: form.assessment_name,
        period_name: selectedCourse?.period_name,
        csv: sheetText,
      }),
    onSuccess: (result: PreviewPayload) => {
      setPreview(result);
      if (result.ready && result.saved) {
        toast.success(
          form.kind === 'final_exam' || form.kind === 'midsem'
            ? 'Uploaded. Students will see it after the principal lecturer approves.'
            : 'Uploaded. Students can see these scores.'
        );
        queryClient.invalidateQueries({ queryKey: ['university-results'] });
      }
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to save this upload.')),
  });
  const downloadTemplate = async () => {
    if (!form.offering_id) {
      toast.error('Choose the course first.');
      return;
    }
    const blob = await eduovaApi.university.resultTemplate(form.offering_id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCourse?.code || 'results'}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const semesters = useMemo(() => data?.summary || [], [data?.summary]);
  const entryKinds = kindForTab(tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        description="Quizzes, tests, coursework, pre-mocks and mocks are visible as soon as they are accepted. Mid-semester and final exams stay hidden until a principal lecturer approves them. The final grade adds each accepted part by its percentage. Several tests of the same type are averaged. A resit replaces the failed score."
      />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
            onClick={() => {
              setTab(item.id);
              const kinds = kindForTab(item.id);
              if (kinds[0]) setForm((current) => ({ ...current, kind: kinds[0] }));
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {canEditWeights && tab === 'coursework' ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">How each part counts toward the final score</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {['quiz', 'test', 'coursework', 'mock', 'midsem', 'final_exam'].map((kind) => (
              <Input
                key={kind}
                label={`${kind.replace('_', ' ')} %`}
                type="number"
                value={String(activeWeights[kind] ?? 0)}
                onChange={(event) =>
                  setWeights({ ...activeWeights, [kind]: Number(event.target.value), pre_mock: 0 })
                }
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Mock starts at 0 until you change it. Pre-mock is never part of the final score.
          </p>
          <Button className="mt-4" onClick={() => saveWeights.mutate()} loading={saveWeights.isPending}>
            Save percentages
          </Button>
        </div>
      ) : null}

      {canEnter && entryKinds.length ? (
        <form
          className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            recordResult.mutate();
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Student</span>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
              value={form.student_id}
              onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))}
            >
              <option value="">Select student</option>
              {(data?.students || []).map((student: ResultsPayload['students'][number]) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Course</span>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
              value={form.offering_id}
              onChange={(event) => setForm((current) => ({ ...current, offering_id: event.target.value }))}
            >
              <option value="">Select course</option>
              {(data?.courses || []).map((course: ResultsPayload['courses'][number]) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Assessment</span>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
              value={form.kind}
              onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as ResultKind }))}
            >
              {entryKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Name, for example test 1 or end of semester"
            value={form.assessment_name}
            onChange={(event) => setForm((current) => ({ ...current, assessment_name: event.target.value }))}
          />
          <Input
            label="Score out of 100"
            type="number"
            value={form.score}
            onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.is_resit}
              onChange={(event) => setForm((current) => ({ ...current, is_resit: event.target.checked }))}
            />
            This is a resit and should replace the failed score
          </label>
          <div className="flex items-end">
            <Button type="submit" loading={recordResult.isPending}>
              Add manually
            </Button>
          </div>
        </form>
      ) : null}

      {canEnter && entryKinds.length ? (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Spreadsheet upload</p>
              <p className="text-sm text-slate-500">
                Download the template, fill student ID and score in Excel, then save it as CSV. Every student ID must be registered on this course this semester. One mistake blocks the whole file.
              </p>
            </div>
            <Button variant="secondary" onClick={downloadTemplate}>Download template</Button>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              setSheetText(text);
              setPreview(null);
            }}
          />
          {preview ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2">Student ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row: PreviewRow) => (
                    <tr key={`${row.student_number}-${row.student_name}`} className={row.ok ? '' : 'bg-rose-50 text-rose-800'}>
                      <td className="px-3 py-2">{row.student_number}</td>
                      <td className="px-3 py-2">{row.student_name}</td>
                      <td className="px-3 py-2">{row.score ?? ''}</td>
                      <td className="px-3 py-2">{row.ok ? 'Ready' : row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => previewSheet.mutate()}
              loading={previewSheet.isPending}
              disabled={!sheetText || !form.offering_id || !form.assessment_name}
            >
              Preview
            </Button>
            <Button
              onClick={() => commitSheet.mutate()}
              loading={commitSheet.isPending}
              disabled={!preview?.ready}
            >
              Confirm and save
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'current' ? (
        <ResultTable rows={data?.current || []} empty="No course result has been uploaded in the last 21 days." />
      ) : null}

      {tab === 'summary' ? (
        <div className="space-y-3">
          {(data?.rewrites || []).length ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <p className="font-semibold text-rose-800">Courses to be rewritten</p>
              <div className="mt-3 space-y-2">
                {(data?.rewrites || []).map((course: CourseResult) => (
                  <p key={`${course.student_id}-${course.course_code}`} className="text-sm text-rose-700">
                    {course.student_name ? `${course.student_name} · ` : ''}
                    {course.course_code} · {course.course_name} · {course.score} · {course.grade}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {semesters.map((semester: SemesterSummary) => {
            const key = `${semester.student_id}-${semester.period_id || semester.period_name}`;
            const open = openSemester === key;
            return (
              <div key={key} className="rounded-3xl border border-slate-200 bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenSemester(open ? '' : key)}
                >
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Total GP {semester.total_gp} · GPA {semester.gpa}
                    </span>
                    <span className="mt-1 block text-lg font-semibold text-slate-900">
                      {semester.courses[0]?.student_name || 'Student'} · {semester.period_name}
                    </span>
                  </span>
                  <span className="text-sm text-slate-500">{open ? 'Hide' : 'Show courses'}</span>
                </button>
                {open ? <ResultTable rows={semester.courses} empty="No courses in this semester yet." /> : null}
              </div>
            );
          })}
          {semesters.length === 0 ? <p className="text-sm text-slate-500">No results have been uploaded yet.</p> : null}
        </div>
      ) : null}

      {tab !== 'current' && tab !== 'summary' ? (
        <p className="text-sm text-slate-500">
          Online work can be entered here as well. Use Add manually when the quiz, test, practical, mock, or exam was
          done on paper.
        </p>
      ) : null}
    </div>
  );
};

const ResultTable = ({ rows, empty }: { rows: CourseResult[]; empty: string }) => {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-400">
          <tr>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Remark</th>
            <th className="px-4 py-3">GP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: CourseResult) => (
            <tr key={`${row.student_id}-${row.course_code}-${row.period_id || ''}`} className="border-t border-slate-100">
              <td className="px-4 py-3">{row.student_name || 'Student'}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{row.course_name}</td>
              <td className="px-4 py-3">{row.course_code}</td>
              <td className="px-4 py-3">{row.score}</td>
              <td className="px-4 py-3">{row.grade}</td>
              <td className="px-4 py-3">{row.remark}</td>
              <td className="px-4 py-3">{row.gp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UniversityResultsPage;
