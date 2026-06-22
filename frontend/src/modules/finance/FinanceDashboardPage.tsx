import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileSpreadsheet, Receipt, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Stat from '../../components/ui/Stat';
import PageHeader from '../shared/PageHeader';

interface FinanceStat {
  id: string;
  label: string;
  value: string;
  icon: string;
  trend: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
}

const FinanceDashboardPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: eduovaApi.finance.dashboard,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load finance dashboard"
        message="Refresh the finance workspace to retry the latest summaries."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Dashboard"
        description="Track billing, collections, and outstanding balances across the active school term."
      />

      <div className="grid gap-5 xl:grid-cols-4">
        {(data.stats as FinanceStat[]).map((item) => (
          <Stat key={item.id} item={item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Revenue by Week" description="Collected amount over the last four weeks.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByWeek}>
                <XAxis dataKey="week" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="amount" fill="#0F1B3C" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Quick Actions" description="Launch common finance workflows.">
          <div className="grid gap-4">
            <Button variant="secondary" leftIcon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => navigate('/finance/invoices')}>
              Generate Invoices
            </Button>
            <Button variant="secondary" leftIcon={<Receipt className="h-4 w-4" />} onClick={() => navigate('/finance/payments')}>
              Record Payment
            </Button>
            <Button variant="secondary" leftIcon={<ShieldAlert className="h-4 w-4" />} onClick={() => navigate('/finance/defaulters')}>
              View Defaulters
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboardPage;
