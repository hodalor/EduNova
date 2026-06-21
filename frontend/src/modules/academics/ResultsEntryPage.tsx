import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

interface AssessmentRow {
  id: string;
  className: string;
  subject: string;
  term: string;
  assessment: string;
  max_score: number;
}

interface StudentRow {
  id: string;
  name: string;
  student_number: string;
}

const ResultsEntryPage = () => {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  const assessmentsQuery = useQuery({
    queryKey: ['academics-assessments'],
    queryFn: eduovaApi.academics.assessments,
  });
  const studentsQuery = useQuery({
    queryKey: ['academics-results-students'],
    queryFn: eduovaApi.students.list,
  });

  const assessments = (assessmentsQuery.data || []) as AssessmentRow[];
  const selectedAssessment =
    assessments.find((item) => item.id === selectedAssessmentId) || assessments[0];
  const students = ((studentsQuery.data || []) as Array<{ id: string; name: string; student_number: string }>).map(
    (item) => ({
      id: item.id,
      name: item.name,
      student_number: item.student_number,
    })
  );

  const rows = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        score: scores[student.id] ?? 0,
      })),
    [scores, students]
  );

  if (assessmentsQuery.isLoading || studentsQuery.isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results Entry"
        description="Enter assessment scores in bulk, validate inline, and prepare report cards."
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Assessment Selector" description="Choose class, subject, term, and assessment.">
          <div className="grid gap-4 xl:grid-cols-2">
            <Select
              label="Assessment"
              value={selectedAssessmentId || selectedAssessment?.id || ''}
              onChange={(event) => setSelectedAssessmentId(event.target.value)}
            >
              {assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.className} · {item.subject} · {item.assessment}
                </option>
              ))}
            </Select>
            <Input label="Class" value={selectedAssessment?.className || ''} readOnly />
            <Input label="Subject" value={selectedAssessment?.subject || ''} readOnly />
            <Input label="Term" value={selectedAssessment?.term || ''} readOnly />
          </div>
        </Card>

        <Card title="CSV Import" description="Import scores from a CSV file and preview mapped rows.">
          <div className="space-y-4">
            <FileUpload multiple={false} />
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Preview columns: Student Number, Student Name, Score
            </div>
            <Button variant="secondary" leftIcon={<Upload className="h-4 w-4" />}>
              Import from CSV
            </Button>
          </div>
        </Card>
      </div>

      <Table<StudentRow & { score: number }>
        title="Bulk Score Entry"
        data={rows}
        columns={[
          { header: 'Student', accessorKey: 'name' },
          { header: 'Student Number', accessorKey: 'student_number' },
          {
            header: 'Score',
            cell: ({ row }) => (
              <Input
                type="number"
                min={0}
                max={selectedAssessment?.max_score || 100}
                value={scores[row.original.id] ?? ''}
                helperText={`0 - ${selectedAssessment?.max_score || 100}`}
                error={
                  Number(scores[row.original.id] ?? 0) > (selectedAssessment?.max_score || 100)
                    ? 'Above max score'
                    : undefined
                }
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [row.original.id]: Number(event.target.value),
                  }))
                }
              />
            ),
          },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <Button>Save All Scores</Button>
        <Button variant="secondary">Generate Report Cards</Button>
      </div>
    </div>
  );
};

export default ResultsEntryPage;
