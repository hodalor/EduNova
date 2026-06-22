import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ShieldCheck, UserCog, Users2 } from 'lucide-react';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';
import { useCreateStaffUser } from './hooks/useCreateStaffUser';

const userSchema = z.object({
  role: z
    .string()
    .refine((value) => ['institution_admin', 'teacher'].includes(value), 'User role is required'),
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(6, 'Phone number is required'),
  staff_number: z.string().min(3, 'Staff number is required'),
  department: z.string().min(2, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  employment_type: z
    .string()
    .refine((value) => ['full_time', 'part_time', 'contract'].includes(value), 'Employment type is required'),
  date_joined: z.string().min(1, 'Joining date is required'),
  temporary_password: z.string().min(8, 'Temporary password must be at least 8 characters'),
});

type UserFormValues = z.infer<typeof userSchema>;

interface ManagedUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'institution_admin' | 'teacher';
  staff_number: string;
  department: string;
  designation: string;
  employment_type: 'full_time' | 'part_time' | 'contract';
  date_joined: string;
  status: string;
}

const defaultValues: UserFormValues = {
  role: 'teacher',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  staff_number: '',
  department: '',
  designation: '',
  qualification: '',
  specialization: '',
  employment_type: 'full_time',
  date_joined: '',
  temporary_password: '',
};

const UserManagementPage = () => {
  const createStaffUser = useCreateStaffUser();
  const { data, isLoading } = useQuery({
    queryKey: ['user-management-users'],
    queryFn: eduovaApi.users.list,
  });
  const users = (data || []) as ManagedUserRow[];

  const {
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  const role = watch('role');

  const onSubmit = handleSubmit(async (payload) => {
    await createStaffUser.mutateAsync(payload);
    reset(defaultValues);
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access Management"
        description="Create institution admin users and teacher accounts, assign staff identity details, and keep school access under control."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Staff Users',
            value: `${users.length}`,
            helper: 'Admin and teacher accounts currently tracked.',
            icon: Users2,
          },
          {
            label: 'Institution Admins',
            value: `${users.filter((item) => item.role === 'institution_admin').length}`,
            helper: 'Operational admin accounts with school-wide control.',
            icon: ShieldCheck,
          },
          {
            label: 'Teachers',
            value: `${users.filter((item) => item.role === 'teacher').length}`,
            helper: 'Academic staff accounts with teaching permissions.',
            icon: UserCog,
          },
          {
            label: 'Pending Activation',
            value: `${users.filter((item) => item.status !== 'active').length}`,
            helper: 'Accounts waiting for first sign-in or activation.',
            icon: ShieldCheck,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold text-brand-navy">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                </div>
                <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Create Admin or Teacher" description="Create a new institution admin or teacher account with staff profile details.">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 xl:grid-cols-2">
              <Select label="User Role" error={errors.role?.message} {...register('role')}>
                <option value="teacher">Teacher</option>
                <option value="institution_admin">Institution Admin</option>
              </Select>
              <Input
                label="Staff Number"
                error={errors.staff_number?.message}
                helperText="Use a unique staff code for payroll, timetable, and HR references."
                {...register('staff_number')}
              />
              <Input label="First Name" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last Name" error={errors.last_name?.message} {...register('last_name')} />
              <Input label="Email" error={errors.email?.message} {...register('email')} />
              <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
              <Input label="Department" error={errors.department?.message} {...register('department')} />
              <Input label="Designation" error={errors.designation?.message} {...register('designation')} />
              <Select
                label="Employment Type"
                error={errors.employment_type?.message}
                {...register('employment_type')}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </Select>
              <Input
                label="Date Joined"
                type="date"
                error={errors.date_joined?.message}
                {...register('date_joined')}
              />
              <Input label="Qualification" {...register('qualification')} />
              <Input
                label={role === 'teacher' ? 'Teaching Specialization' : 'Administrative Focus'}
                {...register('specialization')}
              />
              <div className="xl:col-span-2">
                <Input
                  label="Temporary Password"
                  error={errors.temporary_password?.message}
                  helperText="The new user signs in with this password first and can change it later."
                  {...register('temporary_password')}
                />
              </div>
            </div>

            <Alert
              title={role === 'teacher' ? 'Teacher account setup' : 'Institution admin account setup'}
              message={
                role === 'teacher'
                  ? 'Teacher users will use this account for attendance, assessment, report cards, communication, and timetable access.'
                  : 'Institution admin users will get school-level control for admissions, students, finance, staff, settings, and reporting.'
              }
              variant="info"
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={createStaffUser.isPending}>
                Create User Account
              </Button>
              <Button type="button" variant="secondary" onClick={() => reset(defaultValues)}>
                Reset Form
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Access Rules" description="Operational guidance for school user creation.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="font-semibold text-brand-navy">Institution Admin</p>
              <p className="mt-1 text-sm text-slate-500">
                Use for bursars, registrars, principals, heads, or operations managers who need broader school-level control.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="font-semibold text-brand-navy">Teacher</p>
              <p className="mt-1 text-sm text-slate-500">
                Use for classroom teachers, lecturers, tutors, form masters, and subject handlers who need academic workflows.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="font-semibold text-brand-navy">Mixed School Support</p>
              <p className="mt-1 text-sm text-slate-500">
                One school can create staff for daycare, primary, secondary, and tertiary structures while keeping the same identity and role system.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Table<ManagedUserRow>
        title="Recent Staff Users"
        data={users}
        columns={[
          {
            header: 'Name',
            cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
          },
          { header: 'Role', cell: ({ row }) => row.original.role.replace('_', ' ') },
          { header: 'Staff No.', accessorKey: 'staff_number' },
          { header: 'Department', accessorKey: 'department' },
          { header: 'Designation', accessorKey: 'designation' },
          { header: 'Email', accessorKey: 'email' },
          {
            header: 'Status',
            cell: ({ row }) => (
              <Badge variant={row.original.status === 'active' ? 'success' : 'pending'}>
                {row.original.status}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
};

export default UserManagementPage;
