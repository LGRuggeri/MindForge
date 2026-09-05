'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RegistroDiario, RegistrarDiarioInput, RegistroDiarioComRecomendacoes } from '@/types/api';

const DIARIO_KEY = 'diario';

export function useDiario(perfilId: string | null) {
  return useQuery({
    queryKey: [DIARIO_KEY, perfilId],
    queryFn: async () => {
      const { data } = await api.get<RegistroDiario[]>(`/diario/perfis/${perfilId}`);
      return data;
    },
    enabled: !!perfilId,
  });
}

export function useRegistrarDiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegistrarDiarioInput) => {
      const { data } = await api.post<RegistroDiarioComRecomendacoes>('/diario', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DIARIO_KEY, variables.perfilId] });
    },
  });
}
