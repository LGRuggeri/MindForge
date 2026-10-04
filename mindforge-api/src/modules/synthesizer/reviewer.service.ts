import { Injectable } from '@nestjs/common';
import { validarRespostaIa } from '../../common/ia/json-ia';
import { avaliacaoReviewerSchema } from '../../common/ia/contratos-ia';
import { AgentesService } from '../agentes/agentes.service';
import { ConteudoGerado } from './synthesizer.service';

export interface AvaliacaoReviewer {
  nota: number;
  pontosFortes: string[];
  pontosFracos: string[];
  sugestoes: string[];
  criterios?: { profundidade: number; cobertura: number; fundamentacao: number; aplicacao: number };
  topicosPendentes?: string[];
}

@Injectable()
export class ReviewerService {
  constructor(private readonly agentes: AgentesService) {}

  async revisar(conteudo: ConteudoGerado, contexto: string): Promise<AvaliacaoReviewer> {
    return this.agentes.executar<AvaliacaoReviewer>({
      agente: 'reviewer',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(conteudo, contexto),
      entrada: { titulo: conteudo.titulo },
      parser: (raw) => validarRespostaIa(raw, avaliacaoReviewerSchema, 'Reviewer'),
      temperature: 0.4,
    });
  }

  private montarSystemPrompt(): string {
    return `Você é o Reviewer do MindForge. Avalie conteúdos didáticos gerados por outro agente.

Critérios (nota 1 a 5):
- Clareza: o texto é fácil de entender?
- Fundamentação: distinguir evidência consultada de resumo ou URL não verificados; identificar limites e referências sem inventar consulta.
- Adequação ao nível: respeita iniciante/intermediário/avançado?
- Estrutura: uso bom de Markdown, títulos, listas, exemplos?
- Autocontido: um aluno pode aprender só lendo o texto?
- Profundidade: explica relações e motivos, com exemplos desenvolvidos, sem apenas listar definições?
- Cobertura: desenvolve TODOS os tópicos obrigatórios do contexto? Liste omissões em topicosPendentes.
- Aplicação: exemplos resolvidos, atividades e critérios permitem demonstrar aprendizagem?

Regras:
1. Seja exigente mas construtivo.
   Compare com o modo solicitado e os requisitos do contexto. Aulas completas e de concurso com lacunas não podem receber cobertura >= 3. Nota global alta não compensa profundidade insuficiente. Avalie apenas a evidência fornecida; não certifica vigência jurídica.
2. Retorne APENAS um objeto JSON válido.

Formato obrigatório:
{
  "nota": number,
  "pontosFortes": ["string"],
  "pontosFracos": ["string"],
  "sugestoes": ["string"],
  "criterios": { "profundidade": number, "cobertura": number, "fundamentacao": number, "aplicacao": number },
  "topicosPendentes": ["string"]
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
}
