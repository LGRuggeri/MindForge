# Fase 3 — Knowledge Graph Implementation Plan

> **For Hermes:** Use subagent-driven-development or execute directly task-by-task.

**Goal:** Tornar o módulo `knowledge-graph` funcional: extrair competências automaticamente de trilhas e conteúdos, persistir nós/arestas, expor progresso do aluno e caminhos de pré-requisito via REST, e alimentar o progresso a partir de módulos concluídos e exercícios bem-sucedidos.

**Architecture:** Lista de adjacência em PostgreSQL (`competencias` + `competencia_relacoes`) com consultas recursivas `WITH RECURSIVE` para cadeias de pré-requisitos. Progresso por perfil em `competencia_progresso`. Ligação módulo→competência em `modulo_competencias`. Extração de competências feita por agente LLM no pipeline do Planner (trilha) e Synthesizer (conteúdo), com fallback para palavras-chave do conteúdo.

**Tech Stack:** NestJS + Drizzle ORM + PostgreSQL + pgvector + OpenAI/GPT-5.5 via `AgentesService`.

---

## Contexto atual

- Schemas de competências já existem em `src/database/schema/competencias.schema.ts`.
- Relações Drizzle em `src/database/schema/index.ts` já exportam `competencias`, `competenciaRelacoes`, `competenciaProgresso`, `moduloCompetencias`, mas faltam relações de `competenciaRelacoes` e `moduloCompetencias`.
- `src/modules/knowledge-graph/` é placeholder: `knowledge-graph.module.ts`, `knowledge-graph.service.ts` (vazio) e `knowledge-graph.controller.ts` (vazio).
- Planner e Synthesizer já geram módulos e conteúdo, mas não populam o grafo.

---

## Task 1: Completar relações Drizzle no schema de competências

**Objective:** Adicionar relações faltantes para `competenciaRelacoes` e `moduloCompetencias` e expor tipos de insert.

**Files:**
- Modify: `src/database/schema/index.ts`

**Step 1: Adicionar relações**

```typescript
export const competenciaRelacoesRelations = relations(competenciaRelacoes, ({ one }) => ({
  origem: one(competencias, {
    fields: [competenciaRelacoes.competenciaOrigemId],
    references: [competencias.id],
    relationName: 'origem',
  }),
  destino: one(competencias, {
    fields: [competenciaRelacoes.competenciaDestinoId],
    references: [competencias.id],
    relationName: 'destino',
  }),
}));

export const moduloCompetenciasRelations = relations(moduloCompetencias, ({ one }) => ({
  modulo: one(modulosTrilha, {
    fields: [moduloCompetencias.moduloId],
    references: [modulosTrilha.id],
  }),
  competencia: one(competencias, {
    fields: [moduloCompetencias.competenciaId],
    references: [competencias.id],
  }),
}));

export const competenciaProgressoRelations = relations(competenciaProgresso, ({ one }) => ({
  competencia: one(competencias, {
    fields: [competenciaProgresso.competenciaId],
    references: [competencias.id],
  }),
  perfil: one(perfilAprendizagem, {
    fields: [competenciaProgresso.perfilId],
    references: [perfilAprendizagem.id],
  }),
}));
```

**Step 2: Verificar tipos de insert**

Em `competencias.schema.ts`, os tipos de insert já existem para `competencias`, `competenciaRelacoes`, `competenciaProgresso`, mas não para `moduloCompetencias`. Adicionar:

```typescript
export type NovoModuloCompetencia = typeof moduloCompetencias.$inferInsert;
```

**Step 3: Verificar build**

Run: `npm run build`
Expected: pass (sem erros de TypeScript)

**Step 4: Commit**

```bash
git add src/database/schema/index.ts src/database/schema/competencias.schema.ts
git commit -m "chore(schema): relações e tipos do knowledge graph"
```

---

## Task 2: Criar KnowledgeGraphRepository

**Objective:** Centralizar queries de grafo em um repository, seguindo o padrão do projeto (service não importa `drizzle-orm`).

**Files:**
- Create: `src/modules/knowledge-graph/knowledge-graph.repository.ts`

**Step 1: Implementar repository**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, inArray, sql, SQL } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  competencias,
  competenciaRelacoes,
  competenciaProgresso,
  moduloCompetencias,
  Competencia,
  NovaCompetencia,
  CompetenciaRelacao,
  CompetenciaProgresso,
  NovoModuloCompetencia,
} from '../../database/schema';

export interface CompetenciaComProgresso extends Competencia {
  progresso?: CompetenciaProgresso | null;
}

export interface CaminhoNo {
  id: string;
  nome: string;
  tipoRelacao: string;
  profundidade: number;
}

@Injectable()
export class KnowledgeGraphRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criarCompetencia(dados: NovaCompetencia) {
    const [comp] = await this.db.insert(competencias).values(dados).returning();
    return comp;
  }

  async buscarCompetenciaPorId(id: string) {
    return this.db.query.competencias.findFirst({
      where: eq(competencias.id, id),
      with: { relacoesOrigem: { with: { destino: true } }, progresso: true },
    });
  }

  async buscarCompetenciaPorNome(nome: string) {
    return this.db.query.competencias.findFirst({
      where: eq(competencias.nome, nome),
    });
  }

  async criarRelacao(dados: { competenciaOrigemId: string; competenciaDestinoId: string; tipoRelacao: string }) {
    const [relacao] = await this.db.insert(competenciaRelacoes).values(dados).returning();
    return relacao;
  }

  async vincularModuloCompetencias(dados: NovoModuloCompetencia[]) {
    if (dados.length === 0) return [];
    return this.db.insert(moduloCompetencias).values(dados).returning();
  }

  async listarCompetenciasDoModulo(moduloId: string) {
    return this.db.query.moduloCompetencias.findMany({
      where: eq(moduloCompetencias.moduloId, moduloId),
      with: { competencia: true },
    });
  }

  async listarCompetenciasDoPerfil(perfilId: string) {
    return this.db.query.competencias.findMany({
      with: {
        progresso: {
          where: eq(competenciaProgresso.perfilId, perfilId),
        },
        modulos: { with: { modulo: true } },
      },
    });
  }

  async atualizarProgresso(
    competenciaId: string,
    perfilId: string,
    nivel: string,
    evidencia?: string,
  ) {
    const agora = new Date();
    const [existente] = await this.db
      .select()
      .from(competenciaProgresso)
      .where(
        and(
          eq(competenciaProgresso.competenciaId, competenciaId),
          eq(competenciaProgresso.perfilId, perfilId),
        ),
      );

    if (existente) {
      const [atualizado] = await this.db
        .update(competenciaProgresso)
        .set({ nivelAtual: nivel, evidencia, atualizadoEm: agora })
        .where(eq(competenciaProgresso.id, existente.id))
        .returning();
      return atualizado;
    }

    const [novo] = await this.db
      .insert(competenciaProgresso)
      .values({ competenciaId, perfilId, nivelAtual: nivel, evidencia, atualizadoEm: agora })
      .returning();
    return novo;
  }

  async buscarCaminhoDePreRequisitos(competenciaId: string): Promise<CaminhoNo[]> {
    const result = await this.db.execute<CaminhoNo>(sql`
      WITH RECURSIVE cadeia AS (
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          0 AS profundidade
        FROM competencias c
        JOIN competencia_relacoes r ON r.competencia_destino_id = c.id
        WHERE c.id = ${competenciaId}
          AND r.tipo_relacao = 'pre_requisito'
        UNION ALL
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          cadeia.profundidade + 1
        FROM competencia_relacoes r
        JOIN competencias c ON c.id = r.competencia_destino_id
        JOIN cadeia ON cadeia.id = r.competencia_origem_id
        WHERE r.tipo_relacao = 'pre_requisito'
          AND cadeia.profundidade < 10
      )
      SELECT * FROM cadeia ORDER BY profundidade DESC;
    `);
    return result.rows;
  }

  async buscarDependentes(competenciaId: string): Promise<CaminhoNo[]> {
    const result = await this.db.execute<CaminhoNo>(sql`
      WITH RECURSIVE cadeia AS (
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          0 AS profundidade
        FROM competencias c
        JOIN competencia_relacoes r ON r.competencia_origem_id = c.id
        WHERE c.id = ${competenciaId}
          AND r.tipo_relacao = 'pre_requisito'
        UNION ALL
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          cadeia.profundidade + 1
        FROM competencia_relacoes r
        JOIN competencias c ON c.id = r.competencia_origem_id
        JOIN cadeia ON cadeia.id = r.competencia_destino_id
        WHERE r.tipo_relacao = 'pre_requisito'
          AND cadeia.profundidade < 10
      )
      SELECT * FROM cadeia ORDER BY profundidade;
    `);
    return result.rows;
  }
}
```

**Step 2: Criar teste de repository**

Create: `src/modules/knowledge-graph/knowledge-graph.repository.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';
import { DRIZZLE } from '../../database/database.module';

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnValue([]),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  query: {
    competencias: { findFirst: jest.fn(), findMany: jest.fn() },
    moduloCompetencias: { findMany: jest.fn() },
  },
  execute: jest.fn().mockResolvedValue({ rows: [] }),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

describe('KnowledgeGraphRepository', () => {
  let repo: KnowledgeGraphRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: DRIZZLE, useValue: mockDb }, KnowledgeGraphRepository],
    }).compile();
    repo = module.get(KnowledgeGraphRepository);
  });

  it('deve criar competência', async () => {
    const comp = { id: 'c1', nome: 'Rust básico' };
    mockDb.returning.mockResolvedValueOnce([comp]);
    const result = await repo.criarCompetencia({ nome: 'Rust básico' });
    expect(result).toEqual(comp);
  });
});
```

**Step 3: Rodar teste**

Run: `npx jest src/modules/knowledge-graph/knowledge-graph.repository.spec.ts --no-coverage`
Expected: PASS

**Step 4: Commit**

```bash
git add src/modules/knowledge-graph/knowledge-graph.repository.ts src/modules/knowledge-graph/knowledge-graph.repository.spec.ts
git commit -m "feat(knowledge-graph): repository de competências e grafo"
```

---

## Task 3: Criar DTOs do Knowledge Graph

**Objective:** Definir contratos de entrada para competências, relações, progresso e progresso por módulo.

**Files:**
- Create: `src/modules/knowledge-graph/dto/criar-competencia.dto.ts`
- Create: `src/modules/knowledge-graph/dto/criar-relacao.dto.ts`
- Create: `src/modules/knowledge-graph/dto/atualizar-progresso.dto.ts`
- Create: `src/modules/knowledge-graph/dto/criar-progresso-modulo.dto.ts`

**Step 1: Implementar DTOs**

```typescript
// criar-competencia.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CriarCompetenciaDto {
  @IsString()
  nome!: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsString()
  @IsOptional()
  categoria?: string;
}

// criar-relacao.dto.ts
import { IsUUID, IsIn } from 'class-validator';

const tiposRelacao = ['pre_requisito', 'relacionada', 'aprofundamento'] as const;

export class CriarRelacaoDto {
  @IsUUID()
  competenciaOrigemId!: string;

  @IsUUID()
  competenciaDestinoId!: string;

  @IsIn(tiposRelacao)
  tipoRelacao!: typeof tiposRelacao[number];
}

// atualizar-progresso.dto.ts
import { IsUUID, IsIn, IsString, IsOptional } from 'class-validator';

const niveis = ['nao_iniciado', 'aprendendo', 'praticando', 'dominado'] as const;

export class AtualizarProgressoDto {
  @IsUUID()
  competenciaId!: string;

  @IsUUID()
  perfilId!: string;

  @IsIn(niveis)
  nivel!: typeof niveis[number];

  @IsString()
  @IsOptional()
  evidencia?: string;
}

// criar-progresso-modulo.dto.ts
import { IsUUID } from 'class-validator';

export class CriarProgressoModuloDto {
  @IsUUID()
  moduloId!: string;

  @IsUUID()
  perfilId!: string;
}
```

**Step 2: Commit**

```bash
git add src/modules/knowledge-graph/dto
git commit -m "feat(knowledge-graph): DTOs de competências, relações e progresso"
```

---

## Task 4: Implementar KnowledgeGraphService

**Objective:** Lógica de negócio: criar nós/arestas, vincular módulos, listar grafo com progresso, caminhos de pré-requisito e progresso automático por módulo.

**Files:**
- Modify: `src/modules/knowledge-graph/knowledge-graph.service.ts`
- Create: `src/modules/knowledge-graph/knowledge-graph.service.spec.ts`

**Step 1: Implementar service**

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';
import { CriarCompetenciaDto } from './dto/criar-competencia.dto';
import { CriarRelacaoDto } from './dto/criar-relacao.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(private readonly repo: KnowledgeGraphRepository) {}

  async criarCompetencia(dto: CriarCompetenciaDto) {
    const existente = await this.repo.buscarCompetenciaPorNome(dto.nome);
    if (existente) return existente;
    const competencia = await this.repo.criarCompetencia(dto);
    this.logger.log(`Competência criada: ${competencia.id} (${competencia.nome})`);
    return competencia;
  }

  async criarRelacao(dto: CriarRelacaoDto) {
    const relacao = await this.repo.criarRelacao(dto);
    this.logger.log(`Relação criada: ${relacao.id}`);
    return relacao;
  }

  async listarGrafoDoPerfil(perfilId: string) {
    const competencias = await this.repo.listarCompetenciasDoPerfil(perfilId);
    return competencias.map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      categoria: c.categoria,
      progresso: c.progresso?.[0] ?? null,
      modulos: c.modulos.map((m) => m.modulo),
    }));
  }

  async buscarCaminhoDePreRequisitos(competenciaId: string) {
    return this.repo.buscarCaminhoDePreRequisitos(competenciaId);
  }

  async buscarDependentes(competenciaId: string) {
    return this.repo.buscarDependentes(competenciaId);
  }

  async atualizarProgresso(dto: AtualizarProgressoDto) {
    return this.repo.atualizarProgresso(dto.competenciaId, dto.perfilId, dto.nivel, dto.evidencia);
  }

  async marcarProgressoPorModulo(moduloId: string, perfilId: string) {
    const vinculos = await this.repo.listarCompetenciasDoModulo(moduloId);
    if (vinculos.length === 0) {
      this.logger.warn(`Nenhuma competência vinculada ao módulo ${moduloId}`);
      return { atualizados: 0 };
    }

    let atualizados = 0;
    for (const v of vinculos) {
      await this.repo.atualizarProgresso(
        v.competencia.id,
        perfilId,
        'aprendendo',
        `Módulo ${v.moduloId} concluído/estudado`,
      );
      atualizados++;
    }

    this.logger.log(`Progresso atualizado para ${atualizados} competências do perfil ${perfilId}`);
    return { atualizados };
  }
}
```

**Step 2: Teste unitário**

Create: `src/modules/knowledge-graph/knowledge-graph.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';

const mockRepo = {
  criarCompetencia: jest.fn(),
  buscarCompetenciaPorNome: jest.fn().mockResolvedValue(null),
  criarRelacao: jest.fn(),
  listarCompetenciasDoPerfil: jest.fn().mockResolvedValue([]),
  buscarCaminhoDePreRequisitos: jest.fn().mockResolvedValue([]),
  buscarDependentes: jest.fn().mockResolvedValue([]),
  atualizarProgresso: jest.fn(),
  listarCompetenciasDoModulo: jest.fn().mockResolvedValue([]),
};

describe('KnowledgeGraphService', () => {
  let service: KnowledgeGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeGraphService,
        { provide: KnowledgeGraphRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(KnowledgeGraphService);
  });

  it('deve criar competência', async () => {
    mockRepo.criarCompetencia.mockResolvedValue({ id: 'c1', nome: 'Rust' });
    const result = await service.criarCompetencia({ nome: 'Rust' });
    expect(result.nome).toBe('Rust');
  });

  it('deve atualizar progresso por módulo', async () => {
    mockRepo.listarCompetenciasDoModulo.mockResolvedValue([
      { competencia: { id: 'c1' }, moduloId: 'm1' },
    ]);
    mockRepo.atualizarProgresso.mockResolvedValue({ id: 'p1' });
    const result = await service.marcarProgressoPorModulo('m1', 'perfil1');
    expect(result.atualizados).toBe(1);
  });
});
```

**Step 3: Rodar teste**

Run: `npx jest src/modules/knowledge-graph/knowledge-graph.service.spec.ts --no-coverage`
Expected: PASS

**Step 4: Commit**

```bash
git add src/modules/knowledge-graph/knowledge-graph.service.ts src/modules/knowledge-graph/knowledge-graph.service.spec.ts
git commit -m "feat(knowledge-graph): service de nós, arestas, progresso e caminhos"
```

---

## Task 5: Implementar KnowledgeGraphController

**Objective:** Expor endpoints REST para manipular e consultar o grafo.

**Files:**
- Modify: `src/modules/knowledge-graph/knowledge-graph.controller.ts`

**Step 1: Implementar controller**

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { CriarCompetenciaDto } from './dto/criar-competencia.dto';
import { CriarRelacaoDto } from './dto/criar-relacao.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';
import { CriarProgressoModuloDto } from './dto/criar-progresso-modulo.dto';

@Controller('knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly service: KnowledgeGraphService) {}

  @Post('competencias')
  criarCompetencia(@Body() dto: CriarCompetenciaDto) {
    return this.service.criarCompetencia(dto);
  }

  @Get('competencias/:id')
  buscarCompetencia(@Param('id') id: string) {
    return this.service.listarGrafoDoPerfil(id); // placeholder? decidir: listar por perfil ou competência
  }

  @Post('relacoes')
  criarRelacao(@Body() dto: CriarRelacaoDto) {
    return this.service.criarRelacao(dto);
  }

  @Get('perfis/:perfilId')
  listarGrafoDoPerfil(@Param('perfilId') perfilId: string) {
    return this.service.listarGrafoDoPerfil(perfilId);
  }

  @Get('perfis/:perfilId/proximos')
  async proximosPassos(@Param('perfilId') perfilId: string) {
    const grafo = await this.service.listarGrafoDoPerfil(perfilId);
    const bloqueados = grafo.filter(
      (c) => c.progresso?.nivelAtual !== 'dominado',
    );
    return bloqueados.slice(0, 10);
  }

  @Get('competencias/:id/pre-requisitos')
  buscarPreRequisitos(@Param('id') id: string) {
    return this.service.buscarCaminhoDePreRequisitos(id);
  }

  @Get('competencias/:id/dependentes')
  buscarDependentes(@Param('id') id: string) {
    return this.service.buscarDependentes(id);
  }

  @Post('progresso')
  atualizarProgresso(@Body() dto: AtualizarProgressoDto) {
    return this.service.atualizarProgresso(dto);
  }

  @Post('progresso/modulo')
  marcarProgressoPorModulo(@Body() dto: CriarProgressoModuloDto) {
    return this.service.marcarProgressoPorModulo(dto.moduloId, dto.perfilId);
  }
}
```

**Observação:** O endpoint `@Get('competencias/:id')` pode conflitar com `@Get('competencias/:id/pre-requisitos')` se NestJS interpretar "id" como "pre-requisitos". Ajustar ordem das rotas para rotas estáticas primeiro (pre-requisitos e dependentes) antes da rota com `:id` simples, ou remover o endpoint ambíguo.

**Step 2: Commit**

```bash
git add src/modules/knowledge-graph/knowledge-graph.controller.ts
git commit -m "feat(knowledge-graph): endpoints REST do grafo"
```

---

## Task 6: Integrar extração de competências no Planner

**Objective:** Quando o Planner gerar uma trilha, extrair competências dos módulos e vincular ao módulo.

**Files:**
- Modify: `src/modules/planner/planner.service.ts`
- Modify: `src/modules/planner/planner.module.ts`
- Modify: `src/modules/planner/planner.repository.ts` (se necessário expor vinculação)

**Step 1: Injetar KnowledgeGraphService no PlannerService**

```typescript
constructor(
  private readonly repo: PlannerRepository,
  private readonly agentes: AgentesService,
  private readonly knowledgeGraph: KnowledgeGraphService,
) {}
```

Importar `KnowledgeGraphModule` em `PlannerModule`.

**Step 2: Após criar módulos, extrair competências**

Para cada módulo:

```typescript
const competencias = await this.knowledgeGraph.criarCompetencia({
  nome: m.objetivoAprendizagem,
  categoria: 'planner',
});
await this.knowledgeGraph.criarRelacao({
  competenciaOrigemId: competenciaAnterior?.id,
  competenciaDestinoId: competencias.id,
  tipoRelacao: 'pre_requisito',
});
```

Implementar lógica de encadeamento: módulo[i] → pré-requisito de módulo[i+1].

**Step 3: Commit**

```bash
git add src/modules/planner/planner.service.ts src/modules/planner/planner.module.ts
git commit -m "feat(planner): extrai competências e liga ao knowledge graph"
```

---

## Task 7: Integrar extração de competências no Synthesizer

**Objective:** Quando o Synthesizer gerar conteúdo, extrair competências do texto e vincular ao módulo.

**Files:**
- Modify: `src/modules/synthesizer/synthesizer.service.ts`
- Modify: `src/modules/synthesizer/synthesizer.module.ts`

**Step 1: Injetar KnowledgeGraphService no SynthesizerService**

```typescript
constructor(
  private readonly repo: SynthesizerRepository,
  private readonly agentes: AgentesService,
  private readonly biblioteca: BibliotecaVivaService,
  private readonly reviewer: ReviewerService,
  private readonly knowledgeGraph: KnowledgeGraphService,
) {}
```

Importar `KnowledgeGraphModule` em `SynthesizerModule`.

**Step 2: Após salvar conteúdo, extrair competências por LLM ou palavras-chave**

Opção LLM (mais rica):

```typescript
const competenciasExtraidas = await this.agentes.executar<Array<{ nome: string; descricao: string }>>({
  agente: 'synthesizer',
  system: 'Você extrai competências de um conteúdo didático. Retorne JSON array: [{"nome":"string","descricao":"string"}].',
  user: `Conteúdo:\n${conteudoGerado.corpoMarkdown}\n\nPalavras-chave: ${conteudoGerado.palavrasChave.join(', ')}`,
  parser: (raw) => this.parseJsonSeguro(raw),
  entrada: { conteudoId: conteudo.id },
  temperature: 0.4,
});
```

Fallback: usar `palavrasChave` do Synthesizer.

**Step 3: Vincular competências ao módulo**

```typescript
for (const comp of competenciasExtraidas) {
  const competencia = await this.knowledgeGraph.criarCompetencia({
    nome: comp.nome,
    descricao: comp.descricao,
    categoria: 'synthesizer',
  });
  // vincular ao módulo via repository
}
```

**Step 4: Commit**

```bash
git add src/modules/synthesizer/synthesizer.service.ts src/modules/synthesizer/synthesizer.module.ts
git commit -m "feat(synthesizer): extrai competências do conteúdo para o knowledge graph"
```

---

## Task 8: Acionar progresso automático em Exercícios/Avaliações

**Objective:** Quando o aluno acertar exercícios ou for bem em avaliação, subir o nível das competências do módulo.

**Files:**
- Modify: `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts` (ou novo service)
- Modify: `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.module.ts`

**Step 1: Injetar KnowledgeGraphService**

**Step 2: Após correção com nota alta (>= 0.7), marcar competências como 'praticando' ou 'dominado'**

```typescript
const nivel = nota >= 0.9 ? 'dominado' : nota >= 0.7 ? 'praticando' : 'aprendendo';
await this.knowledgeGraph.atualizarProgresso({
  competenciaId: comp.id,
  perfilId,
  nivel,
  evidencia: `Exercício ${exercicioId} acertado com nota ${nota}`,
});
```

**Step 3: Commit**

```bash
git add src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts src/modules/exercicios-avaliacoes/exercicios-avaliacoes.module.ts
git commit -m "feat(exercicios): atualiza progresso do knowledge graph na correção"
```

---

## Task 9: Atualizar módulo knowledge-graph e AppModule

**Objective:** Registrar repository e DTOs no módulo.

**Files:**
- Modify: `src/modules/knowledge-graph/knowledge-graph.module.ts`

**Step 1: Atualizar módulo**

```typescript
import { Module } from '@nestjs/common';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';

@Module({
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService, KnowledgeGraphRepository],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
```

**Step 2: Commit**

```bash
git add src/modules/knowledge-graph/knowledge-graph.module.ts
git commit -m "feat(knowledge-graph): registra providers e exports do módulo"
```

---

## Task 10: Gerar migration e aplicar

**Objective:** Gerar migration com base no schema atualizado.

**Step 1: Gerar migration**

Run: `npm run db:generate`
Expected: cria migration em `src/database/migrations/`

**Step 2: Aplicar migration**

Run: `npm run db:migrate`
Expected: sucesso (verificar conexão com Postgres local)

**Step 3: Commit**

```bash
git add src/database/migrations
git commit -m "chore(db): migration da fase 3 knowledge graph"
```

---

## Task 11: Verificar build, lint e testes

**Step 1: Build**

Run: `npm run build`
Expected: sucesso

**Step 2: Lint**

Run: `npm run lint`
Expected: sem erros (ou auto-fix com `npm run lint:fix`)

**Step 3: Testes**

Run: `npm run test -- --testPathPattern=knowledge-graph --no-coverage`
Expected: todos passam

**Step 4: Commit ajustes**

```bash
git add .
git commit -m "style(knowledge-graph): lint e build"
```

---

## Task 12: Atualizar roadmap e documentação

**Files:**
- Modify: `docs/13-roadmap.md`
- Create: `docs/14-knowledge-graph.md` (opcional)

**Step 1: Atualizar roadmap**

- Marcar Knowledge Graph (progresso automático) como ✅.
- Mover visualização React Flow para próximo item.

**Step 2: Commit**

```bash
git add docs/13-roadmap.md docs/14-knowledge-graph.md
git commit -m "docs(knowledge-graph): atualiza roadmap e adiciona doc da fase 3"
```

---

## Risks, tradeoffs, and open questions

1. **Risco:** extração por LLM pode gerar competências duplicadas ou granulares demais. Mitigação: deduplicação por nome normalizado no service.
2. **Tradeoff:** não usar Neo4j/AGE mantém stack simples, mas consultas de caminho mais longo que 10 níveis precisam de limite. Já colocado `profundidade < 10`.
3. **Questão aberta:** o endpoint `GET /knowledge-graph/competencias/:id` foi deixado como placeholder; decidir se lista competência por ID ou remove.
4. **Questão aberta:** integração com Diário (registrar competências estudadas no dia) pode ser feita na próxima iteração.

---

## Resumo de arquivos

- Novos: `knowledge-graph.repository.ts`, `knowledge-graph.service.ts`, `knowledge-graph.controller.ts`, DTOs, specs.
- Modificados: `src/database/schema/index.ts`, `src/database/schema/competencias.schema.ts`, `planner.service.ts`, `planner.module.ts`, `synthesizer.service.ts`, `synthesizer.module.ts`, `exercicios-avaliacoes.service.ts`, `exercicios-avaliacoes.module.ts`, `docs/13-roadmap.md`.
