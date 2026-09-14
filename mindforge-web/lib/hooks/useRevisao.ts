"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { RevisaoDetalhe, RevisaoItem } from "@/types/api";

const REVISAO_KEY = "revisao";

export function useRevisoes(perfilId: string | null, data?: string) {
  return useQuery({
    queryKey: [REVISAO_KEY, perfilId, data],
    queryFn: async () => {
      if (!perfilId) {
        return [] as RevisaoItem[];
      }
      const { data: response } = await api.get<RevisaoItem[]>(
        "/exercicios-avaliacoes/revisao",
        {
          params: { perfilId, ...(data ? { data } : {}) },
        },
      );
      return response;
    },
    enabled: !!perfilId,
  });
}

export function useRevisaoDetalhe(id: string | null, perfilId: string) {
  return useQuery({
    queryKey: [REVISAO_KEY, perfilId, "detalhe", id],
    queryFn: async () => {
      const { data } = await api.get<RevisaoDetalhe>(
        `/exercicios-avaliacoes/revisao/${id}`,
        {
          params: { perfilId },
        },
      );
      return data;
    },
    enabled: !!id && !!perfilId,
  });
}

export function useConcluirRevisao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      perfilId: string;
      qualidade: number;
      proximaRevisaoEsperada: string;
    }) => {
      const { data } = await api.post<RevisaoItem>(
        `/exercicios-avaliacoes/revisao/${id}/concluir`,
        input,
      );
      return data;
    },
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: [REVISAO_KEY, input.perfilId],
      });
    },
  });
}
