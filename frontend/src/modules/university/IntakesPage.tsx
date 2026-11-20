import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import type { IntakeOption } from './IntakeReport';

const IntakesPage = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const intakesQuery = useQuery<IntakeOption[]>({
    queryKey: ['university-intakes'],
    queryFn: eduovaApi.university.intakes,
  });

  const createIntake = useMutation({
    mutationFn: () =>
      eduovaApi.university.createIntake({
        name,
        start_date: startDate,
        enrollment_deadline: deadline,
      }),
    onSuccess: () => {
      toast.success('Intake opened.');
      setName('');
      setStartDate('');
      setDeadline('');
      queryClient.invalidateQueries({ queryKey: ['university-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['intake-report'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to create this intake.')),
  });

  const deleteIntake = useMutation({
    mutationFn: (id: string) => eduovaApi.university.deleteIntake(id),
    onSuccess: () => {
      toast.success('Intake removed.');
      queryClient.invalidateQueries({ queryKey: ['university-intakes'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to remove this intake.')),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intakes"
        description="Open a January and August intake, or a monthly intake. The start date cannot be in the past, and enrolment must close on or before the next intake begins."
      />
      <form
        className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          createIntake.mutate();
        }}
      >
        <Input label="Intake name" value={name} onChange={(event) => setName(event.target.value)} placeholder="January 2027" />
        <Input label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <Input
          label="Enrolment deadline"
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" loading={createIntake.isPending}>
            Create intake
          </Button>
        </div>
      </form>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {(intakesQuery.data || []).length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No intakes yet. Create the first one before applications open.</p>
        ) : null}
        {(intakesQuery.data || []).map((intake: IntakeOption) => (
          <div key={intake.id} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
            <div>
              <p className="font-semibold text-slate-900">{intake.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                Starts {intake.start_date} · enrolment closes {intake.enrollment_deadline}
              </p>
            </div>
            <Button variant="ghost" onClick={() => deleteIntake.mutate(intake.id)} loading={deleteIntake.isPending}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntakesPage;
