'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CriarProjetoInput,
  GerarProjetoInput,
  Projeto,
  ProjetoEntrega,
  SubmeterEntregaInput,
} from '@/types/api';

const PROJETOS_KEY = 'projetos';

export function useProjetos(moduloId: string | null, objetivoId: string | null) {
  return useQuery({
    queryKey: [PROJETOS_KEY, moduloId, objetivoId],
    queryFn: async () => {
      const { data } = await api.get<Projeto[]>('/projetos', {
        params: { moduloId, objetivoId },
      });
      return data;
    },
    enabled: !!moduloId || !!objetivoId,
  });
}

export function useProjeto(id: string | null) {
  return useQuery({
    queryKey: [PROJETOS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Projeto>(`/projetos/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCriarProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CriarProjetoInput) => {
      const { data } = await api.post<Projeto>('/projetos', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJETOS_KEY, variables.moduloId, null] });
      queryClient.invalidateQueries({ queryKey: [PROJETOS_KEY, null, variables.objetivoId] });
    },
  });
}

export function useGerarProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GerarProjetoInput) => {
      const { data } = await api.post<Projeto>('/projetos/gerar', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJETOS_KEY, variables.moduloId, null] });
      queryClient.invalidateQueries({ queryKey: [PROJETOS_KEY, null, variables.objetivoId] });
    },
  });
}

export function useSubmeterEntrega() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { projetoId: string; data: SubmeterEntregaInput; perfilId?: string }) => {
      const { data } = await api.post<ProjetoEntrega>(
        `/projetos/${input.projetoId}/entregas`,
        input.data,
        { params: { perfilId: input.perfilId } },
      );
      return data;
    },
    onSuccess: () => {
      // A submissão muda a lista (status da última entrega) e o detalhe;
      // invalidar o prefixo inteiro evita lista stale com TTL de 5 minutos.
      queryClient.invalidateQueries({ queryKey: [PROJETOS_KEY] });
    },
  });
}

export function useConcluirProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projetoId: string) => {
      const { data } = await api.post<Projeto>(`/projetos/${projetoId}/concluir`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJETOS_KEY] });
    },
  });
}
