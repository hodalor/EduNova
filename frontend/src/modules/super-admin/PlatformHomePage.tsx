import { Link } from 'react-router-dom';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../shared/PageHeader';

const PlatformHomePage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Control Plane"
        description="Manage institutions, subscriptions, platform analytics, and governance from the SaaS layer above tenant operations."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Institutions',
            description: 'Monitor school lifecycle, plan status, and operational health.',
            to: '/super-admin/institutions',
          },
          {
            title: 'Onboard School',
            description: 'Provision a new institution and first admin account.',
            to: '/super-admin/institutions/new',
          },
          {
            title: 'Platform Analytics',
            description: 'Review aggregate KPIs like MRR, MAU, churn, and growth.',
            to: '/super-admin/analytics',
          },
          {
            title: 'Audit Trail',
            description: 'Inspect platform governance events and super-admin writes.',
            to: '/super-admin/audit-logs',
          },
        ].map((item) => (
          <Card key={item.title} title={item.title} description={item.description}>
            <Link to={item.to}>
              <Button variant="secondary">Open</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlatformHomePage;
