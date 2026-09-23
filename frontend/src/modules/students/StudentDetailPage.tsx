import { useEffect, useState } from 'react';
import { Download, FileBadge2, PencilLine } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import PageHeader from '../shared/PageHeader';
import { type StudentDetail, useStudent } from './hooks/useStudent';
import { useUpdateStudent } from './hooks/useUpdateStudent';

const attendanceColor = (value: number) =>
  value > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

const StudentDetailPage = () => {
  const { studentId = 'stu-001' } = useParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    allergies: '',
    bloodGroup: '',
    medicalNotes: '',
  });
  const { data, isLoading, isError, refetch } = useStudent(studentId);
  const updateStudent = useUpdateStudent();

  useEffect(() => {
    if (!data) return;
    setFormValues({
      fullName: data.name || '',
      guardianName: data.guardian?.name || '',
      guardianPhone: data.guardian?.phone || '',
      guardianRelation: data.guardian?.relation || '',
      allergies: data.medical?.allergies || '',
      bloodGroup: data.medical?.bloodGroup || '',
      medicalNotes: data.medical?.notes || '',
    });
  }, [data]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load student profile"
        message="Refresh the student page to retry."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const outstandingBalance = data.invoices.reduce(
    (sum: number, invoice: StudentDetail['invoices'][number]) => sum + invoice.balance,
    0
  );
  const presentDays = data.attendanceCalendar.filter((item: StudentDetail['attendanceCalendar'][number]) => item.value > 0).length;
  const absentDays = data.attendanceCalendar.filter((item: StudentDetail['attendanceCalendar'][number]) => item.value <= 0).length;
  const attendanceRate = presentDays + absentDays > 0 ? Math.round((presentDays / (presentDays + absentDays)) * 100) : 0;
  const openIncidents = data.discipline.filter((item: StudentDetail['discipline'][number]) => item.status !== 'resolved').length;
  const resolvedIncidents = data.discipline.filter((item: StudentDetail['discipline'][number]) => item.status === 'resolved').length;
  const handleFieldChange = (key: keyof typeof formValues, value: string) =>
    setFormValues((current) => ({ ...current, [key]: value }));
  const handleEditSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    try {
      await updateStudent.mutateAsync({
        studentId: data.id,
        full_name: formValues.fullName,
        guardian_name: formValues.guardianName,
        guardian_phone: formValues.guardianPhone,
        guardian_relation: formValues.guardianRelation,
        allergies: formValues.allergies,
        blood_group: formValues.bloodGroup,
        medical_notes: formValues.medicalNotes,
      });
      setIsEditing(false);
    } catch (_error) {
      // Toast feedback is handled in the mutation hook.
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.student_number} · ${data.className} · ${data.level}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to={`/students/${data.id}/id-card`}>
              <Button variant="secondary" leftIcon={<FileBadge2 className="h-4 w-4" />}>
                Generate ID Card
              </Button>
            </Link>
            <Button
              leftIcon={<PencilLine className="h-4 w-4" />}
              onClick={() => {
                void handleEditSave();
              }}
              loading={updateStudent.isPending}
            >
              {isEditing ? 'Save Profile' : 'Edit Profile'}
            </Button>
          </div>
        }
      />

      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={data.name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-brand-navy">{data.name}</h2>
              <Badge variant={data.status === 'active' ? 'success' : 'warning'}>{data.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Guardian: {data.guardian.name} · {data.guardian.phone}
            </p>
          </div>
          <div className="surface-muted p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding Balance</p>
            <p className="mt-2 text-3xl font-bold text-rose-500">
              GHS {outstandingBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Personal Information" description={isEditing ? 'Editing is enabled. Save when you are done.' : 'Locked until you click Edit Profile.'}>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={formValues.fullName}
                  onChange={(event) => handleFieldChange('fullName', event.target.value)}
                  disabled={!isEditing}
                />
                <Input label="Student Number" value={data.student_number} disabled />
                <Input label="Current Class" value={data.className} disabled />
              </div>
            </Card>
            <Card title="Guardian Information" description="Primary guardian and emergency contact.">
              <div className="space-y-4">
                <Input
                  label="Guardian Name"
                  value={formValues.guardianName}
                  onChange={(event) => handleFieldChange('guardianName', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Phone"
                  value={formValues.guardianPhone}
                  onChange={(event) => handleFieldChange('guardianPhone', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Relationship"
                  value={formValues.guardianRelation}
                  onChange={(event) => handleFieldChange('guardianRelation', event.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </Card>
            <Card title="Medical Information" description="Medical alerts, restrictions, and notes.">
              <div className="space-y-4">
                <Input
                  label="Allergies"
                  value={formValues.allergies}
                  onChange={(event) => handleFieldChange('allergies', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Blood Group"
                  value={formValues.bloodGroup}
                  onChange={(event) => handleFieldChange('bloodGroup', event.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="Notes"
                  value={formValues.medicalNotes}
                  onChange={(event) => handleFieldChange('medicalNotes', event.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <Card title="GPA Trend" description="Trend across recent academic terms.">
              {data.academicTrend.length === 0 ? (
                <EmptyState
                  title="No academic records yet"
                  message="This student does not have published results yet, so no academic trend is available."
                />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.academicTrend}>
                      <XAxis dataKey="term" stroke="#64748B" />
                      <YAxis stroke="#64748B" domain={[0, 4]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="gpa" stroke="#0F1B3C" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <Card title="Current Academic Snapshot" description="Overview of the student's current study context.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Class</p>
                  <p className="mt-2 font-semibold text-brand-navy">{data.className}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Academic Status</p>
                  <p className="mt-2">
                    {data.academicTrend.length > 0 ? 'Published records available' : 'Awaiting first published result'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Current GPA</p>
                  <p className="mt-2 font-semibold text-brand-navy">
                    {data.academicTrend[data.academicTrend.length - 1]?.gpa ?? 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            <Card title="Attendance Summary" description="Current term attendance performance.">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Present Days</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">{presentDays}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Absent Days</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">{absentDays}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Attendance Rate</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{attendanceRate}%</p>
                </div>
              </div>
            </Card>
            <Card title="Calendar Heatmap" description="Recent attendance markers by date.">
              {data.attendanceCalendar.length === 0 ? (
                <EmptyState
                  title="No attendance records yet"
                  message="Attendance for this student will appear here after the first marked session."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(data.attendanceCalendar as StudentDetail['attendanceCalendar']).map((item) => (
                    <div
                      key={item.date}
                      className={`rounded-2xl p-4 text-sm ${attendanceColor(item.value)}`}
                    >
                      <p className="font-semibold">{item.date}</p>
                      <p className="mt-2">{item.value ? 'Present' : 'Absent'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance">
          <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <Table<StudentDetail['invoices'][number]>
              title="Invoices"
              data={data.invoices}
              columns={[
                { header: 'Invoice', accessorKey: 'invoice_number' },
                { header: 'Total', cell: ({ row }) => `GHS ${row.original.total.toLocaleString()}` },
                { header: 'Paid', cell: ({ row }) => `GHS ${row.original.paid.toLocaleString()}` },
                { header: 'Balance', cell: ({ row }) => `GHS ${row.original.balance.toLocaleString()}` },
                {
                  header: 'Status',
                  cell: ({ row }) => (
                    <Badge
                      variant={
                        row.original.status === 'paid'
                          ? 'success'
                          : row.original.status === 'partial'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {row.original.status}
                    </Badge>
                  ),
                },
              ]}
            />
            <Card title="Payment History" description="Most recent payment posture and next steps.">
              <div className="space-y-4">
                <div className="rounded-2xl bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-rose-500">Outstanding</p>
                  <p className="mt-2 text-3xl font-bold text-rose-600">
                    GHS {outstandingBalance.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {outstandingBalance > 0
                    ? 'Payment reminders are recommended before the next fee checkpoint.'
                    : 'No outstanding balance at the moment.'}
                </div>
                <Button>Record Payment</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discipline">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Table<StudentDetail['discipline'][number]>
              title="Incident History"
              data={data.discipline}
              columns={[
                { header: 'Category', accessorKey: 'category' },
                { header: 'Points', accessorKey: 'points' },
                { header: 'Date', accessorKey: 'date' },
                { header: 'Status', accessorKey: 'status' },
              ]}
            />
            <Card title="Behavior Score" description="Current merit and demerit standing.">
              <div className="space-y-3">
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Incidents Logged</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">{data.discipline.length}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Open Cases</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">{openIncidents}</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Resolved</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{resolvedIncidents}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Table<StudentDetail['documents'][number]>
              title="Uploaded Documents"
              data={data.documents}
              columns={[
                { header: 'Document Name', accessorKey: 'name' },
                { header: 'Type', accessorKey: 'type' },
                {
                  header: 'Action',
                  cell: () => (
                    <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
                      Download
                    </Button>
                  ),
                },
              ]}
            />
            <Card title="Archives" description="Generate identity assets and maintain records.">
              <div className="space-y-4">
                <Button>Generate ID Card</Button>
                <Button variant="secondary">Open Report Card Archive</Button>
                <FileUpload />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDetailPage;
