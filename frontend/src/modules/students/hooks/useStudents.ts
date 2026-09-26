import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../../api/eduovaApi';
import { useAuthStore } from '../../../store/authStore';

export interface StudentsFilters {
  level?: string;
  className?: string;
  program?: string;
  status?: string;
  search?: string;
}

export interface StudentListItem {
  id: string;
  name: string;
  student_number: string;
  className: string;
  program_name?: string | null;
  level: string;
  status: string;
  photo: string;
  guardian: string;
}

export const useStudents = (filters: StudentsFilters) => {
  const query = useQuery<StudentListItem[]>({
    queryKey: [
      'students',
      useAuthStore.getState().tenantContext?.id || useAuthStore.getState().institution?.id || null,
    ],
    queryFn: async () => {
      return (await eduovaApi.students.list()) as StudentListItem[];
    },
  });

  const data = useMemo(() => {
    const rows: StudentListItem[] = query.data || [];
    return rows.filter((row: StudentListItem) => {
      const matchesLevel = !filters.level || filters.level === 'all' || row.level === filters.level;
      const matchesClass =
        !filters.className || filters.className === 'all' || row.className === filters.className;
      const matchesProgram =
        !filters.program ||
        filters.program === 'all' ||
        String(row.program_name || '').trim() === filters.program;
      const matchesStatus =
        !filters.status || filters.status === 'all' || row.status === filters.status;
      const searchQuery = filters.search?.trim().toLowerCase();
      const matchesSearch =
        !searchQuery ||
        row.name.toLowerCase().includes(searchQuery) ||
        row.student_number.toLowerCase().includes(searchQuery) ||
        String(row.className || '')
          .toLowerCase()
          .includes(searchQuery) ||
        String(row.program_name || '')
          .toLowerCase()
          .includes(searchQuery);

      return matchesLevel && matchesClass && matchesProgram && matchesStatus && matchesSearch;
    });
  }, [filters.className, filters.level, filters.program, filters.search, filters.status, query.data]);

  return {
    ...query,
    allRows: (query.data || []) as StudentListItem[],
    data,
  };
};
