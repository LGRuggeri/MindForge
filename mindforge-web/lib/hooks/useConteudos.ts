'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Conteudo, GerarConteudoInput } from '@/types/api';

const CONTEUDOS_KEY = 'conteudos';

export function useConteudos(moduloId: string | null) {
  return useQuery({
    queryKey: [CONTEUDOS_KEY, moduloId],
    queryFn: async () => {
      const { data } = await api.get<Conteudo[]>(`/synthesizer/modulos/${moduloId}/conteudos`);
      return data;
    },
    enabled: !!moduloId,
  });
}

export function useGerarConteudo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GerarConteudoInput) => {
      const { data } = await api.post<Conteudo & { jobId?: string; status?: string }>(
        '/synthesizer/conteudos',
        input,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CONTEUDOS_KEY, variables.moduloId] });
    },
  });
}
