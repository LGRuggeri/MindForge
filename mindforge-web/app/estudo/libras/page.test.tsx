import { describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import LibrasPage from './page';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
describe('Endereço anterior de Libras', () => {
  it('direciona para os objetivos por perfil', () => {
    LibrasPage();
    expect(redirect).toHaveBeenCalledWith('/objetivos');
  });
});
