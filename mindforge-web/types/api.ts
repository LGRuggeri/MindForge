export type Nivel = 'iniciante' | 'intermediario' | 'avancado';

export interface Perfil {
  id: string;
  nome: string;
  objetivosGerais?: string | null;
  nivelAtual?: Nivel | null;
  preferencias?: Record<string, unknown> | null;
  criadoEm: string;
}

export interface Objetivo {
  id: string;
  perfilId: string;
  titulo: string;
  descricao?: string | null;
  nivelDesejado?: Nivel | null;
  prazoEstimado?: string | null;
  criadoEm: string;
  trilhas?: Trilha[];
}

export interface Trilha {
  id: string;
  objetivoId: string;
  versao: number;
  status: 'ativa' | 'concluida' | 'substituida';
  criadoEm: string;
  modulos?: Modulo[];
}

export interface Modulo {
  id: string;
  trilhaId: string;
  trilha?: {
    id: string;
    objetivoId: string;
    objetivo?: {
      id: string;
      titulo: string;
    } | null;
  } | null;
  ordem: number;
  titulo: string;
  objetivoAprendizagem?: string | null;
  tempoEstimadoMin?: number | null;
  prerequisitos?: string[] | null;
  criadoEm: string;
}

export interface Fonte {
  id: string;
  moduloId: string;
  tipo: string;
  titulo: string;
  url?: string | null;
  autor?: string | null;
  confiabilidadeScore: string;
  resumo: string;
  criadoEm: string;
}

export interface Conteudo {
  id: string;
  moduloId: string;
  titulo: string;
  corpoMarkdown: string;
  versao: number;
  status: string;
  criadoEm: string;
}

export interface Exercicio {
  id: string;
  moduloId: string;
  tipo: string;
  enunciado: string;
  gabarito?: string | null;
  dificuldade: string;
  criadoEm: string;
}

export interface Tentativa {
  id: string;
  exercicioId: string;
  respostaUsuario: string;
  correta: boolean;
  pontuacao: string;
  feedbackIa?: string | null;
  tentativaNumero: number;
  criadoEm: string;
}

export interface Duvida {
  id: string;
  perfilId: string;
  moduloId: string;
  pergunta: string;
  resposta: string;
  citacoes: unknown[];
  proximosPassos: unknown[];
  chunksIds: unknown[];
  avaliacao?: number | null;
  feedback?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RevisaoItem {
  id: string;
  itemTipo: string;
  itemId: string;
  fatorFacilidade: number;
  intervaloDias: number;
  repeticoes: number;
  proximaRevisao: string;
  criadoEm: string;
}

export interface Competencia {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  criadoEm: string;
}

export interface CompetenciaGrafo extends Competencia {
  progresso?: {
    nivelAtual: string;
    atualizadoEm: string;
  } | null;
  preRequisitos?: Competencia[];
}

export interface GrafoVisualNode {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  nivelAtual: string;
}

export interface GrafoVisualEdge {
  id: string;
  source: string;
  target: string;
  tipo: string;
}

export interface GrafoVisual {
  nodes: GrafoVisualNode[];
  edges: GrafoVisualEdge[];
}

export interface Job {
  encontrado: boolean;
  id?: string;
  nome?: string;
  status?: string;
  dados?: Record<string, unknown>;
  criadoEm?: string;
  iniciadoEm?: string;
  finalizadoEm?: string;
  tentativas?: number;
}

export interface CriarPerfilInput {
  nome: string;
  objetivosGerais?: string;
  nivelAtual?: Nivel;
  preferencias?: Record<string, unknown>;
}

export interface AtualizarPerfilInput {
  nome?: string;
  objetivosGerais?: string;
  nivelAtual?: Nivel;
  preferencias?: Record<string, unknown>;
}

export interface CriarObjetivoInput {
  perfilId: string;
  titulo: string;
  descricao?: string;
  nivelDesejado?: Nivel;
  prazoEstimado?: string;
}

export interface GerarTrilhaInput {
  objetivoId: string;
}

export interface TrilhaComModulos extends Trilha {
  modulos: Modulo[];
}

export interface GerarConteudoInput {
  moduloId: string;
  topico: string;
  nivelAlvo?: string;
  instrucoesExtras?: string;
  async?: boolean;
}

export interface GerarExercicioInput {
  moduloId: string;
  tipo: string;
  dificuldade?: string;
  instrucoesExtras?: string;
  async?: boolean;
}

export interface SubmeterTentativaInput {
  exercicioId: string;
  respostaUsuario: string;
  perfilId: string;
  avaliacaoId?: string | null;
  async?: boolean;
}

export interface TirarDuvidaInput {
  perfilId: string;
  moduloId: string;
  pergunta: string;
  limiteChunks?: number;
}

export interface AvaliarDuvidaInput {
  duvidaId: string;
  avaliacao: number;
  feedback?: string;
}

export interface Avaliacao {
  id: string;
  moduloId?: string | null;
  trilhaId?: string | null;
  titulo: string;
  tipo: string;
  criadoEm: string;
  exercicios?: {
    ordem: number;
    exercicio: Exercicio;
  }[];
}

export interface CriarAvaliacaoInput {
  moduloId?: string;
  trilhaId?: string;
  titulo: string;
  tipo: string;
  exerciciosIds?: string[];
  quantidade?: number;
}

export interface RespostaAvaliacaoInput {
  exercicioId: string;
  tentativaId: string;
}

export interface SubmeterAvaliacaoInput {
  avaliacaoId: string;
  perfilId: string;
  respostas: RespostaAvaliacaoInput[];
}

export interface CriarProgressoModuloInput {
  moduloId: string;
  perfilId: string;
}

export interface BuscarSemanticaInput {
  pergunta: string;
  topK?: number;
  moduloId?: string;
  conteudoId?: string;
}

export interface JobPollingInput {
  jobId: string;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface ProjetoEntrega {
  id: string;
  projetoId: string;
  conteudo: string;
  feedback?: string | null;
  pontuacao?: string | null;
  numeroEntrega: number;
  criadoEm: string;
}

export interface Projeto {
  id: string;
  moduloId?: string | null;
  objetivoId?: string | null;
  perfilId: string;
  titulo: string;
  descricao: string;
  criterios: string[];
  dicas: string[];
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  entregas?: ProjetoEntrega[];
}

export interface CriarProjetoInput {
  perfilId: string;
  moduloId?: string;
  objetivoId?: string;
  titulo: string;
  descricao: string;
  criterios?: string[];
  dicas?: string[];
}

export interface GerarProjetoInput {
  perfilId: string;
  moduloId?: string;
  objetivoId?: string;
}

export interface SubmeterEntregaInput {
  conteudo: string;
}

export interface PesquisarFontesInput {
  moduloId: string;
  topico?: string;
  limite?: number;
  webSearch?: boolean;
  async?: boolean;
}

export interface ResultadoPesquisa {
  moduloId: string;
  topico: string;
  estrategia: string;
  fontes: Fonte[];
  resultadosWeb: number;
}

export interface PesquisaEnfileirada {
  jobId: string;
  status: 'enfileirado';
  moduloId: string;
  topico: string;
}

export type RespostaPesquisa = ResultadoPesquisa | PesquisaEnfileirada;

export interface RegistroDiario {
  id: string;
  perfilId: string;
  data: string;
  tempoInvestidoMin: number;
  dificuldades?: string | null;
  conquistas?: string | null;
  recomendacoesIa?: string | null;
  criadoEm: string;
  modulos?: { diarioId: string; moduloId: string; modulo: Modulo }[];
}

export interface RegistrarDiarioInput {
  perfilId: string;
  data?: string;
  tempoInvestidoMin?: number;
  dificuldades?: string;
  conquistas?: string;
  moduloIds?: string[];
}

export interface RegistroDiarioComRecomendacoes extends RegistroDiario {
  recomendacoesIa: string;
  proximoFoco: string;
  ajustesSugeridos: string[];
}
