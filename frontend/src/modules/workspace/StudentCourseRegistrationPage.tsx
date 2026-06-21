import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpenCheck, CalendarRange, GraduationCap, ShieldCheck } from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface RegistrationCourse {
  id: string;
  code: string;
  name: string;
  credit_hours?: number;
  prerequisite_codes?: string[];
  next_offering_codes?: string[];
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
  outstanding_resit_codes: string[];
  eligible_courses: RegistrationCourse[];
  blocked_courses: RegistrationCourse[];
  next_period_preview: RegistrationCourse[];
  already_registered: Array<{ id: string; courses?: RegistrationCourse[] }>;
}

const StudentCourseRegistrationPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery<RegistrationState>({
    queryKey: ['student-course-registration', user?.id],
    queryFn: () => eduovaApi.tertiary.studentRegistration(user?.id || ''),
    enabled: Boolean(user?.id),
  });

  const registerCourses = useMutation({
    mutationFn: eduovaApi.tertiary.registerCourses,
    onSuccess: () => {
      toast.success('Courses registered successfully.');
      setSelectedCourseIds([]);
      void queryClient.invalidateQueries({ queryKey: ['student-course-registration', user?.id] });
    },
    onError: () => toast.error('Unable to register the selected courses.'),
  });

  const totalCredits = useMemo(
    () =>
      (data?.eligible_courses || [])
        .filter((course) => selectedCourseIds.includes(course.id))
        .reduce((sum, course) => sum + Number(course.credit_hours || 0), 0),
    [data?.eligible_courses, selectedCourseIds]
  );

  if (isLoading || !data) {
    return <PageLoader />;
  }

  const alreadyRegisteredCount = data.already_registered.reduce(
    (sum, item) => sum + Number(item.courses?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Registration"
        description="Register only the courses under your current level and active semester. The system blocks courses outside your progression path or with unmet prerequisites."
      />

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
          title="Outstanding resit detected"
          message={`You have carry-over courses: ${data.outstanding_resit_codes.join(', ')}. The system restricts progression until those courses are handled.`}
          variant="warning"
        />
      ) : (
        <Alert
          title="Progression status is clear"
          message="You have no active resit hold, so the platform can show your current semester courses and next-semester preview."
          variant="success"
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Register Your Courses"
          description="Choose from the courses assigned to your current level and semester only."
          action={
            <Button
              onClick={() =>
                registerCourses.mutate({
                  student_id: user?.id,
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
            {(data.eligible_courses || []).map((course) => (
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
              data.blocked_courses.map((course) => (
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
              data.next_period_preview.map((course) => (
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
