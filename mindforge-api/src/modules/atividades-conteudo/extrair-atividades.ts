import { createHash } from 'node:crypto';

export interface AtividadeConteudo {
  chave: string;
  numero: number;
  enunciado: string;
  linhaInicial: number;
}

/** Listas de perguntas na seção Atividades; código e critérios recolhidos não são perguntas. */
export function extrairAtividades(markdown: string): AtividadeConteudo[] {
  const atividades: AtividadeConteudo[] = [];
  let nivelAtividades = 0;
  let indentacaoLista: number | undefined;
  let cerca: string | undefined;
  let detalhes = 0;
  let comentario = false;
  let separado = false;
  let atual: { linha: number; partes: string[] } | undefined;
  const concluir = () => {
    if (atual) {
      const enunciado = atual.partes.join('\n').trim();
      if (enunciado)
        atividades.push({
          chave: createHash('sha256').update(`${atual.linha}|${enunciado}`).digest('hex'),
          numero: atividades.length + 1,
          enunciado,
          linhaInicial: atual.linha,
        });
    }
    atual = undefined;
    separado = false;
  };
  for (const [indice, linha] of markdown.replace(/\r\n?/g, '\n').split('\n').entries()) {
    if (comentario || linha.trimStart().startsWith('<!--')) {
      comentario = !linha.includes('-->');
      continue;
    }
    const marca = /^\s*(`{3,}|~{3,})/.exec(linha)?.[1];
    if (cerca) {
      atual?.partes.push(linha);
      if (marca?.[0] === cerca[0] && marca.length >= cerca.length) cerca = undefined;
      continue;
    }
    if (marca) {
      cerca = marca;
      atual?.partes.push(linha);
      continue;
    }
    const abreDetalhes = (linha.match(/<details\b/gi) ?? []).length;
    const fechaDetalhes = (linha.match(/<\/details\s*>/gi) ?? []).length;
    if (detalhes || abreDetalhes) {
      concluir();
      detalhes = Math.max(0, detalhes + abreDetalhes - fechaDetalhes);
      continue;
    }
    const cabecalho = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(linha);
    if (cabecalho) {
      concluir();
      const titulo = cabecalho[2]
        .replace(/[*_`]/g, '')
        .replace(/^\d+(?:[.)]\d+)*[.)]?\s*/, '')
        .trim();
      if (/^atividades?\b/i.test(titulo)) {
        nivelAtividades = cabecalho[1].length;
        indentacaoLista = undefined;
      } else if (cabecalho[1].length <= nivelAtividades) {
        nivelAtividades = 0;
        indentacaoLista = undefined;
      }
      continue;
    }
    if (!nivelAtividades) continue;
    const item = /^( {0,3})(?:\d+[.)]|[-+*])\s+(.+)$/.exec(linha);
    if (item && (indentacaoLista === undefined || item[1].length <= indentacaoLista)) {
      concluir();
      indentacaoLista = item[1].length;
      atual = { linha: indice + 1, partes: [item[2]] };
    } else if (atual) {
      if (!linha.trim()) {
        separado = true;
        atual.partes.push('');
      } else if (separado && !/^\s+/.test(linha)) concluir();
      else {
        atual.partes.push(linha.replace(new RegExp(`^ {0,${(indentacaoLista ?? 0) + 2}}`), ''));
        separado = false;
      }
    }
  }
  concluir();
  return atividades;
}
