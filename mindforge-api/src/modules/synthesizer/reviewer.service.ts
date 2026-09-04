import { Injectable, Logger } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { ConteudoGerado } from './synthesizer.service';

export interface AvaliacaoReviewer {
  nota: number;
  pontosFortes: string[];
  pontosFracos: string[];
  sugestoes: string[];
}

@Injectable()
export class ReviewerService {
  private readonly logger = new Logger(ReviewerService.name);

  constructor(private readonly agentes: AgentesService) {}

  async revisar(conteudo: ConteudoGerado, contexto: string): Promise<AvaliacaoReviewer> {
    return this.agentes.executar<AvaliacaoReviewer>({
      agente: 'reviewer',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(conteudo, contexto),
      entrada: { titulo: conteudo.titulo },
      parser: (raw) => this.parseJsonSeguro<AvaliacaoReviewer>(raw),
      temperature: 0.4,
    });
  }

  private montarSystemPrompt(): string {
    return `Você é o Reviewer do MindForge. Avalie conteúdos didáticos gerados por outro agente.

Critérios (nota 1 a 5):
- Clareza: o texto é fácil de entender?
- Factualidade: as informações parecem corretas e consistentes?
- Adequação ao nível: respeita iniciante/intermediário/avançado?
- Estrutura: uso bom de Markdown, títulos, listas, exemplos?
- Autocontido: um aluno pode aprender só lendo o texto?

Regras:
1. Seja exigente mas construtivo.
2. Retorne APENAS um objeto JSON válido.

Formato obrigatório:
{
  "nota": number,
  "pontosFortes": ["string"],
  "pontosFracos": ["string"],
  "sugestoes": ["string"]
}`;
  }

  private montarUserPrompt(conteudo: ConteudoGerado, contexto: string): string {
    return `${contexto}

Título: ${conteudo.titulo}
Resumo: ${conteudo.resumo}
Palavras-chave: ${conteudo.palavrasChave.join(', ')}

Corpo Markdown:
---
${conteudo.corpoMarkdown}
---

Avalie o conteúdo no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Reviewer', raw);
      throw new Error('O agente Reviewer retornou uma resposta inválida');
    }
  }
}
