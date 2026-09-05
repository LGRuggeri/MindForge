import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { api } from '@/lib/api';
import { useDiario, useRegistrarDiario } from './useDiario';
import type { RegistroDiario, RegistroDiarioComRecomendacoes } from '@/types/api';
import { renderComQuery } from '@/test/utils';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const apiGet = api.get as unknown as Mock;
const apiPost = api.post as unknown as Mock;

const registro: RegistroDiario = {
  id: 'diario-1',
  perfilId: 'perfil-1',
  data: '2026-09-04',
  tempoInvestidoMin: 45,
  conquistas: 'Terminei o módulo de injeção de dependência',
  dificuldades: null,
  recomendacoesIa: 'Continue praticando com exercícios.',
  criadoEm: '2026-09-04T10:00:00Z',
  modulos: [],
};

function ProbeDiario({ perfilId }: { perfilId: string | null }) {
  const { data, isLoading } = useDiario(perfilId);
  const registrar = useRegistrarDiario();

  return (
    <div>
      <span data-testid="estado">{isLoading ? 'carregando' : 'pronto'}</span>
      <span data-testid="qtd">{data?.length ?? 0}</span>
      <button onClick={() => registrar.mutate({ perfilId: perfilId ?? '', tempoInvestidoMin: 45 })}>
        registrar
      </button>
      {registrar.data && <span data-testid="proximo-foco">{registrar.data.proximoFoco}</span>}
      {registrar.isError && <span data-testid="erro">falhou</span>}
    </div>
  );
}

describe('useDiario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista os registros do perfil chamando o endpoint correto', async () => {
    apiGet.mockResolvedValue({ data: [registro] });

    renderComQuery(<ProbeDiario perfilId="perfil-1" />);

    expect(screen.getByTestId('estado')).toHaveTextContent('carregando');
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('pronto'));
    expect(screen.getByTestId('qtd')).toHaveTextContent('1');
    expect(apiGet).toHaveBeenCalledWith('/diario/perfis/perfil-1');
  });

  it('não chama a API sem perfil selecionado', () => {
    renderComQuery(<ProbeDiario perfilId={null} />);

    expect(apiGet).not.toHaveBeenCalled();
    expect(screen.getByTestId('qtd')).toHaveTextContent('0');
  });

  it('registra um novo diário e invalida a lista', async () => {
    apiGet.mockResolvedValue({ data: [] });
    const criado: RegistroDiarioComRecomendacoes = {
      ...registro,
      recomendacoesIa: 'Revise os conceitos antes de avançar.',
      proximoFoco: 'Praticar providers',
      ajustesSugeridos: ['Estudar 30 min por dia'],
    };
    apiPost.mockResolvedValue({ data: criado });

    const user = userEvent.setup();
    renderComQuery(<ProbeDiario perfilId="perfil-1" />);

    await user.click(screen.getByRole('button', { name: 'registrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('proximo-foco')).toHaveTextContent('Praticar providers'),
    );
    expect(apiPost).toHaveBeenCalledWith('/diario', { perfilId: 'perfil-1', tempoInvestidoMin: 45 });
    // A invalidação do cache dispara o refetch da lista de registros.
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    expect(apiGet).toHaveBeenCalledWith('/diario/perfis/perfil-1');
  });

  it('expõe erro quando a API falha', async () => {
    apiGet.mockResolvedValue({ data: [] });
    apiPost.mockRejectedValue(new Error('Registro já existe para esta data'));

    const user = userEvent.setup();
    renderComQuery(<ProbeDiario perfilId="perfil-1" />);

    await user.click(screen.getByRole('button', { name: 'registrar' }));

    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('falhou'));
  });
});
