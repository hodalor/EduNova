import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import ProgressBar from '../../components/ui/ProgressBar';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';
import { useCreateStudent } from './hooks/useCreateStudent';

const draftKey = 'eduova.studentEnrollmentDraft';

const enrollmentSchema = z.object({
  level: z.string().min(1, 'Education level is required'),
  fullName: z.string().min(3, 'Student name is required'),
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
  program: z.string().optional(),
  qualification: z.string().optional(),
  assignedClass: z.string().min(1, 'Class assignment is required'),
  feePlan: z.string().min(1, 'Fee plan is required'),
});

type EnrollmentValues = z.infer<typeof enrollmentSchema>;

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
  fullName: '',
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
  program: '',
  qualification: '',
  assignedClass: '',
  feePlan: 'Standard Term Plan',
};

const StudentEnrollmentForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const createStudent = useCreateStudent();

  const savedDraft = useMemo(() => {
    const draft = window.localStorage.getItem(draftKey);
    return draft ? (JSON.parse(draft) as Partial<EnrollmentValues>) : null;
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      ...defaultValues,
      ...savedDraft,
    },
  });

  const values = watch();
  const completion = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify(values));
  }, [values]);

  const nextStep = async () => {
    const fieldsByStep: Array<Array<keyof EnrollmentValues>> = [
      ['level'],
      ['fullName', 'email', 'dateOfBirth'],
      ['guardianName', 'guardianPhone'],
      [],
      ['assignedClass', 'feePlan'],
      [],
    ];

    const isValid = await trigger(fieldsByStep[step]);
    if (isValid) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  };

  const previousStep = () => setStep((current) => Math.max(current - 1, 0));

  const onSubmit = handleSubmit(async (payload) => {
    await createStudent.mutateAsync(payload);
    window.localStorage.removeItem(draftKey);
    navigate('/students');
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enroll Student"
        description="Capture student information in a guided, level-aware enrollment flow."
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
          <Card title="Education Level" description="Select the student's educational pathway.">
            <Select label="Education Level" error={errors.level?.message} {...register('level')}>
              <option value="DC">DC</option>
              <option value="PR">PR</option>
              <option value="JH">JH</option>
              <option value="SH">SH</option>
              <option value="TR">TR</option>
            </Select>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card title="Personal Information" description="Capture core student biodata and a profile photo.">
            <div className="grid gap-4 xl:grid-cols-2">
              <Input label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
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
          <Card title="Level Specific Details" description="The fields below adapt to the selected level.">
            <div className="grid gap-4 xl:grid-cols-2">
              {values.level === 'DC' ? (
                <>
                  <Input label="Medical Form Notes" {...register('medicalNotes')} />
                  <Input label="Dietary Restrictions" {...register('dietaryRestrictions')} />
                  <Input label="Pickup Persons" {...register('pickupPersons')} />
                </>
              ) : null}
              {values.level === 'PR' ? <Input label="Previous School Information" {...register('previousSchool')} /> : null}
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
                  <Input label="Program Selection" {...register('program')} />
                  <Input label="Qualification Upload Reference" {...register('qualification')} />
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
          <Card title="Class Assignment and Fees" description="Assign class placement and preview fee structure.">
            <div className="grid gap-4 xl:grid-cols-2">
              <Input
                label="Assigned Class"
                error={errors.assignedClass?.message}
                {...register('assignedClass')}
              />
              <Input label="Fee Structure" error={errors.feePlan?.message} {...register('feePlan')} />
              <div className="xl:col-span-2 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-brand-navy">Fee Preview</p>
                <p className="mt-2 text-sm text-slate-600">
                  Tuition, ICT levy, extracurricular fee, and transport options will be confirmed at submission.
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
                <p className="mt-2 font-semibold text-brand-navy">{values.fullName || 'Not provided'}</p>
                <p className="mt-1 text-sm text-slate-500">{values.level}</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Guardian</p>
                <p className="mt-2 font-semibold text-brand-navy">{values.guardianName || 'Not provided'}</p>
                <p className="mt-1 text-sm text-slate-500">{values.guardianPhone || 'No phone yet'}</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Class Assignment</p>
                <p className="mt-2 font-semibold text-brand-navy">
                  {values.assignedClass || 'Pending assignment'}
                </p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Fee Plan</p>
                <p className="mt-2 font-semibold text-brand-navy">{values.feePlan}</p>
              </div>
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
