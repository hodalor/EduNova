import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface Slot {
  id: string;
  year: number;
  intake_id?: string | null;
  day: string;
  start_time: string;
  end_time: string;
  venue: string;
  course_code: string;
  course_name: string;
}

interface Board {
  lectures: Slot[];
  courses: Array<{ offering_id: string; code: string; name: string; lecturer_name?: string }>;
  intakes: Array<{ id: string; name: string; year: number }>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LectureTimetablePage = () => {
  const role = useAuthStore((state) => state.role);
  const canEdit = role === 'institution_admin' || role === 'super_admin';
  const queryClient = useQueryClient();
  const boardQuery = useQuery<Board>({ queryKey: ['exam-board'], queryFn: eduovaApi.university.examBoard });
  const board = boardQuery.data;
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({
    offering_id: '',
    year: String(new Date().getFullYear()),
    intake_id: '',
    day: 'Monday',
    start_time: '',
    end_time: '',
    venue: '',
  });
  const saveSlot = useMutation({
    mutationFn: () => {
      const course = (board?.courses || []).find((item: Board['courses'][number]) => item.offering_id === form.offering_id);
      return eduovaApi.university.saveSitting({
        ...form,
        year: Number(form.year),
        collection: 'lecture',
        course_code: course?.code,
        course_name: course?.name,
      });
    },
    onSuccess: () => {
      toast.success('Lecture slot saved for that year and intake.');
      queryClient.invalidateQueries({ queryKey: ['exam-board'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to save this lecture slot.')),
  });
  const removeSlot = useMutation({
    mutationFn: (id: string) => eduovaApi.university.removeSitting(id, 'lecture'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-board'] }),
  });
  const years = useMemo(() => {
    const values = new Set<string>((board?.lectures || []).map((slot: Slot) => String(slot.year)));
    values.add(yearFilter);
    return Array.from(values).sort();
  }, [board?.lectures, yearFilter]);
  const visible = (board?.lectures || []).filter((slot: Slot) => String(slot.year) === yearFilter);
  const intakeName = (id?: string | null) => (board?.intakes || []).find((item: Board['intakes'][number]) => item.id === id)?.name || 'All intakes';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lecture timetable"
        description="Prepare a timetable for each intake and each academic year. Levels and semesters stay on the course. A new year is a new timetable, so older years remain available to download."
        actions={<Button variant="secondary" onClick={() => window.print()}>Download or print</Button>}
      />
      <label className="block max-w-xs space-y-2">
        <span className="text-sm font-semibold text-slate-700">Academic year</span>
        <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
          {years.map((year: string) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </label>
      {canEdit ? (
        <form
          className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveSlot.mutate();
          }}
        >
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Course</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.offering_id} onChange={(event) => setForm({ ...form, offering_id: event.target.value })}>
              <option value="">Select course</option>
              {(board?.courses || []).map((course: Board['courses'][number]) => (
                <option key={course.offering_id} value={course.offering_id}>{course.code} · {course.name}</option>
              ))}
            </select>
          </label>
          <Input label="Academic year" type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Intake</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.intake_id} onChange={(event) => setForm({ ...form, intake_id: event.target.value })}>
              <option value="">All intakes</option>
              {(board?.intakes || []).map((intake: Board['intakes'][number]) => (
                <option key={intake.id} value={intake.id}>{intake.name} · {intake.year}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Day</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>
              {DAYS.map((day) => <option key={day}>{day}</option>)}
            </select>
          </label>
          <Input label="Start" type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
          <Input label="End" type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
          <Input label="Venue" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
          <div className="flex items-end">
            <Button type="submit" loading={saveSlot.isPending}>Add lecture</Button>
          </div>
        </form>
      ) : null}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Intake</th>
              {canEdit ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((slot: Slot) => (
              <tr key={slot.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{slot.day}</td>
                <td className="px-4 py-3">{slot.start_time}{slot.end_time ? ` - ${slot.end_time}` : ''}</td>
                <td className="px-4 py-3">{slot.venue}</td>
                <td className="px-4 py-3 font-semibold">{slot.course_code} · {slot.course_name}</td>
                <td className="px-4 py-3">{intakeName(slot.intake_id)}</td>
                {canEdit ? (
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => removeSlot.mutate(slot.id)}>Remove</Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? <p className="px-4 py-6 text-sm text-slate-500">No lectures have been set for {yearFilter}.</p> : null}
      </div>
    </div>
  );
};

export default LectureTimetablePage;
