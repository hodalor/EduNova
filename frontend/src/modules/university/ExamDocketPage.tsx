import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { Letterhead, PrintableSheet, type SchoolLetterhead } from './printable';

interface DocketCourse {
  code: string;
  name: string;
  date: string;
  time: string;
  venue: string;
}

interface Docket {
  school: SchoolLetterhead;
  student: { name: string; number: string; photo?: string | null; nrc?: string; mode: string; program: string };
  term: string;
  printed_on: string;
  courses: DocketCourse[];
  qr: string;
}

interface StudentOption {
  student_id: string;
  name: string;
}

const ExamDocketPage = () => {
  const role = useAuthStore((state) => state.role);
  const isStudent = role === 'student';
  const [studentId, setStudentId] = useState('');
  const boardQuery = useQuery<{ students: StudentOption[] }>({
    queryKey: ['exam-board'],
    queryFn: eduovaApi.university.examBoard,
    enabled: !isStudent,
  });
  const docketQuery = useQuery<Docket>({
    queryKey: ['exam-docket', isStudent ? 'me' : studentId],
    queryFn: () => eduovaApi.university.examDocket(isStudent ? undefined : studentId),
    enabled: isStudent || Boolean(studentId),
    retry: false,
  });
  const docket = docketQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam docket"
        description="The docket is generated when the semester fees are cleared. The student prints it, with their photo, and shows it to the invigilator together with an ID."
      />
      {!isStudent ? (
        <label className="block max-w-md space-y-2 print:hidden">
          <span className="text-sm font-semibold text-slate-700">Student</span>
          <select className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">Select student</option>
            {(boardQuery.data?.students || []).map((student: StudentOption) => (
              <option key={student.student_id} value={student.student_id}>{student.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      {docketQuery.isError ? (
        <p className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
          {getApiErrorMessage(docketQuery.error, 'The exam docket is not available yet.')}
        </p>
      ) : null}
      {docket ? (
        <PrintableSheet>
          <Letterhead school={docket.school} />
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-bold">FINAL EXAMINATION DOCKET</p>
              <p className="text-sm font-semibold uppercase">{docket.term}</p>
            </div>
            {docket.qr ? <img src={docket.qr} alt="Docket verification" className="h-24 w-24" /> : null}
          </div>
          <div className="mt-6 flex gap-4">
            {docket.student.photo ? (
              <img src={docket.student.photo} alt="" className="h-28 w-24 rounded-md object-cover ring-1 ring-slate-200" />
            ) : (
              <div className="flex h-28 w-24 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">Photo</div>
            )}
            <div className="text-sm leading-6">
              <p>Examination slip for: <span className="font-semibold">{docket.student.name}</span></p>
              <p>Student ID No.: {docket.student.number}</p>
              <p>NRC No.: {docket.student.nrc || '—'}</p>
              <p>Printed: {docket.printed_on}</p>
              <p>Status: 100% THRESHOLD MET ({docket.school.currency || 'ZMW'} 0.00)</p>
              <p>Delivery: {docket.student.mode}</p>
            </div>
          </div>
          <p className="mt-6 text-sm">
            Student is registered under: <span className="font-semibold">{docket.student.program || 'Programme'}</span>
          </p>
          <p className="text-sm">Candidate has been authorized to write FINAL EXAMINATION in the following courses:</p>
          <table className="mt-3 w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="border border-slate-300 px-2 py-2">DATE / TIME</th>
                <th className="border border-slate-300 px-2 py-2">VENUE</th>
                <th className="border border-slate-300 px-2 py-2">COURSE</th>
              </tr>
            </thead>
            <tbody>
              {docket.courses.map((course: DocketCourse) => (
                <tr key={course.code}>
                  <td className="border border-slate-300 px-2 py-2">{course.date || '—'} {course.time}</td>
                  <td className="border border-slate-300 px-2 py-2">{course.venue || '—'}</td>
                  <td className="border border-slate-300 px-2 py-2">{course.code} - {course.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs leading-5 text-slate-600">
            Kindly cross check your courses on this slip against the examination timetable for the exact date and time.
            Admission into the examination hall is by student identity card, NRC or passport, this examination docket, and clearance of all outstanding tuition fees.
          </p>
        </PrintableSheet>
      ) : null}
    </div>
  );
};

export default ExamDocketPage;
