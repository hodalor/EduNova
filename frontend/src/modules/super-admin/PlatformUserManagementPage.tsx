import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ShieldCheck, UserCog, Users2 } from 'lucide-react';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

const schema = z.object({
  username: z.string().min(3, 'Username is required'),
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  temporary_password: z.string().min(8, 'Temporary password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

interface PlatformUser {
  id: string;
  username: string;
  email: string;
  role: 'super_admin';
  first_name: string;
  last_name: string;
  status: string;
}

const defaultValues: FormValues = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  temporary_password: '',
};

const PlatformUserManagementPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'users'],
    queryFn: eduovaApi.superAdmin.users,
  });

  const createUser = useMutation({
    mutationFn: eduovaApi.superAdmin.createUser,
    onSuccess: () => {
      toast.success('Platform user created.');
      reset(defaultValues);
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
    },
    onError: () => toast.error('Unable to create platform user.'),
  });

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const users = (data || []) as PlatformUser[];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        description="Create and manage control-plane super admin accounts without tying them to any institution."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Super Admins</p>
              <p className="mt-3 text-3xl font-bold text-brand-navy">{users.length}</p>
              <p className="mt-2 text-sm text-slate-500">All platform control-plane accounts.</p>
            </div>
            <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
              <Users2 className="h-6 w-6" />
            </span>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Accounts</p>
              <p className="mt-3 text-3xl font-bold text-brand-navy">
                {users.filter((item) => item.status === 'active').length}
              </p>
              <p className="mt-2 text-sm text-slate-500">Platform users able to sign in now.</p>
            </div>
            <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Access Scope</p>
              <p className="mt-3 text-3xl font-bold text-brand-navy">Master</p>
              <p className="mt-2 text-sm text-slate-500">Platform users can operate across all institutions.</p>
            </div>
            <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
              <UserCog className="h-6 w-6" />
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card title="Create Super Admin" description="Add another platform operator with master access.">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => createUser.mutate(values))}>
            <Input label="Username" error={errors.username?.message} {...register('username')} />
            <Input label="Email" error={errors.email?.message} {...register('email')} />
            <Input label="First Name" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Last Name" error={errors.last_name?.message} {...register('last_name')} />
            <div className="md:col-span-2">
              <Input
                label="Temporary Password"
                error={errors.temporary_password?.message}
                helperText="Set the first password for this control-plane account."
                {...register('temporary_password')}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" loading={createUser.isPending}>
                Create Platform User
              </Button>
              <Button type="button" variant="secondary" onClick={() => reset(defaultValues)}>
                Reset
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Sign-in Rule" description="How platform users access the control plane.">
          <div className="space-y-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
            <p>
              All platform users sign in with platform code <strong>master</strong>.
            </p>
            <p>
              The master account remains available, and newly created super admins use their own username.
            </p>
            <p>
              Platform users are not institution users. They operate above schools and can select a school scope when needed.
            </p>
          </div>
        </Card>
      </div>

      <Table<PlatformUser>
        title="Platform User Accounts"
        data={users}
        columns={[
          {
            header: 'Name',
            cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
          },
          { header: 'Username', accessorKey: 'username' },
          { header: 'Email', accessorKey: 'email' },
          {
            header: 'Role',
            cell: () => <Badge variant="info">super admin</Badge>,
          },
          {
            header: 'Status',
            cell: ({ row }) => (
              <Badge variant={row.original.status === 'active' ? 'success' : 'inactive'}>
                {row.original.status}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
};

export default PlatformUserManagementPage;
