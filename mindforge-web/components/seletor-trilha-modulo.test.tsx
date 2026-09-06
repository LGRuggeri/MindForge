import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeletorTrilhaModulo } from './seletor-trilha-modulo';
import { useModulosDoPerfil } from '@/lib/hooks/useModulos';

vi.mock('@/lib/hooks/useModulos', () => ({
  useModulosDoPerfil: vi.fn(),
}));

// Popup do base-ui chama scrollIntoView, ausente no jsdom.
Element.prototype.scrollIntoView = vi.fn();

const gruposMock = [
  {
    trilhaId: 'trilha-1',
    titulo: 'Aprender TypeScript',
    objetivoTitulo: 'Aprender TypeScript',
    modulos: [
      {
        id: 'mod-1',
        trilhaId: 'trilha-1',
        ordem: 1,
        titulo: 'Tipos primitivos',
        objetivoAprendizagem: null,
        tempoEstimadoMin: null,
        prerequisitos: null,
        criadoEm: '2026-09-01T00:00:00Z',
      },
      {
        id: 'mod-2',
        trilhaId: 'trilha-1',
        ordem: 2,
        titulo: 'Interfaces',
        objetivoAprendizagem: null,
        tempoEstimadoMin: null,
        prerequisitos: null,
        criadoEm: '2026-09-01T00:00:00Z',
      },
    ],
  },
  {
    trilhaId: 'trilha-2',
    titulo: 'Aprender NestJS · v2',
    objetivoTitulo: 'Aprender NestJS',
    modulos: [
      {
        id: 'mod-3',
        trilhaId: 'trilha-2',
        ordem: 1,
        titulo: 'Módulos e providers',
        objetivoAprendizagem: null,
        tempoEstimadoMin: null,
        prerequisitos: null,
        criadoEm: '2026-09-01T00:00:00Z',
      },
    ],
  },
];

function renderizar(props?: Partial<Parameters<typeof SeletorTrilhaModulo>[0]>) {
  const onTrilhaChange = vi.fn();
  const onModuloChange = vi.fn();
  render(
    <SeletorTrilhaModulo
      perfilId="perfil-1"
      trilhaId=""
      moduloId=""
      onTrilhaChange={onTrilhaChange}
      onModuloChange={onModuloChange}
      {...props}
    />,
  );
  return { onTrilhaChange, onModuloChange };
}

describe('SeletorTrilhaModulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useModulosDoPerfil).mockReturnValue({
      data: [],
      grupos: gruposMock,
      isLoading: false,
    } as unknown as ReturnType<typeof useModulosDoPerfil>);
  });

  it('desabilita o módulo até uma trilha ser escolhida', () => {
    renderizar();
    expect(screen.getByText('Selecione a trilha')).toBeInTheDocument();
    expect(screen.getByText('Selecione a trilha primeiro')).toBeInTheDocument();
  });

  it('associa labels acessíveis aos dois triggers (review Codex P2)', () => {
    renderizar({ id: 'modulo' });

    const labelTrilha = screen.getByText('Trilha');
    const labelModulo = screen.getByText('Módulo');
    expect(labelTrilha).toHaveAttribute('for', 'modulo-trilha');
    expect(labelModulo).toHaveAttribute('for', 'modulo-modulo');
    expect(document.getElementById('modulo-trilha')).not.toBeNull();
    expect(document.getElementById('modulo-modulo')).not.toBeNull();
  });

  it('lista as trilhas como agrupadoras e filtra módulos ao escolher', async () => {
    const usuario = userEvent.setup();
    const { onTrilhaChange, onModuloChange } = renderizar();

    await usuario.click(screen.getByText('Selecione a trilha'));
    await usuario.click(await screen.findByText('Aprender TypeScript'));

    expect(onTrilhaChange).toHaveBeenCalledWith('trilha-1');
    // Trocar de trilha sempre limpa o módulo selecionado.
    expect(onModuloChange).toHaveBeenCalledWith('');
  });

  it('exibe os títulos selecionados em vez dos IDs (regressão)', () => {
    renderizar({ trilhaId: 'trilha-1', moduloId: 'mod-2' });

    expect(screen.getByText('Aprender TypeScript')).toBeInTheDocument();
    expect(screen.getByText('2. Interfaces')).toBeInTheDocument();
    expect(screen.queryByText('trilha-1')).not.toBeInTheDocument();
    expect(screen.queryByText('mod-2')).not.toBeInTheDocument();
  });

  it('exibe estado vazio quando não há trilhas ativas', () => {
    vi.mocked(useModulosDoPerfil).mockReturnValue({
      data: [],
      grupos: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useModulosDoPerfil>);

    renderizar();
    expect(screen.getByText('Nenhuma trilha ativa (gere uma trilha primeiro)')).toBeInTheDocument();
  });

  it('exibe estado de carregamento', () => {
    vi.mocked(useModulosDoPerfil).mockReturnValue({
      data: [],
      grupos: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useModulosDoPerfil>);

    renderizar();
    expect(screen.getByText('Carregando trilhas...')).toBeInTheDocument();
  });
});
