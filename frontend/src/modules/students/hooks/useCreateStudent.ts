import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../../api/eduovaApi';
import { getApiErrorMessage } from '../../../api/axiosInstance';

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eduovaApi.students.create,
    onSuccess: () => {
      toast.success('Student enrollment submitted successfully.');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: unknown) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Unable to create student enrollment. Check the highlighted details and try again.'
        )
      );
    },
  });
};
