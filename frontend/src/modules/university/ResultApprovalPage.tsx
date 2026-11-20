import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import PageHeader from '../shared/PageHeader';

interface PendingBatch {
  batch_id: string;
  course_code: string;
  course_name: string;
  assessment_name: string;
  kind: string;
  uploaded_at: string;
  count: number;
}

const ResultApprovalPage = () => {
  const queryClient = useQueryClient();
  const pendingQuery = useQuery<PendingBatch[]>({
    queryKey: ['pending-results'],
    queryFn: eduovaApi.university.pendingResults,
  });
  const approve = useMutation({
    mutationFn: (batchId: string) => eduovaApi.university.approveResults(batchId),
    onSuccess: () => {
      toast.success('Approved. Students can now see this result, and it counts in the final grade.');
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      queryClient.invalidateQueries({ queryKey: ['university-results'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to approve this result.')),
  });
  const batches = pendingQuery.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approve results"
        description="Mid-semester and final exam uploads stay hidden from students until a principal lecturer approves them. After approval the system folds them into the final score using the percentages already set."
      />
      <div className="space-y-3">
        {batches.map((batch: PendingBatch) => (
          <div key={batch.batch_id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5">
            <div>
              <p className="font-semibold text-slate-900">
                {batch.course_code} · {batch.course_name}
              </p>
              <p className="text-sm text-slate-500">
                {batch.assessment_name || batch.kind} · {batch.count} student{batch.count === 1 ? '' : 's'} · uploaded {String(batch.uploaded_at || '').slice(0, 10)}
              </p>
            </div>
            <Button onClick={() => approve.mutate(batch.batch_id)} loading={approve.isPending}>
              Approve and publish
            </Button>
          </div>
        ))}
        {!batches.length ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
            No exam result is waiting for approval.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ResultApprovalPage;
