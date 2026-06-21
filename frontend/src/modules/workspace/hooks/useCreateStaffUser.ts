import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../../api/eduovaApi';

export const useCreateStaffUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eduovaApi.users.create,
    onSuccess: () => {
      toast.success('User account created successfully.');
      void queryClient.invalidateQueries({ queryKey: ['user-management-users'] });
    },
    onError: () => {
      toast.error('Unable to create user account.');
    },
  });
};
