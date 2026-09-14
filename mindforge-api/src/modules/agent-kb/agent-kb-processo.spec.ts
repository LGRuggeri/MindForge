import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AgentKbService } from './agent-kb.service';

jest.mock('node:child_process', () => ({
  execFile: Object.assign(jest.fn(), {
    [jest.requireActual<typeof import('node:util')>('node:util').promisify.custom]: jest.fn(),
  }),
}));

const executar = (execFile as unknown as Record<symbol, jest.Mock>)[promisify.custom];
const projeto = {
  id: 'uuid-projeto',
  name: 'MindForge',
  slug: 'mindforge',
  core_objective: 'Estudar',
  status: 'active',
};
const memoria = {
  title: 'Título',
  summary: 'Resumo',
  content: 'CONTEUDO_PRIVADO',
  nodeType: 'ADR',
};
const contexto = {
  query: 'consulta',
  project_id: projeto.id,
  token_budget: 4000,
  tokens_used: 12,
  latency_ms: 1,
  semantic_enabled: false,
  pack: {
    rules: [],
    skills: [],
    memory: [{ id: 'm1', title: 'Decisão', type: 'ADR', tokens: 12 }],
    mcp_tools: [],
  },
};
const responder = (valor: unknown) =>
  executar.mockResolvedValueOnce({ stdout: JSON.stringify(valor), stderr: '' });
const criar = (config: Record<string, string | undefined> = {}) =>
  new AgentKbService(
    new ConfigService({
      AGENT_KB_ENABLED: 'true',
      AGENT_KB_SCRIPT_PATH: 'C:/teste/agent_kb.py',
      AGENT_KB_PROJECT_ID: 'mindforge',
      ...config,
    }),
  );

describe('Agent KB — contrato do subprocesso', () => {
  beforeEach(() => {
    executar.mockReset();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    { AGENT_KB_ENABLED: 'false' },
    { AGENT_KB_SCRIPT_PATH: '' },
    { AGENT_KB_PROJECT_ID: '' },
  ])('não executa o processo com configuração indisponível: %j', async (config) => {
    const service = criar(config);
    await expect(
      service.ensureProject({ name: 'MindForge', objective: 'Estudar' }),
    ).rejects.toThrow('não está habilitado');
    await expect(service.addMemory(memoria)).rejects.toThrow('não está habilitado');
    await expect(service.semanticSearch('consulta')).rejects.toThrow('não está habilitado');
    expect(executar).not.toHaveBeenCalled();
  });

  it.each(['mindforge', projeto.id])(
    'resolve projeto por slug ou UUID (%s) e normaliza o contexto',
    async (identificador) => {
      responder([projeto]);
      responder(contexto);
      responder(contexto);
      const service = criar({ AGENT_KB_PROJECT_ID: identificador });
      expect(await service.buildContextPack('consulta')).toMatchObject({
        pack: { memory: [{ node_type: 'ADR' }] },
      });
      await service.buildContextPack('outra consulta', 1000);
      expect(executar).toHaveBeenCalledTimes(3);
      expect(executar.mock.calls[1]).toEqual([
        expect.stringMatching(/^python3?$/),
        [
          'C:/teste/agent_kb.py',
          'context-pack',
          'consulta',
          '--project-id',
          projeto.id,
          '--budget',
          '4000',
        ],
        expect.objectContaining({
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
          encoding: 'utf8',
        }),
      ]);
      expect(executar.mock.calls[2][1]).toContain('1000');
    },
  );

  it('prioriza o identificador configurado sobre projeto homônimo', async () => {
    responder([{ ...projeto, id: 'outro', slug: 'outro' }, projeto]);
    const resultado = await criar().ensureProject({ name: 'MindForge', objective: 'Estudar' });
    expect(resultado).toEqual({
      id: projeto.id,
      name: 'MindForge',
      slug: 'mindforge',
      coreObjective: 'Estudar',
      status: 'active',
    });
  });

  it('aceita projeto legado pelo nome quando o identificador não existe', async () => {
    responder([{ ...projeto, slug: 'legado' }]);
    expect(await criar().ensureProject({ name: 'MindForge', objective: 'Estudar' })).toMatchObject({
      id: projeto.id,
    });
  });

  it.each([undefined, ['NestJS', 'PostgreSQL']])(
    'cria projeto e lê o registro completo após o recibo (%j)',
    async (techStack) => {
      responder([]);
      responder({ id: projeto.id, name: projeto.name, status: 'created' });
      responder(projeto);
      const resultado = await criar().ensureProject({
        name: projeto.name,
        objective: 'Estudar',
        techStack,
      });
      expect(resultado.coreObjective).toBe('Estudar');
      expect(executar.mock.calls[2][1]).toEqual([
        'C:/teste/agent_kb.py',
        'project',
        'get',
        projeto.id,
      ]);
      expect(executar.mock.calls[1][1]).toEqual([
        'C:/teste/agent_kb.py',
        'project',
        'add',
        '--name',
        projeto.name,
        '--objective',
        'Estudar',
        ...(techStack ? ['--tech-stack', ...techStack] : []),
      ]);
    },
  );

  it.each([
    {},
    {
      importance: 'high' as const,
      tags: ['adr', 'teste'],
      sourceType: 'docs',
      sourceRef: 'ADR-001',
    },
  ])('normaliza recibo de memória e preserva argumentos como dados (%j)', async (opcionais) => {
    responder([projeto]);
    responder({ id: 'm1', title: memoria.title, status: 'created', embedded: false });
    const params = { ...memoria, ...opcionais };
    const resultado = await criar().addMemory(params);
    expect(resultado).toMatchObject({
      ...params,
      id: 'm1',
      projectId: projeto.id,
      importance: opcionais.importance ?? 'medium',
    });
    const args = executar.mock.calls[1][1] as string[];
    expect(args[args.indexOf('--content') + 1]).toBe('CONTEUDO_PRIVADO');
    expect(args.includes('--tags')).toBe(Boolean(opcionais.tags));
    if (opcionais.sourceRef)
      expect(args).toEqual(
        expect.arrayContaining(['--source-ref', 'ADR-001', '--source-type', 'docs']),
      );
  });

  it.each([undefined, 3])('extrai resultados de busca do envelope real (%j)', async (limite) => {
    responder([projeto]);
    responder({
      query: 'consulta',
      mode: 'hybrid',
      total: 1,
      latency_ms: 2,
      results: [
        { id: 'm1', title: 'Decisão', summary: 'Resumo', node_type: 'ADR', final_score: 0.75 },
      ],
    });
    expect(await criar().semanticSearch('consulta', limite)).toEqual([
      {
        id: 'm1',
        domain: 'memory',
        title: 'Decisão',
        summary: 'Resumo',
        node_type: 'ADR',
        score: 0.75,
      },
    ]);
    expect(executar.mock.calls[1][1]).toEqual(
      expect.arrayContaining(['--mode', 'hybrid', '--limit', String(limite ?? 5)]),
    );
  });

  it('não consulta outro projeto quando o configurado está ausente', async () => {
    responder([]);
    await expect(criar().buildContextPack('consulta')).rejects.toThrow('não encontrado');
    expect(executar).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Error('CONTEUDO_PRIVADO'),
    Object.assign(new Error('CONTEUDO_PRIVADO'), { killed: true, code: 'ETIMEDOUT' }),
    'CONTEUDO_PRIVADO',
  ])('oculta argumentos e detalhes em erros do processo (%j)', async (falha) => {
    responder([projeto]);
    executar.mockRejectedValueOnce(falha);
    await expect(criar().addMemory(memoria)).rejects.toThrow(/^Falha ao executar agent_kb\.$/);
    expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toContain(
      'CONTEUDO_PRIVADO',
    );
  });

  it.each(['JSON_PRIVADO_INVÁLIDO', 'null', '{}', '[{"id": 123}]'])(
    'rejeita saída inválida sem divulgar seu conteúdo (%s)',
    async (stdout) => {
      executar.mockResolvedValueOnce({ stdout, stderr: 'CONTEUDO_PRIVADO' });
      await expect(criar().semanticSearch('CONTEUDO_PRIVADO')).rejects.toThrow(
        /^Falha ao executar agent_kb\.$/,
      );
      expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toContain(
        'PRIVADO',
      );
    },
  );

  it.each([{ ...contexto, pack: null }, { results: 'inválido' }])(
    'valida respostas posteriores à resolução do projeto (%j)',
    async (resposta) => {
      responder([projeto]);
      responder(resposta);
      const service = criar();
      await expect(
        'results' in resposta
          ? service.semanticSearch('consulta')
          : service.buildContextPack('consulta'),
      ).rejects.toThrow('Falha ao executar agent_kb.');
    },
  );
});
