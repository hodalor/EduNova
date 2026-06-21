import { Boxes } from 'lucide-react';

import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from './shared/PageHeader';

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

const ModulePlaceholderPage = ({
  title,
  description,
}: ModulePlaceholderPageProps) => {
  return (
    <div>
      <PageHeader title={title} description={description} actions={<Button>Configure Module</Button>} />
      <EmptyState
        icon={<Boxes className="h-8 w-8" />}
        title={`${title} module scaffolded`}
        message="This module is ready to be connected to backend workflows and live institutional data."
      />
    </div>
  );
};

export default ModulePlaceholderPage;
