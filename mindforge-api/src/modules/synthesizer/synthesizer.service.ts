import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { GerarConteudoDto } from './dto/gerar-conteudo.dto';
import { SynthesizerRepository } from './synthesizer.repository';

export interface ConteudoGerado {
  titulo: string;
  corpoMarkdown: string;
  resumo: string;
  palavrasChave: string[];
}

interface ModuloContexto {
  titulo: string;
  objetivoAprendizagem: string | null;
  trilha?: {
    objetivo?: {
      titulo: string;
      descricao: string | null;
      perfil?: { nivelAtual: string };
    };
  };
}

interface FonteContexto {
  id?: string;
  titulo: string;
  resumo: string | null;
  url: string | null;
  tipo: string;
}

@Injectable()
export class SynthesizerService {
  private readonly logger = new Logger(SynthesizerService.name);

  constructor(
    private readonly repo: SynthesizerRepository,
    private readonly agentes: AgentesService,
    private readonly biblioteca: BibliotecaVivaService,
  ) {}

  async gerar(dto: GerarConteudoDto) {
    const modulo = await this.repo.buscarModuloPorId(dto.moduloId);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
    }

    const fontes = await this.repo.listarFontesPorModulo(dto.moduloId);
    const conteudoGerado = await this.agentes.executar<ConteudoGerado>({
      agente: 'synthesizer',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(dto, modulo, fontes),
      entrada: { moduloId: dto.moduloId, topico: dto.topico },
      parser: (raw) => this.parseJsonSeguro<ConteudoGerado>(raw),
      temperature: 0.6,
    });

    const conteudo = await this.repo.criarConteudo({
      moduloId: dto.moduloId,
      titulo: conteudoGerado.titulo,
      corpoMarkdown: conteudoGerado.corpoMarkdown,
      versao: 1,
      status: 'rascunho',
    });

    if (fontes.length > 0) {
      await this.repo.vincularFontes(
        conteudo.id,
        fontes.map((f) => f.id),
      );
    }

    let chunksIndexados = 0;
    try {
      const chunks = await this.biblioteca.indexarTexto({
        texto: conteudoGerado.corpoMarkdown,
        conteudoId: conteudo.id,
      });
      chunksIndexados = chunks.length;
    } catch (erro) {
      // Conteúdo já foi salvo — indexação não deve apagar o ganho da síntese.
      this.logger.error(
        `Falha ao indexar conteúdo ${conteudo.id} na Biblioteca Viva`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }

    this.logger.log(
      `Conteúdo gerado: ${conteudo.id} para o módulo ${dto.moduloId} (${chunksIndexados} chunks)`,
    );

    return {
      ...conteudo,
      resumo: conteudoGerado.resumo,
      palavrasChave: conteudoGerado.palavrasChave,
      chunksIndexados,
    };
  }

  async listarPorModulo(moduloId: string) {
    return this.repo.listarConteudosPorModulo(moduloId);
  }

  private montarSystemPrompt(): string {
    return `Você é o Synthesizer do MindForge, um especialista em didática e clareza.
Sua tarefa é transformar fontes de pesquisa em um material de estudo original, didático e bem estruturado em Markdown.

Regras:
1. O conteúdo deve ser autocontido: um aluno pode aprender o tema só lendo o texto.
2. Use Markdown semântico: títulos (#), listas, blocos de código, tabelas e negrito quando útil.
3. Inclua exemplos concretos e, quando aplicável, um exercício mental ou pequeno desafio no final.
4. Respeite o nível do aluno (iniciante, intermediário, avançado).
5. Não copie textos das fontes; reescreva com suas próprias palavras e organize didaticamente.
6. Retorne APENAS um objeto JSON válido, sem markdown ao redor, sem explicações adicionais.

Formato obrigatório:
{
  "titulo": "string",
  "corpoMarkdown": "string",
  "resumo": "string",
  "palavrasChave": ["string"]
}`;
  }

  private montarUserPrompt(
    dto: GerarConteudoDto,
    modulo: ModuloContexto,
    fontes: FonteContexto[],
  ): string {
    const tituloTrilha = modulo.trilha?.objetivo?.titulo ?? 'Trilha';
    const descricao = modulo.trilha?.objetivo?.descricao ?? 'Sem descrição';
    const nivelAluno = dto.nivelAlvo ?? modulo.trilha?.objetivo?.perfil?.nivelAtual ?? 'iniciante';

    const fontesTexto =
      fontes.length > 0
        ? fontes
            .map(
              (f) =>
                `- ${f.titulo} (${f.tipo})${f.url ? ` [${f.url}]` : ''}${f.resumo ? `: ${f.resumo}` : ''}`,
            )
            .join('\n')
        : 'Nenhuma fonte registrada. Gere o conteúdo com base no tópico e no objetivo de aprendizagem.';

    return `Trilha: ${tituloTrilha}
Descrição da trilha: ${descricao}
Módulo: ${modulo.titulo}
Objetivo de aprendizagem do módulo: ${modulo.objetivoAprendizagem ?? 'Não informado'}
Nível do aluno: ${nivelAluno}
Tópico solicitado: ${dto.topico}
Instruções extras: ${dto.instrucoesExtras ?? 'Nenhuma'}

Fontes de pesquisa:
${fontesTexto}

Gere o conteúdo didático no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Synthesizer', raw);
      throw new Error('O agente Synthesizer retornou uma resposta inválida');
    }
  }
}
