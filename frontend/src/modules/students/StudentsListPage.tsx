import { useMemo, useState } from 'react';
import { Download, MessageSquare, Printer, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';
import { type StudentListItem, useStudents } from './hooks/useStudents';

const StudentsListPage = () => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [className, setClassName] = useState('all');
  const [status, setStatus] = useState('all');

  const filters = useMemo(
    () => ({
      search,
      level,
      className,
      status,
    }),
    [className, level, search, status]
  );

  const { data, isLoading } = useStudents(filters);
  const rows = (data || []) as StudentListItem[];
  const classes = Array.from(new Set(rows.map((row) => row.className)));

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage active student records, enrollment status, class placement, and communication workflows."
        actions={
          <Link to="/students/enroll">
            <Button leftIcon={<UserPlus className="h-4 w-4" />}>Enroll Student</Button>
          </Link>
        }
      />

      <Card title="Filters" description="Refine the student register by level, class, status, and search terms.">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <SearchInput placeholder="Search name or student number" onDebouncedChange={setSearch} />
          <Select label="Education Level" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">All levels</option>
            <option value="DC">Day Care</option>
            <option value="PR">Primary</option>
            <option value="JH">Junior High</option>
            <option value="SH">Senior High</option>
            <option value="TR">Tertiary</option>
          </Select>
          <Select label="Class" value={className} onChange={(event) => setClassName(event.target.value)}>
            <option value="all">All classes</option>
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
          Export CSV
        </Button>
        <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />}>
          Print List
        </Button>
        <Button variant="secondary" leftIcon={<MessageSquare className="h-4 w-4" />}>
          Bulk SMS
        </Button>
      </div>

      {rows.length ? (
        <Table<StudentListItem>
          title="Student Register"
          data={rows}
          selectable
          columns={[
            {
              header: 'Student',
              cell: ({ row }) => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.original.name} src={row.original.photo} />
                  <div>
                    <Link
                      to={`/students/${row.original.id}`}
                      className="font-semibold text-brand-navy hover:underline"
                    >
                      {row.original.name}
                    </Link>
                    <p className="text-xs text-slate-500">{row.original.guardian}</p>
                  </div>
                </div>
              ),
            },
            { header: 'Student Number', accessorKey: 'student_number' },
            { header: 'Class', accessorKey: 'className' },
            {
              header: 'Level',
              cell: ({ row }) => <Badge variant="info">{row.original.level}</Badge>,
            },
            {
              header: 'Status',
              cell: ({ row }) => (
                <Badge
                  variant={
                    row.original.status === 'active'
                      ? 'success'
                      : row.original.status === 'pending'
                        ? 'warning'
                        : 'inactive'
                  }
                >
                  {row.original.status}
                </Badge>
              ),
            },
            {
              header: 'Actions',
              cell: ({ row }) => (
                <div className="flex gap-2">
                  <Link to={`/students/${row.original.id}`}>
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  </Link>
                  <Link to={`/students/${row.original.id}/id-card`}>
                    <Button size="sm">ID Card</Button>
                  </Link>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="No students matched the current filters"
          message="Adjust the search or filter values to see more records."
        />
      )}
    </div>
  );
};

export default StudentsListPage;
