import { Global, Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BibliotecaVivaModule } from '../modules/biblioteca-viva/biblioteca-viva.module';
import { BibliotecaVivaService } from '../modules/biblioteca-viva/biblioteca-viva.service';
import { ExerciciosAvaliacoesModule } from '../modules/exercicios-avaliacoes/exercicios-avaliacoes.module';
import { ExerciciosAvaliacoesService } from '../modules/exercicios-avaliacoes/exercicios-avaliacoes.service';
import { SynthesizerModule } from '../modules/synthesizer/synthesizer.module';
import { SynthesizerService } from '../modules/synthesizer/synthesizer.service';
import {
  BIBLIOTECA_VIVA_SERVICE,
  EmbeddingsJobHandler,
  EXERCICIOS_AVALIACOES_SERVICE,
  ExerciciosJobHandler,
  SYNTHESIZER_SERVICE,
  SynthesizerJobHandler,
} from './handlers';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JOB_QUEUE } from './job-queue.token';

/**
 * pg-boss roda sobre o próprio PostgreSQL (LISTEN/NOTIFY) — sem Redis,
 * sem serviço novo para operar localmente. Ver decisão em
 * 01-filosofia.md e 03-stack-tecnologica.md.
 */
@Global()
@Module({
  imports: [SynthesizerModule, ExerciciosAvaliacoesModule, BibliotecaVivaModule],
  providers: [
    {
      provide: JOB_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        return new JobsService(connectionString);
      },
    },
    {
      provide: SYNTHESIZER_SERVICE,
      inject: [SynthesizerService],
      useFactory: (service: SynthesizerService) => ({
        gerar: (dto: {
          moduloId: string;
          topico: string;
          nivelAlvo?: string;
          instrucoesExtras?: string;
          async?: boolean;
        }) => service.gerar(dto),
      }),
    },
    {
      provide: EXERCICIOS_AVALIACOES_SERVICE,
      inject: [ExerciciosAvaliacoesService],
      useFactory: (service: ExerciciosAvaliacoesService) => ({
        gerarExercicio: (dto: {
          moduloId: string;
          tipo: string;
          dificuldade?: string;
          instrucoesExtras?: string;
          async?: boolean;
        }) => service.gerarExercicio(dto as never),
        submeterTentativa: (dto: {
          exercicioId: string;
          respostaUsuario: string;
          perfilId?: string;
          async?: boolean;
        }) => service.submeterTentativa(dto as never),
      }),
    },
    {
      provide: BIBLIOTECA_VIVA_SERVICE,
      inject: [BibliotecaVivaService],
      useFactory: (service: BibliotecaVivaService) => ({
        indexarTexto: (params: {
          texto: string;
          conteudoId?: string;
          fonteId?: string;
          async?: boolean;
        }) => service.indexarTexto(params),
      }),
    },
    SynthesizerJobHandler,
    ExerciciosJobHandler,
    EmbeddingsJobHandler,
  ],
  controllers: [JobsController],
  exports: [JOB_QUEUE],
})
export class JobsModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
    private readonly synthesizerHandler: SynthesizerJobHandler,
    private readonly exerciciosHandler: ExerciciosJobHandler,
    private readonly embeddingsHandler: EmbeddingsJobHandler,
  ) {}

  onModuleInit() {
    return this.queue.onModuleInit();
  }

  onModuleDestroy() {
    return this.queue.onModuleDestroy();
  }
}
