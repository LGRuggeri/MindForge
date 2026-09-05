/**
 * Converte uma string no formato ISO 8601 date-only (`YYYY-MM-DD`) em um objeto
 * `Date` que representa a data no fuso local, sem deslocamento causado pela
 * interpretação UTC do construtor `new Date('YYYY-MM-DD')`.
 */
export function parseDateOnlyLocal(dateOnly: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new Error(`Formato de data inválido (esperado YYYY-MM-DD): ${dateOnly}`);
  }
  const [ano, mes, dia] = dateOnly.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Retorna a data atual no fuso local no formato `YYYY-MM-DD`, sem conversão
 * para UTC (diferente de `new Date().toISOString().split('T')[0]`).
 */
export function hojeLocal(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}
