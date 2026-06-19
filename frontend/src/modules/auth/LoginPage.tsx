import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAuthStore } from '../../store/authStore';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@eduova.com',
      password: 'Password123',
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setSession({
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      user: {
        id: 'admin-1',
        name: 'System Administrator',
        email: values.email,
        role: 'admin',
      },
    });
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy px-6 py-12">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-brand-navy px-10 py-12 text-white">
          <div className="inline-flex rounded-full border border-brand-gold/40 bg-brand-gold/10 p-4 text-brand-gold">
            <ShieldCheck size={28} />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.35em] text-brand-gold">
            EDUOVA
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Trusted administration for modern education systems.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Access admissions, attendance, finance, analytics and communication
            workflows from a single secure portal.
          </p>
        </section>

        <section className="px-8 py-12 md:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">
            Admin Sign In
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-brand-navy">Portal access</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This scaffold uses a demo sign-in flow so the protected shell is
            immediately navigable.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                {...register('email')}
                className="mt-2 w-full rounded-2xl border border-brand-line px-4 py-3 outline-none transition focus:border-brand-gold"
                placeholder="admin@eduova.com"
              />
              <span className="mt-1 block text-xs text-rose-500">
                {errors.email?.message}
              </span>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                {...register('password')}
                type="password"
                className="mt-2 w-full rounded-2xl border border-brand-line px-4 py-3 outline-none transition focus:border-brand-gold"
                placeholder="Password123"
              />
              <span className="mt-1 block text-xs text-rose-500">
                {errors.password?.message}
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:opacity-70"
            >
              {isSubmitting ? 'Signing in...' : 'Enter EDUOVA'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
