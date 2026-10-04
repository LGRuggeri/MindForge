import { Module } from '@nestjs/common';
import { BibliotecaVivaModule } from '../biblioteca-viva/biblioteca-viva.module';
import { EstudoPilotoController } from './estudo-piloto.controller';
import { EstudoPilotoRepository } from './estudo-piloto.repository';
import { EstudoPilotoService } from './estudo-piloto.service';

@Module({
  imports: [BibliotecaVivaModule],
  controllers: [EstudoPilotoController],
  providers: [EstudoPilotoService, EstudoPilotoRepository],
})
export class EstudoPilotoModule {}
