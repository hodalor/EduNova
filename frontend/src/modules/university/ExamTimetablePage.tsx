import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface Sitting {
  id: string;
  offering_id: string;
  course_code: string;
  course_name: string;
  year: number;
  intake_id?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
}

interface BoardCourse {
  offering_id: string;
  code: string;
  name: string;
}

interface ExamBoard {
  sittings: Sitting[];
  courses: BoardCourse[];
  intakes: Array<{ id: string; name: string; year: number }>;
}

const ExamTimetablePage = () => {
  const role = useAuthStore((state) => state.role);
  const canEdit = role === 'institution_admin' || role === 'super_admin';
  const queryClient = useQueryClient();
  const boardQuery = useQuery<ExamBoard>({ queryKey: ['exam-board'], queryFn: eduovaApi.university.examBoard });
  const board = boardQuery.data;
  const [form, setForm] = useState({
    offering_id: '',
    year: String(new Date().getFullYear()),
    intake_id: '',
    date: '',
    start_time: '',
    end_time: '',
    venue: '',
  });
  const saveSitting = useMutation({
    mutationFn: () => {
      const course = (board?.courses || []).find((item: BoardCourse) => item.offering_id === form.offering_id);
      return eduovaApi.university.saveSitting({
        ...form,
        year: Number(form.year),
        collection: 'exam',
        course_code: course?.code,
        course_name: course?.name,
      });
    },
    onSuccess: () => {
      toast.success('Exam sitting added. It will show on the student docket.');
      queryClient.invalidateQueries({ queryKey: ['exam-board'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to save this sitting.')),
  });
  const removeSitting = useMutation({
    mutationFn: (id: string) => eduovaApi.university.removeSitting(id, 'exam'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-board'] }),
  });
  const intakeName = (id?: string | null) =>
    (board?.intakes || []).find((item: ExamBoard['intakes'][number]) => item.id === id)?.name || 'All intakes';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam timetable"
        description="Each sitting keeps its academic year and intake, so a new year does not replace the previous one. The date, time and venue appear on the student's exam docket."
        actions={<Button variant="secondary" onClick={() => window.print()}>Download or print</Button>}
      />
      {canEdit ? (
        <form
          className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveSitting.mutate();
          }}
        >
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Course</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.offering_id} onChange={(event) => setForm({ ...form, offering_id: event.target.value })}>
              <option value="">Select course</option>
              {(board?.courses || []).map((course: BoardCourse) => (
                <option key={course.offering_id} value={course.offering_id}>{course.code} · {course.name}</option>
              ))}
            </select>
          </label>
          <Input label="Academic year" type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Intake</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.intake_id} onChange={(event) => setForm({ ...form, intake_id: event.target.value })}>
              <option value="">All intakes</option>
              {(board?.intakes || []).map((intake: ExamBoard['intakes'][number]) => (
                <option key={intake.id} value={intake.id}>{intake.name}</option>
              ))}
            </select>
          </label>
          <Input label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <Input label="Start" type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
          <Input label="End" type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
          <Input label="Venue" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
          <div className="flex items-end">
            <Button type="submit" loading={saveSitting.isPending}>Add sitting</Button>
          </div>
        </form>
      ) : null}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Intake</th>
              <th className="px-4 py-3">Date / time</th>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Course</th>
              {canEdit ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {(board?.sittings || []).map((sitting: Sitting) => (
              <tr key={sitting.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{sitting.year}</td>
                <td className="px-4 py-3">{intakeName(sitting.intake_id)}</td>
                <td className="px-4 py-3">{sitting.date || 'Date to be announced'} · {sitting.start_time}{sitting.end_time ? ` - ${sitting.end_time}` : ''}</td>
                <td className="px-4 py-3">{sitting.venue}</td>
                <td className="px-4 py-3 font-semibold">{sitting.course_code} · {sitting.course_name}</td>
                {canEdit ? (
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => removeSitting.mutate(sitting.id)}>Remove</Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamTimetablePage;
