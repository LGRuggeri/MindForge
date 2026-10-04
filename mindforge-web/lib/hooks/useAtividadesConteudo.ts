"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AtividadeConteudo, RespostaAtividade } from "@/types/api";

export function useAtividadesConteudo(
  conteudoId: string,
  perfilId: string | null,
) {
  return useQuery({
    queryKey: ["atividades-conteudo", conteudoId, perfilId],
    enabled: !!perfilId,
    queryFn: async () => {
      const { data } = await api.get<AtividadeConteudo[]>(
        `/atividades-conteudo/conteudos/${conteudoId}`,
        { params: { perfilId } },
      );
      return data;
    },
  });
}

export function useSalvarRespostaAtividade() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conteudoId: string;
      chave: string;
      perfilId: string;
      resposta: string;
    }) => {
      const { data } = await api.put<RespostaAtividade>(
        `/atividades-conteudo/conteudos/${input.conteudoId}/${input.chave}`,
        { perfilId: input.perfilId, resposta: input.resposta },
      );
      return data;
    },
    onSuccess: (_data, input) =>
      client.invalidateQueries({
        queryKey: ["atividades-conteudo", input.conteudoId, input.perfilId],
      }),
  });
}
