import { ValidationPipe } from '@nestjs/common';
import { ConcluirRevisaoDto } from './concluir-revisao.dto';

describe('Contrato de conclusão de revisão', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const valido = {
    perfilId: '123e4567-e89b-12d3-a456-426614174000',
    qualidade: 4,
    proximaRevisaoEsperada: '2026-09-13',
  };
  const transformar = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: ConcluirRevisaoDto });

  it('aceita perfil, qualidade e data da agenda', async () => {
    await expect(transformar(valido)).resolves.toEqual(valido);
  });
  it.each([
    { perfilId: 'invalido' },
    { qualidade: -1 },
    { qualidade: 6 },
    { qualidade: 2.5 },
    { qualidade: '4' },
    { proximaRevisaoEsperada: '2026-02-30' },
    { proximaRevisaoEsperada: '2026-09-13T00:00:00Z' },
    { proximaRevisaoEsperada: undefined },
  ])('rejeita dados inválidos: %j', async (invalido) => {
    await expect(transformar({ ...valido, ...invalido })).rejects.toThrow();
  });
});
