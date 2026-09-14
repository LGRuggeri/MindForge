import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DockerProcesso } from './docker-processo';
import { ExecutarCodigoDto } from './dto/executar-codigo.dto';
import { LAUNCHER_JAVASCRIPT, LAUNCHER_PYTHON } from './programas-sandbox';

export type StatusExecucao =
  'concluido' | 'erro' | 'limite_tempo' | 'limite_saida' | 'limite_memoria';
export interface ResultadoExecucao {
  status: StatusExecucao;
  stdout: string;
  stderr: string;
  codigoSaida: number | null;
  duracaoMs: number;
}

@Injectable()
export class DockerExecutor {
  private readonly logger = new Logger(DockerExecutor.name);
  private limpezaPendente = false;
  constructor(
    private readonly config: ConfigService,
    private readonly processo: DockerProcesso,
  ) {}

  async executar(
    dto: Pick<ExecutarCodigoDto, 'linguagem' | 'codigo' | 'entrada'>,
  ): Promise<ResultadoExecucao> {
    if (this.limpezaPendente) throw this.indisponivel();
    const nome = `mindforge-sandbox-${randomUUID()}`;
    const inicio = Date.now();
    const tempo = this.config.get<number>('SANDBOX_TEMPO_MS', 5000);
    let resultado: ResultadoExecucao | undefined;
    try {
      const criacao = await this.processo.executar(this.argumentos(nome, dto.linguagem, tempo));
      if (criacao.codigo !== 0 || criacao.limite) throw this.indisponivel();
      const saida = await this.processo.executar(
        ['start', '--attach', '--interactive', nome],
        JSON.stringify({
          linguagem: dto.linguagem,
          codigo: dto.codigo,
          entrada: dto.entrada ?? '',
        }),
        tempo + 3000,
      );
      let codigoSaida = saida.codigo;
      let status: StatusExecucao;
      if (saida.limite) {
        status = saida.limite === 'tempo' ? 'limite_tempo' : 'limite_saida';
      } else {
        const consulta = await this.processo.executar([
          'inspect',
          '--format',
          '{{json .State}}',
          nome,
        ]);
        if (consulta.codigo !== 0 || consulta.limite) throw this.indisponivel();
        const estado: unknown = JSON.parse(consulta.stdout);
        if (
          !estado ||
          typeof estado !== 'object' ||
          !('ExitCode' in estado) ||
          typeof estado.ExitCode !== 'number' ||
          !('OOMKilled' in estado) ||
          typeof estado.OOMKilled !== 'boolean' ||
          ('Running' in estado && estado.Running)
        )
          throw this.indisponivel();
        codigoSaida = estado.ExitCode;
        status = estado.OOMKilled
          ? 'limite_memoria'
          : [124, 137].includes(codigoSaida)
            ? 'limite_tempo'
            : codigoSaida === 0
              ? 'concluido'
              : 'erro';
        if (saida.codigo !== codigoSaida) throw this.indisponivel();
      }
      resultado = {
        status,
        stdout: saida.stdout,
        stderr: saida.stderr,
        codigoSaida,
        duracaoMs: Date.now() - inicio,
      };
    } catch {
      resultado = undefined;
    } finally {
      if (!(await this.remover(nome))) {
        this.limpezaPendente = true;
        this.logger.error(
          `Limpeza pendente do container ${nome}; novas execuções bloqueadas até reiniciar a API após verificar o Docker.`,
        );
      }
    }
    if (!resultado || this.limpezaPendente) throw this.indisponivel();
    return resultado;
  }

  private argumentos(
    nome: string,
    linguagem: ExecutarCodigoDto['linguagem'],
    tempo: number,
  ): string[] {
    const python = linguagem === 'python';
    const imagem = python
      ? this.config.get('SANDBOX_PYTHON_IMAGE', 'python:3.13-slim-bookworm')
      : this.config.get('SANDBOX_JAVASCRIPT_IMAGE', 'node:22-bookworm-slim');
    return [
      'create',
      '--name',
      nome,
      '--label=mindforge.sandbox=true',
      '--pull=never',
      '--interactive',
      '--init',
      '--network=none',
      '--read-only',
      '--cap-drop=ALL',
      '--cap-add=SETUID',
      '--cap-add=SETGID',
      '--cap-add=KILL',
      '--security-opt=no-new-privileges',
      '--user=0:0',
      '--memory=128m',
      '--memory-swap=128m',
      '--cpus=0.5',
      '--pids-limit=32',
      '--ulimit=nofile=64:64',
      '--ulimit=core=0',
      '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777',
      '--workdir=/tmp',
      '--log-driver=none',
      '--restart=no',
      '--entrypoint=/usr/bin/timeout',
      imagem,
      '--signal=TERM',
      '--kill-after=0.1s',
      `${tempo / 1000}s`,
      ...(python
        ? ['/usr/local/bin/python3', '-I', '-u', '-c', LAUNCHER_PYTHON]
        : ['/usr/local/bin/node', '-e', LAUNCHER_JAVASCRIPT]),
    ];
  }

  private async remover(nome: string): Promise<boolean> {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const res = await this.processo.executar(['rm', '--force', nome], '', 10000);
        if (!res.limite && (res.codigo === 0 || /No such container/i.test(res.stderr))) return true;
      } catch {
        /* Repete uma vez; falha persistente bloqueia o executor. */
      }
    }
    return false;
  }

  private indisponivel() {
    return new ServiceUnavailableException(
      'Sandbox indisponível. Verifique o Docker e as imagens configuradas; consulte a documentação local.',
    );
  }
}
