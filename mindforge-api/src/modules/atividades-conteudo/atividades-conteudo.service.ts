import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AtividadesConteudoRepository } from './atividades-conteudo.repository';
import { ResponderAtividadeDto } from './dto/responder-atividade.dto';
import { extrairAtividades } from './extrair-atividades';

@Injectable()
export class AtividadesConteudoService {
  constructor(private readonly repo: AtividadesConteudoRepository) {}

  private async atividadesDoPerfil(conteudoId: string, perfilId: string) {
    const conteudo = await this.repo.buscarConteudo(conteudoId);
    if (!conteudo) throw new NotFoundException('Conteúdo não encontrado');
    if (conteudo.modulo.trilha.objetivo.perfilId !== perfilId) {
      throw new ForbiddenException('Conteúdo não pertence ao perfil informado');
    }
    return extrairAtividades(conteudo.corpoMarkdown);
  }

  async listar(conteudoId: string, perfilId: string) {
    const atividades = await this.atividadesDoPerfil(conteudoId, perfilId);
    const respostas = await this.repo.listarRespostas(conteudoId, perfilId);
    return atividades.map((atividade) => {
      const salva = respostas.find((r) => r.atividadeChave === atividade.chave);
      return {
        ...atividade,
        resposta: salva ? { texto: salva.resposta, atualizadoEm: salva.atualizadoEm } : null,
      };
    });
  }

  async responder(conteudoId: string, chave: string, dto: ResponderAtividadeDto) {
    const atividades = await this.atividadesDoPerfil(conteudoId, dto.perfilId);
    const atividade = atividades.find((a) => a.chave === chave);
    if (!atividade) throw new NotFoundException('Atividade não encontrada neste conteúdo');
    const salva = await this.repo.salvarResposta({
      conteudoId,
      perfilId: dto.perfilId,
      atividadeChave: chave,
      enunciado: atividade.enunciado,
      resposta: dto.resposta,
    });
    return { texto: salva.resposta, atualizadoEm: salva.atualizadoEm };
  }
}
