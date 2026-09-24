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
  tertiary?: {
    faculty_id?: string | null;
    faculty_name?: string | null;
    department_id?: string | null;
    department_name?: string | null;
    program_id?: string | null;
    program_name?: string | null;
    credential?: string | null;
    duration?: string | null;
    can_progress?: boolean | null;
    fee_clearance?: boolean | null;
    outstanding_resit_codes?: string[];
    current_level?: {
      id: string;
      name: string;
      code: string;
    } | null;
    current_period?: {
      id: string;
      name: string;
      status: string;
    } | null;
    roadmap?: {
      level_count: number;
      total_courses: number;
      levels: Array<{
        id: string;
        name: string;
        code: string;
        periods: Array<{
          id: string;
          name: string;
          sequence: number;
          status: string;
          courses: Array<{
            id: string;
            code: string;
            name: string;
            credit_hours: number | null;
            is_core: boolean;
            prerequisite_codes: string[];
          }>;
        }>;
      }>;
    } | null;
  } | null;
}

export const useStudent = (studentId?: string) =>
  useQuery({
    queryKey: ['student', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => (await eduovaApi.students.detail(studentId as string)) as StudentDetail,
  });
