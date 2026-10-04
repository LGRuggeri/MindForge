import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { EstudoPilotoRepository } from './estudo-piloto.repository';
import { apresentarPiloto } from './libras.catalogo';

@Injectable()
export class EstudoPilotoService {
  private readonly logger = new Logger(EstudoPilotoService.name);
  constructor(
    private readonly repo: EstudoPilotoRepository,
    private readonly biblioteca: BibliotecaVivaService,
  ) {}

  apresentar() {
    return apresentarPiloto();
  }

  async instalar(perfilId: string) {
    const registro = await this.repo.instalar(perfilId);
    if (!registro) throw new NotFoundException('Perfil não encontrado');
    const { conteudos, ...publico } = registro;
    let indexacao: 'enfileirada' | 'pendente' | 'existente' = registro.criado
      ? 'enfileirada'
      : 'existente';
    for (const conteudo of conteudos) {
      try {
        await this.biblioteca.indexarTexto({
          texto: conteudo.corpoMarkdown,
          conteudoId: conteudo.id,
          async: true,
        });
      } catch {
        indexacao = 'pendente';
        this.logger.warn(
          `Indexação pendente do conteúdo ${conteudo.id}; o material permanece disponível.`,
        );
      }
    }
    return { ...publico, perfilId, indexacao };
  }
}
