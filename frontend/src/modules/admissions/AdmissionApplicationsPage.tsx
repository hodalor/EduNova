import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import { useSocket } from '../../hooks/useSocket';
import PageHeader from '../shared/PageHeader';

interface ApplicationSummary {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string;
  program_name: string;
  intake: string;
  student_category: string;
  status: string;
  admission_number?: string | null;
  submitted_at: string;
}

interface FeeLine {
  fee_type: string;
  amount: number;
  currency: string;
  term: string;
  level: string;
}

interface ApplicationDetail extends ApplicationSummary {
  credential?: string;
  duration?: string;
  faculty?: string;
  department?: string;
  study_mode?: string;
  nationality?: string;
  id_type?: string;
  id_number?: string;
  previous_institution?: string;
  qualification?: string;
  year_completed?: string;
  subjects_or_grades?: string;
  sponsor_name?: string;
  sponsor_phone?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  letter_html?: string;
  fee_plan?: FeeLine[];
  email_delivered?: boolean | null;
  minimum_payment_percent?: number;
}

const formatWhen = (value?: string) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const AdmissionApplicationsPage = () => {
  const queryClient = useQueryClient();
  const socket = useSocket('/notifications');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'admitted' | 'all'>('submitted');

  const listQuery = useQuery<ApplicationSummary[]>({
    queryKey: ['admissions', 'applications'],
    queryFn: eduovaApi.admissions.list,
    refetchInterval: 15000,
  });

  const detailQuery = useQuery<ApplicationDetail>({
    queryKey: ['admissions', 'application', selectedId],
    queryFn: () => eduovaApi.admissions.detail(selectedId || ''),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    };
    socket.on('admission:created', refresh);
    socket.on('admission:updated', refresh);

    return () => {
      socket.off('admission:created', refresh);
      socket.off('admission:updated', refresh);
    };
  }, [queryClient, socket]);

  const admitMutation = useMutation({
    mutationFn: (id: string) => eduovaApi.admissions.admit(id),
    onSuccess: (application: ApplicationDetail) => {
      toast.success(
        application.email_delivered
          ? `Admission letter sent to ${application.email}`
          : 'Admitted. The letter is ready to print because email is not configured.'
      );
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to admit this applicant.')),
  });

  const applications = (listQuery.data || []).filter((item) =>
    statusFilter === 'all' ? true : item.status === statusFilter
  );
  const detail = detailQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New applications"
        description="Tertiary applications appear here as soon as they are submitted. Admitting an applicant sends the acceptance letter and fee plan."
      />

      <div className="flex flex-wrap gap-2">
        {(['submitted', 'admitted', 'all'] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              statusFilter === status ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'submitted' ? 'New' : status === 'admitted' ? 'Admitted' : 'All'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="surface overflow-hidden">
          {listQuery.isLoading ? <p className="p-6 text-sm text-slate-500">Loading applications...</p> : null}
          {listQuery.isError ? (
            <p className="p-6 text-sm text-rose-600">
              {getApiErrorMessage(listQuery.error, 'Unable to load applications.')}
            </p>
          ) : null}
          {!listQuery.isLoading && applications.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No applications in this list yet.</p>
          ) : null}
          <div className="divide-y divide-slate-100">
            {applications.map((application) => (
              <button
                key={application.id}
                type="button"
                className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${
                  selectedId === application.id ? 'bg-amber-50' : ''
                }`}
                onClick={() => setSelectedId(application.id)}
              >
                <div>
                  <p className="font-semibold text-slate-900">{application.full_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {application.program_name} · {application.intake}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{application.reference}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      application.status === 'admitted'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {application.status}
                  </span>
                  <p className="mt-2 text-xs text-slate-400">{formatWhen(application.submitted_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="surface p-6">
          {!selectedId ? (
            <p className="text-sm text-slate-500">Select an application to review the programme, sponsor, and fees.</p>
          ) : null}
          {detailQuery.isLoading ? <p className="text-sm text-slate-500">Opening application...</p> : null}
          {detail ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{detail.reference}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{detail.full_name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {detail.email} · {detail.phone}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-400">Programme</dt>
                  <dd className="font-semibold text-slate-800">{detail.program_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Credential</dt>
                  <dd className="font-semibold text-slate-800">{detail.credential || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Faculty</dt>
                  <dd className="font-semibold text-slate-800">{detail.faculty || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Department</dt>
                  <dd className="font-semibold text-slate-800">{detail.department || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Category</dt>
                  <dd className="font-semibold text-slate-800">{detail.student_category}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Identity</dt>
                  <dd className="font-semibold text-slate-800">
                    {detail.id_type} {detail.id_number}
                  </dd>
                </div>
              </dl>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  {detail.previous_institution} · {detail.qualification}
                  {detail.year_completed ? ` · ${detail.year_completed}` : ''}
                </p>
                {detail.subjects_or_grades ? <p className="mt-2">{detail.subjects_or_grades}</p> : null}
                <p className="mt-2">
                  Sponsor {detail.sponsor_name}
                  {detail.sponsor_phone ? ` · ${detail.sponsor_phone}` : ''}
                </p>
                <p>
                  Next of kin {detail.next_of_kin_name} · {detail.next_of_kin_phone}
                </p>
              </div>
              {detail.status === 'submitted' ? (
                <Button
                  className="w-full"
                  loading={admitMutation.isPending}
                  onClick={() => admitMutation.mutate(detail.id)}
                >
                  Admit and send letter
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-emerald-700">
                    Admitted as {detail.admission_number}
                    {detail.email_delivered ? ' · letter emailed' : ' · print the letter below'}
                  </p>
                  {detail.fee_plan?.length ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      {detail.fee_plan.map((line) => (
                        <div key={`${line.fee_type}-${line.term}`} className="flex justify-between gap-3 border-b border-slate-100 px-4 py-2 text-sm last:border-b-0">
                          <span>
                            {line.fee_type} · {line.term}
                          </span>
                          <span className="font-semibold">
                            {line.currency} {Number(line.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {detail.letter_html ? (
                    <div
                      className="max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                      dangerouslySetInnerHTML={{ __html: detail.letter_html }}
                    />
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdmissionApplicationsPage;
