import { BadGatewayException } from '@nestjs/common';
import { z } from 'zod';

/** Remove apenas o invólucro externo; Markdown dentro de strings é conteúdo. */
export function lerJsonIa(raw: string): unknown {
  const texto = raw.trim();
  const bloco = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(texto);
  try {
    return JSON.parse(bloco ? bloco[1] : texto) as unknown;
  } catch {
    // Mensagens de JSON.parse podem conter trechos da resposta privada do LLM.
    throw new Error('A resposta da IA não contém JSON válido');
  }
}

export function validarRespostaIa<T>(raw: string, contrato: z.ZodType<T>, agente: string): T {
  try {
    const resultado = contrato.safeParse(lerJsonIa(raw));
    if (resultado.success) return resultado.data;
  } catch {
    // Somente uma mensagem fixa chega aos logs e ao filtro HTTP.
  }
  throw new BadGatewayException(`O agente ${agente} retornou uma resposta inválida`);
}
