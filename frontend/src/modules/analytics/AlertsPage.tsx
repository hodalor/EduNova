import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DatePicker from '../../components/ui/DatePicker';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';

interface AlertRow {
  id: string;
  type: 'Academic' | 'Financial' | 'Attendance' | 'Behavioral';
  student: string;
  severity: 'info' | 'warning' | 'danger' | 'error';
  date: string;
  message: string;
}

const groups = ['Academic', 'Financial', 'Attendance', 'Behavioral'] as const;

const AlertsPage = () => {
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState('2026-06-30');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-alerts', from, to],
    queryFn: eduovaApi.analytics.getAlerts,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load alerts"
        message="Refresh to retry the active alerts feed."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const alerts = data as AlertRow[];

  return (
    <div className="space-y-6">
      <div className="surface-muted grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <DatePicker label="From" value={from} onChange={setFrom} />
        <DatePicker label="To" value={to} onChange={setTo} />
        <Button variant="secondary">Escalation Rules</Button>
      </div>

      {groups.map((group) => {
        const items = alerts.filter((alert) => alert.type === group);
        return (
          <Card
            key={group}
            title={`${group} Alerts`}
            description={`${items.length} alert${items.length === 1 ? '' : 's'} in this category.`}
          >
            {items.length ? (
              <div className="space-y-4">
                {items.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-brand-navy">{alert.student}</h3>
                          <Badge
                            variant={
                              alert.severity === 'danger' || alert.severity === 'error'
                                ? 'danger'
                                : alert.severity === 'warning'
                                  ? 'warning'
                                  : 'info'
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <Badge variant="inactive">{alert.date}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{alert.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">
                          Open Profile
                        </Button>
                        <Button size="sm">Take Action</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={`No ${group.toLowerCase()} alerts`}
                message="Current rule checks did not generate any incidents for this category."
              />
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default AlertsPage;
