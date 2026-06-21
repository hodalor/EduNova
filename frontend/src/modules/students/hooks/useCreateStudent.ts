import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../../api/eduovaApi';

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eduovaApi.students.create,
    onSuccess: () => {
      toast.success('Student enrollment submitted successfully.');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: () => {
      toast.error('Unable to create student enrollment.');
    },
  });
};
