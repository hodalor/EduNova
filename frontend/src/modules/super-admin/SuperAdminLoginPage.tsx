import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, ShieldCheck, UserCog } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';

const loginSchema = z.object({
  institution_code: z.string().min(1, 'Platform code is required'),
  identity: z.string().min(1, 'Super admin username is required'),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

const SuperAdminLoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      institution_code: 'master',
      identity: 'superadmin',
      password: '12345678',
    },
  });

  const mutation = useMutation({
    mutationFn: eduovaApi.auth.superAdminLogin,
    onSuccess: (payload) => {
      if (payload.user.role !== 'super_admin') {
        logout();
        toast.error('Super admin access is required.');
        return;
      }
      setSession(payload);
      toast.success('Welcome to the EDUOVA control plane');
      navigate('/super-admin');
    },
    onError: () => toast.error('Unable to sign in to the control plane.'),
  });

  return (
    <AuthLayout
      title="Sign in to EDUOVA Super Admin"
      description="Access the platform control plane for institutions, subscriptions, analytics, and audit visibility."
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Input
          label="Platform Code"
          error={errors.institution_code?.message}
          prefix={<ShieldCheck className="h-4 w-4" />}
          {...register('institution_code')}
        />
        <Input
          label="Super Admin Username"
          error={errors.identity?.message}
          helperText="Use `superadmin` as the master username."
          prefix={<UserCog className="h-4 w-4" />}
          {...register('identity')}
        />
        <Input
          label="Password"
          type="password"
          error={errors.password?.message}
          prefix={<Lock className="h-4 w-4" />}
          {...register('password')}
        />
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Default master access: school id `master`, username `superadmin`, password `12345678`.
        </p>
        <Button type="submit" className="w-full" size="lg" loading={mutation.isPending || isSubmitting}>
          Access Control Plane
        </Button>
      </form>
    </AuthLayout>
  );
};

export default SuperAdminLoginPage;
