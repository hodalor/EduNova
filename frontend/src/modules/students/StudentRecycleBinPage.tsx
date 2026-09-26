import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import SearchInput from '../../components/ui/SearchInput';
import Table from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/core';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { getInstitutionLevels } from '../../lib/institution';

interface DeletedStudentRow {
  id: string;
  name: string;
  student_number: string;
  className: string;
  level: string;
  status: string;
  deleted_at?: string | null;
}

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
};

const StudentRecycleBinPage = () => {
  const queryClient = useQueryClient();
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const institutionLevels = getInstitutionLevels(tenantContext || institution);
  const isPureTertiaryWorkspace =
    institutionLevels.length === 1 && institutionLevels[0] === 'TR';
  const activeInstitutionId = (tenantContext || institution)?.id || null;
  const [search, setSearch] = useState('');
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: null | (() => void);
    confirmLabel: string;
  }>({
    open: false,
    title: '',
    description: '',
    action: null,
    confirmLabel: 'Confirm',
  });

  const { data, isLoading } = useQuery<DeletedStudentRow[]>({
    queryKey: ['students-deleted', activeInstitutionId],
    queryFn: eduovaApi.students.deleted,
    enabled: Boolean(activeInstitutionId),
  });

  const refreshStudents = async () => {
    await queryClient.invalidateQueries({ queryKey: ['students', activeInstitutionId] });
    await queryClient.invalidateQueries({ queryKey: ['students-deleted', activeInstitutionId] });
  };

  const restoreStudent = useMutation({
    mutationFn: (id: string) => eduovaApi.students.restore(id),
    onSuccess: async () => {
      toast.success('Student restored.');
      await refreshStudents();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to restore this student.')),
  });

  const deleteStudentPermanent = useMutation({
    mutationFn: (id: string) => eduovaApi.students.deletePermanent(id),
    onSuccess: async () => {
      toast.success('Student permanently deleted.');
      await refreshStudents();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to permanently delete this student.')),
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items: DeletedStudentRow[] = data || [];
    if (!query) {
      return items;
    }
    return items.filter(
      (row: DeletedStudentRow) =>
        row.name.toLowerCase().includes(query) ||
        row.student_number.toLowerCase().includes(query) ||
        row.className.toLowerCase().includes(query)
    );
  }, [data, search]);

  const openConfirm = ({
    title,
    description,
    action,
    confirmLabel,
  }: {
    title: string;
    description: string;
    action: () => void;
    confirmLabel: string;
  }) =>
    setConfirmState({
      open: true,
      title,
      description,
      action,
      confirmLabel,
    });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Recycle Bin"
        description="Restore soft-deleted students or permanently remove records that are no longer needed."
        actions={
          <Link to="/students">
            <Button variant="secondary">Back to Students</Button>
          </Link>
        }
      />

      <div className="max-w-sm">
        <SearchInput
          value={search}
          placeholder="Search deleted students"
          onDebouncedChange={setSearch}
        />
      </div>

      {rows.length ? (
        <Table<DeletedStudentRow>
          title="Deleted Students"
          data={rows}
          columns={[
            { header: 'Student', accessorKey: 'name' },
            { header: 'Student Number', accessorKey: 'student_number' },
            { header: isPureTertiaryWorkspace ? 'Level' : 'Class', accessorKey: 'className' },
            {
              header: 'Level',
              cell: ({ row }) => <Badge variant="info">{row.original.level}</Badge>,
            },
            {
              header: 'Deleted',
              cell: ({ row }) =>
                row.original.deleted_at ? String(row.original.deleted_at).slice(0, 10) : '—',
            },
            {
              header: 'Actions',
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                    onClick={() =>
                      openConfirm({
                        title: 'Restore Student',
                        description: `Restore ${row.original.name} to the active student register?`,
                        action: () => restoreStudent.mutate(row.original.id),
                        confirmLabel: 'Restore',
                      })
                    }
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={() =>
                      openConfirm({
                        title: 'Permanently Delete Student',
                        description:
                          'This permanently removes the deleted student record. Related finance or academic history must be cleared first.',
                        action: () => deleteStudentPermanent.mutate(row.original.id),
                        confirmLabel: 'Delete Forever',
                      })
                    }
                  >
                    Delete Forever
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="Recycle bin is empty"
          message="Deleted students will appear here until they are restored or permanently removed."
        />
      )}

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((current) => ({ ...current, open }))}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => confirmState.action?.()}
        confirmLabel={confirmState.confirmLabel}
      />
    </div>
  );
};

export default StudentRecycleBinPage;
