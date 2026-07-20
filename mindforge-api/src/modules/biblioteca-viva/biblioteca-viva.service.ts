import { Injectable, Logger } from '@nestjs/common';
import { BibliotecaVivaRepository } from './biblioteca-viva.repository';
import { EmbeddingService } from './embedding.service';
import { BuscarSemanticaDto } from './dto/buscar-semantica.dto';
import { chunkTexto } from './chunking';

@Injectable()
export class BibliotecaVivaService {
  private readonly logger = new Logger(BibliotecaVivaService.name);

  constructor(
    private readonly repo: BibliotecaVivaRepository,
    private readonly embeddings: EmbeddingService,
  ) {}

  async buscar(dto: BuscarSemanticaDto) {
    const embeddingConsulta = await this.embeddings.gerar(dto.consulta);
    return this.repo.buscarSimilares(embeddingConsulta, dto.limite ?? 5);
  }

  /**
   * Quebra o texto em chunks, gera embeddings e indexa em `conteudo_chunks`.
   * Origem: exatamente um de `conteudoId` ou `fonteId` (CHECK do schema).
   */
  async indexarTexto(params: { texto: string; conteudoId?: string; fonteId?: string }) {
    const { texto, conteudoId, fonteId } = params;

    if (Boolean(conteudoId) === Boolean(fonteId)) {
      throw new Error('Informe exatamente um de conteudoId ou fonteId');
    }

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
