import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface ReportCardRow {
  id: string;
  student: string;
  status: 'Generated' | 'Pending' | 'Published';
}

const ReportCardsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['academics-report-cards'],
    queryFn: eduovaApi.academics.reportCards,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="Generate, review, publish, and export report cards for a selected class and term."
      />

      <Card title="Filters" description="Select the class and term to manage report card publishing.">
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Class">
            <option>SH 2 Science</option>
            <option>PR 5 Gold</option>
          </Select>
          <Select label="Term">
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </Select>
          <div className="flex items-end gap-3">
            <Button>Generate All</Button>
            <Button variant="secondary">Publish All</Button>
            <Button variant="secondary">Download ZIP</Button>
          </div>
        </div>
      </Card>

      <Table<ReportCardRow>
        title="Report Card Queue"
        data={(data || []) as ReportCardRow[]}
        columns={[
          { header: 'Student', accessorKey: 'student' },
          {
            header: 'Status',
            cell: ({ row }) => (
              <Badge
                variant={
                  row.original.status === 'Published'
                    ? 'success'
                    : row.original.status === 'Generated'
                      ? 'info'
                      : 'warning'
                }
              >
                {row.original.status}
              </Badge>
            ),
          },
          {
            header: 'Actions',
            cell: () => (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary">
                  Preview
                </Button>
                <Button size="sm" variant="ghost">
                  Publish
                </Button>
                <Button size="sm">Download PDF</Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ReportCardsPage;
