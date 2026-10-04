export interface AlternativaQuestao {
  letra: string;
  texto: string;
}

/** Lê alternativas já presentes no enunciado; não cria opções para questões legadas. */
export function extrairAlternativas(enunciado: string) {
  const linhas = enunciado.split(/\r?\n/);
  const alternativas: AlternativaQuestao[] = [];
  const pergunta: string[] = [];
  for (const linha of linhas) {
    const inicio =
      /^\s*(?:[-*]\s+)?(?:\*\*)?([A-Z])(?:\*\*)?[.)](?:\*\*)?\s+(.+)$/u.exec(
        linha,
      );
    if (inicio) {
      alternativas.push({ letra: inicio[1], texto: inicio[2].trim() });
    } else if (alternativas.length) {
      if (linha.trim())
        alternativas[alternativas.length - 1].texto += `\n${linha.trim()}`;
    } else {
      pergunta.push(linha);
    }
  }
  if (
    !pergunta.join("").trim() ||
    alternativas.length < 2 ||
    alternativas.some(
      (opcao, indice) => opcao.letra !== String.fromCharCode(65 + indice),
    )
  )
    return null;
  return { pergunta: pergunta.join("\n").trim(), alternativas };
}

export function extrairGabarito(feedback: string | null) {
  return feedback
    ? /\*\*Gabarito:\s*([A-Z])\.\*\*/u.exec(feedback)?.[1]
    : undefined;
}
