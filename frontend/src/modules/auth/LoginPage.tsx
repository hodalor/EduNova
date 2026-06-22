import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, School } from 'lucide-react';
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
  institution_code: z.string().min(1, 'Institution code is required'),
  identity: z.string().min(3, 'Email or phone is required'),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      institution_code: '',
      identity: '',
      password: '',
    },
  });
  const institutionCode = watch('institution_code');

  const mutation = useMutation({
    mutationFn: eduovaApi.auth.login,
    onSuccess: (payload) => {
      queryClient.clear();
      setSession(payload);
      toast.success('Welcome back to EDUOVA');
      navigate(payload.user.role === 'super_admin' ? '/super-admin' : '/');
    },
    onError: () => toast.error('Unable to sign in.'),
  });

  return (
    <AuthLayout
      title=""
      description=""
      decorativeWord={(institutionCode || 'EDUNOVA').trim().toUpperCase()}
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          mutation.mutate({
            ...values,
            institution_code: values.institution_code.trim().toUpperCase(),
          })
        )}
      >
        <Input
          label="Institution Code"
          error={errors.institution_code?.message}
          prefix={<School className="h-4 w-4" />}
          {...register('institution_code')}
        />
        <Input
          label="Email or Phone"
          error={errors.identity?.message}
          prefix={<Mail className="h-4 w-4" />}
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
          Sign In
        </Button>
       
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
