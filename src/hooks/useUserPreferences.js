import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserPreferences, updateUserPreferences } from '../services/apiUserPreferences';
import { useAuth } from '../features/auth/AuthContext';

// Hook to fetch user preferences
export function useUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: getUserPreferences,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to update user preferences
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['user-preferences', user?.id], data);
    },
    onError: (error) => {
      console.error('Error updating preferences:', error);
    },
  });
}

// Hook to get specific preference value
export function usePreference(preferencePath) {
  const { data: preferences } = useUserPreferences();

  if (!preferences) return null;

  const keys = preferencePath.split('.');
  let value = preferences;

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}

// Hook to update specific preference
export function useUpdatePreference(preferencePath) {
  const { mutate: updatePreferences } = useUpdateUserPreferences();

  return (newValue) => {
    updatePreferences({
      [preferencePath]: newValue,
    });
  };
}
