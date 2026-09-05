import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Mock } from 'vitest';
import { api } from '@/lib/api';
import { useModulosDoPerfil } from './useModulos';
import { criarQueryClientTeste } from '@/test/utils';
import type { Modulo, Objetivo } from '@/types/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const apiGet = api.get as unknown as Mock;

const moduloAtual: Modulo = {
  id: 'mod-atual',
  trilhaId: 'trilha-atual',
  ordem: 1,
  titulo: 'Módulo atual',
  objetivoAprendizagem: 'Conteúdo da trilha ativa',
  tempoEstimadoMin: 30,
  prerequisitos: null,
  criadoEm: '2026-09-01T00:00:00Z',
};

const moduloObsoleto: Modulo = {
  ...moduloAtual,
  id: 'mod-obsoleto',
  trilhaId: 'trilha-antiga',
  titulo: 'Módulo de trilha substituída',
};

const objetivoResumido: Objetivo = {
  id: 'obj-1',
  perfilId: 'perfil-1',
  titulo: 'Aprender NestJS',
  descricao: null,
  nivelDesejado: null,
  prazoEstimado: null,
  criadoEm: '2026-09-01T00:00:00Z',
};

const objetivoDetalhe: Objetivo = {
  ...objetivoResumido,
  trilhas: [
    {
      id: 'trilha-antiga',
      objetivoId: 'obj-1',
      versao: 1,
      status: 'substituida',
      criadoEm: '2026-09-01T00:00:00Z',
      modulos: [moduloObsoleto],
    },
    {
      id: 'trilha-atual',
      objetivoId: 'obj-1',
      versao: 2,
      status: 'ativa',
      criadoEm: '2026-09-03T00:00:00Z',
      modulos: [moduloAtual],
    },
  ],
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={criarQueryClientTeste()}>{children}</QueryClientProvider>
  );
}

describe('useModulosDoPerfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation((url: string) => {
      if (url === '/planner/perfis/perfil-1/objetivos') {
        return Promise.resolve({ data: [objetivoResumido] });
      }
      if (url === '/planner/objetivos/obj-1') {
        return Promise.resolve({ data: objetivoDetalhe });
      }
      return Promise.reject(new Error(`URL não mapeada no teste: ${url}`));
    });
  });

  it('exclui módulos de trilhas substituídas do resultado', async () => {
    const { result } = renderHook(() => useModulosDoPerfil('perfil-1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data.map((item) => item.modulo.id)).toEqual(['mod-atual']);
    expect(result.current.data[0].objetivoTitulo).toBe('Aprender NestJS');
  });

  it('retorna lista vazia sem perfil', async () => {
    const { result } = renderHook(() => useModulosDoPerfil(null), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(apiGet).not.toHaveBeenCalled();
  });
});
