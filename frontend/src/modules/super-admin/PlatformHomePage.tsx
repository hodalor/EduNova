import { Link } from 'react-router-dom';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../shared/PageHeader';

const PlatformHomePage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Control Plane"
        description="Manage platform users, analytics, and the audit trail for this school."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Platform Users',
            description: 'Create and manage super admin accounts for the control plane.',
            to: '/super-admin/users',
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
