'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrilhaComModulos, GerarTrilhaInput, ProgramaTrilha } from '@/types/api';

const TRILHAS_KEY = 'trilhas';

export function useProgramasTrilha() {
  return useQuery({
    queryKey: ['programas-trilha'],
    queryFn: async () => {
      const { data } = await api.get<ProgramaTrilha[]>('/planner/programas');
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useGerarTrilha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GerarTrilhaInput) => {
      const { data } = await api.post<TrilhaComModulos>('/planner/trilhas', input);
      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: [TRILHAS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['objetivos', input.objetivoId] });
    },
  });
}
