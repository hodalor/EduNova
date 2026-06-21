import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, Coins, TrendingUp } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';

const PlatformAnalyticsPage = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['super-admin', 'analytics'],
    queryFn: eduovaApi.superAdmin.analytics,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Card title="Unable to load platform analytics" description="Retry the platform KPI query.">
        <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-brand-navy">
          Retry
        </button>
      </Card>
    );
  }

  const stats = [
    { label: 'Total Schools', value: data.total_schools, icon: Building2 },
    { label: 'Monthly Active Users', value: data.monthly_active_users, icon: Activity },
    { label: 'MRR', value: `GHS ${Number(data.monthly_recurring_revenue).toLocaleString()}`, icon: Coins },
    { label: 'Growth Rate', value: `${data.growth_rate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Analytics"
        description="Aggregate-only SaaS metrics across adoption, revenue, churn, and platform activity."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} title={item.label}>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-semibold text-brand-navy">{item.value}</div>
                <Icon className="h-8 w-8 text-brand-gold" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Lifecycle Metrics" description="Trial and active institution distribution.">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Active Schools</span>
              <span className="font-semibold text-brand-navy">{data.active_schools}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Trial Schools</span>
              <span className="font-semibold text-brand-navy">{data.trial_schools}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Churn Rate</span>
              <span className="font-semibold text-brand-navy">{data.churn_rate}%</span>
            </div>
          </div>
        </Card>
        <Card title="Learner Footprint" description="Platform-wide student volume without exposing tenant records.">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Total Students</span>
              <span className="font-semibold text-brand-navy">{Number(data.total_students).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Revenue Run Rate</span>
              <span className="font-semibold text-brand-navy">
                GHS {Number(data.monthly_recurring_revenue).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Platform Growth</span>
              <span className="font-semibold text-brand-navy">{data.growth_rate}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PlatformAnalyticsPage;
