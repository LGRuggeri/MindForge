import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { renderComQuery } from '@/test/utils';
import SimuladoPage from './page';
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'a' }), useRouter: () => ({ push: vi.fn() }) }));
describe('Simulado vazio legado', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAppStore.setState({ perfilSelecionado: { id: 'p', nome: 'Ana', criadoEm: '' } });
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'a', titulo: 'Simulado vazio', exercicios: [] } });
  });
  it('impede finalizar sem questões', async () => {
    renderComQuery(<SimuladoPage />);
    expect(await screen.findByRole('button', { name: /Finalizar/ })).toBeDisabled();
  });
});
