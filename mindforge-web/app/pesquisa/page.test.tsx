import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { Fonte, Modulo, Objetivo } from '@/types/api';
import PesquisaPage from './page';
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

const modulo: Modulo = {
  id: 'mod-1',
  trilhaId: 'trilha-1',
  ordem: 1,
  titulo: 'Fundamentos de NestJS',
  objetivoAprendizagem: 'Entender os pilares do framework',
  tempoEstimadoMin: 30,
  prerequisitos: null,
  criadoEm: '2026-09-01T00:00:00Z',
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
      id: 'trilha-1',
      objetivoId: 'obj-1',
      versao: 1,
      status: 'ativa',
      criadoEm: '2026-09-01T00:00:00Z',
      modulos: [modulo],
    },
  ],
};

const fonte: Fonte = {
  id: 'fonte-1',
  moduloId: 'mod-1',
  tipo: 'documentacao_oficial',
  titulo: 'Documentação oficial do NestJS',
  url: 'https://docs.nestjs.com',
  autor: null,
  confiabilidadeScore: '0.95',
  resumo: 'Referência oficial do framework, com guias e exemplos.',
  criadoEm: '2026-09-04T00:00:00Z',
};

function mapearUrls() {
  apiGet.mockImplementation((url: string) => {
    if (url === '/planner/perfis/perfil-1/objetivos') {
      return Promise.resolve({ data: [objetivoResumido] });
    }
    if (url === '/planner/perfis/perfil-2/objetivos') {
      return Promise.resolve({ data: [] });
    }
    if (url === '/planner/objetivos/obj-1') {
      return Promise.resolve({ data: objetivoDetalhe });
    }
    if (url === '/research/modulos/mod-1/fontes') {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(new Error(`URL não mapeada no teste: ${url}`));
  });
}

describe('Página de Pesquisa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ perfilSelecionado: null });
  });

  it('pede a seleção de perfil quando nenhum perfil está ativo', () => {
    renderComQuery(<PesquisaPage />);

    expect(screen.getByRole('heading', { name: 'Selecione um perfil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para perfis' })).toHaveAttribute('href', '/perfis');
  });

  it('exibe o formulário e mantém o botão desabilitado sem módulo selecionado', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();

    renderComQuery(<PesquisaPage />);

    await screen.findByText('Selecione o módulo');
    expect(screen.getByRole('button', { name: 'Pesquisar fontes' })).toBeDisabled();
    expect(screen.getByLabelText('Tópico (opcional)')).toBeInTheDocument();
  });

  it('pesquisa fontes para o módulo selecionado e exibe o resultado', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();
    apiPost.mockResolvedValue({
      data: {
        moduloId: 'mod-1',
        topico: 'Injeção de dependência',
        estrategia: 'Priorizar documentação oficial e livros técnicos',
        fontes: [fonte],
        resultadosWeb: 8,
      },
    });

    const user = userEvent.setup();
    renderComQuery(<PesquisaPage />);

    const gatilho = await screen.findByText('Selecione o módulo');
    await user.click(gatilho);
    await user.click(await screen.findByText('Fundamentos de NestJS'));

    await user.type(screen.getByLabelText('Tópico (opcional)'), 'Injeção de dependência');
    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));

    await waitFor(() =>
      expect(screen.getByText('Documentação oficial do NestJS')).toBeInTheDocument(),
    );
    expect(apiPost).toHaveBeenCalledWith('/research/fontes', {
      moduloId: 'mod-1',
      topico: 'Injeção de dependência',
      limite: 5,
      webSearch: true,
    });
    expect(screen.getByText(/Priorizar documentação oficial/)).toBeInTheDocument();
    expect(screen.getByText(/8 resultados web usados/)).toBeInTheDocument();
    expect(screen.getByText('Confiabilidade 95%')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('1 fontes curadas');
  });

  it('exibe mensagem de erro quando a pesquisa falha', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();
    apiPost.mockRejectedValue(new Error('Módulo mod-1 não encontrado'));

    const user = userEvent.setup();
    renderComQuery(<PesquisaPage />);

    await user.click(await screen.findByText('Selecione o módulo'));
    await user.click(await screen.findByText('Fundamentos de NestJS'));
    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Módulo mod-1 não encontrado'),
    );
    expect(screen.queryByText('Resultado da pesquisa')).not.toBeInTheDocument();
  });

  it('envia limite undefined quando o campo está vazio (usa o padrão do backend)', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();
    apiPost.mockResolvedValue({
      data: {
        moduloId: 'mod-1',
        topico: 'Fundamentos de NestJS',
        estrategia: 'Documentação oficial primeiro',
        fontes: [],
        resultadosWeb: 0,
      },
    });

    const user = userEvent.setup();
    renderComQuery(<PesquisaPage />);

    await user.click(await screen.findByText('Selecione o módulo'));
    await user.click(await screen.findByText('Fundamentos de NestJS'));
    await user.clear(screen.getByLabelText('Quantidade de fontes'));
    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith('/research/fontes', {
        moduloId: 'mod-1',
        topico: undefined,
        limite: undefined,
        webSearch: true,
      }),
    );
  });

  it('descarta módulo e resultado ao trocar de perfil', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();
    apiPost.mockResolvedValue({
      data: {
        moduloId: 'mod-1',
        topico: 'Fundamentos de NestJS',
        estrategia: 'Documentação oficial primeiro',
        fontes: [fonte],
        resultadosWeb: 3,
      },
    });

    const user = userEvent.setup();
    renderComQuery(<PesquisaPage />);

    await user.click(await screen.findByText('Selecione o módulo'));
    await user.click(await screen.findByText('Fundamentos de NestJS'));
    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));
    await screen.findByText('Resultado da pesquisa');
    const chamadasFontes = apiGet.mock.calls.filter(([url]) =>
      String(url).startsWith('/research/modulos/'),
    ).length;

    // Troca de perfil: o rascunho do perfil anterior não pode permanecer
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-2', nome: 'Beto', criadoEm: '2026-09-01T00:00:00Z' },
    });

    await waitFor(() =>
      expect(screen.queryByText('Resultado da pesquisa')).not.toBeInTheDocument(),
    );
    // Perfil novo sem trilhas: o seletor não pode continuar exibindo o módulo antigo
    expect(
      screen.getByText('Nenhum módulo disponível (gere uma trilha primeiro)'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Fundamentos de NestJS/)).not.toBeInTheDocument();
    const chamadasAposTroca = apiGet.mock.calls.filter(([url]) =>
      String(url).startsWith('/research/modulos/'),
    ).length;
    expect(chamadasAposTroca).toBe(chamadasFontes);
  });

  it('limpa o resultado anterior quando a nova pesquisa falha', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();
    apiPost
      .mockResolvedValueOnce({
        data: {
          moduloId: 'mod-1',
          topico: 'Fundamentos de NestJS',
          estrategia: 'Documentação oficial primeiro',
          fontes: [fonte],
          resultadosWeb: 3,
        },
      })
      .mockRejectedValueOnce(new Error('Falha na curadoria'));

    const user = userEvent.setup();
    renderComQuery(<PesquisaPage />);

    await user.click(await screen.findByText('Selecione o módulo'));
    await user.click(await screen.findByText('Fundamentos de NestJS'));

    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));
    await screen.findByText('Resultado da pesquisa');

    await user.type(screen.getByLabelText('Tópico (opcional)'), 'Providers');
    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Falha na curadoria'),
    );
    expect(screen.queryByText('Resultado da pesquisa')).not.toBeInTheDocument();
  });

  it('descarta a resposta se o perfil mudar durante a pesquisa', async () => {
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00Z' },
    });
    mapearUrls();

    // Pesquisa lenta: só resolve quando o teste liberar
    let resolverResposta!: (valor: unknown) => void;
    apiPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverResposta = resolve;
        }),
    );

    const user = userEvent.setup();
    renderComQuery(<PesquisaPage />);

    await user.click(await screen.findByText('Selecione o módulo'));
    await user.click(await screen.findByText('Fundamentos de NestJS'));
    await user.click(screen.getByRole('button', { name: 'Pesquisar fontes' }));

    // Troca de perfil antes de a pesquisa resolver
    useAppStore.setState({
      perfilSelecionado: { id: 'perfil-2', nome: 'Beto', criadoEm: '2026-09-01T00:00:00Z' },
    });
    await screen.findByText('Nenhum módulo disponível (gere uma trilha primeiro)');

    resolverResposta({
      data: {
        moduloId: 'mod-1',
        topico: 'Fundamentos de NestJS',
        estrategia: 'Documentação oficial primeiro',
        fontes: [fonte],
        resultadosWeb: 3,
      },
    });

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        'Perfil ou módulo alterado durante a pesquisa — resultado descartado.',
      ),
    );
    expect(screen.queryByText('Resultado da pesquisa')).not.toBeInTheDocument();
  });
});
