import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Eye, Plus, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  eduovaApi,
  type LearningAssessment,
  type LearningCourse,
  type LearningSubmission,
} from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../shared/PageHeader';

interface QuestionDraft {
  id: string;
  type: 'objective' | 'theory';
  prompt: string;
  optionsText: string;
  correctAnswer: string;
  modelAnswer: string;
  maxScore: string;
}

const createQuestionDraft = (type: 'objective' | 'theory' = 'objective'): QuestionDraft => ({
  id: crypto.randomUUID(),
  type,
  prompt: '',
  optionsText: '',
  correctAnswer: '',
  modelAnswer: '',
  maxScore: type === 'theory' ? '10' : '1',
});

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'No due date';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const scoreTone = (status: string) =>
  status === 'graded' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';

const LearningAssessmentsPage = () => {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isStaff = role === 'institution_admin' || role === 'teacher';
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assessmentType, setAssessmentType] = useState('quiz');
  const [dueAt, setDueAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [attemptsAllowed, setAttemptsAllowed] = useState('1');
  const [isPublished, setIsPublished] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestionDraft('objective')]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gradingScores, setGradingScores] = useState<Record<string, string>>({});
  const [gradingFeedback, setGradingFeedback] = useState('');

  const coursesQuery = useQuery<LearningCourse[]>({
    queryKey: ['learning-courses'],
    queryFn: eduovaApi.learning.courses,
  });
  const assessmentsQuery = useQuery<LearningAssessment[]>({
    queryKey: ['learning-assessments', selectedCourseId],
    queryFn: () => eduovaApi.learning.assessments(selectedCourseId || undefined),
  });
  const submissionsQuery = useQuery<LearningSubmission[]>({
    queryKey: ['learning-assessment-submissions', selectedAssessmentId],
    queryFn: () => eduovaApi.learning.assessmentSubmissions(selectedAssessmentId),
    enabled: isStaff && Boolean(selectedAssessmentId),
  });

  const createAssessment = useMutation({
    mutationFn: eduovaApi.learning.createAssessment,
    onSuccess: () => {
      toast.success('Assessment published.');
      setTitle('');
      setInstructions('');
      setAssessmentType('quiz');
      setDueAt('');
      setDurationMinutes('30');
      setAttemptsAllowed('1');
      setIsPublished(true);
      setQuestions([createQuestionDraft('objective')]);
      void queryClient.invalidateQueries({ queryKey: ['learning-assessments'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create assessment.');
    },
  });
  const submitAssessment = useMutation({
    mutationFn: ({ assessmentId, payload }: { assessmentId: string; payload: Record<string, unknown> }) =>
      eduovaApi.learning.submitAssessment(assessmentId, payload),
    onSuccess: () => {
      toast.success('Assessment submitted successfully.');
      setAnswers({});
      setSelectedAssessmentId('');
      void queryClient.invalidateQueries({ queryKey: ['learning-assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['learning-results'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to submit assessment.');
    },
  });
  const gradeSubmission = useMutation({
    mutationFn: ({ submissionId, payload }: { submissionId: string; payload: Record<string, unknown> }) =>
      eduovaApi.learning.gradeSubmission(submissionId, payload),
    onSuccess: () => {
      toast.success('Submission graded.');
      setSelectedSubmissionId('');
      setGradingScores({});
      setGradingFeedback('');
      void queryClient.invalidateQueries({ queryKey: ['learning-assessment-submissions'] });
      void queryClient.invalidateQueries({ queryKey: ['learning-results'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to grade submission.');
    },
  });

  const courses: LearningCourse[] = coursesQuery.data || [];
  const assessments: LearningAssessment[] = assessmentsQuery.data || [];
  const selectedAssessment =
    assessments.find((item: LearningAssessment) => item.id === selectedAssessmentId) || null;
  const selectedSubmission = useMemo(
    () =>
      ((submissionsQuery.data || []) as LearningSubmission[]).find(
        (item: LearningSubmission) => item.id === selectedSubmissionId
      ) || null,
    [selectedSubmissionId, submissionsQuery.data]
  );
  const totalQuestionScore = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.maxScore || 0), 0),
    [questions]
  );

  useEffect(() => {
    if (!selectedSubmission) {
      setGradingScores({});
      setGradingFeedback('');
      return;
    }
    setGradingScores(
      selectedSubmission.answers.reduce<Record<string, string>>((accumulator, answer) => {
        if (answer.type === 'theory') {
          accumulator[answer.question_id] = String(answer.awarded_score ?? '');
        }
        return accumulator;
      }, {})
    );
    setGradingFeedback(selectedSubmission.feedback || '');
  }, [selectedSubmission]);

  if (coursesQuery.isLoading || assessmentsQuery.isLoading || submissionsQuery.isLoading) {
    return <PageLoader />;
  }

  if (coursesQuery.isError || assessmentsQuery.isError || submissionsQuery.isError) {
    return (
      <Alert
        title="Unable to load assessments"
        message="Refresh the page to retry the tertiary learning assessment workspace."
        variant="error"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description={
          isStaff
            ? 'Create quizzes, tests, and theory assessments against real tertiary courses.'
            : 'Open active quizzes, tests, and exams that belong to your tertiary course path.'
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Course Filter" description="Focus the assessment queue on one course if needed.">
          <div className="space-y-4">
            <Select
              label="Course"
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              <option value="">All accessible courses</option>
              {courses.map((course: LearningCourse) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </Select>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active Courses</p>
                <p className="mt-2 text-2xl font-semibold text-brand-navy">{courses.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Assessments</p>
                <p className="mt-2 text-2xl font-semibold text-brand-navy">{assessments.length}</p>
              </div>
            </div>
          </div>
        </Card>

        {isStaff ? (
          <Card title="Create Assessment" description="Support objective and theory questions with due dates and attempt limits.">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Course"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map((course: LearningCourse) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Assessment Type"
                  value={assessmentType}
                  onChange={(event) => setAssessmentType(event.target.value)}
                >
                  <option value="quiz">Quiz</option>
                  <option value="test">Test</option>
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Continuous Assessment 1"
                />
                <Input
                  label="Due Date"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Duration (Minutes)"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
                <Input
                  label="Attempts Allowed"
                  type="number"
                  min={1}
                  value={attemptsAllowed}
                  onChange={(event) => setAttemptsAllowed(event.target.value)}
                />
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-brand-navy">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(event) => setIsPublished(event.target.checked)}
                  />
                  Publish immediately
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                  placeholder="Add the assessment instructions students should follow."
                />
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-navy">Questions</h3>
                    <p className="text-sm text-slate-500">
                      Total score: {totalQuestionScore}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setQuestions((current) => [...current, createQuestionDraft('objective')])}
                    >
                      Add Objective
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setQuestions((current) => [...current, createQuestionDraft('theory')])}
                    >
                      Add Theory
                    </Button>
                  </div>
                </div>

                {questions.map((question: QuestionDraft, index: number) => (
                  <div key={question.id} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">Question {index + 1}</Badge>
                        <Badge variant="success">{question.type}</Badge>
                      </div>
                      {questions.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setQuestions((current) =>
                              current.filter((item: QuestionDraft) => item.id !== question.id)
                            )
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-[1fr_140px_160px]">
                      <Select
                        label="Question Type"
                        value={question.type}
                        onChange={(event) =>
                          setQuestions((current) =>
                            current.map((item: QuestionDraft) =>
                              item.id === question.id
                                ? {
                                    ...item,
                                    type: event.target.value as 'objective' | 'theory',
                                    maxScore:
                                      event.target.value === 'theory'
                                        ? item.maxScore || '10'
                                        : item.maxScore || '1',
                                  }
                                : item
                            )
                          )
                        }
                      >
                        <option value="objective">Objective</option>
                        <option value="theory">Theory</option>
                      </Select>
                      <Input
                        label="Max Score"
                        type="number"
                        min={1}
                        value={question.maxScore}
                        onChange={(event) =>
                          setQuestions((current) =>
                            current.map((item: QuestionDraft) =>
                              item.id === question.id ? { ...item, maxScore: event.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Prompt
                      </label>
                      <textarea
                        value={question.prompt}
                        onChange={(event) =>
                          setQuestions((current) =>
                            current.map((item: QuestionDraft) =>
                              item.id === question.id ? { ...item, prompt: event.target.value } : item
                            )
                          )
                        }
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                        placeholder="Enter the question prompt."
                      />
                    </div>
                    {question.type === 'objective' ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Options
                          </label>
                          <textarea
                            value={question.optionsText}
                            onChange={(event) =>
                              setQuestions((current) =>
                                current.map((item: QuestionDraft) =>
                                  item.id === question.id ? { ...item, optionsText: event.target.value } : item
                                )
                              )
                            }
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                            placeholder={'One option per line\nA\nB\nC\nD'}
                          />
                        </div>
                        <Input
                          label="Correct Answer"
                          value={question.correctAnswer}
                          onChange={(event) =>
                            setQuestions((current) =>
                              current.map((item: QuestionDraft) =>
                                item.id === question.id
                                  ? { ...item, correctAnswer: event.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="Enter the exact correct option text."
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Model Answer
                        </label>
                        <textarea
                          value={question.modelAnswer}
                          onChange={(event) =>
                            setQuestions((current) =>
                              current.map((item: QuestionDraft) =>
                                item.id === question.id ? { ...item, modelAnswer: event.target.value } : item
                              )
                            )
                          }
                          rows={4}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                          placeholder="Add the marking guide or sample answer."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  loading={createAssessment.isPending}
                  onClick={() => {
                    if (!selectedCourseId || !title.trim()) {
                      toast.error('Select a course and enter an assessment title first.');
                      return;
                    }
                    void createAssessment.mutateAsync({
                      course_id: selectedCourseId,
                      title,
                      instructions,
                      assessment_type: assessmentType,
                      due_at: dueAt ? new Date(dueAt).toISOString() : null,
                      duration_minutes: Number(durationMinutes || 30),
                      attempts_allowed: Number(attemptsAllowed || 1),
                      is_published: isPublished,
                      questions: questions.map((question: QuestionDraft) => ({
                        type: question.type,
                        prompt: question.prompt,
                        options:
                          question.type === 'objective'
                            ? question.optionsText
                                .split('\n')
                                .map((item: string) => item.trim())
                                .filter(Boolean)
                            : [],
                        correct_answer: question.correctAnswer,
                        model_answer: question.modelAnswer,
                        max_score: Number(question.maxScore || 1),
                      })),
                    });
                  }}
                >
                  Publish Assessment
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <Card title="Assessment Queue" description="Open any assessment to review questions, submissions, or student response flow.">
        {assessments.length ? (
          <div className="space-y-4">
            {assessments.map((assessment: LearningAssessment) => (
              <div
                key={assessment.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-brand-navy">{assessment.title}</h3>
                    <Badge variant="info">{assessment.assessment_type}</Badge>
                    <Badge variant={assessment.is_published === false ? 'warning' : 'success'}>
                      {assessment.is_published === false ? 'Draft' : 'Published'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {assessment.course_code} - {assessment.course_name}
                    {assessment.period_name ? ` · ${assessment.period_name}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <span>Total Score: {assessment.total_score || 0}</span>
                    <span>Questions: {assessment.questions.length}</span>
                    <span>Attempts: {assessment.attempts_allowed || 1}</span>
                    <span>Due: {formatDateTime(assessment.due_at)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    leftIcon={<Eye className="h-4 w-4" />}
                    onClick={() => setSelectedAssessmentId(assessment.id)}
                  >
                    {isStaff ? 'Open Assessment' : 'Start Assessment'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No assessments available"
            message="Published tertiary quizzes and tests will appear here."
          />
        )}
      </Card>

      <Modal
        open={Boolean(selectedAssessment)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssessmentId('');
            setAnswers({});
          }
        }}
        title={selectedAssessment ? selectedAssessment.title : 'Assessment'}
        description={
          isStaff
            ? 'Review question design and student submission progress.'
            : 'Complete the assessment before the deadline and submit your answers.'
        }
        size="xl"
      >
        {selectedAssessment ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Course</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedAssessment.course_code}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedAssessment.assessment_type}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Due</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {formatDateTime(selectedAssessment.due_at)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Duration</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">
                  {selectedAssessment.duration_minutes || 0} mins
                </p>
              </div>
            </div>

            {selectedAssessment.instructions ? (
              <div className="rounded-3xl bg-amber-50 p-4 text-sm text-slate-700">
                {selectedAssessment.instructions}
              </div>
            ) : null}

            <div className="space-y-4">
              {selectedAssessment.questions.map((question, index: number) => (
                <div key={question.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Question {index + 1}</Badge>
                    <Badge variant="success">{question.type}</Badge>
                    <Badge variant="warning">{question.max_score} mark(s)</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-brand-navy">{question.prompt}</p>

                  {isStaff ? (
                    question.type === 'objective' ? (
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        {question.options.map((option: string) => (
                          <div key={option} className="rounded-2xl bg-slate-50 px-4 py-3">
                            {option}
                          </div>
                        ))}
                        <p className="text-xs uppercase tracking-[0.14em] text-emerald-600">
                          Correct answer: {question.correct_answer || 'Not set'}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        {question.model_answer || 'No model answer provided.'}
                      </div>
                    )
                  ) : question.type === 'objective' ? (
                    <div className="mt-4 space-y-3">
                      {question.options.map((option: string) => (
                        <label
                          key={option}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            checked={answers[question.id] === option}
                            onChange={() =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: option,
                              }))
                            }
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <textarea
                        value={answers[question.id] || ''}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        rows={5}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                        placeholder="Enter your answer here."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isStaff ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-brand-navy">Submissions</h3>
                  <Badge variant="info">{(submissionsQuery.data || []).length} submitted</Badge>
                </div>
                {(submissionsQuery.data || []).length ? (
                  <div className="space-y-3">
                    {((submissionsQuery.data || []) as LearningSubmission[]).map(
                      (submission: LearningSubmission) => (
                      <div
                        key={submission.id}
                        className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-brand-navy">{submission.student_name}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            Submitted {formatDateTime(submission.submitted_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone(submission.status)}`}>
                            {submission.status === 'graded' ? 'Graded' : 'Pending Review'}
                          </span>
                          <span className="text-sm font-semibold text-brand-navy">
                            {submission.final_score ?? submission.auto_score}/{submission.max_score}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<ClipboardCheck className="h-4 w-4" />}
                            onClick={() => setSelectedSubmissionId(submission.id)}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No submissions yet"
                    message="Student attempts will appear here once they complete this assessment."
                  />
                )}
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setSelectedAssessmentId('')}>
                  Close
                </Button>
                <Button
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  loading={submitAssessment.isPending}
                  onClick={() =>
                    void submitAssessment.mutateAsync({
                      assessmentId: selectedAssessment.id,
                      payload: { answers },
                    })
                  }
                >
                  Submit Assessment
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubmissionId('');
          }
        }}
        title={selectedSubmission ? `Review - ${selectedSubmission.student_name}` : 'Review Submission'}
        description="Score theory responses, confirm the final mark, and publish feedback."
        size="xl"
      >
        {selectedSubmission ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Course</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedSubmission.course_code}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedSubmission.status}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Auto Score</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedSubmission.auto_score}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Max Score</p>
                <p className="mt-2 text-lg font-semibold text-brand-navy">{selectedSubmission.max_score}</p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedSubmission.answers.map((answer, index: number) => (
                <div key={answer.question_id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Question {index + 1}</Badge>
                    <Badge variant={answer.type === 'theory' ? 'warning' : 'success'}>{answer.type}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-brand-navy">{answer.prompt}</p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    {Array.isArray(answer.response) ? answer.response.join(', ') : answer.response || 'No response'}
                  </div>
                  {answer.type === 'theory' ? (
                    <div className="mt-4 max-w-[220px]">
                      <Input
                        label="Awarded Score"
                        type="number"
                        min={0}
                        max={answer.max_score}
                        value={gradingScores[answer.question_id] || ''}
                        onChange={(event) =>
                          setGradingScores((current) => ({
                            ...current,
                            [answer.question_id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Auto scored: {answer.awarded_score ?? 0}/{answer.max_score}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Feedback
              </label>
              <textarea
                value={gradingFeedback}
                onChange={(event) => setGradingFeedback(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                placeholder="Add grading notes for the student."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedSubmissionId('')}>
                Close
              </Button>
              <Button
                loading={gradeSubmission.isPending}
                leftIcon={<Timer className="h-4 w-4" />}
                onClick={() =>
                  void gradeSubmission.mutateAsync({
                    submissionId: selectedSubmission.id,
                    payload: {
                      answers: Object.fromEntries(
                        Object.entries(gradingScores).map(([questionId, value]) => [
                          questionId,
                          Number(value || 0),
                        ])
                      ),
                      feedback: gradingFeedback,
                    },
                  })
                }
              >
                Publish Result
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default LearningAssessmentsPage;
