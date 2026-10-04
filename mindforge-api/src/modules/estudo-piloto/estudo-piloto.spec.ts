import { NotFoundException } from '@nestjs/common';
import { aulasLibras, apresentarPiloto } from './libras.catalogo';
import { EstudoPilotoRepository } from './estudo-piloto.repository';
import { EstudoPilotoService } from './estudo-piloto.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { matrizLibras } from './libras.matriz';
import { questoesAvaliacaoLibras } from './libras.avaliacao';

describe('Piloto de estudo de Libras', () => {
  it('desenvolve os 19 itens específicos e separa avaliação e treino', () => {
    expect(aulasLibras).toHaveLength(11);
    const publico = apresentarPiloto();
    expect(publico).toHaveProperty('totalQuestoesAvaliacao', 19);
    expect(publico).toHaveProperty('matriz');
    expect(publico.totalQuestoes).toBe(26);
    for (const aula of aulasLibras) {
      expect(aula.corpoMarkdown).toContain('Caso resolvido');
      expect(aula.corpoMarkdown).toContain('Atividades');
      expect(aula.fontes.every((fonte) => !!fonte.localizador && !!fonte.trechoConsultado)).toBe(
        true,
      );
      for (const questao of aula.questoes) {
        expect(questao.comentario.alternativas).toHaveLength(4);
        expect(questao.comentario.fontes?.length).toBeGreaterThan(0);
      }
    }
    expect(apresentarPiloto().limites).toContain('núcleos comuns');
  });

  it('a prévia não revela gabaritos nem comentários de avaliação', () => {
    const publico = JSON.stringify(apresentarPiloto());
    expect(publico).not.toContain('gabarito');
    expect(publico).not.toContain('"comentario"');
    expect(publico).toContain('corpoMarkdown');
    expect(publico).not.toContain('questoesAvaliacao');
    expect(publico).not.toContain(questoesAvaliacaoLibras[0].enunciado);
  });

  it('liga cada item a uma aula e a uma questão inédita, com comentários de todas as alternativas', () => {
    const pratica = new Set(aulasLibras.flatMap((aula) => aula.questoes.map((q) => q.enunciado)));
    expect(matrizLibras.map((item) => item.id)).toEqual(
      Array.from({ length: 19 }, (_, i) => `E${String(i + 1).padStart(2, '0')}`),
    );
    expect(new Set(questoesAvaliacaoLibras.map((q) => q.enunciado)).size).toBe(19);
    for (const item of matrizLibras) {
      const aula = aulasLibras.find((aula) => aula.codigo === item.aulaCodigo)!;
      expect(aula).toBeDefined();
      expect(aula.itensEdital).toContain(item.id);
      const questoes = aula.questoesAvaliacao.filter((q) => q.itemEdital === item.id);
      expect(questoes).toHaveLength(1);
      const questao = questoes[0];
      expect(pratica.has(questao.enunciado)).toBe(false);
      expect(questao.gabarito).toMatch(/^[ABCD]$/);
      expect(questao.comentario.alternativas?.map((opcao) => opcao.alternativa)).toEqual([
        'A',
        'B',
        'C',
        'D',
      ]);
      expect(questao.comentario.topicoRevisao).toContain(item.id);
      expect(questao.comentario.fontes?.every((url) => url.startsWith('https://'))).toBe(true);
    }
  });

  it('não instala material para perfil inexistente', async () => {
    const repo = { instalar: jest.fn().mockResolvedValue(null) };
    const service = new EstudoPilotoService(
      repo as unknown as EstudoPilotoRepository,
      {} as BibliotecaVivaService,
    );
    await expect(service.instalar('perfil')).rejects.toBeInstanceOf(NotFoundException);
  });
});
