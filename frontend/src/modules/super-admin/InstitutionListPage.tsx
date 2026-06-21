import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PauseCircle, PlusCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';

interface InstitutionRecord {
  id: string;
  name: string;
  code: string;
  subscription_plan: string;
  status: string;
  active_students: number;
  active_staff: number;
  monthly_revenue: number;
  trial_ends_at: string;
}

const InstitutionListPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['super-admin', 'institutions'],
    queryFn: eduovaApi.superAdmin.institutions,
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => eduovaApi.superAdmin.suspendInstitution(id),
    onSuccess: () => {
      toast.success('Institution suspended.');
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'institutions'] });
    },
    onError: () => toast.error('Failed to suspend institution.'),
  });

  const trialMutation = useMutation({
    mutationFn: (id: string) => eduovaApi.superAdmin.extendTrial(id, 14),
    onSuccess: () => {
      toast.success('Trial extended by 14 days.');
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'institutions'] });
    },
    onError: () => toast.error('Failed to extend trial.'),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Card title="Unable to load institutions" description="Retry the platform institutions query.">
        <Button onClick={() => refetch()}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutions"
        description="Monitor institution status, capacity, revenue, and subscription posture across the EDUOVA SaaS platform."
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Link to="/super-admin/institutions/new">
              <Button leftIcon={<PlusCircle className="h-4 w-4" />}>Onboard School</Button>
            </Link>
          </div>
        }
      />

      <Card title="All Schools" description="Platform-wide institution inventory with plan and lifecycle actions.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Institution', 'Plan', 'Status', 'Students', 'Staff', 'MRR', 'Trial Ends', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(data as InstitutionRecord[]).map((institution) => (
                <tr key={institution.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-brand-navy">{institution.name}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{institution.code}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{institution.subscription_plan}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                      {institution.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{institution.active_students.toLocaleString()}</td>
                  <td className="px-4 py-3">{institution.active_staff.toLocaleString()}</td>
                  <td className="px-4 py-3">GHS {institution.monthly_revenue.toLocaleString()}</td>
                  <td className="px-4 py-3">{new Date(institution.trial_ends_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<PauseCircle className="h-4 w-4" />}
                        onClick={() => suspendMutation.mutate(institution.id)}
                        loading={suspendMutation.isPending}
                      >
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => trialMutation.mutate(institution.id)}
                        loading={trialMutation.isPending}
                      >
                        Extend Trial
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default InstitutionListPage;
