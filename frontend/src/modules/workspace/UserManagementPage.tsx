import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pencil, ShieldCheck, Trash2, UserCog, Users2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';
import { useCreateStaffUser } from './hooks/useCreateStaffUser';

const userSchema = z.object({
  role: z
    .string()
    .refine((value) => ['institution_admin', 'teacher', 'accountant'].includes(value), 'User role is required'),
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
  custom_permissions: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface ManagedUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'institution_admin' | 'teacher' | 'accountant';
  staff_number: string;
  department: string;
  designation: string;
  qualification?: string | null;
  specialization?: string | null;
  employment_type: 'full_time' | 'part_time' | 'contract';
  date_joined: string;
  status: string;
  custom_permissions?: string[];
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
  custom_permissions: [],
};

const UserManagementPage = () => {
  const createStaffUser = useCreateStaffUser();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUserRow | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['user-management-users'],
    queryFn: eduovaApi.users.list,
  });
  const users = (data || []) as ManagedUserRow[];

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ['user-management-users'] });

  const updateUser = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      eduovaApi.users.update(id, payload),
    onSuccess: async () => {
      toast.success('User updated.');
      setEditingUser(null);
      setShowCreate(false);
      await refreshUsers();
    },
    onError: () => toast.error('Unable to update this user.'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => eduovaApi.users.delete(id),
    onSuccess: async () => {
      toast.success('User deleted.');
      setEditingUser(null);
      await refreshUsers();
    },
    onError: () => toast.error('Unable to delete this user.'),
  });

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
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, payload });
      } else {
        await createStaffUser.mutateAsync(payload);
      }
      reset(defaultValues);
      setShowCreate(false);
      setEditingUser(null);
    } catch (_error) {
      toast.error('Please correct the highlighted fields and try again.');
    }
  });

  const openEdit = (user: ManagedUserRow) => {
    setEditingUser(user);
    reset({
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      staff_number: user.staff_number,
      department: user.department,
      designation: user.designation,
      qualification: user.qualification || '',
      specialization: user.specialization || '',
      employment_type: user.employment_type,
      date_joined: user.date_joined?.slice(0, 10) || '',
      temporary_password: 'temporary123',
      custom_permissions: user.custom_permissions || [],
    });
    setShowCreate(true);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const adminCount = users.filter((item) => item.role === 'institution_admin').length;
  const teacherCount = users.filter((item) => item.role === 'teacher').length;
  const accountantCount = users.filter((item) => item.role === 'accountant').length;
  const pendingCount = users.filter((item) => item.status !== 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access Management"
        description="Create institution admin users and teacher accounts, assign staff identity details, and keep school access under control."
        actions={
          <Button
            variant="primary"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowCreate(true)}
          >
            Create User
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Staff Users', value: `${users.length}`, icon: Users2 },
          { label: 'Institution Admins', value: `${adminCount}`, icon: ShieldCheck },
          { label: 'Teachers', value: `${teacherCount}`, icon: UserCog },
          { label: 'Accountants', value: `${accountantCount}`, icon: ShieldCheck },
          { label: 'Pending Activation', value: `${pendingCount}`, icon: ShieldCheck },
        ].slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{item.value}</p>
            </div>
            <span className="shrink-0 rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
              <Icon className="h-5 w-5" />
            </span>
          </div>
            </Card>
          );
        })}
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
          {
            header: 'Finance Grants',
            cell: ({ row }) =>
              row.original.custom_permissions?.length
                ? row.original.custom_permissions.join(', ').replaceAll('_', ' ')
                : '—',
          },
          { header: 'Email', accessorKey: 'email' },
          {
            header: 'Status',
            cell: ({ row }) => (
              <Badge variant={row.original.status === 'active' ? 'success' : 'pending'}>
                {row.original.status}
              </Badge>
            ),
          },
          {
            header: 'Actions',
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => openEdit(row.original)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${row.original.first_name} ${row.original.last_name}?`
                      )
                    ) {
                      deleteUser.mutate(row.original.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            reset(defaultValues);
            setEditingUser(null);
          }
          setShowCreate(open);
        }}
        size="xl"
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="User Role" error={errors.role?.message} {...register('role')}>
              <option value="teacher">Teacher</option>
              <option value="institution_admin">Institution Admin</option>
              <option value="accountant">Accountant</option>
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
            <Select label="Employment Type" error={errors.employment_type?.message} {...register('employment_type')}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </Select>
            <Input label="Date Joined" type="date" error={errors.date_joined?.message} {...register('date_joined')} />
            <Input label="Qualification" {...register('qualification')} />
            <Input
              label={role === 'teacher' ? 'Teaching Specialization' : 'Administrative Focus'}
              {...register('specialization')}
            />
            <div className="md:col-span-2">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Finance Approval Grants</p>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    value="finance_approve_director"
                    {...register('custom_permissions')}
                  />
                  <span>Director approval stage</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    value="finance_approve_accountant"
                    {...register('custom_permissions')}
                  />
                  <span>Accountant approval stage</span>
                </label>
              </div>
            </div>
            {!editingUser ? (
              <div className="md:col-span-2">
                <Input
                  label="Temporary Password"
                  error={errors.temporary_password?.message}
                  {...register('temporary_password')}
                />
              </div>
            ) : null}
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

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { reset(defaultValues); setShowCreate(false); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createStaffUser.isPending || updateUser.isPending}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              {editingUser ? 'Save Changes' : 'Create User Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
