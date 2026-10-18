'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';

/**
 * Logs out, then goes to the login page. `onLeave` runs first, so the page doesn't react to its own
 * 401 by redirecting with a returnTo.
 */
export function useLogout(onLeave?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      onLeave?.();
      router.replace('/login');
      queryClient.clear();
    },
  });
}
