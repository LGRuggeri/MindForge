import { Injectable, NotFoundException } from '@nestjs/common';
import { PerfilRepository } from './perfil.repository';
import { CriarPerfilDto } from './dto/criar-perfil.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';

@Injectable()
export class PerfilService {
  constructor(private readonly repo: PerfilRepository) {}

  criar(dto: CriarPerfilDto) {
    return this.repo.criar(dto);
  }

  async buscarPorId(id: string) {
    const perfil = await this.repo.buscarPorId(id);
    if (!perfil) {
      throw new NotFoundException(`Perfil ${id} não encontrado`);
    }
    return perfil;
  }

  async atualizar(id: string, dto: AtualizarPerfilDto) {
    await this.buscarPorId(id);
    const perfil = await this.repo.atualizar(id, dto);
    if (!perfil) {
      throw new NotFoundException(`Perfil ${id} não encontrado`);
    }
    return perfil;
  }

  listar() {
    return this.repo.listar();
  }
}
