import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';

export interface ResultadoProcesso {
  codigo: number | null;
  stdout: string;
  stderr: string;
  limite: 'tempo' | 'saida' | null;
}

@Injectable()
export class DockerProcesso {
  executar(
    args: string[],
    entrada = '',
    tempoMs = 10000,
    maxBytes = 32768,
  ): Promise<ResultadoProcesso> {
    return new Promise((resolve, reject) => {
      const filho = spawn('docker', args, { shell: false, windowsHide: true, stdio: 'pipe' });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let bytes = 0;
      let limite: ResultadoProcesso['limite'] = null;
      const interromper = (motivo: NonNullable<ResultadoProcesso['limite']>) => {
        if (limite) return;
        limite = motivo;
        filho.kill('SIGKILL');
      };
      const timer = setTimeout(() => interromper('tempo'), tempoMs);
      const coletar = (destino: Buffer[], chunk: Buffer) => {
        if (limite) return;
        const restante = Math.max(0, maxBytes - bytes);
        destino.push(chunk.subarray(0, restante));
        bytes += Math.min(chunk.length, restante);
        if (chunk.length > restante) interromper('saida');
      };
      filho.stdout.on('data', (chunk: Buffer) => coletar(stdout, chunk));
      filho.stderr.on('data', (chunk: Buffer) => coletar(stderr, chunk));
      filho.once('error', (erro) => {
        clearTimeout(timer);
        reject(erro);
      });
      filho.once('close', (codigo) => {
        clearTimeout(timer);
        resolve({
          codigo,
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
          limite,
        });
      });
      // Docker pode fechar stdin antes de consumi-lo (daemon/imagem indisponível).
      // A saída/exit code do processo continua sendo a fonte do diagnóstico.
      filho.stdin.on('error', () => undefined);
      filho.stdin.end(entrada);
    });
  }
}
