import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  Clock3,
  ShieldCheck,
  Stethoscope,
  Plus,
  Save,
  Trash2,
  Users,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/cn';

type DaycareClass = {
  id: string;
  name: string;
  code?: string;
  capacity?: number | null;
  age_min?: number | null;
  age_max?: number | null;
  group_type?: string;
  level_code?: string;
};

type MilestoneBand = {
  id?: string;
  ageBand: string;
  focus: string;
};

type DaycareOverview = {
  presentNow: unknown[];
  classes: DaycareClass[];
  pickupPolicies: string[];
  milestones: MilestoneBand[];
  sessionModel: string;
  pickupPinRequired: boolean;
};

const SESSION_OPTIONS = [
  { value: 'fullDay', label: 'Full Day' },
  { value: 'halfDayMorning', label: 'Half Day (Morning)' },
  { value: 'halfDayAfternoon', label: 'Half Day (Afternoon)' },
  { value: 'hourly', label: 'Hourly / Drop-in' },
];

const sessionLabel = (value: string) =>
  SESSION_OPTIONS.find((opt) => opt.value === value)?.label || value || 'Full Day';

const NewClassForm = ({ onSubmit, onCancel }: { onSubmit: (payload: Record<string, unknown>) => void; onCancel: () => void }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [ageMin, setAgeMin] = useState<string>('');
  const [ageMax, setAgeMax] = useState<string>('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase() || name.trim().toUpperCase().replace(/\s+/g, '-'),
      capacity: capacity === '' ? null : Number(capacity),
      age_min: ageMin === '' ? null : Number(ageMin),
      age_max: ageMax === '' ? null : Number(ageMax),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Class / Room Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunflower Room" />
        <Input label="Short Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. DC-SUN" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Capacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 20" />
        <Input label="Age Min (years)" type="number" min={0} max={12} step={0.5} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="0" />
        <Input label="Age Max (years)" type="number" min={0} max={18} step={0.5} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="5" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>Save Class</Button>
      </div>
    </form>
  );
};

const PolicyForm = ({ onSubmit, onCancel }: { onSubmit: (payload: { body: string }) => void; onCancel: () => void }) => {
  const [body, setBody] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit({ body: body.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Policy Text</span>
        <textarea
          required
          rows={3}
          className="field-base min-h-[96px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. A parent or authorized guardian must show photo ID before pickup."
        />
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>Add Policy</Button>
      </div>
    </form>
  );
};

const MilestoneForm = ({ onSubmit, onCancel }: { onSubmit: (payload: { age_band: string; focus: string }) => void; onCancel: () => void }) => {
  const [ageBand, setAgeBand] = useState('');
  const [focus, setFocus] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageBand.trim() || !focus.trim()) return;
    onSubmit({ age_band: ageBand.trim(), focus: focus.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Age Band" required value={ageBand} onChange={(e) => setAgeBand(e.target.value)} placeholder="e.g. 0 - 1" />
        <Input label="Focus Area" required value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. Gross motor & sensory play" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>Add Milestone Band</Button>
      </div>
    </form>
  );
};

const SettingsCard = ({
  initial,
  onSave,
  saving,
}: {
  initial: { sessionModel: string; pickupPinRequired: boolean };
  onSave: (payload: Record<string, unknown>) => void;
  saving: boolean;
}) => {
  const [sessionModel, setSessionModel] = useState(initial.sessionModel);
  const [pickupPinRequired, setPickupPinRequired] = useState(initial.pickupPinRequired);

  const changed = sessionModel !== initial.sessionModel || pickupPinRequired !== initial.pickupPinRequired;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Session Model"
          value={sessionModel}
          onChange={(e) => setSessionModel(e.target.value)}
        >
          {SESSION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <div>
          <span className="text-sm font-semibold text-slate-700">Guardian Pickup PIN</span>
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{pickupPinRequired ? 'Required' : 'Optional'}</p>
              <p className="text-sm text-slate-500">
                {pickupPinRequired
                  ? 'Staff must enter a 6-digit PIN to verify each pickup.'
                  : 'PIN is only required for unrecognized adults.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pickupPinRequired}
              onClick={() => setPickupPinRequired((v) => !v)}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition',
                pickupPinRequired ? 'bg-brand-navy' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition',
                  pickupPinRequired ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          leftIcon={<Save className="h-4 w-4" />}
          disabled={!changed || saving}
          onClick={() => onSave({ session_model: sessionModel, pickup_pin_required: pickupPinRequired })}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
};

const DaycareManagementPage = () => {
  const queryClient = useQueryClient();
  const institution = useAuthStore((state) => state.institution);

  const [tab, setTab] = useState('overview');
  const [showClassForm, setShowClassForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'class'; id: string; name: string }
    | { kind: 'policy'; index: number; label: string }
    | { kind: 'milestone'; id: string; label: string }
    | null
  >(null);

  const { data, isLoading } = useQuery<DaycareOverview>({
    queryKey: ['daycare-overview'],
    queryFn: eduovaApi.daycare.overview,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['daycare-overview'] });
  };

  const createClass = useMutation({
    mutationFn: (payload: Record<string, unknown>) => eduovaApi.daycare.createClass(payload),
    onSuccess: () => {
      setShowClassForm(false);
      refresh();
    },
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => eduovaApi.daycare.deleteClass(id),
    onSuccess: () => {
      setPendingDelete(null);
      refresh();
    },
  });

  const createPolicy = useMutation({
    mutationFn: (payload: { body: string }) => eduovaApi.daycare.createPolicy(payload),
    onSuccess: () => {
      setShowPolicyForm(false);
      refresh();
    },
  });

  const deletePolicy = useMutation({
    mutationFn: (index: number) => eduovaApi.daycare.deletePolicy(index),
    onSuccess: () => {
      setPendingDelete(null);
      refresh();
    },
  });

  const createMilestone = useMutation({
    mutationFn: (payload: { age_band: string; focus: string }) =>
      eduovaApi.daycare.createMilestoneBand(payload),
    onSuccess: () => {
      setShowMilestoneForm(false);
      refresh();
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: (id: string) => eduovaApi.daycare.deleteMilestoneBand(id),
    onSuccess: () => {
      setPendingDelete(null);
      refresh();
    },
  });

  const updateSettings = useMutation({
    mutationFn: (payload: Record<string, unknown>) => eduovaApi.daycare.updateSettings(payload),
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['institution'] });
    },
  });

  const classes = data?.classes || [];
  const policies = data?.pickupPolicies || [];
  const milestones = data?.milestones || [];

  const statItems = useMemo(() => {
    const sessionModel = data?.sessionModel || institution?.settings?.daycare?.session_model || 'fullDay';
    const pickupPin = data?.pickupPinRequired ?? institution?.settings?.daycare?.pickup_pin_required;
    return [
      {
        label: 'Session Model',
        value: sessionLabel(sessionModel),
        helper: 'Configured daycare attendance pattern.',
        icon: Clock3,
      },
      {
        label: 'Pickup PIN',
        value: pickupPin ? 'Required' : 'Optional',
        helper: 'Guardian release protection status.',
        icon: ShieldCheck,
      },
      {
        label: 'Classes / Rooms',
        value: `${classes.length}`,
        helper: 'Active groups and classrooms.',
        icon: GraduationCap,
      },
      {
        label: 'Present Now',
        value: `${data?.presentNow?.length || 0}`,
        helper: 'Children checked in today.',
        icon: Users,
      },
      {
        label: 'Milestone Bands',
        value: `${milestones.length}`,
        helper: 'Age-based observation groupings.',
        icon: Baby,
      },
      {
        label: 'Care Policies',
        value: `${policies.length}`,
        helper: 'Safety, medical, and pickup rules.',
        icon: Stethoscope,
      },
    ];
  }, [data, institution, classes.length, milestones.length, policies.length]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daycare Operations"
        description="Manage child care workflows, pickup controls, classroom structure, and readiness milestones for early-years institutions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 truncate text-3xl font-bold capitalize text-brand-navy">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                </div>
                <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">Class / Room Setup</TabsTrigger>
            <TabsTrigger value="policies">Policies &amp; Milestones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card
                title="Operational Settings"
                description="How your center runs each day — session shape and pickup safety."
              >
                <SettingsCard
                  initial={{
                    sessionModel: data?.sessionModel || institution?.settings?.daycare?.session_model || 'fullDay',
                    pickupPinRequired:
                      data?.pickupPinRequired ?? institution?.settings?.daycare?.pickup_pin_required ?? false,
                  }}
                  onSave={(payload) => updateSettings.mutate(payload)}
                  saving={updateSettings.isPending}
                />
              </Card>

              <Card title="Quick Snapshot" description="Summary of today's readiness for operations.">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <div className="mt-1 rounded-full bg-brand-navy/5 p-2 text-brand-navy">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{classes.length} Class{classes.length === 1 ? '' : 'es'} Defined</p>
                      <p className="text-sm text-slate-500">
                        {classes.length === 0
                          ? 'Start by adding your first classroom under Class Setup.'
                          : 'Use the Class / Room Setup tab to add or edit rooms.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <div className={cn(
                      'mt-1 rounded-full p-2',
                      milestones.length === 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    )}>
                      {milestones.length === 0 ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {milestones.length === 0 ? 'No Milestone Bands Yet' : 'Milestone Bands Configured'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {milestones.length === 0
                          ? 'Age groups keep observations focused — create a set on the Policies tab.'
                          : `${milestones.length} age band${milestones.length === 1 ? '' : 's'} already defined.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <div className={cn(
                      'mt-1 rounded-full p-2',
                      policies.length === 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    )}>
                      {policies.length === 0 ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <Stethoscope className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {policies.length === 0 ? 'No Care Policies' : 'Policies Documented'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {policies.length === 0
                          ? 'Capture pickup rules, medical notes, and safeguarding guidance.'
                          : `${policies.length} policy item${policies.length === 1 ? '' : 's'} on file.`}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="classes">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Create classrooms and rooms so students, attendance, and milestones all group under the right level.
                  </p>
                </div>
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowClassForm((v) => !v)}>
                  {showClassForm ? 'Hide Form' : 'Add Class / Room'}
                </Button>
              </div>

              {showClassForm ? (
                <Card title="New Class / Room" description="Fills a row in the Class table below once saved.">
                  <NewClassForm
                    onSubmit={(payload) => createClass.mutate(payload)}
                    onCancel={() => setShowClassForm(false)}
                  />
                </Card>
              ) : null}

              {classes.length === 0 ? (
                <EmptyState
                  title="No classrooms yet"
                  message="Add a class to get started. Each class appears in the Students filter, attendance roster, and milestone tracking."
                  cta={
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowClassForm(true)}>
                      Add Class / Room
                    </Button>
                  }
                />
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-6 py-3">Name</th>
                          <th className="px-6 py-3">Code</th>
                          <th className="px-6 py-3">Age Range</th>
                          <th className="px-6 py-3">Capacity</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classes.map((c: DaycareClass) => (
                          <tr key={c.id} className="align-top">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{c.name}</p>
                              {c.group_type ? (
                                <p className="mt-0.5 inline-flex"><Badge variant="info">{c.group_type}</Badge></p>
                              ) : null}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-500">{c.code || '—'}</td>
                            <td className="px-6 py-4 text-slate-600">
                              {c.age_min == null && c.age_max == null
                                ? '—'
                                : `${c.age_min ?? 0} – ${c.age_max ?? '∞'} years`}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{c.capacity == null ? 'Unlimited' : String(c.capacity)}</td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                variant="danger"
                                size="sm"
                                leftIcon={<Trash2 className="h-4 w-4" />}
                                onClick={() => setPendingDelete({ kind: 'class', id: c.id, name: c.name })}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="policies">
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card
                title="Pickup & Safeguarding Policies"
                description="Operational rules that govern release and child safety."
                action={
                  <Button
                    variant="secondary"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowPolicyForm((v) => !v)}
                  >
                    {showPolicyForm ? 'Hide Form' : 'Add Policy'}
                  </Button>
                }
              >
                {showPolicyForm ? (
                  <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                    <PolicyForm
                      onSubmit={(payload) => createPolicy.mutate(payload)}
                      onCancel={() => setShowPolicyForm(false)}
                    />
                  </div>
                ) : null}

                {policies.length === 0 ? (
                  <EmptyState
                    title="No policies yet"
                    message="Capture pickup rules, allergy notices, and safeguarding expectations so every staff member works from the same checklist."
                  />
                ) : (
                  <div className="space-y-3">
                    {policies.map((policy: string, idx: number) => (
                      <div
                        key={`${policy}-${idx}`}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700">{policy}</p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() =>
                            setPendingDelete({
                              kind: 'policy',
                              index: idx,
                              label: policy.length > 48 ? `${policy.slice(0, 48)}…` : policy,
                            })
                          }
                          aria-label="Delete policy"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title="Development Milestones"
                description="Track focus areas by age band for reporting and school readiness."
                action={
                  <Button
                    variant="secondary"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowMilestoneForm((v) => !v)}
                  >
                    {showMilestoneForm ? 'Hide Form' : 'Add Milestone Band'}
                  </Button>
                }
              >
                {showMilestoneForm ? (
                  <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                    <MilestoneForm
                      onSubmit={(payload) => createMilestone.mutate(payload)}
                      onCancel={() => setShowMilestoneForm(false)}
                    />
                  </div>
                ) : null}

                {milestones.length === 0 ? (
                  <EmptyState
                    title="No milestone bands yet"
                    message="Describe age-group focus areas so staff can plan observations, activities, and parent reports against the right expectations."
                  />
                ) : (
                  <div className="space-y-3">
                    {milestones.map((item: MilestoneBand) => (
                      <div
                        key={item.id || item.ageBand}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-navy">{item.ageBand} years</p>
                          <p className="text-sm text-slate-500">{item.focus}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="info">Readiness</Badge>
                          <button
                            type="button"
                            className="rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() =>
                              setPendingDelete({
                                kind: 'milestone',
                                id: item.id || item.ageBand,
                                label: `${item.ageBand} yrs — ${item.focus}`,
                              })
                            }
                            aria-label="Delete milestone band"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        title={
          pendingDelete?.kind === 'class'
            ? 'Delete Class / Room?'
            : pendingDelete?.kind === 'policy'
            ? 'Delete Care Policy?'
            : pendingDelete?.kind === 'milestone'
            ? 'Delete Milestone Band?'
            : 'Delete Item?'
        }
        description={
          pendingDelete
            ? `"${
                pendingDelete.kind === 'class' ? pendingDelete.name : pendingDelete.label
              }" will be removed permanently.`
            : ''
        }
        confirmLabel="Delete"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === 'class') deleteClass.mutate(pendingDelete.id);
          else if (pendingDelete.kind === 'policy') deletePolicy.mutate(pendingDelete.index);
          else if (pendingDelete.kind === 'milestone') deleteMilestone.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
};

export default DaycareManagementPage;
