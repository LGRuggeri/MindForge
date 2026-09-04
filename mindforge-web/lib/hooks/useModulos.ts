'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modulo, CriarProgressoModuloInput } from '@/types/api';

const MODULOS_KEY = 'modulos';

export function useModulo(id: string | null) {
  return useQuery({
    queryKey: [MODULOS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Modulo>(`/planner/modulos/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMarcarProgressoModulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CriarProgressoModuloInput) => {
      const { data } = await api.post('/knowledge-graph/progresso/modulo', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MODULOS_KEY, variables.moduloId] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-graph'] });
    },
  });
}
