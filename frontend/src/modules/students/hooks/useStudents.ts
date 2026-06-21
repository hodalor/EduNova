import { useQuery } from '@tanstack/react-query';

import { eduovaApi } from '../../../api/eduovaApi';

export interface StudentsFilters {
  level?: string;
  className?: string;
  status?: string;
  search?: string;
}

export interface StudentListItem {
  id: string;
  name: string;
  student_number: string;
  className: string;
  level: string;
  status: string;
  photo: string;
  guardian: string;
}

export const useStudents = (filters: StudentsFilters) =>
  useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      const rows = (await eduovaApi.students.list()) as StudentListItem[];
      return rows.filter((row) => {
        const matchesLevel = !filters.level || filters.level === 'all' || row.level === filters.level;
        const matchesClass =
          !filters.className || filters.className === 'all' || row.className === filters.className;
        const matchesStatus =
          !filters.status || filters.status === 'all' || row.status === filters.status;
        const query = filters.search?.trim().toLowerCase();
        const matchesSearch =
          !query ||
          row.name.toLowerCase().includes(query) ||
          row.student_number.toLowerCase().includes(query);

        return matchesLevel && matchesClass && matchesStatus && matchesSearch;
      });
    },
  });
