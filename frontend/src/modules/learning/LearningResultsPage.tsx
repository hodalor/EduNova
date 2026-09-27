import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Trophy } from 'lucide-react';

import {
  eduovaApi,
  type LearningCourse,
  type LearningSubmission,
} from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Pending';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const LearningResultsPage = () => {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedResultId, setSelectedResultId] = useState('');

  const coursesQuery = useQuery<LearningCourse[]>({
    queryKey: ['learning-courses'],
    queryFn: eduovaApi.learning.courses,
  });
  const resultsQuery = useQuery<LearningSubmission[]>({
    queryKey: ['learning-results'],
    queryFn: eduovaApi.learning.myResults,
  });

  const filteredResults = useMemo(
    () =>
      ((resultsQuery.data || []) as LearningSubmission[]).filter(
        (item: LearningSubmission) =>
          !selectedCourseId || String(item.course_id) === String(selectedCourseId)
      ),
    [resultsQuery.data, selectedCourseId]
  );
  const selectedResult = useMemo(
    () =>
      filteredResults.find((item: LearningSubmission) => item.id === selectedResultId) || null,
    [filteredResults, selectedResultId]
  );

  if (coursesQuery.isLoading || resultsQuery.isLoading) {
    return <PageLoader />;
  }

  if (coursesQuery.isError || resultsQuery.isError) {
    return (
      <Alert
        title="Unable to load learning results"
        message="Refresh the page to retry your tertiary assessment results."
        variant="error"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="See graded learning submissions, pending theory reviews, and feedback from lecturers."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card title="Result Filter" description="Focus your result history on one course if needed.">
          <div className="space-y-4">
            <Select
              label="Course"
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              <option value="">All my courses</option>
              {((coursesQuery.data || []) as LearningCourse[]).map((course: LearningCourse) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </Select>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Results</p>
                <p className="mt-2 text-2xl font-semibold text-brand-navy">{filteredResults.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Graded</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {filteredResults.filter((item: LearningSubmission) => item.status === 'graded').length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Assessment Results" description="Scores update after auto-marking or lecturer review for theory answers.">
          {filteredResults.length ? (
            <div className="space-y-4">
              {filteredResults.map((item: LearningSubmission) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-brand-navy">{item.assessment_title}</h3>
                      <Badge variant={item.status === 'graded' ? 'success' : 'warning'}>
                        {item.status === 'graded' ? 'Graded' : 'Pending Review'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {item.course_code} - {item.course_name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Submitted {formatDateTime(item.submitted_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Score</p>
                      <p className="mt-1 text-xl font-semibold text-brand-navy">
                        {item.final_score ?? item.auto_score}/{item.max_score}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      leftIcon={<Eye className="h-4 w-4" />}
                      onClick={() => setSelectedResultId(item.id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Trophy className="h-5 w-5" />}
              title="No results yet"
              message="Your submitted assessments will appear here after you start using the learning module."
            />
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(selectedResult)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedResultId('');
          }
        }}
        title={selectedResult ? selectedResult.assessment_title : 'Result'}
        description="Detailed question-by-question result breakdown."
        size="xl"
      >
        {selectedResult ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Course</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedResult.course_code}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedResult.status}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Final Score</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {selectedResult.final_score ?? selectedResult.auto_score}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Submitted</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {formatDateTime(selectedResult.submitted_at)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedResult.answers.map((answer, index: number) => (
                <div key={answer.question_id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Question {index + 1}</Badge>
                    <Badge variant={answer.type === 'theory' ? 'warning' : 'success'}>{answer.type}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-brand-navy">{answer.prompt}</p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    {Array.isArray(answer.response) ? answer.response.join(', ') : answer.response || 'No response'}
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-400">
                    Score: {answer.awarded_score ?? 0}/{answer.max_score}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lecturer Feedback</p>
              <p className="mt-2 text-sm text-slate-700">{selectedResult.feedback || 'No feedback yet.'}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default LearningResultsPage;
