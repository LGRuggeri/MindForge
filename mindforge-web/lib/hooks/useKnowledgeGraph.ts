'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Competencia, CompetenciaGrafo, GrafoVisual } from '@/types/api';

const KNOWLEDGE_GRAPH_KEY = 'knowledge-graph';

export function useCompetencias() {
  return useQuery({
    queryKey: [KNOWLEDGE_GRAPH_KEY, 'competencias'],
    queryFn: async () => {
      const { data } = await api.get<Competencia[]>('/knowledge-graph/competencias');
      return data;
    },
  });
}

export function useCompetencia(id: string | null, perfilId?: string | null) {
  return useQuery({
    queryKey: [KNOWLEDGE_GRAPH_KEY, 'competencias', id, perfilId],
    queryFn: async () => {
      const { data } = await api.get<CompetenciaGrafo>(`/knowledge-graph/competencias/${id}`, {
        params: perfilId ? { perfilId } : {},
      });
      return data;
    },
    enabled: !!id,
  });
}

export function useGrafoDoPerfil(perfilId: string | null) {
  return useQuery({
    queryKey: [KNOWLEDGE_GRAPH_KEY, 'perfil', perfilId],
    queryFn: async () => {
      const { data } = await api.get<CompetenciaGrafo[]>(`/knowledge-graph/perfis/${perfilId}`);
      return data;
    },
    enabled: !!perfilId,
  });
}

export function useGrafoVisual(perfilId: string | null) {
  return useQuery({
    queryKey: [KNOWLEDGE_GRAPH_KEY, 'visual', perfilId],
    queryFn: async () => {
      const { data } = await api.get<GrafoVisual>(`/knowledge-graph/perfis/${perfilId}/grafo`);
      return data;
    },
    enabled: !!perfilId,
  });
}

export function useProximosPassos(perfilId: string | null) {
  return useQuery({
    queryKey: [KNOWLEDGE_GRAPH_KEY, 'proximos', perfilId],
    queryFn: async () => {
      const { data } = await api.get<CompetenciaGrafo[]>(
        `/knowledge-graph/perfis/${perfilId}/proximos`,
      );
      return data;
    },
    enabled: !!perfilId,
  });
}

export function useCriarCompetencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string; categoria?: string }) => {
      const { data } = await api.post<Competencia>('/knowledge-graph/competencias', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KNOWLEDGE_GRAPH_KEY, 'competencias'] });
    },
  });
}
