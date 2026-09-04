'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Duvida, TirarDuvidaInput, AvaliarDuvidaInput } from '@/types/api';

const TUTOR_KEY = 'tutor';

export function useHistoricoTutor(perfilId: string | null) {
  return useQuery({
    queryKey: [TUTOR_KEY, 'historico', perfilId],
    queryFn: async () => {
      const { data } = await api.get<Duvida[]>(`/tutor/perfis/${perfilId}/historico`);
      return data;
    },
    enabled: !!perfilId,
  });
}

export function useTirarDuvida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TirarDuvidaInput) => {
      const { data } = await api.post<Duvida>('/tutor/duvidas', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TUTOR_KEY, 'historico', variables.perfilId] });
    },
  });
}

export function useAvaliarDuvida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AvaliarDuvidaInput) => {
      const { data } = await api.post<Duvida>(`/tutor/duvidas/${input.duvidaId}/avaliar`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TUTOR_KEY] });
    },
  });
}
