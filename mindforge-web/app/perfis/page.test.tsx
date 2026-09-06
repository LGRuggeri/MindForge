import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import PerfisPage from './page';
import { renderComQuery } from '@/test/utils';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const apiGet = api.get as unknown as Mock;
const apiPatch = api.patch as unknown as Mock;

const perfilMock = {
  id: 'perfil-1',
  nome: 'Luiz Gustavo',
  objetivosGerais: 'Aprender TypeScript',
  criadoEm: '2026-09-01T00:00:00Z',
};

describe('Página de Perfis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ perfilSelecionado: null });
    apiGet.mockResolvedValue({ data: [perfilMock] });
  });

  it('deve editar nome e objetivos de um perfil existente', async () => {
    const usuario = userEvent.setup();
    apiPatch.mockResolvedValue({
      data: { ...perfilMock, nome: 'Luiz', objetivosGerais: 'Aprender NestJS' },
    });

    renderComQuery(<PerfisPage />);

    const botaoEditar = await screen.findByRole('button', { name: /editar perfil/i });
    await usuario.click(botaoEditar);

    const campoNome = screen.getByLabelText(/nome/i, { selector: '[id^="nome-edicao"]' });
    const campoObjetivos = screen.getByLabelText(/objetivos gerais/i, {
      selector: '[id^="objetivos-edicao"]',
    });
    expect(campoNome).toHaveValue('Luiz Gustavo');
    expect(campoObjetivos).toHaveValue('Aprender TypeScript');

    await usuario.clear(campoNome);
    await usuario.type(campoNome, 'Luiz');
    await usuario.clear(campoObjetivos);
    await usuario.type(campoObjetivos, 'Aprender NestJS');
    await usuario.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(apiPatch).toHaveBeenCalledWith('/perfis/perfil-1', {
        nome: 'Luiz',
        objetivosGerais: 'Aprender NestJS',
      });
    });
  });

  it('deve atualizar o perfil selecionado na store após salvar', async () => {
    const usuario = userEvent.setup();
    useAppStore.setState({ perfilSelecionado: perfilMock });
    apiPatch.mockResolvedValue({
      data: { ...perfilMock, nome: 'Luiz' },
    });

    renderComQuery(<PerfisPage />);

    const botaoEditar = await screen.findByRole('button', { name: /editar perfil/i });
    await usuario.click(botaoEditar);

    const campoNome = screen.getByLabelText(/nome/i, { selector: '[id^="nome-edicao"]' });
    await usuario.clear(campoNome);
    await usuario.type(campoNome, 'Luiz');
    await usuario.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(useAppStore.getState().perfilSelecionado?.nome).toBe('Luiz');
    });
  });

  it('deve cancelar a edição sem chamar a API', async () => {
    const usuario = userEvent.setup();
    renderComQuery(<PerfisPage />);

    const botaoEditar = await screen.findByRole('button', { name: /editar perfil/i });
    await usuario.click(botaoEditar);
    await usuario.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(apiPatch).not.toHaveBeenCalled();
    expect(await screen.findByText('Luiz Gustavo')).toBeInTheDocument();
  });
});
