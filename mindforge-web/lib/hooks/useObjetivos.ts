'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Objetivo, CriarObjetivoInput } from '@/types/api';

const OBJETIVOS_KEY = 'objetivos';

export function useObjetivos(perfilId: string | null) {
  return useQuery({
    queryKey: [OBJETIVOS_KEY, perfilId],
    queryFn: async () => {
      const { data } = await api.get<Objetivo[]>(`/planner/perfis/${perfilId}/objetivos`);
      return data;
    },
    enabled: !!perfilId,
  });
}

export function useObjetivo(id: string | null) {
  return useQuery({
    queryKey: [OBJETIVOS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Objetivo>(`/planner/objetivos/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCriarObjetivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CriarObjetivoInput) => {
      const { data } = await api.post<Objetivo>('/planner/objetivos', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [OBJETIVOS_KEY, variables.perfilId] });
    },
  });
}
