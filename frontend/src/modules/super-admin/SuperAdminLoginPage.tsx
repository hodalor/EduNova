import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, UserCog } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  identity: z.string().min(1, 'Super admin username is required'),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

const SuperAdminLoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identity: '',
      password: '',
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
      queryClient.clear();
      setSession(payload);
      toast.success('Welcome to the EDUOVA control plane');
      navigate('/super-admin');
    },
    onError: () => toast.error('Unable to sign in to the control plane.'),
  });

  return (
    <AuthLayout
      title="Sign in to EDUOVA Super Admin"
      description="Sign in with your username and password."
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Input
          label="Email or Username"
          error={errors.identity?.message}
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
        <Button type="submit" className="w-full" size="lg" loading={mutation.isPending || isSubmitting}>
          Access Control Plane
        </Button>
      </form>
    </AuthLayout>
  );
};

export default SuperAdminLoginPage;
