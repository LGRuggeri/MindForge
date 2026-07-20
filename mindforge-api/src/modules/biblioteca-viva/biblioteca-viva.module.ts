import { Module } from '@nestjs/common';
import { BibliotecaVivaController } from './biblioteca-viva.controller';
import { BibliotecaVivaService } from './biblioteca-viva.service';
import { BibliotecaVivaRepository } from './biblioteca-viva.repository';
import { EmbeddingService } from './embedding.service';

@Module({
  controllers: [BibliotecaVivaController],
  providers: [BibliotecaVivaService, BibliotecaVivaRepository, EmbeddingService],
  exports: [BibliotecaVivaService, EmbeddingService],
})
export class BibliotecaVivaModule {}
