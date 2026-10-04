import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { Objetivo, ProgramaTrilha } from '@/types/api';
import { renderComQuery } from '@/test/utils';
import ObjetivoPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'obj-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const programa: ProgramaTrilha = {
  codigo: 'AZ-900',
  tipo: 'certificacao',
  nome: 'Microsoft Azure Fundamentals',
  descricao: 'Fundamentos do Azure',
  fonteOficial: 'https://learn.microsoft.com/guide',
  paginaCertificacao: 'https://learn.microsoft.com/certification',
  avaliacaoPratica: 'https://learn.microsoft.com/practice',
  vigenciaDesde: '2026-07-20',
  revisadoEm: '2026-09-23',
  dominios: [
    { codigo: 'nuvem', titulo: 'Conceitos de nuvem', pesoMinimo: 25, pesoMaximo: 30, topicos: [] },
  ],
  modulos: [],
};

const kali: ProgramaTrilha = {
  codigo: 'KALI-LINUX',
  tipo: 'assunto',
  nome: 'Kali Linux em laboratório',
  descricao: 'Uso inicial em ambiente próprio',
  fonteOficial: 'https://www.kali.org/docs/',
  revisadoEm: '2026-09-23',
  dominios: [{ codigo: 'ambiente', titulo: 'Ambiente', topicos: [] }],
  modulos: [],
};

const objetivo: Objetivo = {
  id: 'obj-1',
  perfilId: 'perfil-1',
  titulo: 'Estudar Azure',
  criadoEm: '2026-09-23T00:00:00Z',
  trilhas: [],
};

describe('Página de detalhe do objetivo com certificação', () => {
  it('não apresenta ações do objetivo quando outro perfil está selecionado', async () => {
    useAppStore.setState({ perfilSelecionado: { id: 'outro-perfil', nome: 'Bruno', criadoEm: '' } });
    renderComQuery(<ObjetivoPage />);
    expect(await screen.findByText('Este objetivo pertence a outro perfil')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Criar trilha AZ-900' })).not.toBeInTheDocument();
  });
  it('preserva a seleção parcial ao regenerar a trilha', async () => {
    const selecionado = { ...objetivo, trilhas: [{ id: 'trilha', status: 'ativa', metadata: { programa, modulosIndices: [2, 5] }, modulos: [] }] };
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: url === '/planner/programas' ? [programa] : selecionado }));
    renderComQuery(<ObjetivoPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Regenerar trilha' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/planner/trilhas', { objetivoId: 'obj-1', programaCodigo: 'AZ-900', modulosIndices: [2, 5] }));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/planner/objetivos/obj-1') return Promise.resolve({ data: objetivo });
      if (url === '/planner/programas') return Promise.resolve({ data: [programa, kali] });
      return Promise.reject(new Error(`URL não mapeada: ${url}`));
    });
    (api.post as Mock).mockResolvedValue({ data: { id: 'trilha-1', modulos: [] } });
  });

  it('envia o código AZ-900 quando o usuário escolhe o programa oficial', async () => {
    const user = userEvent.setup();
    renderComQuery(<ObjetivoPage />);

    await user.click(await screen.findByRole('button', { name: 'Criar trilha AZ-900' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/planner/trilhas', {
        objetivoId: 'obj-1',
        programaCodigo: 'AZ-900',
      }),
    );
    expect(screen.getByRole('link', { name: 'Programa da prova' })).toHaveAttribute(
      'href',
      programa.fonteOficial,
    );
    expect(screen.getByRole('link', { name: 'Avaliação prática oficial' })).toHaveAttribute(
      'href',
      programa.avaliacaoPratica,
    );
  });

  it('permite escolher uma trilha por assunto sem classificá-la como certificação', async () => {
    const user = userEvent.setup();
    renderComQuery(<ObjetivoPage />);

    await user.click(await screen.findByRole('button', { name: 'Criar trilha KALI-LINUX' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/planner/trilhas', {
        objetivoId: 'obj-1',
        programaCodigo: 'KALI-LINUX',
      }),
    );
    expect(screen.getByRole('link', { name: 'Referência principal' })).toHaveAttribute(
      'href',
      kali.fonteOficial,
    );
  });

  it('regenera a trilha de certificação mantendo o programa escolhido', async () => {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/planner/objetivos/obj-1') {
        return Promise.resolve({
          data: {
            ...objetivo,
            trilhas: [
              {
                id: 'trilha-atual',
                objetivoId: objetivo.id,
                versao: 1,
                status: 'ativa',
                criadoEm: '2026-09-23T00:00:00Z',
                metadata: {
                  certificacao: { ...programa, tipo: undefined, descricao: undefined },
                },
                modulos: [],
              },
            ],
          },
        });
      }
      if (url === '/planner/programas') return Promise.resolve({ data: [programa, kali] });
      return Promise.reject(new Error(`URL não mapeada: ${url}`));
    });

    const user = userEvent.setup();
    renderComQuery(<ObjetivoPage />);

    await user.click(await screen.findByRole('button', { name: 'Regenerar trilha' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/planner/trilhas', {
        objetivoId: 'obj-1',
        programaCodigo: 'AZ-900',
      }),
    );
  });
});
