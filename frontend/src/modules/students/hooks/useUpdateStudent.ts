import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../../api/eduovaApi';

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eduovaApi.students.update,
    onMutate: async (payload: unknown) => {
      await queryClient.cancelQueries({ queryKey: ['student'] });
      return { payload };
    },
    onSuccess: () => {
      toast.success('Student record updated.');
      void queryClient.invalidateQueries({ queryKey: ['student'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: () => {
      toast.error('Unable to update student record.');
    },
  });
};
