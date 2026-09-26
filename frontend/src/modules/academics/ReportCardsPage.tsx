import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, FileCheck2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/core';
import { getInstitutionLevels } from '../../lib/institution';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface ReportCardRow {
  id: string;
  student?: string;
  student_name?: string;
  class_name?: string;
  term_name?: string;
  overall_average?: number | string;
  overall_grade?: string;
  status: 'draft' | 'reviewed' | 'approved' | 'published' | string;
  workflow?: {
    reviewed_at?: string | null;
    approved_at?: string | null;
    published_at?: string | null;
  };
}

const ReportCardsPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitutionId = (tenantContext || institution)?.id || null;
  const activeInstitution = tenantContext || institution;
  const institutionLevels = getInstitutionLevels(activeInstitution);
  const isPureTertiaryWorkspace =
    institutionLevels.length === 1 && institutionLevels[0] === 'TR';
  const [classFilter, setClassFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    id: string | null;
    action: 'review' | 'approve' | 'publish' | null;
    studentName: string;
  }>({
    open: false,
    id: null,
    action: null,
    studentName: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['academics-report-cards', activeInstitutionId],
    queryFn: eduovaApi.academics.reportCards,
    enabled: Boolean(activeInstitutionId),
  });

  const workflowMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'review' | 'approve' | 'publish' }) =>
      action === 'publish'
        ? eduovaApi.academics.publishReportCard(id)
        : eduovaApi.academics.transitionReportCard(id, { action }),
    onSuccess: (_result, variables) => {
      const labels: Record<string, string> = {
        review: 'Report card reviewed.',
        approve: 'Report card approved.',
        publish: 'Report card published.',
      };
      toast.success(labels[variables.action] || 'Report card updated.');
      queryClient.invalidateQueries({ queryKey: ['academics-report-cards', activeInstitutionId] });
      setConfirmState({ open: false, id: null, action: null, studentName: '' });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object'
          ? ((error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
              (error as { message?: string }).message ||
              'Unable to update report card workflow.')
          : 'Unable to update report card workflow.';
      toast.error(message);
    },
  });

  const rows = useMemo<ReportCardRow[]>(() => (data || []) as ReportCardRow[], [data]);
  const classOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.class_name).filter(Boolean) as string[])),
    [rows]
  );
  const termOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.term_name).filter(Boolean) as string[])),
    [rows]
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (classFilter !== 'all' && row.class_name !== classFilter) {
          return false;
        }
        if (termFilter !== 'all' && row.term_name !== termFilter) {
          return false;
        }
        return true;
      }),
    [classFilter, rows, termFilter]
  );

  const role = String(user?.role || '');
  const canReview = role === 'teacher' || role === 'institution_admin';
  const canApprove = role === 'institution_admin';
  const canPublish = role === 'institution_admin';

  const getStatusLabel = (status: string) =>
    ({
      draft: 'Draft',
      reviewed: 'Reviewed',
      approved: 'Approved',
      published: 'Published',
    })[status] || status;

  const getBadgeVariant = (status: string) => {
    if (status === 'published') return 'active';
    if (status === 'approved') return 'info';
    if (status === 'reviewed') return 'inactive';
    return 'inactive';
  };

  const openConfirm = (row: ReportCardRow, action: 'review' | 'approve' | 'publish') =>
    setConfirmState({
      open: true,
      id: row.id,
      action,
      studentName: row.student || row.student_name || 'this student',
    });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isPureTertiaryWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Transcripts"
          description="Tertiary institutions work with transcripts, not report cards."
        />
        <Card
          title="Transcript Workflow"
          description="Open each student profile and use the Transcript tab for official academic output."
          action={
            <Link to="/students">
              <Button>Open Student Register</Button>
            </Link>
          }
        >
          <EmptyState
            title="Report cards are for lower levels"
            message="For tertiary students, score entry, grades, GP, TGP, and transcript output stay on the student record instead of a report-card queue."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="Review, approve, and publish report cards with a clear academic control trail."
      />

      <Card title="Filters" description="Focus the report card queue by class and academic term.">
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="all">All Classes</option>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Select label="Term" value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
            <option value="all">All Terms</option>
            {termOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Draft</p>
              <p className="mt-2 text-xl font-semibold text-brand-navy">
                {filteredRows.filter((row) => row.status === 'draft').length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Approved</p>
              <p className="mt-2 text-xl font-semibold text-brand-navy">
                {filteredRows.filter((row) => row.status === 'approved').length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Published</p>
              <p className="mt-2 text-xl font-semibold text-brand-navy">
                {filteredRows.filter((row) => row.status === 'published').length}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!filteredRows.length ? (
        <Card title="Report Card Queue" description="Reviewed academic output will appear here when available.">
          <EmptyState
            title="No report cards match this filter"
            message="Adjust the class or term filter to see the result governance queue."
          />
        </Card>
      ) : null}

      {filteredRows.length ? (
        <Table<ReportCardRow>
          title="Report Card Queue"
          data={filteredRows}
          columns={[
            {
              header: 'Student',
              cell: ({ row }) => (
                <div>
                  <p className="font-semibold text-brand-navy">
                    {row.original.student || row.original.student_name || 'Student'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.original.class_name || 'Unassigned'} · {row.original.term_name || 'Academic Term'}
                  </p>
                </div>
              ),
            },
            {
              header: 'Average',
              cell: ({ row }) => (
                <div>
                  <p className="font-semibold text-brand-navy">{row.original.overall_average || '—'}</p>
                  <p className="text-xs text-slate-500">Grade {row.original.overall_grade || '—'}</p>
                </div>
              ),
            },
            {
              header: 'Status',
              cell: ({ row }) => (
                <div className="space-y-1">
                  <Badge variant={getBadgeVariant(row.original.status)}>
                    {getStatusLabel(row.original.status)}
                  </Badge>
                  <p className="text-xs text-slate-500">
                    {row.original.status === 'published'
                      ? `Published ${String(row.original.workflow?.published_at || '').slice(0, 10) || ''}`.trim()
                      : row.original.status === 'approved'
                        ? `Approved ${String(row.original.workflow?.approved_at || '').slice(0, 10) || ''}`.trim()
                        : row.original.status === 'reviewed'
                          ? `Reviewed ${String(row.original.workflow?.reviewed_at || '').slice(0, 10) || ''}`.trim()
                          : 'Awaiting first review'}
                  </p>
                </div>
              ),
            },
            {
              header: 'Actions',
              cell: ({ row }) => {
                const report = row.original;
                return (
                  <div className="flex flex-wrap gap-2">
                    {report.status === 'draft' && canReview ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FileCheck2 className="h-4 w-4" />}
                        onClick={() => openConfirm(report, 'review')}
                      >
                        Review
                      </Button>
                    ) : null}
                    {report.status === 'reviewed' && canApprove ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => openConfirm(report, 'approve')}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {report.status === 'approved' && canPublish ? (
                      <Button
                        size="sm"
                        leftIcon={<Send className="h-4 w-4" />}
                        onClick={() => openConfirm(report, 'publish')}
                      >
                        Publish
                      </Button>
                    ) : null}
                    {report.status === 'published' ? (
                      <span className="text-xs font-medium text-emerald-700">Ready for student view</span>
                    ) : null}
                  </div>
                );
              },
            },
          ]}
        />
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) =>
          setConfirmState((current) => ({
            ...current,
            open,
          }))
        }
        title={
          confirmState.action === 'review'
            ? 'Review Report Card'
            : confirmState.action === 'approve'
              ? 'Approve Report Card'
              : 'Publish Report Card'
        }
        description={
          confirmState.action === 'review'
            ? `Mark ${confirmState.studentName} as reviewed and ready for academic approval?`
            : confirmState.action === 'approve'
              ? `Approve ${confirmState.studentName}'s report card for publication?`
              : `Publish ${confirmState.studentName}'s report card to student-facing records?`
        }
        onConfirm={() => {
          if (confirmState.id && confirmState.action) {
            workflowMutation.mutate({
              id: confirmState.id,
              action: confirmState.action,
            });
          }
        }}
        confirmLabel={
          confirmState.action === 'review'
            ? 'Mark Reviewed'
            : confirmState.action === 'approve'
              ? 'Approve Report'
              : 'Publish Report'
        }
      />
    </div>
  );
};

export default ReportCardsPage;
