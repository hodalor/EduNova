import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  actor_name: string;
  actor_role: string;
  created_at: string;
  summary: string;
}

const AuditLogPage = () => {
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['super-admin', 'audit-logs', action, resourceType],
    queryFn: () =>
      eduovaApi.superAdmin.auditLogs({
        action: action || undefined,
        resource_type: resourceType || undefined,
      }),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Card title="Unable to load audit logs" description="Retry the platform audit query.">
        <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-brand-navy">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Trail"
        description="Filter super-admin writes and lifecycle actions across the EDUOVA control plane."
      />

      <Card title="Filters" description="Restrict platform log visibility by action or resource type.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Action" value={action} onChange={(event) => setAction(event.target.value)} />
          <Input
            label="Resource Type"
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
          />
        </div>
      </Card>

      <Card title="Audit Entries" description="Platform-level audit history only, with no direct tenant record content.">
        <div className="space-y-3">
          {(data as AuditLogEntry[]).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-gold">
                    {entry.action} · {entry.resource_type}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-brand-navy">{entry.summary}</h3>
                </div>
                <p className="text-sm text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <p>Actor: {entry.actor_name}</p>
                <p>Role: {entry.actor_role}</p>
                <p>Resource ID: {entry.resource_id}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AuditLogPage;
