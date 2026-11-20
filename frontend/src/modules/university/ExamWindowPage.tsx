import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface ExamWindow {
  id: string;
  name: string;
  year: number;
  period_id?: string | null;
  intake_id?: string | null;
  opens_on: string;
  closes_on: string;
  extended_until?: string | null;
}

interface ExamCourse {
  offering_id: string;
  code: string;
  name: string;
  lecturer_name: string;
  uploaded: boolean;
  approved: boolean;
}

interface ExamBoard {
  today: string;
  windows: ExamWindow[];
  courses: ExamCourse[];
  periods: Array<{ id: string; name: string }>;
  intakes: Array<{ id: string; name: string; year: number }>;
}

const ExamWindowPage = () => {
  const role = useAuthStore((state) => state.role);
  const canEdit = role === 'institution_admin' || role === 'super_admin';
  const queryClient = useQueryClient();
  const boardQuery = useQuery<ExamBoard>({
    queryKey: ['exam-board'],
    queryFn: eduovaApi.university.examBoard,
  });
  const board = boardQuery.data;
  const [form, setForm] = useState({
    name: '',
    year: String(new Date().getFullYear()),
    period_id: '',
    intake_id: '',
    opens_on: '',
    closes_on: '',
  });
  const [extensions, setExtensions] = useState<Record<string, string>>({});
  const saveWindow = useMutation({
    mutationFn: () => eduovaApi.university.saveWindow(form),
    onSuccess: () => {
      toast.success('Exam window saved.');
      queryClient.invalidateQueries({ queryKey: ['exam-board'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to save the exam window.')),
  });
  const extendWindow = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => eduovaApi.university.extendWindow(id, date),
    onSuccess: () => {
      toast.success('The closing date was extended. Lecturers can upload again until that date.');
      queryClient.invalidateQueries({ queryKey: ['exam-board'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to extend the window.')),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam window"
        description="Set the dates when lecturers must upload mid-semester and final results. After the window closes, a lecturer cannot upload until an admin extends the date. Coursework, tests, mocks and pre-mocks stay open."
      />
      {canEdit ? (
        <form
          className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveWindow.mutate();
          }}
        >
          <Input label="Window name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Academic year" type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Semester</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.period_id} onChange={(event) => setForm({ ...form, period_id: event.target.value })}>
              <option value="">All semesters</option>
              {(board?.periods || []).map((period: ExamBoard['periods'][number]) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Intake</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.intake_id} onChange={(event) => setForm({ ...form, intake_id: event.target.value })}>
              <option value="">All intakes</option>
              {(board?.intakes || []).map((intake: ExamBoard['intakes'][number]) => (
                <option key={intake.id} value={intake.id}>{intake.name} · {intake.year}</option>
              ))}
            </select>
          </label>
          <Input label="Opens" type="date" value={form.opens_on} onChange={(event) => setForm({ ...form, opens_on: event.target.value })} />
          <Input label="Closes" type="date" value={form.closes_on} onChange={(event) => setForm({ ...form, closes_on: event.target.value })} />
          <div className="flex items-end">
            <Button type="submit" loading={saveWindow.isPending}>Save window</Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {(board?.windows || []).map((window: ExamWindow) => {
          const closes = window.extended_until || window.closes_on;
          const open = board?.today && board.today >= window.opens_on && board.today <= closes;
          return (
            <div key={window.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{window.name}</p>
                  <p className="text-sm text-slate-500">
                    {window.year} · {window.opens_on} to {window.closes_on}
                    {window.extended_until ? ` · extended to ${window.extended_until}` : ''}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${open ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {open ? 'Open for final uploads' : 'Closed'}
                </span>
              </div>
              {canEdit ? (
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <Input
                    label="Extend closing date"
                    type="date"
                    value={extensions[window.id] || ''}
                    onChange={(event) => setExtensions((current) => ({ ...current, [window.id]: event.target.value }))}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => extendWindow.mutate({ id: window.id, date: extensions[window.id] })}
                    loading={extendWindow.isPending}
                  >
                    Extend
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Lecturer</th>
              <th className="px-4 py-3">Final uploaded</th>
              <th className="px-4 py-3">Approved</th>
            </tr>
          </thead>
          <tbody>
            {(board?.courses || []).map((course: ExamCourse) => (
              <tr key={course.offering_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold">{course.code} · {course.name}</td>
                <td className="px-4 py-3">{course.lecturer_name}</td>
                <td className="px-4 py-3">{course.uploaded ? 'Yes' : 'Not yet'}</td>
                <td className="px-4 py-3">{course.approved ? 'Published' : 'Waiting'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamWindowPage;
