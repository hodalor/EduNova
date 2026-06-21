import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface GradebookRow {
  student: string;
  quiz: number;
  assignment: number;
  exam: number;
  final: number;
}

const scoreColor = (value: number) => {
  if (value >= 80) {
    return 'text-emerald-600';
  }
  if (value >= 60) {
    return 'text-amber-600';
  }
  return 'text-rose-600';
};

const GradebookPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['academics-gradebook'],
    queryFn: eduovaApi.academics.gradebook,
  });

  const rows = (data || []) as GradebookRow[];

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gradebook');
    XLSX.writeFile(workbook, 'eduova-gradebook.xlsx');
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        description="View the assessment matrix, sort by performance, and export grade data."
        actions={<Button onClick={exportExcel}>Export as Excel</Button>}
      />

      <Card title="Assessment Matrix" description="Rows represent students and columns represent assessment components.">
        <Table<GradebookRow>
          data={rows}
          columns={[
            { header: 'Student', accessorKey: 'student' },
            {
              header: 'Quiz',
              cell: ({ row }) => <span className={scoreColor(row.original.quiz)}>{row.original.quiz}</span>,
            },
            {
              header: 'Assignment',
              cell: ({ row }) => (
                <span className={scoreColor(row.original.assignment)}>{row.original.assignment}</span>
              ),
            },
            {
              header: 'Exam',
              cell: ({ row }) => <span className={scoreColor(row.original.exam)}>{row.original.exam}</span>,
            },
            {
              header: 'Final Average',
              cell: ({ row }) => <span className={scoreColor(row.original.final)}>{row.original.final}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default GradebookPage;
