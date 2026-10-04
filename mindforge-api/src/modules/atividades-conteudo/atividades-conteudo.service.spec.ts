import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AtividadesConteudoService } from './atividades-conteudo.service';
import { AtividadesConteudoRepository } from './atividades-conteudo.repository';
import { extrairAtividades } from './extrair-atividades';

describe('Respostas das atividades da aula', () => {
  const markdown = '## Atividades\n1. Compare os conceitos.\n2. Aplique ao caso.';
  const chave = extrairAtividades(markdown)[0].chave;
  let repo: { buscarConteudo: jest.Mock; listarRespostas: jest.Mock; salvarResposta: jest.Mock };
  let service: AtividadesConteudoService;
  beforeEach(() => {
    repo = {
      buscarConteudo: jest
        .fn()
        .mockResolvedValue({
          corpoMarkdown: markdown,
          modulo: { trilha: { objetivo: { perfilId: 'a' } } },
        }),
      listarRespostas: jest
        .fn()
        .mockResolvedValue([
          { atividadeChave: chave, resposta: 'Minha resposta', atualizadoEm: new Date() },
        ]),
      salvarResposta: jest.fn(async (dados) => ({ ...dados, atualizadoEm: new Date() })),
    };
    service = new AtividadesConteudoService(repo as unknown as AtividadesConteudoRepository);
  });
  it('retoma a resposta somente na pergunta e perfil correspondentes', async () => {
    const atividades = await service.listar('conteudo', 'a');
    expect(atividades[0].resposta?.texto).toBe('Minha resposta');
    expect(atividades[1].resposta).toBeNull();
    expect(repo.listarRespostas).toHaveBeenCalledWith('conteudo', 'a');
  });
  it('persiste enunciado conferido no servidor, permitindo editar a atividade', async () => {
    expect(
      await service.responder('conteudo', chave, { perfilId: 'a', resposta: 'Nova resposta' }),
    ).toHaveProperty('texto', 'Nova resposta');
    expect(repo.salvarResposta).toHaveBeenCalledWith({
      conteudoId: 'conteudo',
      perfilId: 'a',
      atividadeChave: chave,
      enunciado: 'Compare os conceitos.',
      resposta: 'Nova resposta',
    });
  });
  it('impede consultar ou gravar atividade de outro perfil e rejeita perguntas inexistentes', async () => {
    await expect(service.listar('conteudo', 'b')).rejects.toThrow(ForbiddenException);
    await expect(
      service.responder('conteudo', chave, { perfilId: 'b', resposta: 'Resposta' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.responder('conteudo', 'inexistente', { perfilId: 'a', resposta: 'Resposta' }),
    ).rejects.toThrow(NotFoundException);
    expect(repo.listarRespostas).not.toHaveBeenCalled();
    expect(repo.salvarResposta).not.toHaveBeenCalled();
    repo.buscarConteudo.mockResolvedValue(undefined);
    await expect(service.listar('ausente', 'a')).rejects.toThrow(NotFoundException);
  });
});
