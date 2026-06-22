import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';

interface FormValues {
  name: string;
  code: string;
  subscription_plan: 'starter' | 'growth' | 'enterprise';
  education_levels: string[];
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_password: string;
}

const educationLevelOptions = [
  { code: 'DC', label: 'Daycare' },
  { code: 'PR', label: 'Primary' },
  { code: 'JH', label: 'Junior High' },
  { code: 'SH', label: 'Senior High' },
  { code: 'TR', label: 'Tertiary' },
];

const InstitutionOnboardPage = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      subscription_plan: 'growth',
      education_levels: ['PR', 'JH', 'SH'],
      admin_password: 'Eduova123',
    },
  });
  const selectedLevels = watch('education_levels');

  const mutation = useMutation({
    mutationFn: eduovaApi.superAdmin.onboardInstitution,
    onSuccess: () => {
      toast.success('Institution onboarded successfully.');
      navigate('/super-admin/institutions');
    },
    onError: () => toast.error('Failed to onboard institution.'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboard Institution"
        description="Create a new school tenant, assign its education levels, generate its tenant database, and bootstrap the first admin user."
      />

      <Card title="Institution Setup" description="Plan, code, level mix, and bootstrap admin account.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <Input label="Institution Name" error={errors.name?.message} {...register('name', { required: 'Institution name is required' })} />
          <Input label="Institution Code" error={errors.code?.message} {...register('code', { required: 'Institution code is required' })} />
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Subscription Plan</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-brand-gold/30 transition focus:border-brand-gold focus:ring-4"
              {...register('subscription_plan')}
            >
              <option value="starter">starter</option>
              <option value="growth">growth</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Education Levels</p>
            <p className="text-xs text-slate-500">
              These levels determine the tenant menu profile and the first admin workspace scope.
            </p>
            <div className="grid gap-2 pt-2">
              {educationLevelOptions.map((level) => (
                <label key={level.code} className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={selectedLevels.includes(level.code)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedLevels, level.code]
                        : selectedLevels.filter((item) => item !== level.code);
                      setValue('education_levels', next, { shouldValidate: true });
                    }}
                  />
                  <span>{level.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Input label="Admin First Name" error={errors.admin_first_name?.message} {...register('admin_first_name', { required: 'Admin first name is required' })} />
          <Input label="Admin Last Name" error={errors.admin_last_name?.message} {...register('admin_last_name', { required: 'Admin last name is required' })} />
          <Input label="Admin Email" error={errors.admin_email?.message} {...register('admin_email', { required: 'Admin email is required' })} />
          <Input
            label="Temporary Password"
            type="password"
            error={errors.admin_password?.message}
            {...register('admin_password', { required: 'Temporary password is required', minLength: 8 })}
          />
          <div className="md:col-span-2 rounded-3xl border border-brand-gold/30 bg-amber-50 px-4 py-4 text-sm text-slate-700">
            One PostgreSQL cluster is used for the platform, but each school is provisioned with its own generated tenant database under that cluster.
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={mutation.isPending || isSubmitting}>
              Create Institution
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default InstitutionOnboardPage;
