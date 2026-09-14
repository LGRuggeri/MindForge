import {
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BibliotecaVivaRepository } from './biblioteca-viva.repository';
import { EmbeddingService } from './embedding.service';
import { BuscarSemanticaDto } from './dto/buscar-semantica.dto';
import { IndexarTextoDto } from './dto/indexar-texto.dto';
import { chunkTexto } from './chunking';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';

@Injectable()
export class BibliotecaVivaService {
  private readonly logger = new Logger(BibliotecaVivaService.name);

  constructor(
    private readonly repo: BibliotecaVivaRepository,
    private readonly embeddings: EmbeddingService,
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
  ) {}

  async buscar(dto: BuscarSemanticaDto) {
    const embeddingConsulta = await this.embeddings.gerar(dto.consulta);
    return this.repo.buscarSimilares(embeddingConsulta, dto.limite ?? 5, dto.moduloId);
  }

  /**
   * Quebra o texto em chunks, gera embeddings e indexa em `conteudo_chunks`.
   * Origem: exatamente um de `conteudoId` ou `fonteId` (CHECK do schema).
   */
  async indexarTexto(params: IndexarTextoDto) {
    if (Boolean(params.conteudoId) === Boolean(params.fonteId)) {
      throw new BadRequestException('Informe exatamente um de conteudoId ou fonteId');
    }
    if (params.async) {
      const jobId = await this.queue.send(
        'biblioteca-viva.indexar',
        params as unknown as Record<string, unknown>,
        { retryLimit: 2 },
      );
      if (!jobId) throw new ServiceUnavailableException('Falha ao enfileirar indexação');
      this.logger.log(`Job de indexação enfileirado: ${jobId}`);
      return { jobId, status: 'enfileirado' };
    }

    return this.indexarTextoSincrono(params);
  }

  private async indexarTextoSincrono(params: {
    texto: string;
    conteudoId?: string;
    fonteId?: string;
  }) {
    const { texto, conteudoId, fonteId } = params;

    const pedacos = chunkTexto(texto);
    if (pedacos.length === 0) {
      this.logger.warn('Nenhum chunk gerado — texto vazio');
      return [];
    }

    const registros = [];
    for (let ordem = 0; ordem < pedacos.length; ordem++) {
      const pedaco = pedacos[ordem];
      const embedding = await this.embeddings.gerar(pedaco);
      registros.push({
        conteudoId: conteudoId ?? null,
        fonteId: fonteId ?? null,
        texto: pedaco,
        embedding,
        ordem,
      });
    }

    const salvos = await this.repo.indexarChunks(registros);
    this.logger.log(
      `Indexados ${salvos.length} chunks` +
        (conteudoId ? ` do conteúdo ${conteudoId}` : ` da fonte ${fonteId}`),
    );
    return salvos;
  }
}
