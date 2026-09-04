'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Perfil, CriarPerfilInput } from '@/types/api';

const PERFIS_KEY = 'perfis';

export function usePerfis() {
  return useQuery({
    queryKey: [PERFIS_KEY],
    queryFn: async () => {
      const { data } = await api.get<Perfil[]>('/perfis');
      return data;
    },
  });
}

export function usePerfil(id: string | null) {
  return useQuery({
    queryKey: [PERFIS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Perfil>(`/perfis/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCriarPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CriarPerfilInput) => {
      const { data } = await api.post<Perfil>('/perfis', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERFIS_KEY] });
    },
  });
}
