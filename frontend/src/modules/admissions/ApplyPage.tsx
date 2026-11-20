import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

interface PublicProgram {
  id: string;
  name: string;
  credential?: string;
  duration?: string;
  faculty?: string;
  department?: string;
}

interface PublicCatalog {
  institution: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  programs: PublicProgram[];
  intakes: string[];
  study_modes: string[];
  student_categories: string[];
}

const steps = ['Programme', 'Personal', 'Education', 'Sponsor'];

const emptyForm = {
  program_id: '',
  second_program_id: '',
  intake: '',
  study_mode: 'Full-time',
  student_category: 'Local',
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  marital_status: 'Single',
  nationality: '',
  id_type: 'National Registration Card',
  id_number: '',
  email: '',
  phone: '',
  residential_address: '',
  postal_address: '',
  previous_institution: '',
  qualification: '',
  year_completed: '',
  subjects_or_grades: '',
  sponsor_type: 'Parent',
  sponsor_name: '',
  sponsor_phone: '',
  sponsor_email: '',
  next_of_kin_name: '',
  next_of_kin_phone: '',
  next_of_kin_relation: 'Parent',
  declaration: false,
};

const ApplyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState(searchParams.get('code') || '');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<{ reference: string; program_name: string } | null>(null);
  const institutionCode = (searchParams.get('code') || '').trim().toUpperCase();

  const catalogQuery = useQuery<PublicCatalog>({
    queryKey: ['public-admissions', institutionCode],
    queryFn: () => eduovaApi.admissions.catalog(institutionCode),
    enabled: Boolean(institutionCode),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      eduovaApi.admissions.submit(institutionCode, {
        ...form,
        declaration: true,
      }),
    onSuccess: (result) => {
      setReceipt({
        reference: result.reference,
        program_name: result.program_name,
      });
      toast.success('Application submitted');
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to submit the application.')),
  });

  const programs = useMemo(() => catalogQuery.data?.programs || [], [catalogQuery.data?.programs]);
  const selectedProgram = programs.find((program) => program.id === form.program_id);

  const setField = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const continueFromProgramme = () => {
    if (!form.program_id || !form.intake || !form.study_mode || !form.student_category) {
      toast.error('Choose a programme, intake, study mode, and student category.');
      return;
    }
    setStep(1);
  };

  const continueFromPersonal = () => {
    const required = [
      form.first_name,
      form.last_name,
      form.date_of_birth,
      form.gender,
      form.nationality,
      form.id_number,
      form.email,
      form.phone,
      form.residential_address,
    ];
    if (required.some((value) => !String(value).trim())) {
      toast.error('Complete the personal details before continuing.');
      return;
    }
    setStep(2);
  };

  const continueFromEducation = () => {
    if (!form.previous_institution.trim() || !form.qualification.trim()) {
      toast.error('Add the previous school and highest qualification.');
      return;
    }
    setStep(3);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.declaration) {
      toast.error('Confirm the declaration before submitting.');
      return;
    }
    if (!form.sponsor_name.trim() || !form.next_of_kin_name.trim() || !form.next_of_kin_phone.trim()) {
      toast.error('Add the sponsor and next of kin.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-500">Tertiary admission</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {catalogQuery.data?.institution.name || 'Apply to a programme'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose a published programme, then complete the personal, education, and sponsor sections.
          </p>
        </div>

        {!institutionCode ? (
          <form
            className="surface space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const nextCode = codeInput.trim().toUpperCase();
              if (!nextCode) {
                return;
              }
              setSearchParams({ code: nextCode });
            }}
          >
            <Input
              label="Institution code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="Enter the school code"
            />
            <Button type="submit" className="w-full">
              Load programmes
            </Button>
          </form>
        ) : null}

        {catalogQuery.isLoading ? <p className="text-center text-sm text-slate-500">Loading programmes...</p> : null}
        {catalogQuery.isError ? (
          <div className="surface p-6 text-center">
            <p className="text-sm text-rose-600">
              {getApiErrorMessage(catalogQuery.error, 'This institution is not open for tertiary applications.')}
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => setSearchParams({})}>
              Try another code
            </Button>
          </div>
        ) : null}

        {catalogQuery.data && receipt ? (
          <div className="surface space-y-3 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Application received</p>
            <h2 className="text-2xl font-semibold text-slate-900">{receipt.reference}</h2>
            <p className="text-sm text-slate-600">
              {catalogQuery.data.institution.name} has your application for {receipt.program_name}. Keep this
              reference for every enquiry.
            </p>
            <Link className="inline-block text-sm font-semibold text-slate-700" to="/login">
              Return to sign in
            </Link>
          </div>
        ) : null}

        {catalogQuery.data && !receipt ? (
          <form className="surface p-6 sm:p-8" onSubmit={submit}>
            <div className="mb-6 grid grid-cols-4 gap-2">
              {steps.map((label, index) => (
                <div key={label} className="text-center">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      index <= step ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {step === 0 && programs.length === 0 ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This institution has not published any tertiary programmes yet.
              </p>
            ) : null}
            {step === 0 && programs.length > 0 ? (
              <div className="space-y-4">
                <Select
                  label="First-choice programme"
                  value={form.program_id}
                  onChange={(event) => setField('program_id', event.target.value)}
                >
                  <option value="">Select a programme</option>
                  {programs.map((program: PublicProgram) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                      {program.credential ? ` · ${program.credential}` : ''}
                    </option>
                  ))}
                </Select>
                {selectedProgram ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {[selectedProgram.faculty, selectedProgram.department, selectedProgram.duration]
                      .filter(Boolean)
                      .join(' · ') || 'Programme details will appear on your admission letter.'}
                  </p>
                ) : null}
                <Select
                  label="Second choice"
                  value={form.second_program_id}
                  onChange={(event) => setField('second_program_id', event.target.value)}
                >
                  <option value="">Optional</option>
                  {programs
                    .filter((program) => program.id !== form.program_id)
                    .map((program: PublicProgram) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                </Select>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Select label="Intake" value={form.intake} onChange={(event) => setField('intake', event.target.value)}>
                    <option value="">Select intake</option>
                    {catalogQuery.data.intakes.map((intake: string) => (
                      <option key={intake} value={intake}>
                        {intake}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Study mode"
                    value={form.study_mode}
                    onChange={(event) => setField('study_mode', event.target.value)}
                  >
                    {catalogQuery.data.study_modes.map((mode: string) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Student category"
                    value={form.student_category}
                    onChange={(event) => setField('student_category', event.target.value)}
                  >
                    {catalogQuery.data.student_categories.map((category: string) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={continueFromProgramme}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="First name" value={form.first_name} onChange={(event) => setField('first_name', event.target.value)} />
                  <Input label="Middle name" value={form.middle_name} onChange={(event) => setField('middle_name', event.target.value)} />
                  <Input label="Surname" value={form.last_name} onChange={(event) => setField('last_name', event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(event) => setField('date_of_birth', event.target.value)} />
                  <Select label="Gender" value={form.gender} onChange={(event) => setField('gender', event.target.value)}>
                    <option value="">Select</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </Select>
                  <Select
                    label="Marital status"
                    value={form.marital_status}
                    onChange={(event) => setField('marital_status', event.target.value)}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Nationality" value={form.nationality} onChange={(event) => setField('nationality', event.target.value)} />
                  <Select label="Identity document" value={form.id_type} onChange={(event) => setField('id_type', event.target.value)}>
                    <option value="National Registration Card">National Registration Card</option>
                    <option value="Passport">Passport</option>
                  </Select>
                </div>
                <Input label="NRC or passport number" value={form.id_number} onChange={(event) => setField('id_number', event.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
                  <Input label="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
                </div>
                <Input
                  label="Residential address"
                  value={form.residential_address}
                  onChange={(event) => setField('residential_address', event.target.value)}
                />
                <Input
                  label="Postal address"
                  value={form.postal_address}
                  onChange={(event) => setField('postal_address', event.target.value)}
                />
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="button" onClick={continueFromPersonal}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <Input
                  label="Previous school or college"
                  value={form.previous_institution}
                  onChange={(event) => setField('previous_institution', event.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Highest qualification"
                    value={form.qualification}
                    onChange={(event) => setField('qualification', event.target.value)}
                    placeholder="Grade 12 certificate, diploma, or degree"
                  />
                  <Input
                    label="Year completed"
                    value={form.year_completed}
                    onChange={(event) => setField('year_completed', event.target.value)}
                  />
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Subjects and grades</span>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    value={form.subjects_or_grades}
                    onChange={(event) => setField('subjects_or_grades', event.target.value)}
                    placeholder="Example: English B, Mathematics C, Biology B"
                  />
                </label>
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" onClick={continueFromEducation}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Sponsor"
                    value={form.sponsor_type}
                    onChange={(event) => setField('sponsor_type', event.target.value)}
                  >
                    <option value="Self">Self</option>
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Organisation">Organisation</option>
                    <option value="Government">Government</option>
                  </Select>
                  <Input label="Sponsor name" value={form.sponsor_name} onChange={(event) => setField('sponsor_name', event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Sponsor phone" value={form.sponsor_phone} onChange={(event) => setField('sponsor_phone', event.target.value)} />
                  <Input label="Sponsor email" value={form.sponsor_email} onChange={(event) => setField('sponsor_email', event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Next of kin"
                    value={form.next_of_kin_name}
                    onChange={(event) => setField('next_of_kin_name', event.target.value)}
                  />
                  <Input
                    label="Next of kin phone"
                    value={form.next_of_kin_phone}
                    onChange={(event) => setField('next_of_kin_phone', event.target.value)}
                  />
                  <Input
                    label="Relationship"
                    value={form.next_of_kin_relation}
                    onChange={(event) => setField('next_of_kin_relation', event.target.value)}
                  />
                </div>
                <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.declaration}
                    onChange={(event) => setField('declaration', event.target.checked)}
                  />
                  <span>I confirm that the information in this application is true and complete.</span>
                </label>
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" loading={mutation.isPending}>
                    Submit application
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
};

export default ApplyPage;
