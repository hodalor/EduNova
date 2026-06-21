import { useQuery } from '@tanstack/react-query';
import { Baby, Clock3, ShieldCheck, Stethoscope } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

const DaycareManagementPage = () => {
  const institution = useAuthStore((state) => state.institution);
  const { data, isLoading } = useQuery({
    queryKey: ['daycare-overview'],
    queryFn: eduovaApi.daycare.overview,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const pickupPinRequired = institution?.settings?.daycare?.pickup_pin_required ? 'Enabled' : 'Optional';
  const sessionModel = institution?.settings?.daycare?.session_model || 'fullDay';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daycare Operations"
        description="Manage child care workflows, pickup controls, session structure, and readiness milestones for early-years institutions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Session Model',
            value: sessionModel,
            helper: 'Configured daycare attendance pattern.',
            icon: Clock3,
          },
          {
            label: 'Pickup PIN',
            value: pickupPinRequired,
            helper: 'Guardian release protection status.',
            icon: ShieldCheck,
          },
          {
            label: 'Milestone Bands',
            value: `${data?.milestones?.length || 0}`,
            helper: 'Age-based observation groupings.',
            icon: Baby,
          },
          {
            label: 'Care Policies',
            value: `${data?.pickupPolicies?.length || 0}`,
            helper: 'Safety, medical, and pickup rules.',
            icon: Stethoscope,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold capitalize text-brand-navy">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                </div>
                <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Pickup and Safeguarding Policies" description="Operational rules that govern release and child safety.">
          <div className="space-y-3">
            {(data?.pickupPolicies || []).map((policy: string) => (
              <div key={policy} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                {policy}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Development Milestones" description="Track focus areas by age band for reporting and readiness.">
          <div className="space-y-3">
            {(data?.milestones || []).map((item: { ageBand: string; focus: string }) => (
              <div
                key={item.ageBand}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-navy">{item.ageBand} years</p>
                  <p className="text-sm text-slate-500">{item.focus}</p>
                </div>
                <Badge variant="info">Readiness</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DaycareManagementPage;
