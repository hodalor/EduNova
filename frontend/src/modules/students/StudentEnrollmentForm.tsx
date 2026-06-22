import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import ProgressBar from '../../components/ui/ProgressBar';
import Select from '../../components/ui/Select';
import { getInstitutionLevels, isTertiaryInstitution } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import type { EducationLevelCode } from '../../types/auth';
import PageHeader from '../shared/PageHeader';
import { useCreateStudent } from './hooks/useCreateStudent';

const draftKey = 'eduova.studentEnrollmentDraft';

const enrollmentSchema = z
  .object({
    level: z.string().min(1, 'Education level is required'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().optional(),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    guardianName: z.string().min(3, 'Guardian name is required'),
    guardianPhone: z.string().min(6, 'Guardian phone is required'),
    parentLink: z.string().optional(),
    medicalNotes: z.string().optional(),
    dietaryRestrictions: z.string().optional(),
    pickupPersons: z.string().optional(),
    previousSchool: z.string().optional(),
    previousResults: z.string().optional(),
    qualification: z.string().optional(),
    facultyId: z.string().optional(),
    departmentId: z.string().optional(),
    programId: z.string().optional(),
    groupId: z.string().min(1, 'Class or level assignment is required'),
    feePlan: z.string().min(1, 'Fee plan is required'),
  })
  .superRefine((values, context) => {
    if (values.level === 'TR' && !values.facultyId) {
      context.addIssue({
        code: 'custom',
        path: ['facultyId'],
        message: 'Faculty is required for tertiary enrollment',
      });
    }
    if (values.level === 'TR' && !values.departmentId) {
      context.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: 'Department is required for tertiary enrollment',
      });
    }
    if (values.level === 'TR' && !values.programId) {
      context.addIssue({
        code: 'custom',
        path: ['programId'],
        message: 'Program is required for tertiary enrollment',
      });
    }
  });

type EnrollmentValues = z.infer<typeof enrollmentSchema>;

interface AcademicGroup {
  id: string;
  name: string;
  code: string;
  group_type: 'class' | 'level';
  level_code: string;
  calendar_type: string;
}

interface AcademicStructureResponse {
  groups: AcademicGroup[];
}

interface TertiaryOverview {
  faculties: Array<{ id: string; name: string; code: string }>;
  departments: Array<{ id: string; name: string; code: string; faculty_id: string }>;
  programs: Array<{
    id: string;
    name: string;
    code: string;
    credential: string;
    department_id: string;
    faculty_id: string;
    duration: string;
    calendar: string;
  }>;
}

const levelLabels: Record<EducationLevelCode, string> = {
  DC: 'Daycare',
  PR: 'Primary',
  JH: 'Junior High',
  SH: 'Senior High',
  TR: 'Tertiary',
};

const steps = [
  'Level',
  'Personal',
  'Guardian',
  'Level Specific',
  'Assignment',
  'Review',
];

const defaultValues: EnrollmentValues = {
  level: 'PR',
  firstName: '',
  lastName: '',
  email: '',
  dateOfBirth: '',
  guardianName: '',
  guardianPhone: '',
  parentLink: '',
  medicalNotes: '',
  dietaryRestrictions: '',
  pickupPersons: '',
  previousSchool: '',
  previousResults: '',
  qualification: '',
  facultyId: '',
  departmentId: '',
  programId: '',
  groupId: '',
  feePlan: 'Standard Term Plan',
};

const StudentEnrollmentForm = () => {
  const navigate = useNavigate();
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const allowedLevels = getInstitutionLevels(activeInstitution);
  const activeLevelSet = useMemo(
    () => (allowedLevels.length ? allowedLevels : (['PR'] as EducationLevelCode[])),
    [allowedLevels]
  );
  const defaultLevel = activeLevelSet[0];
  const isTertiaryOnly = activeLevelSet.length === 1 && activeLevelSet[0] === 'TR';
  const isBasicOnly = activeLevelSet.length > 0 && !activeLevelSet.includes('TR');
  const assignmentLabel = isTertiaryOnly ? 'Level' : isBasicOnly ? 'Class' : 'Class or Level';
  const roadmapLabel = isTertiaryOnly ? 'program roadmap' : 'class placement';
  const [step, setStep] = useState(0);
  const createStudent = useCreateStudent();
  const { data: structure, isLoading: structureLoading } = useQuery<AcademicStructureResponse>({
    queryKey: ['academic-structure', 'enrollment', activeInstitutionId],
    queryFn: eduovaApi.academics.structure,
    enabled: Boolean(activeInstitutionId),
  });
  const { data: tertiaryOverview, isLoading: tertiaryLoading } = useQuery<TertiaryOverview>({
    queryKey: ['tertiary-overview', 'enrollment', activeInstitutionId],
    queryFn: eduovaApi.tertiary.overview,
    enabled: Boolean(activeInstitutionId && isTertiaryInstitution(activeInstitution)),
  });

  const savedDraft = useMemo(() => {
    const draft = window.localStorage.getItem(draftKey);
    return draft ? (JSON.parse(draft) as Partial<EnrollmentValues>) : null;
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      ...defaultValues,
      ...savedDraft,
      level:
        savedDraft?.level && activeLevelSet.includes(savedDraft.level as EducationLevelCode)
          ? savedDraft.level
          : defaultLevel,
    },
  });

  const values = watch();
  const completion = ((step + 1) / steps.length) * 100;
  const groups: AcademicGroup[] = (structure?.groups || []).filter((item: AcademicGroup) =>
    activeLevelSet.includes(item.level_code as EducationLevelCode)
  );
  const availableGroups = groups.filter((item: AcademicGroup) => item.level_code === values.level);
  const faculties: TertiaryOverview['faculties'] = tertiaryOverview?.faculties || [];
  const departments: TertiaryOverview['departments'] = (tertiaryOverview?.departments || []).filter(
    (item: TertiaryOverview['departments'][number]) =>
      !values.facultyId || item.faculty_id === values.facultyId
  );
  const programs: TertiaryOverview['programs'] = (tertiaryOverview?.programs || []).filter(
    (item: TertiaryOverview['programs'][number]) =>
      (!values.facultyId || item.faculty_id === values.facultyId) &&
      (!values.departmentId || item.department_id === values.departmentId)
  );
  const selectedGroup = availableGroups.find((item: AcademicGroup) => item.id === values.groupId);
  const selectedProgram = programs.find(
    (item: TertiaryOverview['programs'][number]) => item.id === values.programId
  );

  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify(values));
  }, [values]);

  useEffect(() => {
    if (!activeLevelSet.includes(values.level as EducationLevelCode)) {
      setValue('level', defaultLevel);
      setValue('groupId', '');
      setValue('facultyId', '');
      setValue('departmentId', '');
      setValue('programId', '');
    }
  }, [activeLevelSet, defaultLevel, setValue, values.level]);

  useEffect(() => {
    if (values.groupId && !availableGroups.some((item) => item.id === values.groupId)) {
      setValue('groupId', '');
    }
  }, [availableGroups, setValue, values.groupId]);

  useEffect(() => {
    if (values.facultyId && !departments.some((item) => item.id === values.departmentId)) {
      setValue('departmentId', '');
      setValue('programId', '');
    }
  }, [departments, setValue, values.departmentId, values.facultyId]);

  useEffect(() => {
    if (values.departmentId && !programs.some((item) => item.id === values.programId)) {
      setValue('programId', '');
    }
  }, [programs, setValue, values.departmentId, values.programId]);

  const nextStep = async () => {
    const fieldsByStep: Array<Array<keyof EnrollmentValues>> = [
      ['level'],
      ['firstName', 'lastName', 'email', 'dateOfBirth'],
      ['guardianName', 'guardianPhone'],
      [],
      ['groupId', 'feePlan'],
      [],
    ];

    const isValid = await trigger(fieldsByStep[step]);
    if (isValid) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  };

  const previousStep = () => setStep((current) => Math.max(current - 1, 0));

  const onSubmit = handleSubmit(async (payload) => {
    await createStudent.mutateAsync({
      level_code: payload.level,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email || undefined,
      date_of_birth: payload.dateOfBirth,
      guardian_name: payload.guardianName,
      guardian_phone: payload.guardianPhone,
      parent_link: payload.parentLink || undefined,
      medical_notes: payload.medicalNotes || undefined,
      dietary_restrictions: payload.dietaryRestrictions || undefined,
      pickup_persons: payload.pickupPersons || undefined,
      previous_school: payload.previousSchool || undefined,
      previous_results: payload.previousResults || undefined,
      qualification: payload.qualification || undefined,
      faculty_id: payload.facultyId || undefined,
      department_id: payload.departmentId || undefined,
      program_id: payload.programId || undefined,
      group_id: payload.groupId,
      fee_plan: payload.feePlan,
    });
    window.localStorage.removeItem(draftKey);
    navigate('/students');
  });

  if (structureLoading || tertiaryLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enroll Student"
        description={`Capture learner information in a guided flow for ${activeInstitution?.name || 'the selected school'}.`}
      />

      <Card title={`Step ${step + 1} of ${steps.length}`} description={steps[step]}>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium text-slate-500">
              <span>Enrollment Progress</span>
              <span>{Math.round(completion)}%</span>
            </div>
            <ProgressBar value={completion} />
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            {steps.map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl px-3 py-2 text-center text-xs font-semibold ${
                  index <= step ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <form className="space-y-6" onSubmit={onSubmit}>
        {step === 0 ? (
          <Card title="Education Level" description="Choose the pathway available for this school.">
            <Select label="Education Level" error={errors.level?.message} {...register('level')}>
              {activeLevelSet.map((level) => (
                <option key={level} value={level}>
                  {levelLabels[level]}
                </option>
              ))}
            </Select>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card title="Personal Information" description="Capture core student biodata and a profile photo.">
            <div className="grid gap-4 xl:grid-cols-2">
              <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
              <Input label="Email" error={errors.email?.message} {...register('email')} />
              <Input
                label="Date of Birth"
                type="date"
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
              />
              <div className="xl:col-span-2">
                <FileUpload multiple={false} />
              </div>
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card title="Guardian Information" description="Add the primary guardian or link an existing parent account.">
            <div className="grid gap-4 xl:grid-cols-2">
              <Input
                label="Guardian Name"
                error={errors.guardianName?.message}
                {...register('guardianName')}
              />
              <Input
                label="Guardian Phone"
                error={errors.guardianPhone?.message}
                {...register('guardianPhone')}
              />
              <Input label="Link Existing Parent User" {...register('parentLink')} />
            </div>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card title="School-Specific Details" description="The fields below adapt to the selected level.">
            <div className="grid gap-4 xl:grid-cols-2">
              {values.level === 'DC' ? (
                <>
                  <Input label="Medical Form Notes" {...register('medicalNotes')} />
                  <Input label="Dietary Restrictions" {...register('dietaryRestrictions')} />
                  <Input label="Pickup Persons" {...register('pickupPersons')} />
                </>
              ) : null}
              {values.level === 'PR' ? <Input label="Previous School" {...register('previousSchool')} /> : null}
              {(values.level === 'JH' || values.level === 'SH') ? (
                <>
                  <Input label="Previous Results Reference" {...register('previousResults')} />
                  <div className="xl:col-span-2">
                    <FileUpload multiple={false} />
                  </div>
                </>
              ) : null}
              {values.level === 'TR' ? (
                <>
                  <Select label="Faculty" error={errors.facultyId?.message} {...register('facultyId')}>
                    <option value="">Select faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </Select>
                  <Select label="Department" error={errors.departmentId?.message} {...register('departmentId')}>
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                  <Select label="Program" error={errors.programId?.message} {...register('programId')}>
                    <option value="">Select program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </Select>
                  <Input label="Qualification" {...register('qualification')} />
                  <div className="xl:col-span-2">
                    <FileUpload multiple={false} />
                  </div>
                </>
              ) : null}
              {values.level === 'PR' ? (
                <div className="xl:col-span-2">
                  <Alert
                    title="Primary intake"
                    message="Previous school history will be used to guide placement and fees."
                    variant="info"
                  />
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card
            title={`${assignmentLabel} Assignment And Fees`}
            description={`Assign the learner to the right ${assignmentLabel.toLowerCase()} and fee plan.`}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <Select label={`Assigned ${assignmentLabel}`} error={errors.groupId?.message} {...register('groupId')}>
                <option value="">Select assignment</option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.code})
                  </option>
                ))}
              </Select>
              <Input label="Fee Structure" error={errors.feePlan?.message} {...register('feePlan')} />
              <div className="xl:col-span-2 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-brand-navy">Fee Preview</p>
                <p className="mt-2 text-sm text-slate-600">
                  Tuition and fee lines will follow the selected {assignmentLabel.toLowerCase()} and the school setup.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {step === 5 ? (
          <Card title="Review and Submit" description="Confirm all details before creating the student record.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Student</p>
                <p className="mt-2 font-semibold text-brand-navy">
                  {[values.firstName, values.lastName].filter(Boolean).join(' ') || 'Not provided'}
                </p>
                <p className="mt-1 text-sm text-slate-500">{levelLabels[values.level as EducationLevelCode] || values.level}</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Guardian</p>
                <p className="mt-2 font-semibold text-brand-navy">{values.guardianName || 'Not provided'}</p>
                <p className="mt-1 text-sm text-slate-500">{values.guardianPhone || 'No phone yet'}</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{assignmentLabel} Assignment</p>
                <p className="mt-2 font-semibold text-brand-navy">
                  {selectedGroup?.name || 'Pending assignment'}
                </p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Fee Plan</p>
                <p className="mt-2 font-semibold text-brand-navy">{values.feePlan}</p>
              </div>
              {values.level === 'TR' ? (
                <div className="surface-muted p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Tertiary Roadmap</p>
                  <p className="mt-2 font-semibold text-brand-navy">
                    {selectedProgram?.name || 'Program not selected'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedProgram
                      ? `${selectedProgram.credential} · ${selectedProgram.duration} · ${selectedProgram.calendar}`
                      : 'Faculty, department, and program selection will drive the semester roadmap.'}
                  </p>
                </div>
              ) : (
                <div className="surface-muted p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Placement Note</p>
                  <p className="mt-2 text-sm text-slate-600">
                    The learner will follow the {roadmapLabel} tied to the selected {assignmentLabel.toLowerCase()}.
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : null}

        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={previousStep} disabled={step === 0}>
            Previous
          </Button>
          <div className="flex gap-3">
            {step < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button type="submit" loading={createStudent.isPending}>
                Submit Enrollment
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default StudentEnrollmentForm;
