import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, TimerReset, UserCheck, Users2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface AssessmentRow {
  id: string;
  className: string;
  subject: string;
  term: string;
  assessment: string;
  max_score: number;
}

interface AttendanceRow {
  id: string;
  student: string;
  days: number;
  present: number;
  rate: number;
}

interface TimetableRow {
  day: string;
  period: string;
  subject: string;
  teacher: string;
  room: string;
}

const TeacherWorkspacePage = () => {
  const user = useAuthStore((state) => state.user);
  const { data: assessments = [], isLoading: loadingAssessments } = useQuery<AssessmentRow[]>({
    queryKey: ['teacher-assessments'],
    queryFn: eduovaApi.academics.assessments,
  });
  const { data: attendance = [], isLoading: loadingAttendance } = useQuery<AttendanceRow[]>({
    queryKey: ['teacher-attendance-report'],
    queryFn: eduovaApi.attendance.report,
  });
  const { data: timetable = [], isLoading: loadingTimetable } = useQuery<TimetableRow[]>({
    queryKey: ['teacher-timetable-grid'],
    queryFn: eduovaApi.timetable.grid,
  });

  const stats = useMemo(() => {
    const pendingScores = assessments.length;
    const attentionLearners = attendance.filter((item: AttendanceRow) => item.rate < 80).length;
    const classCoverage = new Set(
      assessments.map((item: AssessmentRow) => item.className)
    ).size;

    return [
      {
        label: 'Class Groups',
        value: `${classCoverage || 1}`,
        helper: 'Distinct class groups assigned this session.',
        icon: Users2,
      },
      {
        label: 'Pending Scores',
        value: `${pendingScores}`,
        helper: 'Assessments ready for scoring or moderation.',
        icon: TimerReset,
      },
      {
        label: 'Attendance Follow-up',
        value: `${attentionLearners}`,
        helper: 'Learners below the attendance threshold.',
        icon: UserCheck,
      },
      {
        label: 'Open Channels',
        value: '4',
        helper: 'Homeroom, guardians, department, and announcements.',
        icon: MessageSquare,
      },
    ];
  }, [assessments, attendance]);

  if (loadingAssessments || loadingAttendance || loadingTimetable) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Workspace"
        description={`Welcome ${user?.first_name || 'Teacher'}. Use this workspace to manage class teaching, attendance, grading, and parent communication.`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold text-brand-navy">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                </div>
                <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Assessment Queue" description="Scoring and publishing work ready for action.">
          <div className="space-y-3">
            {assessments.map((item: AssessmentRow) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-navy">{item.subject}</p>
                  <p className="text-sm text-slate-500">
                    {item.className} · {item.term} · {item.assessment}
                  </p>
                </div>
                <Badge variant="pending">{item.max_score} marks</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick Actions" description="Open the main teacher workflows.">
          <div className="space-y-3">
            <Link
              to="/academics/results-entry"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Record scores and continuous assessment
            </Link>
            <Link
              to="/attendance/taking"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Take and review attendance
            </Link>
            <Link
              to="/timetable/view"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Check timetable and room allocations
            </Link>
            <Link
              to="/communication"
              className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Send learner and parent updates
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Today&apos;s Timetable" description="Current teaching periods and spaces.">
          <div className="space-y-3">
            {timetable.map((item: TimetableRow, index: number) => (
              <div
                key={`${item.day}-${item.period}-${index}`}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">{item.subject}</p>
                    <p className="text-sm text-slate-500">
                      {item.day} at {item.period} · {item.room}
                    </p>
                  </div>
                  <Badge variant="info">{item.teacher}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Attendance Risks" description="Students who need early intervention.">
          <div className="space-y-3">
            {attendance.slice(0, 4).map((item: AttendanceRow) => (
              <Alert
                key={item.id}
                title={item.student}
                message={`${item.present}/${item.days} present days with ${item.rate}% attendance.`}
                variant={item.rate < 75 ? 'warning' : 'info'}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherWorkspacePage;
