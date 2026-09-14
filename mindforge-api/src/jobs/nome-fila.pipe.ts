import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const FILAS_PUBLICAS = [
  'synthesizer.gerar-conteudo',
  'exercicios.gerar',
  'exercicios.corrigir-tentativa',
  'biblioteca-viva.indexar',
  'research.pesquisar',
];

@Injectable()
export class NomeFilaPipe implements PipeTransform<string, string> {
  transform(nome: string): string {
    if (!FILAS_PUBLICAS.includes(nome)) throw new BadRequestException('Fila não suportada');
    return nome;
  }
}
