import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { Objetivo } from '@/types/api';
import ObjetivosPage from './page';
import { renderComQuery } from '@/test/utils';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const apiGet = api.get as unknown as Mock;
const apiDelete = api.delete as unknown as Mock;

const objetivo: Objetivo = {
  id: 'obj-1',
  perfilId: 'perfil-1',
  titulo: 'Aprender TypeScript',
  descricao: 'Do zero ao avançado',
  nivelDesejado: 'intermediario',
  prazoEstimado: null,
  criadoEm: '2026-09-01T00:00:00Z',
};

describe('Página de Objetivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    apiGet.mockImplementation((url: string) => {
      if (url === '/planner/perfis/perfil-1/objetivos') {
        return Promise.resolve({ data: [objetivo] });
      }
      return Promise.reject(new Error(`URL não mapeada no teste: ${url}`));
    });
  });

  it('exclui o objetivo após confirmação no dialog', async () => {
    // Após a exclusão, a lista volta vazia (invalidação de cache).
    apiDelete.mockResolvedValue({ data: undefined });
    apiGet.mockImplementation((url: string) => {
      if (url === '/planner/perfis/perfil-1/objetivos') {
        return Promise.resolve({ data: apiDelete.mock.calls.length > 0 ? [] : [objetivo] });
      }
      return Promise.reject(new Error(`URL não mapeada no teste: ${url}`));
    });

    const user = userEvent.setup();
    renderComQuery(<ObjetivosPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Excluir objetivo Aprender TypeScript' }),
    );
    expect(await screen.findByText('Excluir objetivo?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/planner/objetivos/obj-1'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Objetivo excluído'),
    );
    await waitFor(() =>
      expect(screen.queryByText('Aprender TypeScript')).not.toBeInTheDocument(),
    );
  });

  it('não exclui nada ao cancelar o dialog', async () => {
    const user = userEvent.setup();
    renderComQuery(<ObjetivosPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Excluir objetivo Aprender TypeScript' }),
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(apiDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Excluir objetivo?')).not.toBeInTheDocument();
    expect(screen.getByText('Aprender TypeScript')).toBeInTheDocument();
  });

  it('exibe erro quando a exclusão falha', async () => {
    apiDelete.mockRejectedValue(new Error('Objetivo vinculado a um projeto ativo'));

    const user = userEvent.setup();
    renderComQuery(<ObjetivosPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Excluir objetivo Aprender TypeScript' }),
    );
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Objetivo vinculado a um projeto ativo'),
    );
    // Dialog permanece aberto para o usuário tentar novamente.
    expect(screen.getByText('Excluir objetivo?')).toBeInTheDocument();
  });
});
