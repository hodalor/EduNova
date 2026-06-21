import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import {
  getAcademicStructureLabel,
  getInstitutionLevels,
  getWorkspaceLabel,
  isDaycareInstitution,
  isTertiaryInstitution,
} from '../../lib/institution';

const SettingsWorkspacePage = () => {
  const institution = useAuthStore((state) => state.institution);
  const levels = getInstitutionLevels(institution);
  const credentials = institution?.settings?.tertiary?.credentials || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Settings"
        description="Configuration summary for branding, academic structure, education levels, and institution-specific operating rules."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Institution Model" description="How this school is configured inside EDUOVA.">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Workspace
              </p>
              <p className="mt-2 text-lg font-semibold text-brand-navy">
                {getWorkspaceLabel(institution)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Academic Calendar
              </p>
              <p className="mt-2 text-lg font-semibold capitalize text-brand-navy">
                {getAcademicStructureLabel(institution)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Education Levels
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {levels.map((level) => (
                  <Badge key={level} variant="info">
                    {level}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Feature Segregation" description="Modules enabled by the current school profile.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="font-semibold text-brand-navy">Daycare workflows</p>
              <p className="mt-1 text-sm text-slate-500">
                {isDaycareInstitution(institution)
                  ? 'Pickup safeguards, milestone tracking, and session controls are enabled.'
                  : 'Daycare workflows are hidden because this institution is not configured for early-years care.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="font-semibold text-brand-navy">Tertiary workflows</p>
              <p className="mt-1 text-sm text-slate-500">
                {isTertiaryInstitution(institution)
                  ? 'Faculties, departments, programs, credentials, and promotion rules are enabled.'
                  : 'Tertiary modules remain hidden until the institution enables tertiary education levels.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="font-semibold text-brand-navy">Credential options</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {credentials.length ? (
                  credentials.map((credential) => (
                    <Badge key={credential} variant="success">
                      {credential}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="inactive">K-12 only</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsWorkspacePage;
