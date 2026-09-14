"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Avaliacao,
  ConsultaResultadoAvaliacao,
  CriarAvaliacaoInput,
  ResultadoAvaliacao,
  SubmeterAvaliacaoInput,
} from "@/types/api";

const AVALIACOES_KEY = "avaliacoes";
const chaveResultado = (id: string, perfilId: string) => [
  AVALIACOES_KEY,
  id,
  "resultado",
  perfilId,
];

export function useCriarAvaliacao() {
  return useMutation({
    mutationFn: async (input: CriarAvaliacaoInput) => {
      const { data } = await api.post<Avaliacao>(
        "/exercicios-avaliacoes/avaliacoes",
        input,
      );
      return data;
    },
  });
}

export function useAvaliacao(id: string | null) {
  return useQuery({
    queryKey: [AVALIACOES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Avaliacao>(
        `/exercicios-avaliacoes/avaliacoes/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useSubmeterAvaliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmeterAvaliacaoInput) => {
      const { data } = await api.post<ResultadoAvaliacao>(
        "/exercicios-avaliacoes/avaliacoes/submeter",
        input,
      );
      return data;
    },
    onSuccess: async (resultado, { avaliacaoId, perfilId }) => {
      const queryKey = chaveResultado(avaliacaoId, perfilId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<ConsultaResultadoAvaliacao>(queryKey, {
        resultado,
      });
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["revisao", perfilId] });
      void queryClient.invalidateQueries({
        queryKey: ["knowledge-graph"],
      });
    },
  });
}

export function useResultadoAvaliacao(id: string, perfilId: string) {
  return useQuery({
    queryKey: chaveResultado(id, perfilId),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<ConsultaResultadoAvaliacao>(
        `/exercicios-avaliacoes/avaliacoes/${id}/resultado`,
        { params: { perfilId }, signal },
      );
      return data;
    },
    enabled: !!id && !!perfilId,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
