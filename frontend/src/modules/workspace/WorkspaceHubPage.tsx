import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import PageHeader from '../shared/PageHeader';

export interface WorkspaceMetric {
  label: string;
  value: string;
  helper: string;
}

export interface WorkspaceLink {
  title: string;
  description: string;
  to: string;
  badge?: string;
}

export interface WorkspaceChecklistItem {
  title: string;
  description: string;
  status?: 'success' | 'warning' | 'info';
}

interface WorkspaceHubPageProps {
  title: string;
  description: string;
  metrics?: WorkspaceMetric[];
  links?: WorkspaceLink[];
  checklist?: WorkspaceChecklistItem[];
}

const WorkspaceHubPage = ({
  title,
  description,
  metrics = [],
  links = [],
  checklist = [],
}: WorkspaceHubPageProps) => {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      {metrics.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="h-full">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-bold text-brand-navy">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.helper}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card
          title="Connected Workflows"
          description="Each section below takes users to a working page instead of a blank module."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {links.map((item) => (
              <div
                key={item.to}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-gold/40 hover:bg-amber-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-brand-navy">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                  </div>
                  {item.badge ? <Badge variant="info">{item.badge}</Badge> : null}
                </div>
                <Link
                  to={item.to}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-brand-navy ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Operational Guardrails"
          description="This workspace adapts to the institution type and role that is signed in."
        >
          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-emerald-50 p-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-navy">{item.title}</p>
                    <Badge variant={item.status || 'info'}>{item.status || 'info'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WorkspaceHubPage;
