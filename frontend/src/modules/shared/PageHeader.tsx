import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-3xl font-semibold text-brand-navy">{title}</h1>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </div>
    {actions}
  </div>
);

export default PageHeader;
