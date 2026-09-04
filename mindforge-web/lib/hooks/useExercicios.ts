'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Exercicio, GerarExercicioInput, SubmeterTentativaInput, Tentativa } from '@/types/api';

const EXERCICIOS_KEY = 'exercicios';

export function useExercicios(moduloId: string | null) {
  return useQuery({
    queryKey: [EXERCICIOS_KEY, moduloId],
    queryFn: async () => {
      const { data } = await api.get<Exercicio[]>(`/exercicios-avaliacoes/exercicios`, {
        params: { moduloId },
      });
      return data;
    },
    enabled: !!moduloId,
  });
}

export function useGerarExercicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GerarExercicioInput) => {
      const { data } = await api.post<Exercicio & { jobId?: string; status?: string }>(
        '/exercicios-avaliacoes/exercicios/gerar',
        input,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [EXERCICIOS_KEY, variables.moduloId] });
    },
  });
}

export function useSubmeterTentativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmeterTentativaInput) => {
      const { data } = await api.post<Tentativa>(
        `/exercicios-avaliacoes/exercicios/${input.exercicioId}/tentativas`,
        input,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [EXERCICIOS_KEY, variables.exercicioId] });
    },
  });
}
