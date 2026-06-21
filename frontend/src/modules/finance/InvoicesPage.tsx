import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface InvoiceRow {
  id: string;
  student: string;
  className: string;
  invoice_number: string;
  total: number;
  paid: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
}

const InvoicesPage = () => {
  const [status, setStatus] = useState('all');
  const [className, setClassName] = useState('all');
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState('2026-06-30');
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['finance-invoices'],
    queryFn: eduovaApi.finance.invoices,
  });

  const rows = useMemo(() => {
    const items = (data || []) as InvoiceRow[];
    return items.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status;
      const matchesClass = className === 'all' || item.className === className;
      return matchesStatus && matchesClass && item.due_date >= from && item.due_date <= to;
    });
  }, [className, data, from, status, to]);

  const classes = Array.from(new Set(((data || []) as InvoiceRow[]).map((item) => item.className)));

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Review student invoices, balances, and due dates across the institution."
        actions={<Button onClick={() => setModalOpen(true)}>Generate Bulk Invoices</Button>}
      />

      <Card title="Invoice Filters" description="Filter invoices by status, class, and due date range.">
        <div className="grid gap-4 xl:grid-cols-4">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>
          <Select label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
            <option value="all">All classes</option>
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <DatePicker label="From" value={from} onChange={setFrom} />
          <DatePicker label="To" value={to} onChange={setTo} />
        </div>
      </Card>

      <Table<InvoiceRow>
        title="Invoice Register"
        data={rows}
        columns={[
          { header: 'Student', accessorKey: 'student' },
          { header: 'Class', accessorKey: 'className' },
          { header: 'Invoice', accessorKey: 'invoice_number' },
          { header: 'Total', cell: ({ row }) => `GHS ${row.original.total.toLocaleString()}` },
          { header: 'Paid', cell: ({ row }) => `GHS ${row.original.paid.toLocaleString()}` },
          { header: 'Balance', cell: ({ row }) => `GHS ${row.original.balance.toLocaleString()}` },
          {
            header: 'Status',
            cell: ({ row }) => (
              <Badge
                variant={
                  row.original.status === 'paid'
                    ? 'success'
                    : row.original.status === 'partial'
                      ? 'warning'
                      : row.original.status === 'overdue'
                        ? 'danger'
                        : 'info'
                }
              >
                {row.original.status}
              </Badge>
            ),
          },
          { header: 'Due Date', accessorKey: 'due_date' },
          {
            header: 'Actions',
            cell: () => (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary">
                  View
                </Button>
                <Button size="sm">Collect</Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Generate Bulk Invoices"
        description="Select the class, term, and fee structure to generate invoices."
        size="md"
      >
        <div className="grid gap-4">
          <Select label="Class">
            <option>SH 2 Science</option>
            <option>PR 5 Gold</option>
            <option>JH 2 Blue</option>
          </Select>
          <Select label="Term">
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </Select>
          <Select label="Fee Structure">
            <option>Standard Term Plan</option>
            <option>Boarding Term Plan</option>
          </Select>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Generate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesPage;
