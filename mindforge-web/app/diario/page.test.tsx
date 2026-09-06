import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import DiarioPage from './page';
import { renderComQuery } from '@/test/utils';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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
const apiPost = api.post as unknown as Mock;

function mapearUrls() {
  apiGet.mockImplementation((url: string) => {
    if (url.startsWith('/diario/perfis/')) {
      return Promise.resolve({ data: [] });
    }
    if (url.startsWith('/planner/perfis/')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(new Error(`URL não mapeada no teste: ${url}`));
  });
}

const perfilAna = { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' };
const perfilBeto = { id: 'perfil-2', nome: 'Beto', criadoEm: '2026-09-01T00:00:00Z' };

describe('Página de Diário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ perfilSelecionado: null });
  });

  it('limpa todo o rascunho e a recomendação ao trocar de perfil', async () => {
    useAppStore.setState({ perfilSelecionado: perfilAna });
    mapearUrls();
    apiPost.mockResolvedValue({
      data: {
        id: 'reg-1',
        perfilId: 'perfil-1',
        data: '2026-09-04',
        tempoInvestidoMin: 30,
        conquistas: 'Estudei decorators',
        dificuldades: null,
        recomendacoesIa: 'Bom ritmo de estudos',
        proximoFoco: 'Revisar injeção de dependência',
        ajustesSugeridos: [],
        criadoEm: '2026-09-04T00:00:00Z',
        modulos: [],
      },
    });

    const user = userEvent.setup();
    renderComQuery(<DiarioPage />);

    await user.type(screen.getByLabelText('Tempo investido (minutos)'), '30');
    await user.type(
      screen.getByLabelText('O que você estudou e conquistou hoje'),
      'Estudei decorators',
    );
    await user.click(screen.getByRole('button', { name: 'Registrar no diário' }));

    await screen.findByText('Recomendações do Tutor IA');

    // Troca de perfil: rascunho e recomendação do perfil anterior não podem permanecer
    useAppStore.setState({ perfilSelecionado: perfilBeto });

    await waitFor(() =>
      expect(screen.queryByText('Recomendações do Tutor IA')).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Tempo investido (minutos)')).toHaveValue(null);
    expect(screen.getByLabelText('O que você estudou e conquistou hoje')).toHaveValue('');
  });
});
