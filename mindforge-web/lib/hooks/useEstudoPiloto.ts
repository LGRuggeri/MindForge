"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PilotoLibras {
  codigo: string;
  titulo: string;
  revisadoEm: string;
  limites: string;
  totalQuestoes: number;
  totalQuestoesAvaliacao: number;
  matriz: {
    id: string;
    assunto: string;
    aulaCodigo: string;
    aulaTitulo: string;
  }[];
  aulas: {
    codigo: string;
    itensEdital: string[];
    titulo: string;
    objetivoAprendizagem: string;
    tempoEstimadoMin: number;
    corpoMarkdown: string;
    totalQuestoes: number;
    fontes: { titulo: string; url: string; localizador: string }[];
  }[];
}
export interface PilotoInstalado {
  perfilId: string;
  objetivoId: string;
  trilhaId: string;
  avaliacaoId: string;
  criado: boolean;
  indexacao: "enfileirada" | "pendente" | "existente";
  modulos: { id: string; titulo: string }[];
}
export function usePilotoLibras() {
  return useQuery({
    queryKey: ["estudo-piloto", "libras"],
    queryFn: async () =>
      (await api.get<PilotoLibras>("/estudo-piloto/libras")).data,
  });
}
export function useInstalarPiloto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (perfilId: string) =>
      (
        await api.post<PilotoInstalado>("/estudo-piloto/libras/instalar", {
          perfilId,
        })
      ).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["objetivos"] });
    },
  });
}
