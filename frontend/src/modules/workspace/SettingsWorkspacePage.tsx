import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import {
  getAcademicStructureLabel,
  getInstitutionLevels,
  getWorkspaceLabel,
  isDaycareInstitution,
  isTertiaryInstitution,
} from '../../lib/institution';

interface FinanceSettings {
  currencies: string[];
  default_local_currency: string;
  default_international_currency: string;
}

const fallbackFinanceSettings: FinanceSettings = {
  currencies: ['GHS', 'ZMW', 'USD'],
  default_local_currency: 'GHS',
  default_international_currency: 'USD',
};

const SettingsWorkspacePage = () => {
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitution = tenantContext || institution;
  const activeInstitutionId = activeInstitution?.id || null;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const levels = getInstitutionLevels(activeInstitution);
  const credentials = activeInstitution?.settings?.tertiary?.credentials || [];

  const financeQuery = useQuery<FinanceSettings>({
    queryKey: ['finance-settings', activeInstitutionId],
    queryFn: eduovaApi.finance.settings,
    enabled: Boolean(activeInstitutionId),
  });
  const financeSettings = financeQuery.data || fallbackFinanceSettings;
  const [currencyInput, setCurrencyInput] = useState(financeSettings.currencies.join(', '));
  const [defaultLocalCurrency, setDefaultLocalCurrency] = useState(financeSettings.default_local_currency);
  const [defaultInternationalCurrency, setDefaultInternationalCurrency] = useState(
    financeSettings.default_international_currency
  );

  useEffect(() => {
    setCurrencyInput(financeSettings.currencies.join(', '));
    setDefaultLocalCurrency(financeSettings.default_local_currency);
    setDefaultInternationalCurrency(financeSettings.default_international_currency);
  }, [
    financeSettings.currencies,
    financeSettings.default_international_currency,
    financeSettings.default_local_currency,
  ]);

  const currencyOptions = useMemo(() => {
    const parsed: string[] = currencyInput
      .split(',')
      .map((item: string) => item.trim().toUpperCase())
      .filter(Boolean);
    return Array.from<string>(new Set(parsed.length ? parsed : fallbackFinanceSettings.currencies));
  }, [currencyInput]);

  useEffect(() => {
    if (!currencyOptions.includes(defaultLocalCurrency)) {
      setDefaultLocalCurrency(currencyOptions[0] || fallbackFinanceSettings.default_local_currency);
    }
    if (!currencyOptions.includes(defaultInternationalCurrency)) {
      setDefaultInternationalCurrency(
        currencyOptions.find((item: string) => item !== (currencyOptions[0] || '')) ||
          currencyOptions[0] ||
          fallbackFinanceSettings.default_international_currency
      );
    }
  }, [currencyOptions, defaultInternationalCurrency, defaultLocalCurrency]);

  const saveFinanceSettings = useMutation({
    mutationFn: () =>
      eduovaApi.finance.updateSettings({
        currencies: currencyOptions,
        default_local_currency: defaultLocalCurrency,
        default_international_currency: defaultInternationalCurrency,
      }),
    onSuccess: () => {
      toast.success('Finance settings updated.');
      queryClient.invalidateQueries({ queryKey: ['finance-settings', activeInstitutionId] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Unable to update finance settings.';
      toast.error(message || 'Unable to update finance settings.');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Settings"
        description="Manage the institution profile, enabled workflows, and finance defaults from one place."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card title="Institution Model">
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Workspace
                  </p>
                  <p className="mt-2 text-lg font-semibold text-brand-navy">
                    {getWorkspaceLabel(activeInstitution)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Academic Calendar
                  </p>
                  <p className="mt-2 text-lg font-semibold capitalize text-brand-navy">
                    {getAcademicStructureLabel(activeInstitution)}
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

            <Card title="Credential Options">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="font-semibold text-brand-navy">Tertiary credentials</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {credentials.length ? (
                      credentials.map((credential) => (
                        <Badge key={credential} variant="info">
                          {credential}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="inactive">K-12 only</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="font-semibold text-brand-navy">Institution code</p>
                  <p className="mt-2 text-sm text-slate-500">{activeInstitution?.code || '-'}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <Card title="Feature Segregation">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="font-semibold text-brand-navy">Daycare workflows</p>
                <p className="mt-1 text-sm text-slate-500">
                  {isDaycareInstitution(activeInstitution)
                    ? 'Pickup safeguards, milestone tracking, and session controls are enabled.'
                    : 'Daycare workflows are hidden for this institution profile.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="font-semibold text-brand-navy">Tertiary workflows</p>
                <p className="mt-1 text-sm text-slate-500">
                  {isTertiaryInstitution(activeInstitution)
                    ? 'Faculties, departments, programs, roadmaps, and progression rules are enabled.'
                    : 'Tertiary modules are currently hidden for this institution profile.'}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card
              title="Finance Defaults"
              action={
                <Button onClick={() => saveFinanceSettings.mutate()} loading={saveFinanceSettings.isPending}>
                  Save Finance Settings
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Currencies"
                    value={currencyInput}
                    onChange={(event) => setCurrencyInput(event.target.value.toUpperCase())}
                    placeholder="GHS, ZMW, USD"
                  />
                </div>
                <Select
                  label="Default Local Currency"
                  value={defaultLocalCurrency}
                  onChange={(event) => setDefaultLocalCurrency(event.target.value)}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Default International Currency"
                  value={defaultInternationalCurrency}
                  onChange={(event) => setDefaultInternationalCurrency(event.target.value)}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
              </div>
            </Card>

            <Card title="Current Finance Profile">
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Local students
                  </p>
                  <p className="mt-2 text-lg font-semibold text-brand-navy">{defaultLocalCurrency}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    International students
                  </p>
                  <p className="mt-2 text-lg font-semibold text-brand-navy">
                    {defaultInternationalCurrency}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-brand-navy">Enabled currencies</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currencyOptions.map((currency) => (
                      <Badge key={currency} variant="info">
                        {currency}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsWorkspacePage;
