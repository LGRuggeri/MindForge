'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RevisaoItem } from '@/types/api';

const REVISAO_KEY = 'revisao';

export function useRevisoes(data?: string) {
  return useQuery({
    queryKey: [REVISAO_KEY, data],
    queryFn: async () => {
      const { data: response } = await api.get<RevisaoItem[]>('/exercicios-avaliacoes/revisao', {
        params: data ? { data } : undefined,
      });
      return response;
    },
  });
}
