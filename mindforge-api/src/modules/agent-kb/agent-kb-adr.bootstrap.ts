import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentKbService } from './agent-kb.service';

interface AdrEntry {
  codigo: string;
  titulo: string;
  conteudo: string;
}

/**
 * Bootstrap que sincroniza os ADRs do MindForge com o agent_kb.
 * Aguarda a sincronização na inicialização; falhas não abortam o startup.
 */
@Injectable()
export class AgentKbAdrBootstrap implements OnModuleInit {
  private readonly logger = new Logger(AgentKbAdrBootstrap.name);

  constructor(private readonly agentKb: AgentKbService) {}

  async onModuleInit() {
    if (!this.agentKb.isAvailable()) {
      this.logger.log('ADRs não serão sincronizados: agent_kb desabilitado');
      return;
    }

    try {
      await this.agentKb.ensureProject({
        name: 'MindForge',
        objective:
          'Plataforma de ensino personalizado com agentes de IA, RAG e trilhas de aprendizado adaptativas',
        techStack: ['NestJS', 'TypeScript', 'Drizzle', 'PostgreSQL', 'pgvector', 'OpenAI', 'Jest'],
      });

      for (const adr of this.adrs()) {
        await this.agentKb.addMemory({
          title: adr.titulo,
          summary: adr.titulo,
          content: adr.conteudo,
          nodeType: 'ADR',
          importance: 'high',
          tags: ['adr', 'mindforge', 'arquitetura'],
          sourceType: 'docs/14-decisoes-arquiteturais.md',
          sourceRef: adr.codigo,
        });
      }

      this.logger.log(`${this.adrs().length} ADRs sincronizados com o agent_kb`);
    } catch {
      this.logger.error('Falha ao sincronizar ADRs com agent_kb.');
    }
  }

  private adrs(): AdrEntry[] {
    return [
      {
        codigo: 'ADR-001',
        titulo: 'ADR-001: Sem Redis',
        conteudo:
          'Decisão: não usar Redis. Alternativas: Redis + BullMQ. Consequências: menos infra local; fila sobre Postgres.',
      },
      {
        codigo: 'ADR-002',
        titulo: 'ADR-002: Fila de jobs sobre Postgres',
        conteudo:
          'Decisão: usar pg-boss (LISTEN/NOTIFY) para jobs longos como pesquisa/síntese/correção. Alternativas: BullMQ, RabbitMQ/SQS.',
      },
      {
        codigo: 'ADR-003',
        titulo: 'ADR-003: TEXT + CHECK em vez de ENUM nativo',
        conteudo:
          'Decisão: status e tipos como TEXT com CHECK constraint. Consequências: migrations simples; validação reforçada nos DTOs.',
      },
      {
        codigo: 'ADR-004',
        titulo: 'ADR-004: UUID como PK',
        conteudo:
          'Decisão: UUID primary key via defaultRandom(). Consequências: merges fáceis, sem vazar volume; índices um pouco maiores.',
      },
      {
        codigo: 'ADR-005',
        titulo: 'ADR-005: revisao_espacada polimórfica',
        conteudo:
          'Decisão: item_tipo + item_id sem FK real. Alternativas: 3 tabelas com FK. Consequências: menos duplicação; sem integridade referencial automática nessa tabela.',
      },
      {
        codigo: 'ADR-006',
        titulo: 'ADR-006: HNSW para índice vetorial',
        conteudo:
          'Decisão: HNSW vector_cosine_ops (defaults pgvector). Alternativas: IVFFlat. Consequências: funciona desde o primeiro chunk, sem treino.',
      },
      {
        codigo: 'ADR-007',
        titulo: 'ADR-007: Postgres único com pgvector',
        conteudo:
          'Decisão: não usar Qdrant. Consequências: um banco só; escala vetorial pessoal é suficiente.',
      },
      {
        codigo: 'ADR-008',
        titulo: 'ADR-008: Drizzle como ORM',
        conteudo:
          'Decisão: Drizzle (suporte nativo a vector + cosineDistance). Alternativas: Prisma (vector fraco), TypeORM. Consequências: wiring manual no Nest; query vetorial de primeira classe.',
      },
      {
        codigo: 'ADR-009',
        titulo: 'ADR-009: Módulo pragmático controller-service-repository',
        conteudo:
          'Decisão: não usar hexagonal completo. Consequências: service não importa Drizzle; só repository.',
      },
      {
        codigo: 'ADR-010',
        titulo: 'ADR-010: TypeScript 6.x',
        conteudo:
          'Decisão: fixar TypeScript ^6 por compatibilidade com Nest CLI. Revisitar quando Nest suportar TS 7.1+.',
      },
      {
        codigo: 'ADR-011',
        titulo: 'ADR-011: Documentação viva',
        conteudo: 'Decisão: núcleo primeiro; docs de módulo atualizados quando o código existir.',
      },
      {
        codigo: 'ADR-012',
        titulo: 'ADR-012: Diário reutiliza agente teacher',
        conteudo:
          'Decisão: usar agente teacher no módulo Diário. Alternativa: criar summarizer. Consequências: enum menor.',
      },
      {
        codigo: 'ADR-013',
        titulo: 'ADR-013: Agente synthesizer no enum de execuções',
        conteudo:
          'Decisão: adicionar synthesizer ao CHECK de agentes_execucoes e ao AgenteTipo. Consequências: logging fiel à geração.',
      },
      {
        codigo: 'ADR-014',
        titulo: 'ADR-014: Postgres Docker na porta 5433',
        conteudo:
          'Decisão: mapear container MindForge para 5433:5432 e DATABASE_URL na 5433. Consequências: coexiste com Postgres nativo na 5432.',
      },
      {
        codigo: 'ADR-015',
        titulo: 'ADR-015: Research curado por LLM (sem search API na v1)',
        conteudo:
          'Decisão: v1 gera lista curada via LLM com priorização de docs oficiais; URLs podem ser null. Consequências: zero chave extra de search; qualidade depende do modelo.',
      },
      {
        codigo: 'ADR-016',
        titulo: 'ADR-016: Provedor de embeddings separado do provedor de chat',
        conteudo:
          'Decisão: EmbeddingService aceita EMBEDDING_API_KEY/EMBEDDING_BASE_URL opcionais, com fallback para LLM_API_KEY/OPENAI_BASE_URL. Em dev, usar Ollama local com nomic-embed-text. Consequências: vetor de dimensão 768.',
      },
    ];
  }
}
