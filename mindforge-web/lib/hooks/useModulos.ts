"use client";

import { useMemo } from "react";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Modulo, Objetivo, CriarProgressoModuloInput } from "@/types/api";
import { useObjetivos } from "./useObjetivos";

const MODULOS_KEY = "modulos";
const OBJETIVOS_KEY = "objetivos";

export interface ModuloComObjetivo {
  modulo: Modulo;
  objetivoTitulo: string;
}

export interface GrupoTrilha {
  trilhaId: string;
  titulo: string;
  objetivoTitulo: string;
  modulos: Modulo[];
}

export function useModulosDoPerfil(perfilId: string | null) {
  const { data: objetivos, isLoading: objetivosLoading } =
    useObjetivos(perfilId);
  const detalhes = useQueries({
    queries: (objetivos ?? []).map((objetivo) => ({
      queryKey: [OBJETIVOS_KEY, objetivo.id],
      queryFn: async () => {
        const { data } = await api.get<Objetivo>(
          `/planner/objetivos/${objetivo.id}`,
        );
        return data;
      },
      enabled: !!perfilId,
    })),
  });

  const isLoading =
    objetivosLoading || detalhes.some((query) => query.isLoading);

  const { data, grupos } = useMemo<{
    data: ModuloComObjetivo[];
    grupos: GrupoTrilha[];
  }>(() => {
    const vistos = new Set<string>();
    const lista: ModuloComObjetivo[] = [];
    const gruposPorTrilha = new Map<string, GrupoTrilha>();
    for (const query of detalhes) {
      const objetivo = query.data;
      if (!objetivo) continue;
      for (const trilha of objetivo.trilhas ?? []) {
        // Trilhas substituídas (replanejamento) não oferecem módulos —
        // versões antigas ficam no histórico do objetivo, não no seletor.
        if (trilha.status === "substituida") continue;
        const modulos = trilha.modulos ?? [];
        gruposPorTrilha.set(trilha.id, {
          trilhaId: trilha.id,
          titulo:
            trilha.versao > 1
              ? `${objetivo.titulo} · v${trilha.versao}`
              : objetivo.titulo,
          objetivoTitulo: objetivo.titulo,
          modulos,
        });
        for (const modulo of modulos) {
          if (vistos.has(modulo.id)) continue;
          vistos.add(modulo.id);
          lista.push({ modulo, objetivoTitulo: objetivo.titulo });
        }
      }
    }
    return { data: lista, grupos: [...gruposPorTrilha.values()] };
  }, [detalhes]);

  return { data, grupos, isLoading };
}

export function useModulo(id: string | null) {
  return useQuery({
    queryKey: [MODULOS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Modulo>(`/planner/modulos/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMarcarProgressoModulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CriarProgressoModuloInput) => {
      const { data } = await api.post<Modulo>(
        `/planner/modulos/${input.moduloId}/concluir`,
        { perfilId: input.perfilId },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [MODULOS_KEY, variables.moduloId],
      });
      queryClient.invalidateQueries({ queryKey: [OBJETIVOS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
    },
  });
}
