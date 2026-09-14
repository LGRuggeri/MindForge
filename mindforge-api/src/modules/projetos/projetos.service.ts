import { lerJsonIa } from '../../common/ia/json-ia';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { ProjetosRepository } from './projetos.repository';
import { CriarProjetoDto, GerarProjetoDto, SubmeterEntregaDto } from './dto';

export interface ProjetoGerado {
  titulo: string;
  descricao: string;
  criterios: string[];
  dicas: string[];
}

export interface CorrecaoEntrega {
  pontuacao: number;
  feedback: string;
}

@Injectable()
export class ProjetosService {
  private readonly logger = new Logger(ProjetosService.name);

  constructor(
    private readonly repo: ProjetosRepository,
    private readonly agentes: AgentesService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly biblioteca: BibliotecaVivaService,
  ) {}

  async criar(dto: CriarProjetoDto) {
    // Sem nenhuma associação o projeto fica órfão: listar() só enxerga
    // projetos por módulo/objetivo e o progresso não pode ser creditado.
    if (!dto.moduloId && !dto.objetivoId) {
      throw new BadRequestException('Informe moduloId ou objetivoId para o projeto');
    }

    await this.garantirVinculoAoPerfil(dto.perfilId, dto.moduloId, dto.objetivoId);

    const projeto = await this.repo.criar({
      perfilId: dto.perfilId,
      moduloId: dto.moduloId ?? null,
      objetivoId: dto.objetivoId ?? null,
      titulo: dto.titulo,
      descricao: dto.descricao,
      criterios: dto.criterios ?? [],
      dicas: dto.dicas ?? [],
      status: 'pendente',
    });

    this.logger.log(`Projeto criado: ${projeto.id}`);
    return this.repo.buscarPorId(projeto.id);
  }

  async gerar(dto: GerarProjetoDto) {
    const contexto = await this.resolverContextoAprendizado(dto);
    let chunks: Array<{ id: string; texto: string; similaridade: number }> = [];

    try {
      chunks = await this.biblioteca.buscar({
        consulta: contexto.consulta,
        limite: 5,
        ...(dto.moduloId ? { moduloId: dto.moduloId } : {}),
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Biblioteca Viva indisponível na geração de projeto: ${mensagem}`);
    }

    const gerado = await this.agentes.executar<ProjetoGerado>({
      agente: 'evaluator',
      system: this.montarSystemPromptGeracao(),
      user: this.montarUserPromptGeracao(contexto, dto.perfilId, chunks),
      entrada: { perfilId: dto.perfilId, moduloId: dto.moduloId, objetivoId: dto.objetivoId },
      parser: (raw) => this.parseProjetoGerado(raw),
      temperature: 0.7,
    });

    return this.criar({
      ...dto,
      titulo: gerado.titulo,
      descricao: gerado.descricao,
      criterios: gerado.criterios,
      dicas: gerado.dicas,
    });
  }

  async listar(filtros: { moduloId?: string; objetivoId?: string }) {
    if (filtros.moduloId) {
      return this.repo.listarPorModulo(filtros.moduloId);
    }
    if (filtros.objetivoId) {
      return this.repo.listarPorObjetivo(filtros.objetivoId);
    }
    return [];
  }

  async buscarPorId(id: string) {
    const projeto = await this.repo.buscarPorId(id);
    if (!projeto) {
      throw new NotFoundException(`Projeto ${id} não encontrado`);
    }
    return projeto;
  }

  async submeterEntrega(id: string, dto: SubmeterEntregaDto, perfilId?: string) {
    const projeto = await this.buscarPorId(id);

    // O progresso sempre pertence ao dono do projeto; um perfil divergente
    // indica seleção errada no frontend e não pode creditar terceiros.
    if (perfilId && perfilId !== projeto.perfilId) {
      throw new ForbiddenException('O perfil informado não é o dono do projeto');
    }

    const numeroEntregaEstimado = (await this.repo.contarEntregas(id)) + 1;

    const correcao = await this.agentes.executar<CorrecaoEntrega>({
      agente: 'evaluator',
      system: this.montarSystemPromptCorrecao(),
      user: this.montarUserPromptCorrecao(projeto, dto.conteudo),
      entrada: { projetoId: id, numeroEntrega: numeroEntregaEstimado },
      parser: (raw) => this.parseCorrecaoEntrega(raw),
      temperature: 0.5,
    });

    const entrega = await this.repo.adicionarEntregaSequencial(id, {
      conteudo: dto.conteudo,
      feedback: correcao.feedback,
      pontuacao: String(correcao.pontuacao),
    });

    if (projeto.status === 'pendente') {
      await this.repo.atualizarStatus(id, 'em_andamento');
    }

    if (correcao.pontuacao >= 7 && projeto.moduloId) {
      const nivel = correcao.pontuacao >= 9 ? 'dominado' : 'praticando';
      // A sincronização com o knowledge graph é não-fatal: a entrega já foi
      // persistida, e um 500 aqui faria o frontend reenviar e duplicar a
      // entrega numerada (o fluxo de exercícios já trata o graph assim).
      try {
        await this.knowledgeGraph.marcarProgressoPorModulo(
          projeto.moduloId,
          projeto.perfilId,
          nivel,
        );
        this.logger.log(
          `Progresso atualizado para o perfil ${projeto.perfilId} pelo projeto ${id} (nota ${correcao.pontuacao})`,
        );
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        this.logger.warn(
          `Falha ao sincronizar progresso no knowledge graph para o projeto ${id}: ${mensagem}`,
        );
      }
    }

    this.logger.log(`Entrega ${entrega.id} submetida para o projeto ${id}`);
    return entrega;
  }

  async concluir(id: string) {
    await this.buscarPorId(id);
    return this.repo.atualizarStatus(id, 'concluido');
  }

  private montarSystemPromptGeracao(): string {
    return `Você é o agente evaluator do MindForge. Crie um projeto prático de aprendizado no formato JSON.

Regras:
1. O projeto deve ser desafiador, contextualizado e aplicável na vida real.
2. Forneça critérios objetivos de avaliação em "criterios".
3. Forneça dicas iniciais em "dicas" (não entregue a solução completa).
4. Use os materiais da Biblioteca Viva como base, mas não invente informações.
5. Retorne APENAS um objeto JSON válido, sem markdown.

Formato obrigatório:
{
  "titulo": "string",
  "descricao": "string (contexto + entrega esperada)",
  "criterios": ["string"],
  "dicas": ["string"]
}`;
  }

  /**
   * Carrega o contexto real de aprendizado (título/descrição do módulo ou do
   * objetivo) para a busca na Biblioteca Viva e para o prompt do evaluator —
   * UUIDs não dão contexto semântico nenhum ao retrieval nem ao LLM.
   */
  private async resolverContextoAprendizado(dto: {
    moduloId?: string;
    objetivoId?: string;
  }): Promise<{ rotulo: string; detalhe: string | null; consulta: string }> {
    if (dto.moduloId) {
      const modulo = await this.repo.buscarModulo(dto.moduloId);
      if (!modulo) {
        throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
      }
      return {
        rotulo: `Módulo: ${modulo.titulo}`,
        detalhe: modulo.objetivoAprendizagem
          ? `Objetivo de aprendizado do módulo: ${modulo.objetivoAprendizagem}`
          : null,
        consulta: `${modulo.titulo} ${modulo.objetivoAprendizagem ?? ''}`.trim(),
      };
    }

    if (dto.objetivoId) {
      const objetivo = await this.repo.buscarObjetivo(dto.objetivoId);
      if (!objetivo) {
        throw new NotFoundException(`Objetivo ${dto.objetivoId} não encontrado`);
      }
      return {
        rotulo: `Objetivo de aprendizado: ${objetivo.titulo}`,
        detalhe: objetivo.descricao ? `Descrição: ${objetivo.descricao}` : null,
        consulta: `${objetivo.titulo} ${objetivo.descricao ?? ''}`.trim(),
      };
    }

    throw new BadRequestException('Informe moduloId ou objetivoId para gerar o projeto');
  }

  private montarUserPromptGeracao(
    contexto: { rotulo: string; detalhe: string | null },
    perfilId: string,
    chunks: Array<{ texto: string; similaridade: number }>,
  ): string {
    const chunksTexto =
      chunks.length > 0
        ? chunks
            .map(
              (c, i) =>
                `--- Chunk ${i + 1} (similaridade ${c.similaridade.toFixed(3)}) ---\n${c.texto}`,
            )
            .join('\n\n')
        : 'Nenhum material relevante encontrado na Biblioteca Viva.';

    return `${contexto.rotulo}
${contexto.detalhe ?? 'Objetivo de aprendizado não informado.'}
Perfil: ${perfilId}

Materiais recuperados da Biblioteca Viva:
${chunksTexto}

Crie o projeto no formato JSON especificado.`;
  }

  private montarSystemPromptCorrecao(): string {
    return `Você é o agente evaluator do MindForge. Avalie uma entrega de projeto no formato JSON.

Regras:
1. Avalie com base na descrição e critérios do projeto.
2. Seja justo e construtivo.
3. Retorne APENAS um objeto JSON válido, sem markdown.

Formato obrigatório:
{
  "pontuacao": number (0 a 10),
  "feedback": "string"
}`;
  }

  private montarUserPromptCorrecao(
    projeto: { titulo: string; descricao: string; criterios: string[] },
    conteudo: string,
  ): string {
    return `Projeto: ${projeto.titulo}
Descrição: ${projeto.descricao}
Critérios:
${projeto.criterios.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Entrega do aluno:
${conteudo}

Avalie no formato JSON especificado.`;
  }

  /**
   * Garante que todos os vínculos informados (módulo e/ou objetivo) pertencem
   * ao mesmo perfil do projeto e existem de fato. Sem essa checagem, um
   * projeto criado com seleção de perfil desatualizada no frontend vincularia
   * conteúdo de outro perfil e uma entrega aprovada creditaria competências
   * alheias no knowledge graph.
   */
  private async garantirVinculoAoPerfil(
    perfilId: string,
    moduloId?: string,
    objetivoId?: string,
  ): Promise<void> {
    if (moduloId) {
      const modulo = await this.repo.buscarModulo(moduloId);
      if (!modulo) {
        throw new NotFoundException(`Módulo ${moduloId} não encontrado`);
      }
      if (modulo.trilha?.objetivo?.perfilId !== perfilId) {
        throw new ForbiddenException('O módulo informado não pertence ao perfil do projeto');
      }
    }

    if (objetivoId) {
      const objetivo = await this.repo.buscarObjetivo(objetivoId);
      if (!objetivo) {
        throw new NotFoundException(`Objetivo ${objetivoId} não encontrado`);
      }
      if (objetivo.perfilId !== perfilId) {
        throw new ForbiddenException('O objetivo informado não pertence ao perfil do projeto');
      }
    }
  }

  private parseJsonSeguro(raw: string): unknown {
    try {
      return lerJsonIa(raw);
    } catch {
      this.logger.error('Falha ao parsear JSON do Evaluator');
      throw new Error('O agente Evaluator retornou uma resposta inválida');
    }
  }

  private parseProjetoGerado(raw: string): ProjetoGerado {
    const valor = this.parseJsonSeguro(raw);
    if (
      !this.eObjeto(valor) ||
      !this.stringNaoVazia(valor.titulo) ||
      !this.stringNaoVazia(valor.descricao) ||
      !this.arrayDeStrings(valor.criterios) ||
      !this.arrayDeStrings(valor.dicas)
    ) {
      throw new Error('O agente Evaluator retornou um projeto com formato inválido');
    }
    return {
      titulo: valor.titulo,
      descricao: valor.descricao,
      criterios: valor.criterios,
      dicas: valor.dicas,
    };
  }

  private parseCorrecaoEntrega(raw: string): CorrecaoEntrega {
    const valor = this.parseJsonSeguro(raw);
    if (
      !this.eObjeto(valor) ||
      typeof valor.pontuacao !== 'number' ||
      valor.pontuacao < 0 ||
      valor.pontuacao > 10 ||
      !this.stringNaoVazia(valor.feedback)
    ) {
      throw new Error('O agente Evaluator retornou uma correção com formato inválido');
    }
    return { pontuacao: valor.pontuacao, feedback: valor.feedback };
  }

  private eObjeto(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
  }

  private stringNaoVazia(valor: unknown): valor is string {
    return typeof valor === 'string' && valor.trim().length > 0;
  }

  private arrayDeStrings(valor: unknown): valor is string[] {
    return Array.isArray(valor) && valor.every((item) => typeof item === 'string');
  }
}
