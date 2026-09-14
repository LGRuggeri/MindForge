import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleDb } from '../../database/database.module';
import { NovaRevisaoEspacada, RevisaoEspacada } from '../../database/schema';
import { RevisaoEspacadaRepository } from './revisao-espacada.repository';
import { ConcluirRevisaoDto } from './dto/concluir-revisao.dto';

export interface ResultadoRevisao {
  perfilId: string;
  itemTipo: 'conteudo' | 'exercicio' | 'competencia';
  itemId: string;
  qualidade: number;
}

@Injectable()
export class RevisaoEspacadaService {
  constructor(private readonly repo: RevisaoEspacadaRepository) {}

  async processarRevisao(resultado: ResultadoRevisao, tx?: DrizzleDb) {
    this.validarQualidade(resultado.qualidade);
    const existente = await this.repo.buscarPorItem(
      resultado.perfilId,
      resultado.itemTipo,
      resultado.itemId,
      tx,
    );
    const dados = this.calcularDados(resultado, existente);
    if (!existente) return this.repo.criar(dados, tx);
    const atualizado = await this.repo.atualizarSeAtual(existente, dados, tx);
    if (!atualizado)
      throw new ConflictException('A agenda mudou. Atualize a página e tente novamente.');
    return atualizado;
  }

  private calcularDados(
    resultado: ResultadoRevisao,
    existente?: RevisaoEspacada,
  ): NovaRevisaoEspacada {
    const { intervaloDias, fatorFacilidade, repeticoes } = this.calcularSm2(
      existente?.intervaloDias ?? 1,
      existente?.repeticoes ?? 0,
      Number(existente?.fatorFacilidade ?? 2.5),
      resultado.qualidade,
    );

    const agora = new Date();
    const hoje = this.formatarData(agora);
    const proximaRevisao = this.formatarData(this.adicionarDias(agora, intervaloDias));

    const dados: NovaRevisaoEspacada = {
      perfilId: resultado.perfilId,
      itemTipo: resultado.itemTipo,
      itemId: resultado.itemId,
      intervaloDias,
      fatorFacilidade: String(Number(fatorFacilidade.toFixed(2))),
      repeticoes,
      proximaRevisao,
      ultimaRevisao: hoje,
    };

    return dados;
  }

  async listarProximasRevisoes(perfilId: string, data?: string) {
    return this.repo.listar(perfilId, data);
  }

  async buscarDetalhe(id: string, perfilId: string) {
    const revisao = await this.repo.buscarPorId(id, perfilId);
    if (!revisao) throw new NotFoundException('Revisão não encontrada para este perfil');
    const item = await this.repo.buscarItem(revisao.itemTipo, revisao.itemId, perfilId);
    if (!item)
      throw new NotFoundException('O item da revisão não está mais disponível para este perfil');
    return { ...revisao, item };
  }

  async concluir(id: string, dto: ConcluirRevisaoDto) {
    this.validarQualidade(dto.qualidade);
    const revisao = await this.buscarDetalhe(id, dto.perfilId);
    if (revisao.proximaRevisao !== dto.proximaRevisaoEsperada) {
      throw new ConflictException('Esta revisão já foi reagendada. Atualize a agenda.');
    }
    if (revisao.proximaRevisao > this.formatarData(new Date())) {
      throw new BadRequestException('Aguarde a data agendada para realizar esta revisão');
    }
    const dados = this.calcularDados(
      {
        perfilId: dto.perfilId,
        itemTipo: revisao.itemTipo as ResultadoRevisao['itemTipo'],
        itemId: revisao.itemId,
        qualidade: dto.qualidade,
      },
      revisao,
    );
    const atualizado = await this.repo.atualizarSeAtual(revisao, dados);
    if (!atualizado)
      throw new ConflictException('A agenda mudou. Atualize a página e tente novamente.');
    return atualizado;
  }

  private validarQualidade(qualidade: number) {
    if (!Number.isInteger(qualidade) || qualidade < 0 || qualidade > 5) {
      throw new BadRequestException('Qualidade deve ser um inteiro entre 0 e 5');
    }
  }

  private calcularSm2(
    intervaloAnterior: number,
    repeticoesAnterior: number,
    fatorAnterior: number,
    qualidade: number,
  ) {
    let fatorFacilidade = fatorAnterior + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
    if (fatorFacilidade < 1.3) {
      fatorFacilidade = 1.3;
    }

    if (qualidade < 3) {
      return { intervaloDias: 1, fatorFacilidade, repeticoes: 0 };
    }

    const repeticoes = repeticoesAnterior + 1;
    let intervaloDias: number;
    if (repeticoes === 1) {
      intervaloDias = 1;
    } else if (repeticoes === 2) {
      intervaloDias = 6;
    } else {
      intervaloDias = Math.round(intervaloAnterior * fatorFacilidade);
    }

    return { intervaloDias, fatorFacilidade, repeticoes };
  }

  private adicionarDias(data: Date, dias: number): Date {
    const resultado = new Date(data);
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
