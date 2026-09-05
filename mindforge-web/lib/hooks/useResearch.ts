'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Fonte, PesquisarFontesInput, RespostaPesquisa } from '@/types/api';

const RESEARCH_KEY = 'research';

export function usePesquisarFontes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PesquisarFontesInput) => {
      const { data } = await api.post<RespostaPesquisa>('/research/fontes', input);
      return data;
    },
    onSuccess: (resposta) => {
      queryClient.invalidateQueries({ queryKey: [RESEARCH_KEY, 'fontes', resposta.moduloId] });
    },
  });
}

export function useFontesModulo(moduloId: string | null) {
  return useQuery({
    queryKey: [RESEARCH_KEY, 'fontes', moduloId],
    queryFn: async () => {
      const { data } = await api.get<Fonte[]>(`/research/modulos/${moduloId}/fontes`);
      return data;
    },
    enabled: !!moduloId,
  });
}
