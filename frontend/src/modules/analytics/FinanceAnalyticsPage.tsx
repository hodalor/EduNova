import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import PageLoader from '../../components/ui/PageLoader';
import ProgressBar from '../../components/ui/ProgressBar';
import Table from '../../components/ui/Table';

interface RevenuePoint {
  month: string;
  revenue: number;
  target: number;
}

interface ExpenseSlice {
  name: string;
  value: number;
}

interface DefaulterRow {
  id: string;
  student: string;
  amount: number;
  daysOverdue: number;
  className: string;
}

const colors = ['#0F1B3C', '#F5A623', '#3B82F6', '#22C55E'];

const FinanceAnalyticsPage = () => {
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-finance', from, to],
    queryFn: eduovaApi.analytics.getFinance,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load finance analytics"
        message="Refresh the page to retry the finance insights feed."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-muted flex flex-col gap-4 p-4 md:flex-row md:items-end">
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <DatePicker label="From" value={from} onChange={setFrom} />
          <DatePicker label="To" value={to} onChange={setTo} />
        </div>
        <Button variant="secondary">Export Snapshot</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card title="Revenue by Month" description="Collected revenue against monthly targets.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueByMonth as RevenuePoint[]}>
                <defs>
                  <linearGradient id="financeRevenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0F1B3C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0F1B3C" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="financeTarget" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#F5A623" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F5A623" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#F5A623"
                  fill="url(#financeTarget)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0F1B3C"
                  fill="url(#financeRevenue)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Collection Rate" description="Term collection progress against target.">
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Collected</p>
                  <p className="mt-2 text-4xl font-bold text-brand-navy">{data.collectionRate}%</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  On track
                </span>
              </div>
              <ProgressBar value={data.collectionRate} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Target</p>
                <p className="mt-2 text-xl font-semibold text-brand-navy">90%</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Gap</p>
                <p className="mt-2 text-xl font-semibold text-amber-600">{90 - data.collectionRate}%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.55fr]">
        <Card title="Expense Breakdown" description="Current operational spend by category.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.expenseBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {(data.expenseBreakdown as ExpenseSlice[]).map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3">
            {(data.expenseBreakdown as ExpenseSlice[]).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-brand-navy">
                  GHS {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Table<DefaulterRow>
          title="Defaulters"
          data={data.defaulters as DefaulterRow[]}
          columns={[
            { header: 'Student', accessorKey: 'student' },
            { header: 'Class', accessorKey: 'className' },
            { header: 'Amount', cell: ({ row }) => `GHS ${row.original.amount.toLocaleString()}` },
            { header: 'Days Overdue', accessorKey: 'daysOverdue' },
            {
              header: 'Action',
              cell: () => (
                <Button size="sm" variant="secondary">
                  Send Reminder
                </Button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default FinanceAnalyticsPage;
