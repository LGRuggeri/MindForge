'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RevisaoItem } from '@/types/api';

const REVISAO_KEY = 'revisao';

export function useRevisoes(perfilId: string | null, data?: string) {
  return useQuery({
    queryKey: [REVISAO_KEY, perfilId, data],
    queryFn: async () => {
      if (!perfilId) {
        return [] as RevisaoItem[];
      }
      const { data: response } = await api.get<RevisaoItem[]>('/exercicios-avaliacoes/revisao', {
        params: { perfilId, ...(data ? { data } : {}) },
      });
      return response;
    },
    enabled: !!perfilId,
  });
}
