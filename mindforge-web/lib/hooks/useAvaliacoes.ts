'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Avaliacao, CriarAvaliacaoInput, SubmeterAvaliacaoInput } from '@/types/api';

const AVALIACOES_KEY = 'avaliacoes';

export function useCriarAvaliacao() {
  return useMutation({
    mutationFn: async (input: CriarAvaliacaoInput) => {
      const { data } = await api.post<Avaliacao>('/exercicios-avaliacoes/avaliacoes', input);
      return data;
    },
  });
}

export function useAvaliacao(id: string | null) {
  return useQuery({
    queryKey: [AVALIACOES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Avaliacao>(`/exercicios-avaliacoes/avaliacoes/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSubmeterAvaliacao() {
  return useMutation({
    mutationFn: async (input: SubmeterAvaliacaoInput) => {
      const { data } = await api.post('/exercicios-avaliacoes/avaliacoes/submeter', input);
      return data;
    },
  });
}
