import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useStudent, type StudentDetail } from '../students/hooks/useStudent';
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
  finance_policy?: {
    new_student_registration_percent: number;
    returning_student_registration_percent: number;
    midsem_exam_percent: number;
    final_exam_percent: number;
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
    resit_course_total?: number;
    late_registration_penalty: number;
    penalty_deadline: string | null;
    penalty_applied: boolean;
    total_amount: number;
    minimum_payment_percent: number;
    minimum_required_amount: number;
    paid_amount: number;
    invoiced_amount: number;
    outstanding_amount: number;
    is_new_student?: boolean;
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
  const [activeTab, setActiveTab] = useState('roadmap');
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
  const { data: studentDetail } = useStudent(targetStudentId);

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
  const tertiaryRoadmap = studentDetail?.tertiary?.roadmap || null;
  const registeredCourses = data.already_registered.flatMap(
    (item: { id: string; courses?: RegistrationCourse[] }) => item.courses || []
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
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Student And Session">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Student</p>
              <p className="mt-2 font-semibold text-brand-navy">
                {selectedStudent?.name || user?.first_name || 'Student'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {selectedStudent?.student_number || user?.student_number || '-'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program Context</p>
              <p className="mt-2 font-semibold text-brand-navy">{data.current_group.name}</p>
              <p className="mt-1 text-sm text-slate-500">{data.current_period.name}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Eligible Courses</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{data.eligible_courses.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Registered Courses</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{alreadyRegisteredCount}</p>
            </div>
          </div>
        </Card>

        <Card title="Finance And Clearance">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Semester Courses</p>
              <p className="mt-2 font-semibold text-brand-navy">
                GHS {Number(data.fee_summary.course_fee_total || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Minimum Before Registration</p>
              <p className="mt-2 font-semibold text-brand-navy">
                {Number(data.fee_summary.minimum_payment_percent || 0)}% · GHS {Number(
                  data.fee_summary.minimum_required_amount || 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Resit Courses</p>
              <p className="mt-2 font-semibold text-brand-navy">
                GHS {Number(data.fee_summary.resit_course_total || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Paid So Far</p>
              <p className="mt-2 font-semibold text-brand-navy">
                GHS {Number(data.fee_summary.paid_amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Expected</p>
              <p className="mt-2 font-semibold text-brand-navy">
                GHS {Number(data.fee_summary.total_amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
              <p className="mt-2 font-semibold text-rose-600">
                GHS {Number(data.fee_summary.outstanding_amount || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <Alert
              title={data.fee_clearance ? 'Registration cleared' : 'Registration blocked by finance'}
              message={
                data.fee_clearance
                  ? 'The student has met the registration payment threshold.'
                  : `This ${
                      data.fee_summary.is_new_student ? 'new' : 'existing'
                    } student must meet the tertiary payment rule before registration.`
              }
              variant={data.fee_clearance ? 'success' : 'warning'}
            />
            <Alert
              title={data.can_progress ? 'Progression allowed' : 'Progression blocked'}
              message={
                data.carry_over_summary?.reason ||
                'Progression follows the recorded results, carry-over load, and institution policy.'
              }
              variant={data.can_progress ? 'success' : 'warning'}
            />
          </div>
        </Card>
      </div>

      {isAdminMode ? (
        <Card
          title="Progression Override"
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
          <div className="grid gap-4 xl:grid-cols-3">
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
              label="Carry-Over Course Codes"
              value={carryOverCodes}
              onChange={(event) => setCarryOverCodes(event.target.value.toUpperCase())}
            />
            <Input
              label="Override Note"
              value={progressionNote}
              onChange={(event) => setProgressionNote(event.target.value)}
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roadmap">Levels And Semesters</TabsTrigger>
            <TabsTrigger value="eligible">Eligible Courses</TabsTrigger>
            <TabsTrigger value="registered">Registered Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="roadmap" className="mt-6">
            {tertiaryRoadmap ? (
              <div className="space-y-4">
                {tertiaryRoadmap.levels.map(
                  (
                    level: NonNullable<
                      NonNullable<NonNullable<StudentDetail['tertiary']>['roadmap']>['levels']
                    >[number]
                  ) => (
                    <details key={level.id} className="rounded-2xl border border-slate-200 bg-white" open>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-semibold text-brand-navy">
                        <span>{level.name}</span>
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </summary>
                      <div className="space-y-3 border-t border-slate-100 p-4">
                        {level.periods.map((period) => (
                          <details key={period.id} className="rounded-2xl bg-slate-50" open={data.current_period.id === period.id}>
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-brand-navy">
                              <span>
                                {period.name}
                                {data.current_period.id === period.id ? ' · Current' : ''}
                              </span>
                              <span className="text-sm text-slate-500">
                                {Number(period.completed_courses || 0)}/{Number(period.total_courses || 0)} cleared
                              </span>
                            </summary>
                            <div className="space-y-2 border-t border-slate-100 p-4">
                              {period.courses.length ? (
                                period.courses.map((course) => (
                                  <div
                                    key={course.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                  >
                                    <div>
                                      <p className="font-semibold text-brand-navy">
                                        {course.code} · {course.name}
                                      </p>
                                      <p className="text-sm text-slate-500">
                                        {course.credit_hours || 0} credits
                                      </p>
                                    </div>
                                    {course.completed ? (
                                      <Badge variant="active">Cleared</Badge>
                                    ) : course.outstanding ? (
                                      <Badge variant="warning">Carry-Over</Badge>
                                    ) : (
                                      <Badge variant="inactive">Pending</Badge>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <EmptyState
                                  title="No courses mapped"
                                  message="This semester does not have any mapped courses yet."
                                />
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  )
                )}
              </div>
            ) : (
              <EmptyState
                title="No roadmap available"
                message="This student does not have a tertiary roadmap linked yet."
              />
            )}
          </TabsContent>

          <TabsContent value="eligible" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-brand-navy">Register Current Semester Courses</p>
                    <p className="text-sm text-slate-500">
                      {selectedCourseIds.length} selected · {totalCredits} credit hours
                    </p>
                  </div>
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
                </div>

                {data.eligible_courses.length ? (
                  <div className="space-y-3">
                    {data.eligible_courses.map((course: RegistrationCourse) => (
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
                                {typeof course.fee_amount === 'number'
                                  ? ` · GHS ${Number(course.fee_amount).toLocaleString()}`
                                  : ''}
                              </p>
                            </div>
                            <Badge variant="success">Eligible</Badge>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No eligible courses"
                    message="There are no courses available for registration in the active semester."
                  />
                )}
              </div>

              <div className="space-y-4">
                <Card title="Registration Rules">
                  <div className="space-y-3">
                    <Alert
                      title={data.current_period.registration_open ? 'Registration is open' : 'Registration is closed'}
                      message={`${data.current_period.name} is the active ${data.current_period.calendar_type}.`}
                      variant={data.current_period.registration_open ? 'success' : 'warning'}
                    />
                    <Alert
                      title={data.fee_clearance ? 'Finance cleared' : 'Finance clearance pending'}
                      message={`Required payment before registration: GHS ${Number(
                        data.fee_summary.minimum_required_amount || 0
                      ).toLocaleString()}.`}
                      variant={data.fee_clearance ? 'success' : 'warning'}
                    />
                    <Alert
                      title={data.can_progress ? 'Progression allowed' : 'Progression blocked'}
                      message={data.carry_over_summary?.reason || 'The current progression rule is active.'}
                      variant={data.can_progress ? 'success' : 'warning'}
                    />
                  </div>
                </Card>

                <Card title="Blocked Courses">
                  <div className="space-y-3">
                    {data.blocked_courses.length ? (
                      data.blocked_courses.map((course: RegistrationCourse) => (
                        <div key={course.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="font-semibold text-brand-navy">
                            {course.code} · {course.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{course.reason}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No blocked courses"
                        message="All active-semester courses are open to this student."
                      />
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="registered" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card title="Registered Courses">
                <div className="space-y-3">
                  {registeredCourses.length ? (
                    registeredCourses.map((course: RegistrationCourse, index: number) => (
                      <div key={`${course.id}-${index}`} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <p className="font-semibold text-brand-navy">
                          {course.code} · {course.name}
                        </p>
                        <p className="text-sm text-slate-500">{course.credit_hours || 0} credit hours</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No registered courses"
                      message="This student has not submitted any course registration yet."
                    />
                  )}
                </div>
              </Card>

              <Card title="Next Semester Preview">
                <div className="space-y-3">
                  {data.next_period_preview.length ? (
                    data.next_period_preview.map((course: RegistrationCourse) => (
                      <div key={course.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <p className="font-semibold text-brand-navy">
                          {course.code} · {course.name}
                        </p>
                        <p className="text-sm text-slate-500">{course.credit_hours || 0} credit hours</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No next semester preview"
                      message="The next set of semester courses will appear here when available."
                    />
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default StudentCourseRegistrationPage;
