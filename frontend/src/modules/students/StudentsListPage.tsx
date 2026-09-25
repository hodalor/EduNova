import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, MessageSquare, Printer, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/core';
import { getInstitutionLevels } from '../../lib/institution';
import { useAuthStore } from '../../store/authStore';
import type { EducationLevelCode } from '../../types/auth';
import PageHeader from '../shared/PageHeader';
import { type StudentListItem, useStudents } from './hooks/useStudents';

const LEVEL_LABELS: Record<EducationLevelCode, string> = {
  DC: 'Day Care',
  PR: 'Primary',
  JH: 'Junior High',
  SH: 'Senior High',
  TR: 'Tertiary',
};

const StudentsListPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const allowedLevels = useMemo<EducationLevelCode[]>(
    () => getInstitutionLevels(activeInstitution),
    [activeInstitution]
  );

  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [className, setClassName] = useState('all');
  const [status, setStatus] = useState('all');
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    open: boolean;
    studentId: string | null;
    studentName: string;
  }>({
    open: false,
    studentId: null,
    studentName: '',
  });

  const filters = useMemo(
    () => ({
      search,
      level,
      className,
      status,
    }),
    [className, level, search, status]
  );

  const { data, isLoading } = useStudents(filters);
  const rows = (data || []) as StudentListItem[];
  const classes = Array.from(new Set(rows.map((row) => row.className)));
  const canManageDeletion = user?.role === 'institution_admin';

  const deleteStudent = useMutation({
    mutationFn: (studentId: string) => eduovaApi.students.delete(studentId),
    onSuccess: async () => {
      toast.success('Student moved to recycle bin.');
      await queryClient.invalidateQueries({ queryKey: ['students', activeInstitutionId] });
      await queryClient.invalidateQueries({ queryKey: ['students-deleted', activeInstitutionId] });
    },
    onError: () => toast.error('Unable to delete this student.'),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage active student records, enrollment status, class placement, and communication workflows."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageDeletion ? (
              <Link to="/students/bin">
                <Button variant="secondary" leftIcon={<Trash2 className="h-4 w-4" />}>
                  Student Bin
                </Button>
              </Link>
            ) : null}
            <Link to="/students/enroll">
              <Button leftIcon={<UserPlus className="h-4 w-4" />}>Enroll Student</Button>
            </Link>
          </div>
        }
      />

      <Card title="Filters" description="Refine the student register by level, class, status, and search terms.">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <SearchInput placeholder="Search name or student number" onDebouncedChange={setSearch} />
          <Select label="Education Level" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">All levels</option>
            {allowedLevels.map((code) => (
              <option key={code} value={code}>{LEVEL_LABELS[code]}</option>
            ))}
          </Select>
          <Select label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
            <option value="all">All classes</option>
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
          Export CSV
        </Button>
        <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />}>
          Print List
        </Button>
        <Button variant="secondary" leftIcon={<MessageSquare className="h-4 w-4" />}>
          Bulk SMS
        </Button>
      </div>

      {rows.length ? (
        <Table<StudentListItem>
          title="Student Register"
          data={rows}
          selectable
          columns={[
            {
              header: 'Student',
              cell: ({ row }) => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.original.name} src={row.original.photo} />
                  <div>
                    <Link
                      to={`/students/${row.original.id}`}
                      className="font-semibold text-brand-navy hover:underline"
                    >
                      {row.original.name}
                    </Link>
                    <p className="text-xs text-slate-500">{row.original.guardian}</p>
                  </div>
                </div>
              ),
            },
            { header: 'Student Number', accessorKey: 'student_number' },
            { header: 'Class', accessorKey: 'className' },
            {
              header: 'Level',
              cell: ({ row }) => <Badge variant="info">{row.original.level}</Badge>,
            },
            {
              header: 'Status',
              cell: ({ row }) => (
                <Badge
                  variant={
                    row.original.status === 'active'
                      ? 'success'
                      : row.original.status === 'pending'
                        ? 'warning'
                        : 'inactive'
                  }
                >
                  {row.original.status}
                </Badge>
              ),
            },
            {
              header: 'Actions',
              cell: ({ row }) => (
                <div className="flex gap-2">
                  <Link to={`/students/${row.original.id}`}>
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  </Link>
                  <Link to={`/students/${row.original.id}/id-card`}>
                    <Button size="sm">ID Card</Button>
                  </Link>
                  {canManageDeletion ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setConfirmDeleteState({
                          open: true,
                          studentId: row.original.id,
                          studentName: row.original.name,
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="No students matched the current filters"
          message="Adjust the search or filter values to see more records."
        />
      )}

      <ConfirmDialog
        open={confirmDeleteState.open}
        onOpenChange={(open) =>
          setConfirmDeleteState((current) => ({
            ...current,
            open,
          }))
        }
        title="Delete Student"
        description={`Move ${confirmDeleteState.studentName || 'this student'} to the recycle bin? You can restore the record later from Student Bin.`}
        onConfirm={() => {
          if (confirmDeleteState.studentId) {
            deleteStudent.mutate(confirmDeleteState.studentId);
          }
        }}
        confirmLabel="Move to Bin"
      />
    </div>
  );
};

export default StudentsListPage;
