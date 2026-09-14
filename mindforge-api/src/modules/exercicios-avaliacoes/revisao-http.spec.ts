import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExerciciosAvaliacoesController } from './exercicios-avaliacoes.controller';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { AvaliacoesService } from './avaliacoes.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';

describe('HTTP da sessão de revisão', () => {
  const perfilId = '123e4567-e89b-12d3-a456-426614174000';
  const id = '223e4567-e89b-12d3-a456-426614174000';
  let app: INestApplication;
  let url: string;
  let registro: {
    id: string;
    perfilId: string;
    itemTipo: string;
    itemId: string;
    proximaRevisao: string;
    repeticoes: number;
    intervaloDias: number;
    fatorFacilidade: string;
  };

  beforeAll(async () => {
    const repo = {
      buscarPorId: async (revisaoId: string, donoId: string) =>
        revisaoId === id && donoId === perfilId ? { ...registro } : undefined,
      buscarItem: async () => ({
        titulo: 'Somas',
        texto: 'Quanto é 2 + 2?',
        resposta: '4',
        moduloId: null,
      }),
      atualizarSeAtual: async (_anterior: unknown, dados: Partial<typeof registro>) => {
        registro = { ...registro, ...dados };
        return registro;
      },
    };
    const modulo = await Test.createTestingModule({
      controllers: [ExerciciosAvaliacoesController],
      providers: [
        { provide: ExerciciosAvaliacoesService, useValue: {} },
        { provide: AvaliacoesService, useValue: {} },
        { provide: RevisaoEspacadaService, useValue: new RevisaoEspacadaService(repo as never) },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/exercicios-avaliacoes/revisao`;
  });
  beforeEach(() => {
    registro = {
      id,
      perfilId,
      itemTipo: 'exercicio',
      itemId: id,
      proximaRevisao: '2020-01-01',
      repeticoes: 1,
      intervaloDias: 1,
      fatorFacilidade: '2.5',
    };
  });
  afterAll(async () => {
    await app?.close();
  });

  it('entrega material somente no perfil da agenda', async () => {
    const resposta = await fetch(`${url}/${id}?perfilId=${perfilId}`);
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ item: { texto: 'Quanto é 2 + 2?' } });
    const outro = await fetch(`${url}/${id}?perfilId=${id}`);
    expect(outro.status).toBe(404);
  });

  it('registra uma revisão e rejeita seu reenvio sem avançar novamente', async () => {
    const request = () =>
      fetch(`${url}/${id}/concluir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfilId, qualidade: 4, proximaRevisaoEsperada: '2020-01-01' }),
      });
    const primeira = await request();
    expect(primeira.status).toBe(201);
    expect(await primeira.json()).toMatchObject({ repeticoes: 2, intervaloDias: 6 });
    const repetida = await request();
    expect(repetida.status).toBe(409);
    expect(registro.repeticoes).toBe(2);
  });

  it('rejeita qualidade fora da faixa antes de alterar a agenda', async () => {
    const resposta = await fetch(`${url}/${id}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfilId, qualidade: 9, proximaRevisaoEsperada: '2020-01-01' }),
    });
    expect(resposta.status).toBe(400);
    expect(registro.repeticoes).toBe(1);
  });

  it('rejeita UUID inválido e perfil ausente', async () => {
    expect((await fetch(`${url}/invalido?perfilId=${perfilId}`)).status).toBe(400);
    expect((await fetch(`${url}/${id}`)).status).toBe(400);
  });
});
