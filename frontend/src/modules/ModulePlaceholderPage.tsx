import SectionPlaceholder from '../components/shared/SectionPlaceholder';

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

const ModulePlaceholderPage = ({
  title,
  description,
}: ModulePlaceholderPageProps) => {
  return <SectionPlaceholder title={title} description={description} />;
};

export default ModulePlaceholderPage;
