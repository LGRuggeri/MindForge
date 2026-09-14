import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PgBoss } from 'pg-boss';
import { JobsModule } from './jobs.module';
import { SynthesizerModule } from '../modules/synthesizer/synthesizer.module';
import { SynthesizerService } from '../modules/synthesizer/synthesizer.service';
import { ExerciciosAvaliacoesModule } from '../modules/exercicios-avaliacoes/exercicios-avaliacoes.module';
import { ExerciciosAvaliacoesService } from '../modules/exercicios-avaliacoes/exercicios-avaliacoes.service';
import { BibliotecaVivaModule } from '../modules/biblioteca-viva/biblioteca-viva.module';
import { BibliotecaVivaService } from '../modules/biblioteca-viva/biblioteca-viva.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));
const synth = { gerar: jest.fn().mockResolvedValue({ id: 'conteudo' }) };
const exercicios = {
  gerarExercicio: jest.fn().mockResolvedValue({ id: 'exercicio' }),
  submeterTentativa: jest.fn().mockResolvedValue({ id: 'tentativa' }),
};
const biblioteca = { indexarTexto: jest.fn().mockResolvedValue([]) };
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: new ConfigService({ DATABASE_URL: 'postgres://localhost/teste' }),
    },
  ],
  exports: [ConfigService],
})
class ConfigTesteModule {}
@Module({
  providers: [{ provide: SynthesizerService, useValue: synth }],
  exports: [SynthesizerService],
})
class SynthTesteModule {}
@Module({
  providers: [{ provide: ExerciciosAvaliacoesService, useValue: exercicios }],
  exports: [ExerciciosAvaliacoesService],
})
class ExerciciosTesteModule {}
@Module({
  providers: [{ provide: BibliotecaVivaService, useValue: biblioteca }],
  exports: [BibliotecaVivaService],
})
class BibliotecaTesteModule {}

describe('JobsModule — factories e lifecycle Nest', () => {
  it('registra os quatro handlers e encerra o provider uma única vez', async () => {
    const boss = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      createQueue: jest.fn().mockResolvedValue(undefined),
      work: jest.fn().mockResolvedValue('worker'),
      on: jest.fn(),
    };
    (PgBoss as unknown as jest.Mock).mockImplementation(() => boss);
    const modulo = await Test.createTestingModule({ imports: [ConfigTesteModule, JobsModule] })
      .overrideModule(SynthesizerModule)
      .useModule(SynthTesteModule)
      .overrideModule(ExerciciosAvaliacoesModule)
      .useModule(ExerciciosTesteModule)
      .overrideModule(BibliotecaVivaModule)
      .useModule(BibliotecaTesteModule)
      .compile();
    const app = modulo.createNestApplication();
    try {
      await app.init();
      expect(boss.start).toHaveBeenCalledTimes(1);
      expect(boss.work.mock.calls.map((c) => c[0]).sort()).toEqual([
        'biblioteca-viva.indexar',
        'exercicios.corrigir-tentativa',
        'exercicios.gerar',
        'synthesizer.gerar-conteudo',
      ]);
      const dados = {
        moduloId: 'modulo',
        conteudoId: 'conteudo',
        exercicioId: 'exercicio',
        async: true,
      };
      for (const chamada of boss.work.mock.calls) {
        await chamada.at(-1)([{ id: 'job', data: dados }]);
      }
      for (const executar of [
        synth.gerar,
        exercicios.gerarExercicio,
        exercicios.submeterTentativa,
        biblioteca.indexarTexto,
      ]) {
        expect(executar).toHaveBeenCalledWith({ ...dados, async: false });
      }
    } finally {
      await app.close();
    }
    expect(boss.stop).toHaveBeenCalledTimes(1);
  });
});
