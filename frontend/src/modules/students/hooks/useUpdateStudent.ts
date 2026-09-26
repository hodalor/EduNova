import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../../api/eduovaApi';
import { getApiErrorMessage } from '../../../api/axiosInstance';

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => eduovaApi.students.update(payload),
    onMutate: async (payload: unknown) => {
      await queryClient.cancelQueries({ queryKey: ['student'] });
      return { payload };
    },
    onSuccess: () => {
      toast.success('Student record updated.');
      void queryClient.invalidateQueries({ queryKey: ['student'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: unknown) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update student record. Review the profile details and try again.')
      );
    },
  });
};
