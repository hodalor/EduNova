import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Wallet } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface DefaulterRow {
  id: string;
  student: string;
  amount: number;
  daysOverdue: number;
  className: string;
}

const DefaultersPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-defaulters'],
    queryFn: eduovaApi.finance.defaulters,
  });

  const rows = (data || []) as DefaulterRow[];

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        Student: row.student,
        Class: row.className,
        Amount: row.amount,
        DaysOverdue: row.daysOverdue,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Defaulters');
    XLSX.writeFile(workbook, 'eduova-defaulters.xlsx');
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Defaulters"
        description="Track overdue invoices and launch reminder or collection actions."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" leftIcon={<MessageSquare className="h-4 w-4" />}>
              Send SMS to All
            </Button>
            <Button onClick={exportToExcel}>Export to Excel</Button>
          </div>
        }
      />

      <Table<DefaulterRow>
        title="Overdue Accounts"
        data={rows}
        columns={[
          { header: 'Student', accessorKey: 'student' },
          { header: 'Class', accessorKey: 'className' },
          { header: 'Amount', cell: ({ row }) => `GHS ${row.original.amount.toLocaleString()}` },
          { header: 'Days Overdue', accessorKey: 'daysOverdue' },
          { header: 'Contact', cell: () => '+233 24 000 0111' },
          {
            header: 'Actions',
            cell: () => (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary">
                  Send SMS Reminder
                </Button>
                <Button size="sm" variant="ghost">
                  View Invoice
                </Button>
                <Button size="sm" leftIcon={<Wallet className="h-4 w-4" />}>
                  Record Payment
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default DefaultersPage;
