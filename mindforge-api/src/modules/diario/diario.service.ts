import { Injectable, Logger } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { RegistrarDiarioDto } from './dto/registrar-diario.dto';
import { DiarioRepository } from './diario.repository';

export interface RecomendacoesIa {
  recomendacoes: string;
  proximoFoco: string;
  ajustesSugeridos: string[];
}

@Injectable()
export class DiarioService {
  private readonly logger = new Logger(DiarioService.name);

  constructor(
    private readonly repo: DiarioRepository,
    private readonly agentes: AgentesService,
  ) {}

  async registrar(dto: RegistrarDiarioDto) {
    const data = dto.data ?? new Date().toISOString().split('T')[0];

    const registro = await this.repo.criar(
      {
        perfilId: dto.perfilId,
        data,
        tempoInvestidoMin: dto.tempoInvestidoMin ?? 0,
        dificuldades: dto.dificuldades ?? null,
        conquistas: dto.conquistas ?? null,
      },
      dto.moduloIds,
    );

    if (!registro) {
      throw new Error('Falha ao criar registro diário');
    }

    const recomendacoes = await this.gerarRecomendacoes(dto);
    await this.repo.atualizarRecomendacoes(registro.id, recomendacoes.recomendacoes);

    this.logger.log(`Diário registrado: ${registro.id} para perfil ${dto.perfilId}`);

    return {
      ...registro,
      recomendacoesIa: recomendacoes.recomendacoes,
      proximoFoco: recomendacoes.proximoFoco,
      ajustesSugeridos: recomendacoes.ajustesSugeridos,
    };
  }

  async listarPorPerfil(perfilId: string) {
    return this.repo.listarPorPerfil(perfilId);
  }

  private async gerarRecomendacoes(dto: RegistrarDiarioDto): Promise<RecomendacoesIa> {
    return this.agentes.executar<RecomendacoesIa>({
      agente: 'teacher',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(dto),
      entrada: { perfilId: dto.perfilId, data: dto.data },
      parser: (raw) => this.parseJsonSeguro<RecomendacoesIa>(raw),
      temperature: 0.7,
    });
  }

  private montarSystemPrompt(): string {
    return `Você é o Tutor IA do MindForge, responsável por acompanhar a evolução do aluno.
Analise o registro diário de estudo e produza recomendações personalizadas.

Regras:
1. Seja encorajador, mas honesto sobre o que precisa melhorar.
2. Sugira um próximo foco concreto para a próxima sessão de estudos.
3. Liste ajustes práticos (ex: técnicas, tempo, tópicos) quando fizerem sentido.
4. Retorne APENAS um objeto JSON válido, sem markdown, sem explicações adicionais.

Formato obrigatório:
{
  "recomendacoes": "string",
  "proximoFoco": "string",
  "ajustesSugeridos": ["string"]
}`;
  }

  private montarUserPrompt(dto: RegistrarDiarioDto): string {
    return `Registro diário de estudo:
- Data: ${dto.data ?? new Date().toISOString().split('T')[0]}
- Tempo investido (minutos): ${dto.tempoInvestidoMin ?? 0}
- Dificuldades: ${dto.dificuldades ?? 'Nenhuma registrada'}
- Conquistas: ${dto.conquistas ?? 'Nenhuma registrada'}
- Módulos estudados: ${dto.moduloIds?.join(', ') ?? 'Nenhum'}

Gere recomendações no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Teacher (diário)', raw);
      throw new Error('O agente Teacher retornou uma resposta inválida');
    }
  }
}
