import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { buscaSchema, contextoSchema, projetoSchema, reciboSchema } from './contratos-agent-kb';

const execFileAsync = promisify(execFile);

export interface AgentKbProject {
  id: string;
  name: string;
  slug: string;
  coreObjective: string;
  status: string;
}

export interface AgentKbMemoryNode {
  id: string;
  title: string;
  summary: string;
  content: string;
  nodeType: string;
  importance: string;
  projectId?: string;
  sourceType?: string;
  sourceRef?: string;
  tags?: string[];
  createdAt?: string;
}

export interface AgentKbContextPackItem {
  id: string;
  name?: string;
  title?: string;
  summary?: string;
  level?: string;
  node_type?: string;
  importance?: string;
  tokens: number;
}

export interface AgentKbContextPack {
  query: string;
  project_id: string;
  token_budget: number;
  tokens_used: number;
  latency_ms: number;
  semantic_enabled: boolean;
  pack: {
    rules: AgentKbContextPackItem[];
    skills: AgentKbContextPackItem[];
    memory: AgentKbContextPackItem[];
    mcp_tools: AgentKbContextPackItem[];
  };
}

export interface AgentKbSearchResult {
  id: string;
  domain: string;
  title: string;
  summary: string;
  score: number;
  node_type?: string;
}

@Injectable()
export class AgentKbService implements OnModuleInit {
  private readonly logger = new Logger(AgentKbService.name);
  private readonly enabled: boolean;
  private readonly scriptPath?: string;
  private readonly projectId?: string;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('AGENT_KB_ENABLED') === 'true';
    this.scriptPath = this.config.get<string>('AGENT_KB_SCRIPT_PATH');
    this.projectId = this.config.get<string>('AGENT_KB_PROJECT_ID');
  }

  private projectUuid?: string;

  onModuleInit() {
    if (this.enabled) {
      this.logger.log(`Agent KB habilitado: script=${this.scriptPath}, projeto=${this.projectId}`);
    } else {
      this.logger.log('Agent KB desabilitado via AGENT_KB_ENABLED');
    }
  }

  /**
   * Verifica se o agent_kb está configurado e disponível.
   */
  isAvailable(): boolean {
    return this.enabled && Boolean(this.scriptPath) && Boolean(this.projectId);
  }

  /**
   * Cria ou retorna o projeto MindForge no agent_kb.
   * O slug é usado como identificador estável.
   */
  async ensureProject(params: {
    name: string;
    objective: string;
    techStack?: string[];
  }): Promise<AgentKbProject> {
    this.assertAvailable();
    const existing = await this.run(['project', 'list'], projetoSchema.array());
    const found =
      existing.find((p) => p.id === this.projectId || p.slug === this.projectId) ??
      existing.find((p) => p.name === params.name);
    if (found) {
      this.projectUuid = found.id;
      return found;
    }

    const args = ['project', 'add', '--name', params.name, '--objective', params.objective];
    if (params.techStack && params.techStack.length > 0) {
      args.push('--tech-stack', ...params.techStack);
    }
    const recibo = await this.run(args, reciboSchema);
    const created = await this.run(['project', 'get', recibo.id], projetoSchema);
    this.projectUuid = created.id;
    return created;
  }

  /**
   * Adiciona um nó de memória ao agent_kb.
   */
  async addMemory(params: {
    title: string;
    summary: string;
    content: string;
    nodeType: 'ADR' | 'EXPLANATION' | 'PATTERN' | 'BUG_FIX' | 'BUSINESS_RULE' | string;
    importance?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    sourceType?: string;
    sourceRef?: string;
  }): Promise<AgentKbMemoryNode> {
    this.assertAvailable();
    const projectId = await this.resolveProjectId();
    const args = [
      'memory',
      'add',
      '--title',
      params.title,
      '--summary',
      params.summary,
      '--content',
      params.content,
      '--node-type',
      params.nodeType,
      '--importance',
      params.importance ?? 'medium',
      '--project-id',
      projectId,
    ];
    if (params.tags && params.tags.length > 0) {
      args.push('--tags', ...params.tags);
    }
    if (params.sourceType) {
      args.push('--source-type', params.sourceType);
    }
    if (params.sourceRef) {
      args.push('--source-ref', params.sourceRef);
    }
    const recibo = await this.run(args, reciboSchema);
    return { ...params, id: recibo.id, importance: params.importance ?? 'medium', projectId };
  }

  /**
   * Monta um context pack otimizado para uma query/tarefa.
   */
  async buildContextPack(query: string, budget = 4000): Promise<AgentKbContextPack> {
    this.assertAvailable();
    const projectId = await this.resolveProjectId();
    return this.run(
      ['context-pack', query, '--project-id', projectId, '--budget', String(budget)],
      contextoSchema,
    );
  }

  /**
   * Busca semântica híbrida no agent_kb.
   */
  async semanticSearch(query: string, limit = 5): Promise<AgentKbSearchResult[]> {
    this.assertAvailable();
    const projectId = await this.resolveProjectId();
    return this.run(
      [
        'semantic-search',
        query,
        '--project-id',
        projectId,
        '--mode',
        'hybrid',
        '--limit',
        String(limit),
      ],
      buscaSchema,
    );
  }

  private async resolveProjectId(): Promise<string> {
    if (this.projectUuid) {
      return this.projectUuid;
    }
    const existing = await this.run(['project', 'list'], projetoSchema.array());
    const found = existing.find((p) => p.id === this.projectId || p.slug === this.projectId);
    if (!found) {
      throw new Error(`Projeto ${this.projectId} não encontrado no agent_kb`);
    }
    this.projectUuid = found.id;
    return found.id;
  }

  private assertAvailable() {
    if (!this.isAvailable()) {
      throw new Error('Agent KB não está habilitado ou não foi configurado');
    }
  }

  private async run<T>(args: string[], schema: z.ZodType<T>): Promise<T> {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    try {
      const { stdout } = await execFileAsync(python, [this.scriptPath!, ...args], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60_000,
        windowsHide: true,
        encoding: 'utf8',
      });
      return schema.parse(JSON.parse(stdout) as unknown);
    } catch {
      this.logger.error('Falha no subprocesso ou na resposta do agent_kb.');
      throw new Error('Falha ao executar agent_kb.');
    }
  }
}
