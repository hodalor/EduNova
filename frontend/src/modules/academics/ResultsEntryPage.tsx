import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';

interface AssessmentRow {
  id: string;
  className: string;
  subject: string;
  term: string;
  assessment: string;
  max_score: number;
  class_id?: string;
  subject_id?: string;
  level_code?: string;
}

interface StudentRow {
  id: string;
  name: string;
  student_number: string;
  className?: string;
  level?: string;
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

  const saveScoresMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => eduovaApi.academics.saveScores(payload),
    onSuccess: () => {
      toast.success('Scores saved successfully.');
    },
    onError: () => {
      toast.error('Unable to save scores yet. The selected assessment source is not fully linked.');
    },
  });

  const assessments = (assessmentsQuery.data || []) as AssessmentRow[];
  const students = ((studentsQuery.data || []) as StudentRow[]).map((item) => ({
    id: item.id,
    name: item.name,
    student_number: item.student_number,
    className: item.className,
    level: item.level,
  }));

  const selectedAssessment =
    assessments.find((item) => item.id === selectedAssessmentId) || null;

  const visibleStudents = useMemo(() => {
    if (!selectedAssessment) {
      return [];
    }

    return students.filter((student) => {
      if (!student.className) {
        return true;
      }
      return student.className === selectedAssessment.className;
    });
  }, [selectedAssessment, students]);

  const rows = useMemo(
    () =>
      visibleStudents.map((student) => ({
        ...student,
        score: scores[student.id] ?? 0,
      })),
    [scores, visibleStudents]
  );

  if (assessmentsQuery.isLoading || studentsQuery.isLoading) {
    return <PageLoader />;
  }

  const handleSaveScores = () => {
    if (!selectedAssessment) {
      return;
    }

    if (!selectedAssessment.class_id || !selectedAssessment.subject_id || !selectedAssessment.level_code) {
      toast.success('Scores captured in the modal. Connect a live assessment source to post them to the backend.');
      return;
    }

    saveScoresMutation.mutate({
      class_id: selectedAssessment.class_id,
      subject_id: selectedAssessment.subject_id,
      level_code: selectedAssessment.level_code,
      assessment_name: selectedAssessment.assessment,
      scores: rows.map((row) => ({
        student_id: row.id,
        student_name: row.name,
        score: row.score,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results Entry"
        description="Open an assessment row to enter scores, review limits, and import marks from one modal."
      />

      <Card>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-navy">Assessments</h3>
            <p className="text-sm text-slate-500">
              Click any assessment row to open score entry and CSV import in a modal.
            </p>
          </div>
          <Badge variant="info">{assessments.length} active</Badge>
        </div>

        <div className="overflow-x-auto">
          {assessments.length ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Class', 'Subject', 'Term', 'Assessment', 'Max Score'].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-semibold uppercase text-slate-600">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessments.map((assessment) => (
                  <tr
                    key={assessment.id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => setSelectedAssessmentId(assessment.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-brand-navy">{assessment.className}</td>
                    <td className="px-4 py-3">{assessment.subject}</td>
                    <td className="px-4 py-3">{assessment.term}</td>
                    <td className="px-4 py-3">{assessment.assessment}</td>
                    <td className="px-4 py-3">{assessment.max_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No assessments are ready for results entry yet.
            </p>
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(selectedAssessment)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssessmentId('');
          }
        }}
        title={selectedAssessment ? `${selectedAssessment.className} · ${selectedAssessment.assessment}` : 'Results Entry'}
        description="Enter scores, review max score limits, and import a CSV without leaving the assessment list."
        size="xl"
      >
        {selectedAssessment ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Class</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedAssessment.className}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subject</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedAssessment.subject}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Term</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedAssessment.term}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Max Score</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedAssessment.max_score}</p>
              </div>
            </div>

            <Card title="CSV Import" description="Preview columns: Student Number, Student Name, Score">
              <div className="space-y-4">
                <FileUpload multiple={false} />
                <Button variant="secondary" leftIcon={<Upload className="h-4 w-4" />}>
                  Import from CSV
                </Button>
              </div>
            </Card>

            <div className="rounded-3xl border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-brand-navy">Student Scores</h3>
                  <p className="text-sm text-slate-500">
                    Scores over {selectedAssessment.max_score} are highlighted before save.
                  </p>
                </div>
                <Badge variant="info">{rows.length} learners</Badge>
              </div>
              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Student', 'Student Number', 'Score'].map((label) => (
                        <th key={label} className="px-4 py-3 text-left font-semibold uppercase text-slate-600">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-semibold text-brand-navy">{row.name}</td>
                        <td className="px-4 py-3">{row.student_number}</td>
                        <td className="px-4 py-3 min-w-[180px]">
                          <Input
                            type="number"
                            min={0}
                            max={selectedAssessment.max_score}
                            value={scores[row.id] ?? ''}
                            helperText={`0 - ${selectedAssessment.max_score}`}
                            error={
                              Number(scores[row.id] ?? 0) > selectedAssessment.max_score
                                ? 'Above max score'
                                : undefined
                            }
                            onChange={(event) =>
                              setScores((current) => ({
                                ...current,
                                [row.id]: Number(event.target.value),
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedAssessmentId('')}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.success('Report card generation should follow after scores are confirmed.')}
              >
                Generate Report Cards
              </Button>
              <Button loading={saveScoresMutation.isPending} onClick={handleSaveScores}>
                Save All Scores
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default ResultsEntryPage;
