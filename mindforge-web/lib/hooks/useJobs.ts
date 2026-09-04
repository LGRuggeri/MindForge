'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Job } from '@/types/api';

const JOBS_KEY = 'jobs';

export function useJob(
  nome: string | null,
  id: string | null,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: [JOBS_KEY, nome, id],
    queryFn: async () => {
      const { data } = await api.get<Job>(`/jobs/${nome}/${id}`);
      return data;
    },
    enabled: !!nome && !!id,
    refetchInterval: options?.refetchInterval ?? 2000,
  });
}
