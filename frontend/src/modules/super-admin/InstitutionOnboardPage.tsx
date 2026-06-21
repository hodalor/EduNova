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
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_password: string;
}

const InstitutionOnboardPage = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      subscription_plan: 'growth',
      admin_password: 'Eduova123',
    },
  });

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
        description="Create a new school tenant and bootstrap its first institution administrator."
      />

      <Card title="Institution Setup" description="Plan, code, and bootstrap admin account.">
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
          <div />
          <Input label="Admin First Name" error={errors.admin_first_name?.message} {...register('admin_first_name', { required: 'Admin first name is required' })} />
          <Input label="Admin Last Name" error={errors.admin_last_name?.message} {...register('admin_last_name', { required: 'Admin last name is required' })} />
          <Input label="Admin Email" error={errors.admin_email?.message} {...register('admin_email', { required: 'Admin email is required' })} />
          <Input
            label="Temporary Password"
            type="password"
            error={errors.admin_password?.message}
            {...register('admin_password', { required: 'Temporary password is required', minLength: 8 })}
          />
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
