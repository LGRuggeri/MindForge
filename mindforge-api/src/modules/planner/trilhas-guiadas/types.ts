export interface DominioPrograma {
  codigo: string;
  titulo: string;
  pesoMinimo?: number;
  pesoMaximo?: number;
  topicos: readonly string[];
}

export interface ModuloPrograma {
  dominioCodigo: string;
  titulo: string;
  objetivoAprendizagem: string;
  tempoEstimadoMin: number;
  topicosObrigatorios?: readonly string[];
  fontes?: readonly FontePrograma[];
}

export interface FontePrograma {
  titulo: string;
  url: string;
  localizador: string;
  trechoConsultado: string;
  consultadoEm: string;
}

/** Um retrato autoral e revisado das fontes públicas, salvo junto à trilha criada. */
export interface ProgramaTrilha {
  codigo: string;
  tipo: 'certificacao' | 'assunto' | 'concurso';
  modoEstudoPadrao?: 'completo' | 'concurso';
  nome: string;
  descricao: string;
  fonteOficial: string;
  paginaCertificacao?: string;
  avaliacaoPratica?: string;
  vigenciaDesde?: string;
  revisadoEm: string;
  dominios: readonly DominioPrograma[];
  modulos: readonly ModuloPrograma[];
}
