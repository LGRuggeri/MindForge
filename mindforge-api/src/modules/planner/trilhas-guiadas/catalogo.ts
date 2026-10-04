import { programaAz900 } from './az-900';
import { programaAwsClfC02 } from './aws-clf-c02';
import { programaCiberseguranca } from './ciberseguranca';
import { programaIsc2Cc } from './isc2-cc';
import { programaKaliLinux } from './kali-linux';
import { ProgramaTrilha } from './types';
import { programaConcursoLibras } from './concurso-libras';

export const programas = [
  programaCiberseguranca,
  programaKaliLinux,
  programaAz900,
  programaAwsClfC02,
  programaIsc2Cc,
  programaConcursoLibras,
] as const satisfies readonly ProgramaTrilha[];

export type CodigoPrograma = (typeof programas)[number]['codigo'];

export function listarProgramas(): readonly ProgramaTrilha[] {
  return programas;
}

export function listarCertificacoes(): readonly ProgramaTrilha[] {
  return programas.filter((programa) => programa.tipo === 'certificacao');
}

export function buscarPrograma(codigo: string): ProgramaTrilha | undefined {
  return programas.find((programa) => programa.codigo === codigo);
}
