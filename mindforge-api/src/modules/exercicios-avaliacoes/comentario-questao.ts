export interface ComentarioQuestao {
  explicacao: string;
  alternativas?: { alternativa: string; explicacao: string }[];
  fontes?: string[];
  topicoRevisao?: string;
}

export function corrigirQuestaoObjetiva(
  resposta: string,
  gabarito: string,
  comentario?: ComentarioQuestao | null,
) {
  const normalizar = (valor: string) =>
    valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  const correta = normalizar(resposta) === normalizar(gabarito);
  const resultado = correta ? 'Resposta correta!' : `Resposta incorreta. ${gabarito}`;
  const detalhes = comentario
    ? [
        `**Gabarito: ${gabarito}.** ${comentario.explicacao}`,
        ...(comentario.alternativas ?? []).map(
          (item) => `- **${item.alternativa}:** ${item.explicacao}`,
        ),
        ...(comentario.fontes ?? []).map((url, indice) => `[Fonte ${indice + 1}](${url})`),
        comentario.topicoRevisao ? `**Revisar:** ${comentario.topicoRevisao}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    : '';
  return {
    correta,
    pontuacao: correta ? 10 : 0,
    feedback: detalhes ? `${resultado}\n\n${detalhes}` : resultado,
  };
}
