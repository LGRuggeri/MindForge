import type { AulaBase } from './libras.questoes';
import { fontesLibras as f, referenciasAula } from './libras.fontes';
import { praticaLibras } from './libras.pratica';
import { aulaDireitos } from './aulas/direitos-historia';
import { aulaNacional } from './aulas/politica-nacional';
import { aulaSantaCatarina } from './aulas/santa-catarina';
import { aulaLinguaCultura } from './aulas/lingua-cultura';
import { aulaProfissao } from './aulas/profissao';
import { aulaModelos } from './aulas/modelos';
import { aulaAquisicaoEnsino } from './aulas/aquisicao-ensino';
import { aulaPortuguesPnebs } from './aulas/portugues-pnebs';
import { aulaTecnologia } from './aulas/tecnologia';

export const aulasComplementares: (AulaBase & { codigo: string })[] = [
  {
    codigo: 'direitos-historia',
    titulo: 'Direitos, barreiras e história da educação especial',
    objetivoAprendizagem:
      'Relacionar LBI, barreiras e direito à educação; construir uma linha do tempo distinguindo atos e versões.',
    tempoEstimadoMin: 60,
    corpoMarkdown: aulaDireitos,
    fontes: [f.lbi, f.constituicao, f.convencao, f.nacional, f.pne],
  },
  {
    codigo: 'politica-nacional',
    titulo: 'Política nacional: AEE, planejamento e Rede Nacional',
    objetivoAprendizagem:
      'Distinguir escolarização, AEE, PAEE/PEI e Rede Nacional no Decreto 12.686/2025 alterado.',
    tempoEstimadoMin: 55,
    corpoMarkdown: aulaNacional,
    fontes: [f.nacional],
  },
  {
    codigo: 'santa-catarina',
    titulo: 'Santa Catarina: política, serviços e currículo inclusivo',
    objetivoAprendizagem:
      'Comparar política de 2018, Resolução 100/2016 e currículo, aplicando a distinção de serviços e equidade curricular.',
    tempoEstimadoMin: 65,
    corpoMarkdown: aulaSantaCatarina,
    fontes: [f.politicaSC, f.resolucaoSC, f.curriculoSC],
  },
  {
    codigo: 'lingua-cultura',
    titulo: 'Libras: língua, história, cultura e identidades surdas',
    objetivoAprendizagem:
      'Explicar reconhecimento e estrutura linguística, comparar concepções e analisar diversidade cultural e identitária.',
    tempoEstimadoMin: 60,
    corpoMarkdown: aulaLinguaCultura,
    fontes: [f.libras, f.ines, f.cultura, f.gramatica],
  },
  {
    codigo: 'profissao',
    titulo: 'Profissão: trajetória e regulamentação',
    objetivoAprendizagem:
      'Relacionar organização coletiva e marcos legais; distinguir fluência, formação, competência e guia-interpretação.',
    tempoEstimadoMin: 55,
    corpoMarkdown: aulaProfissao,
    fontes: [f.historia, f.libras, f.profissional, f.etica],
  },
  {
    codigo: 'modelos',
    titulo: 'Tradução e interpretação: modalidades e modelos',
    objetivoAprendizagem:
      'Comparar sete modelos apresentados pela UFSC e modalidades temporais; analisar ambiguidade, memória e preparo.',
    tempoEstimadoMin: 60,
    corpoMarkdown: aulaModelos,
    fontes: [f.cognitivo, f.modelos, f.processo, f.esforcos],
  },
  {
    codigo: 'aquisicao-ensino',
    titulo: 'Aquisição, aprendizagem e ensino de Libras',
    objetivoAprendizagem:
      'Relacionar trajetória, condições de acesso e teorias; planejar ensino e avaliação conforme repertórios de surdos e ouvintes.',
    tempoEstimadoMin: 80,
    corpoMarkdown: aulaAquisicaoEnsino,
    fontes: [f.aquisicao, f.ensino, f.ensinoL1],
  },
  {
    codigo: 'portugues-pnebs',
    titulo: 'Português escrito como L2 e PNEBS',
    objetivoAprendizagem:
      'Planejar leitura e produção escrita com critérios observáveis; relacionar eixos e governança da Portaria 588/2026.',
    tempoEstimadoMin: 70,
    corpoMarkdown: aulaPortuguesPnebs,
    fontes: [f.decretoLibras, f.portuguesL2, f.pnebs],
  },
  {
    codigo: 'tecnologia',
    titulo: 'Tecnologia assistiva e acessibilidade',
    objetivoAprendizagem:
      'Selecionar recursos por barreiras, necessidades e uso; conferir limites de legendas e automação.',
    tempoEstimadoMin: 50,
    corpoMarkdown: aulaTecnologia,
    fontes: [f.lbi, f.vlibras],
  },
].map((aula) => ({
  ...aula,
  corpoMarkdown: aula.corpoMarkdown + referenciasAula(aula.fontes),
  questoes: praticaLibras[aula.codigo],
}));
