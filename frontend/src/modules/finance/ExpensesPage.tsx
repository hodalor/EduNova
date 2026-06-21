import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface ExpenseRow {
  id: string;
  category: string;
  description: string;
  amount: number;
  status: 'approved' | 'pending';
  date: string;
}

const ExpensesPage = () => {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading } = useQuery({
    queryKey: ['finance-expenses'],
    queryFn: eduovaApi.finance.expenses,
  });

  const rows = useMemo(() => {
    const items = (data || []) as ExpenseRow[];
    return items.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesStatus = status === 'all' || item.status === status;
      return matchesCategory && matchesStatus && item.date >= from && item.date <= to;
    });
  }, [category, data, from, status, to]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Add, review, and approve expense requests across operational categories."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <Card title="Add Expense" description="Capture a new expense request.">
          <div className="grid gap-4">
            <Input label="Description" />
            <Select label="Category">
              <option>Utilities</option>
              <option>Transport</option>
              <option>Supplies</option>
            </Select>
            <Input label="Amount" type="number" />
            <Input label="Expense Date" type="date" />
            <Button>Submit Expense</Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Filters" description="Filter expense records by category, date range, and approval status.">
            <div className="grid gap-4 xl:grid-cols-4">
              <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                <option value="Utilities">Utilities</option>
                <option value="Transport">Transport</option>
              </Select>
              <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </Select>
              <DatePicker label="From" value={from} onChange={setFrom} />
              <DatePicker label="To" value={to} onChange={setTo} />
            </div>
          </Card>

          <Table<ExpenseRow>
            title="Expense Register"
            data={rows}
            columns={[
              { header: 'Category', accessorKey: 'category' },
              { header: 'Description', accessorKey: 'description' },
              { header: 'Amount', cell: ({ row }) => `GHS ${row.original.amount.toLocaleString()}` },
              { header: 'Date', accessorKey: 'date' },
              {
                header: 'Status',
                cell: ({ row }) => (
                  <Badge variant={row.original.status === 'approved' ? 'success' : 'warning'}>
                    {row.original.status}
                  </Badge>
                ),
              },
              {
                header: 'Action',
                cell: ({ row }) => (
                  <Button size="sm" variant={row.original.status === 'approved' ? 'ghost' : 'secondary'}>
                    {row.original.status === 'approved' ? 'Approved' : 'Approve'}
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpensesPage;
