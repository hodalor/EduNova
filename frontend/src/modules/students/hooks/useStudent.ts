import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../../api/eduovaApi';

export interface StudentDetail {
  id: string;
  name: string;
  student_number: string;
  className: string;
  level: string;
  status: string;
  guardian: {
    name: string;
    phone: string;
    relation: string;
  };
  medical: {
    allergies: string;
    bloodGroup: string;
    notes: string;
  };
  academicTrend: Array<{
    term: string;
    gpa: number;
  }>;
  attendanceCalendar: Array<{
    date: string;
    value: number;
  }>;
  invoices: Array<{
    invoice_number: string;
    total: number;
    paid: number;
    balance: number;
    status: string;
  }>;
  discipline: Array<{
    id: string;
    category: string;
    points: number;
    date: string;
    status: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export const useStudent = (studentId?: string) =>
  useQuery({
    queryKey: ['student', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => (await eduovaApi.students.detail(studentId || 'stu-001')) as StudentDetail,
  });
