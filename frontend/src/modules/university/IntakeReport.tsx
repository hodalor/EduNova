import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';

export interface IntakeOption {
  id: string;
  name: string;
  year: number;
  start_date: string;
  enrollment_deadline: string;
}

interface IntakeReportData {
  intakes: IntakeOption[];
  years: number[];
  registered: number;
  paid: number;
  debtors: number;
  paid_percent: number;
  debtor_percent: number;
}

interface IntakeReportProps {
  onChange?: (selection: { intakeId: string; years: number[] }) => void;
}

const IntakeReport = ({ onChange }: IntakeReportProps) => {
  const [intakeId, setIntakeId] = useState('all');
  const [years, setYears] = useState<number[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const reportQuery = useQuery<IntakeReportData>({
    queryKey: ['intake-report', intakeId, years.join(',')],
    queryFn: () => eduovaApi.university.intakeReport({ intakeId, years }),
  });

  useEffect(() => {
    onChangeRef.current?.({ intakeId, years });
  }, [intakeId, years]);

  const report = reportQuery.data as IntakeReportData | undefined;
  const yearOptions: number[] = report?.years?.length
    ? report.years
    : Array.from(new Set((report?.intakes || []).map((item: IntakeOption) => item.year)));

  const toggleYear = (year: number) => {
    setYears((current) => (current.includes(year) ? current.filter((item) => item !== year) : [...current, year]));
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Intake</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Registration and fees</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-11 rounded-2xl border border-slate-200 px-3 text-sm"
            value={intakeId}
            onChange={(event) => setIntakeId(event.target.value)}
          >
            <option value="all">All intakes</option>
            {(report?.intakes || []).map((intake: IntakeOption) => (
              <option key={intake.id} value={intake.id}>
                {intake.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              years.length === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
            onClick={() => setYears([])}
          >
            All years
          </button>
          {yearOptions.map((year: number) => (
            <button
              key={year}
              type="button"
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                years.includes(year) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => toggleYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Registered', report?.registered ?? 0],
          ['Paid school fees', report?.paid ?? 0],
          ['Paid', `${report?.paid_percent ?? 0}%`],
          ['Debtors', `${report?.debtor_percent ?? 0}%`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        {report?.debtors ?? 0} registered students in this selection still owe fees. Choosing a year combines every
        intake in that year. Choose more than one year to combine them.
      </p>
    </div>
  );
};

export default IntakeReport;
