import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { Letterhead, PrintableSheet, type SchoolLetterhead } from './printable';

interface SlipLine {
  reference: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface Slip {
  school: SchoolLetterhead;
  student: { name: string; number: string };
  mode: string;
  term: string;
  printed_on: string;
  lines: SlipLine[];
  current_balance: number;
  courses: Array<{ code: string; name: string }>;
}

interface StudentOption {
  student_id: string;
  name: string;
}

const money = (currency: string, value: number) =>
  value ? `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '';

const ConfirmationSlipPage = () => {
  const role = useAuthStore((state) => state.role);
  const isStudent = role === 'student';
  const [studentId, setStudentId] = useState('');
  const boardQuery = useQuery<{ students: StudentOption[] }>({
    queryKey: ['exam-board'],
    queryFn: eduovaApi.university.examBoard,
    enabled: !isStudent,
  });
  const slipQuery = useQuery<Slip>({
    queryKey: ['confirmation-slip', isStudent ? 'me' : studentId],
    queryFn: () => eduovaApi.university.confirmationSlip(isStudent ? undefined : studentId),
    enabled: isStudent || Boolean(studentId),
    retry: false,
  });
  const slip = slipQuery.data;
  const currency = slip?.school.currency || 'ZMW';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registration confirmation slip"
        description="Print this before a test or exam. It shows the student, the payments made against this semester's invoices, and the registered courses."
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
      {slipQuery.isError ? (
        <p className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
          {getApiErrorMessage(slipQuery.error, 'The confirmation slip is not available yet.')}
        </p>
      ) : null}
      {slip ? (
        <PrintableSheet>
          <Letterhead school={slip.school} />
          <p className="mt-6 text-center text-lg font-semibold">REGISTRATION CONFIRMATION SLIP</p>
          <p className="text-center text-xs text-slate-500">PRINTED {slip.printed_on}</p>
          <h2 className="mt-6 text-lg font-bold">Registration Confirmation Statement</h2>
          <p className="mt-2 text-sm">
            This confirmation slip is printed for <span className="font-semibold underline">{slip.student.name} ({slip.student.number})</span> a {slip.mode} student.
          </p>
          <table className="mt-4 w-full border border-slate-400 text-xs">
            <thead>
              <tr className="text-left">
                {['TRANSACTION', 'DATE', 'TYPE', 'DESCRIPTION', 'DEBIT', 'CREDIT', 'BALANCE'].map((heading) => (
                  <th key={heading} className="border border-slate-400 px-2 py-2">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slip.lines.map((line: SlipLine, index: number) => (
                <tr key={`${line.reference}-${index}`}>
                  <td className="border border-slate-400 px-2 py-2">{line.reference}</td>
                  <td className="border border-slate-400 px-2 py-2">{line.date}</td>
                  <td className="border border-slate-400 px-2 py-2">{line.type}</td>
                  <td className="border border-slate-400 px-2 py-2">{line.description}</td>
                  <td className="border border-slate-400 px-2 py-2">{money(currency, line.debit)}</td>
                  <td className="border border-slate-400 px-2 py-2">{money(currency, line.credit)}</td>
                  <td className="border border-slate-400 px-2 py-2">{money(currency, line.balance)}</td>
                </tr>
              ))}
              <tr>
                <td className="border border-slate-400 px-2 py-2 font-semibold" colSpan={6}>CURRENT BALANCE</td>
                <td className="border border-slate-400 px-2 py-2 font-semibold">{money(currency, slip.current_balance) || `${currency} 0`}</td>
              </tr>
            </tbody>
          </table>
          <h2 className="mt-6 text-lg font-bold">Registered Courses</h2>
          <p className="mt-2 text-sm font-semibold">This student has registered for the following courses for the term: {slip.term}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {slip.courses.map((course: Slip['courses'][number]) => (
              <li key={course.code}>{course.code} - {course.name}</li>
            ))}
          </ul>
        </PrintableSheet>
      ) : null}
    </div>
  );
};

export default ConfirmationSlipPage;
