import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { NovaRevisaoEspacada, revisaoEspacada } from '../../database/schema';

export interface ResultadoRevisao {
  itemTipo: 'conteudo' | 'exercicio' | 'competencia';
  itemId: string;
  qualidade: number;
}

@Injectable()
export class RevisaoEspacadaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async processarRevisao(resultado: ResultadoRevisao) {
    const existente = await this.db.query.revisaoEspacada.findFirst({
      where: (tabela, { and }) =>
        and(eq(tabela.itemTipo, resultado.itemTipo), eq(tabela.itemId, resultado.itemId)),
    });

    const { intervaloDias, fatorFacilidade, repeticoes } = this.calcularSm2(
      existente?.intervaloDias ?? 1,
      existente?.repeticoes ?? 0,
      Number(existente?.fatorFacilidade ?? 2.5),
      resultado.qualidade,
    );

    const hoje = this.formatarData(new Date());
    const proximaRevisao = this.formatarData(this.adicionarDias(new Date(), intervaloDias));

    const dados: NovaRevisaoEspacada = {
      itemTipo: resultado.itemTipo,
      itemId: resultado.itemId,
      intervaloDias,
      fatorFacilidade: String(fatorFacilidade),
      repeticoes,
      proximaRevisao,
      ultimaRevisao: hoje,
    };

    if (existente) {
      const [atualizado] = await this.db
        .update(revisaoEspacada)
        .set(dados)
        .where(eq(revisaoEspacada.id, existente.id))
        .returning();
      return atualizado;
    }

    const [criado] = await this.db.insert(revisaoEspacada).values(dados).returning();
    return criado;
  }

  async listarProximasRevisoes(data?: string) {
    const dataFiltro = data ?? this.formatarData(new Date());
    return this.db.query.revisaoEspacada.findMany({
      where: eq(revisaoEspacada.proximaRevisao, dataFiltro),
      orderBy: (tabela, { desc }) => [desc(tabela.fatorFacilidade)],
    });
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
