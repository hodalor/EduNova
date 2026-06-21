import { useState } from 'react';
import { Download, FileBadge2, PencilLine } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FileUpload from '../../components/ui/FileUpload';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Table from '../../components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import PageHeader from '../shared/PageHeader';
import { type StudentDetail, useStudent } from './hooks/useStudent';

const attendanceColor = (value: number) =>
  value > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

const StudentDetailPage = () => {
  const { studentId = 'stu-001' } = useParams();
  const [activeTab, setActiveTab] = useState('profile');
  const { data, isLoading, isError, refetch } = useStudent(studentId);

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
            <Button leftIcon={<PencilLine className="h-4 w-4" />}>Edit Student</Button>
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
            <Card title="Personal Information" description="Editable personal and contact details.">
              <div className="space-y-4">
                <Input label="Full Name" defaultValue={data.name} />
                <Input label="Student Number" defaultValue={data.student_number} />
                <Input label="Current Class" defaultValue={data.className} />
                <Button size="sm">Save Profile</Button>
              </div>
            </Card>
            <Card title="Guardian Information" description="Primary guardian and emergency contact.">
              <div className="space-y-4">
                <Input label="Guardian Name" defaultValue={data.guardian.name} />
                <Input label="Phone" defaultValue={data.guardian.phone} />
                <Input label="Relationship" defaultValue={data.guardian.relation} />
                <Button size="sm" variant="secondary">
                  Update Guardian
                </Button>
              </div>
            </Card>
            <Card title="Medical Information" description="Medical alerts, restrictions, and notes.">
              <div className="space-y-4">
                <Input label="Allergies" defaultValue={data.medical.allergies} />
                <Input label="Blood Group" defaultValue={data.medical.bloodGroup} />
                <Input label="Notes" defaultValue={data.medical.notes} />
                <Button size="sm" variant="secondary">
                  Save Medical Notes
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <Card title="GPA Trend" description="Trend across recent academic terms.">
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
            </Card>
            <Card title="Current Academic Snapshot" description="Overview of the student's current study context.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Class</p>
                  <p className="mt-2 font-semibold text-brand-navy">{data.className}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Subject List</p>
                  <p className="mt-2">Mathematics, English, Science, ICT, Social Studies</p>
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
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">46</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Absent Days</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">3</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Attendance Rate</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">93%</p>
                </div>
              </div>
            </Card>
            <Card title="Calendar Heatmap" description="Recent attendance markers by date.">
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
                  Payment reminders are recommended before the next fee checkpoint.
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
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Merit Points</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">18</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Demerit Points</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">2</p>
                </div>
                <div className="surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Behavior Score</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">A-</p>
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
