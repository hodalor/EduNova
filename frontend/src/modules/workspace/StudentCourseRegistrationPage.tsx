import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpenCheck, CalendarRange, GraduationCap, ShieldCheck } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useStudents, type StudentListItem } from '../students/hooks/useStudents';

interface RegistrationCourse {
  id: string;
  code: string;
  name: string;
  credit_hours?: number;
  prerequisite_codes?: string[];
  next_offering_codes?: string[];
  fee_amount?: number;
  reason?: string;
}

interface RegistrationState {
  student_id: string;
  current_group: { id: string; name: string; code: string; calendar_type: string };
  current_period: {
    id: string;
    name: string;
    sequence: number;
    calendar_type: string;
    status: string;
    registration_open: boolean;
  };
  fee_clearance: boolean;
  can_progress: boolean;
  base_can_progress?: boolean;
  progression_override?: 'default' | 'allow' | 'hold';
  progression_note?: string | null;
  progression_policy?: {
    allow_carry_over_progression: boolean;
    max_carry_over_courses: number;
    max_carry_over_credits: number;
    allow_manual_overrides: boolean;
  };
  carry_over_summary?: {
    outstanding_count: number;
    outstanding_credit_hours: number;
    policy_allows_progression: boolean;
    effective_can_progress: boolean;
    progression_override: 'default' | 'allow' | 'hold';
    reason: string;
  };
  outstanding_resit_codes: string[];
  eligible_courses: RegistrationCourse[];
  blocked_courses: RegistrationCourse[];
  next_period_preview: RegistrationCourse[];
  already_registered: Array<{ id: string; courses?: RegistrationCourse[] }>;
  fee_summary: {
    base_fee_amount: number;
    course_fee_total: number;
    late_registration_penalty: number;
    penalty_deadline: string | null;
    penalty_applied: boolean;
    total_amount: number;
    minimum_payment_percent: number;
    minimum_required_amount: number;
    paid_amount: number;
    invoiced_amount: number;
    outstanding_amount: number;
    fee_clearance: boolean;
  };
}

const StudentCourseRegistrationPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isAdminMode = role === 'institution_admin' || role === 'teacher';
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [progressionOverride, setProgressionOverride] = useState<'default' | 'allow' | 'hold'>(
    'default'
  );
  const [carryOverCodes, setCarryOverCodes] = useState('');
  const [progressionNote, setProgressionNote] = useState('');

  const { data: tertiaryStudents = [] } = useStudents({
    level: 'TR',
    search,
  });
  const selectedStudent = (tertiaryStudents as StudentListItem[]).find(
    (item) => item.id === selectedStudentId
  );
  const targetStudentId = isAdminMode ? selectedStudentId : user?.student_id || user?.id || '';

  const { data, isLoading } = useQuery<RegistrationState>({
    queryKey: ['student-course-registration', targetStudentId],
    queryFn: () => eduovaApi.tertiary.studentRegistration(targetStudentId),
    enabled: Boolean(targetStudentId),
  });

  const registerCourses = useMutation({
    mutationFn: eduovaApi.tertiary.registerCourses,
    onSuccess: () => {
      toast.success('Courses registered successfully.');
      setSelectedCourseIds([]);
      void queryClient.invalidateQueries({ queryKey: ['student-course-registration', targetStudentId] });
    },
    onError: () => toast.error('Unable to register the selected courses.'),
  });
  const updateStudentProgress = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      eduovaApi.tertiary.updateStudentProgress(targetStudentId, payload),
    onSuccess: () => {
      toast.success('Student progression override updated.');
      void queryClient.invalidateQueries({ queryKey: ['student-course-registration', targetStudentId] });
    },
    onError: () => toast.error('Unable to update student progression override.'),
  });

  const totalCredits = useMemo(
    () =>
      (data?.eligible_courses || [])
        .filter((course: RegistrationCourse) => selectedCourseIds.includes(course.id))
        .reduce((sum: number, course: RegistrationCourse) => sum + Number(course.credit_hours || 0), 0),
    [data?.eligible_courses, selectedCourseIds]
  );

  useEffect(() => {
    setSelectedCourseIds([]);
  }, [targetStudentId]);

  useEffect(() => {
    setProgressionOverride(data?.progression_override || 'default');
    setCarryOverCodes((data?.outstanding_resit_codes || []).join(', '));
    setProgressionNote(data?.progression_note || '');
  }, [data?.outstanding_resit_codes, data?.progression_note, data?.progression_override]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAdminMode && !targetStudentId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tertiary Course Registration"
          description="Search a tertiary student, review registration eligibility, then register current semester courses on their behalf."
        />
        <Card title="Select Student" description="Search by student name or student number.">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <SearchInput placeholder="Search tertiary students" onDebouncedChange={setSearch} />
            <Select
              label="Student"
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
            >
              <option value="">Choose student</option>
              {(tertiaryStudents as StudentListItem[]).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.student_number})
                </option>
              ))}
            </Select>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <PageLoader />;
  }

  const alreadyRegisteredCount = data.already_registered.reduce(
    (sum: number, item: { id: string; courses?: RegistrationCourse[] }) =>
      sum + Number(item.courses?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdminMode ? 'Tertiary Course Registration' : 'Course Registration'}
        description={
          isAdminMode
            ? 'Search a tertiary student, review finance and progression checks, then register the courses allowed for the active semester.'
            : 'Register only the courses under your current level and active semester. The system blocks courses outside your progression path or with unmet prerequisites.'
        }
      />

      {isAdminMode ? (
        <Card title="Selected Student" description="Admin-assisted registration uses the same real-time progression checks as the student portal.">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <SearchInput placeholder="Search tertiary students" onDebouncedChange={setSearch} />
            <Select
              label="Student"
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
            >
              <option value="">Choose student</option>
              {(tertiaryStudents as StudentListItem[]).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.student_number})
                </option>
              ))}
            </Select>
          </div>
          {selectedStudent ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-brand-navy">{selectedStudent.name}</p>
              <p className="mt-1">
                {selectedStudent.student_number} · {selectedStudent.className}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Current Level',
            value: data.current_group.code,
            helper: data.current_group.name,
            icon: GraduationCap,
          },
          {
            label: 'Active Semester',
            value: data.current_period.name,
            helper: `Sequence ${data.current_period.sequence}`,
            icon: CalendarRange,
          },
          {
            label: 'Eligible Courses',
            value: `${data.eligible_courses.length}`,
            helper: 'Only these can be added now.',
            icon: BookOpenCheck,
          },
          {
            label: 'Registered Courses',
            value: `${alreadyRegisteredCount}`,
            helper: 'Saved in your current semester cart.',
            icon: ShieldCheck,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
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

      {data.outstanding_resit_codes.length > 0 ? (
        <Alert
          title={
            data.can_progress
              ? 'Carry-over progression allowed'
              : 'Outstanding resit detected'
          }
          message={
            data.can_progress
              ? `${data.outstanding_resit_codes.join(', ')} can be carried with the next semester because this student is within policy or has an admin override.`
              : `You have carry-over courses: ${data.outstanding_resit_codes.join(', ')}. ${data.carry_over_summary?.reason || 'The system restricts progression until those courses are handled.'}`
          }
          variant={data.can_progress ? 'info' : 'warning'}
        />
      ) : (
        <Alert
          title="Progression status is clear"
          message="You have no active resit hold, so the platform can show your current semester courses and next-semester preview."
          variant="success"
        />
      )}

      {isAdminMode ? (
        <Card
          title="Progression Override"
          description="Use this only when the institution wants to release or hold a student outside the automatic carry-over policy."
          action={
            <Button
              onClick={() =>
                updateStudentProgress.mutate({
                  progression_override: progressionOverride,
                  outstanding_resit_codes: carryOverCodes,
                  progression_note: progressionNote,
                })
              }
              loading={updateStudentProgress.isPending}
            >
              Save Override
            </Button>
          }
        >
          <div className="grid gap-4 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Base Result Status</p>
              <p className="mt-2 font-semibold text-brand-navy">
                {data.base_can_progress ? 'Eligible to progress' : 'Held by results'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Effective Status</p>
              <p className="mt-2 font-semibold text-brand-navy">
                {data.can_progress ? 'Progression allowed' : 'Progression blocked'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Carry-over Load</p>
              <p className="mt-2 font-semibold text-brand-navy">
                {data.carry_over_summary?.outstanding_count || 0} course(s)
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Carry-over Credits</p>
              <p className="mt-2 font-semibold text-brand-navy">
                {Number(data.carry_over_summary?.outstanding_credit_hours || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Select
              label="Progression Override"
              value={progressionOverride}
              onChange={(event) =>
                setProgressionOverride(event.target.value as 'default' | 'allow' | 'hold')
              }
            >
              <option value="default">Follow automatic rule</option>
              <option value="allow">Allow progression</option>
              <option value="hold">Place student on hold</option>
            </Select>
            <Input
              label="Carry-over Course Codes"
              value={carryOverCodes}
              onChange={(event) => setCarryOverCodes(event.target.value.toUpperCase())}
              helperText="Separate multiple course codes with commas."
            />
            <Input
              label="Override Note"
              value={progressionNote}
              onChange={(event) => setProgressionNote(event.target.value)}
              helperText="Keep a short explanation for the institution."
            />
          </div>
          <div className="mt-4 space-y-3">
            <Alert
              title="Current progression decision"
              message={data.carry_over_summary?.reason || 'The system is using the current progression policy.'}
              variant={data.can_progress ? 'success' : 'warning'}
            />
            <Alert
              title="Institution carry-over policy"
              message={
                data.progression_policy?.allow_carry_over_progression
                  ? `This institution allows progression with up to ${Number(data.progression_policy.max_carry_over_courses || 0)} carry-over courses and ${Number(data.progression_policy.max_carry_over_credits || 0)} carry-over credits.`
                  : 'This institution requires students to clear carry-over courses before moving forward unless an admin override is applied.'
              }
              variant="info"
            />
          </div>
        </Card>
      ) : null}

      <Card
        title="Fee And Clearance"
        description="Course registration and finance are linked in real time for the active semester."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Base Fee</p>
            <p className="mt-2 font-semibold text-brand-navy">
              GHS {Number(data.fee_summary.base_fee_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Course Fees</p>
            <p className="mt-2 font-semibold text-brand-navy">
              GHS {Number(data.fee_summary.course_fee_total || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Minimum Before Registration</p>
            <p className="mt-2 font-semibold text-brand-navy">
              {Number(data.fee_summary.minimum_payment_percent || 0)}% · GHS {Number(data.fee_summary.minimum_required_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Paid So Far</p>
            <p className="mt-2 font-semibold text-brand-navy">
              GHS {Number(data.fee_summary.paid_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
            <p className="mt-2 font-semibold text-brand-navy">
              GHS {Number(data.fee_summary.outstanding_amount || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Alert
            title={data.fee_clearance ? 'Registration fee threshold met' : 'Registration fee threshold not met'}
            message={
              data.fee_clearance
                ? 'The student has met the current semester payment rule for course registration.'
                : 'The student must meet the minimum payment rule before course registration can be completed.'
            }
            variant={data.fee_clearance ? 'success' : 'warning'}
          />
          {data.fee_summary.penalty_applied ? (
            <Alert
              title="Late registration penalty applied"
              message={`Penalty deadline passed${data.fee_summary.penalty_deadline ? ` on ${data.fee_summary.penalty_deadline}` : ''}, so GHS ${Number(data.fee_summary.late_registration_penalty || 0).toLocaleString()} was added.`}
              variant="warning"
            />
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Register Your Courses"
          description="Choose from the courses assigned to your current level and semester only."
          action={
            <Button
              onClick={() =>
                registerCourses.mutate({
                  student_id: targetStudentId,
                  course_ids: selectedCourseIds,
                })
              }
              disabled={
                !data.current_period.registration_open ||
                !data.fee_clearance ||
                selectedCourseIds.length === 0
              }
              loading={registerCourses.isPending}
            >
              Submit Registration
            </Button>
          }
        >
          <div className="space-y-3">
            {(data.eligible_courses || []).map((course: RegistrationCourse) => (
              <label
                key={course.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={selectedCourseIds.includes(course.id)}
                  onChange={(event) =>
                    setSelectedCourseIds((current) =>
                      event.target.checked
                        ? [...current, course.id]
                        : current.filter((item) => item !== course.id)
                    )
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">
                        {course.code} · {course.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {course.credit_hours || 0} credit hours
                        {typeof course.fee_amount === 'number' ? ` · GHS ${Number(course.fee_amount).toLocaleString()}` : ''}
                        {course.prerequisite_codes?.length ? ` · prerequisite: ${course.prerequisite_codes.join(', ')}` : ''}
                      </p>
                    </div>
                    <Badge variant="success">eligible</Badge>
                  </div>
                </div>
              </label>
            ))}
          </div>
          {!data.eligible_courses.length ? (
            <div className="mt-4">
              <EmptyState
                title="No eligible courses"
                message="There are no courses available for registration in your current semester."
              />
            </div>
          ) : null}
        </Card>

        <Card title="Registration Rules" description="The system applies these checks before saving.">
          <div className="space-y-3">
            <Alert
              title={data.current_period.registration_open ? 'Registration is open' : 'Registration is closed'}
              message={`Current ${data.current_period.calendar_type}: ${data.current_period.name}.`}
              variant={data.current_period.registration_open ? 'success' : 'warning'}
            />
            <Alert
              title={data.fee_clearance ? 'Finance cleared' : 'Finance clearance pending'}
              message="Fee clearance can be used to permit or block course registration."
              variant={data.fee_clearance ? 'success' : 'warning'}
            />
            <Alert
              title={data.can_progress ? 'Progression allowed' : 'Progression blocked'}
              message={
                data.carry_over_summary?.reason ||
                'Progression follows the student results, carry-over load, and institution policy.'
              }
              variant={data.can_progress ? 'success' : 'warning'}
            />
            <Alert
              title="Selected credit load"
              message={`${selectedCourseIds.length} courses selected with ${totalCredits} credit hours.`}
              variant="info"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Blocked Courses" description="Courses outside your current eligibility are not selectable.">
          <div className="space-y-3">
            {data.blocked_courses.length ? (
              data.blocked_courses.map((course: RegistrationCourse) => (
                <div key={course.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">
                        {course.code} · {course.name}
                      </p>
                      <p className="text-sm text-slate-600">{course.reason}</p>
                    </div>
                    <Badge variant="warning">blocked</Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No blocked courses"
                message="All courses assigned to the current semester are available to you."
              />
            )}
          </div>
        </Card>

        <Card title="Next Semester Preview" description="What comes next if you clear this semester without resits.">
          <div className="space-y-3">
            {data.next_period_preview.length ? (
              data.next_period_preview.map((course: RegistrationCourse) => (
                <div key={course.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">
                        {course.code} · {course.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {course.credit_hours || 0} credit hours
                      </p>
                    </div>
                    <Badge variant="info">next</Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No next semester preview"
                message="The next semester courses will appear once the structure is defined."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentCourseRegistrationPage;
