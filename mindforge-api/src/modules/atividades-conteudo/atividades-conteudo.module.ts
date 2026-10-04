import { Module } from '@nestjs/common';
import { AtividadesConteudoController } from './atividades-conteudo.controller';
import { AtividadesConteudoRepository } from './atividades-conteudo.repository';
import { AtividadesConteudoService } from './atividades-conteudo.service';

@Module({
  controllers: [AtividadesConteudoController],
  providers: [AtividadesConteudoRepository, AtividadesConteudoService],
})
export class AtividadesConteudoModule {}
