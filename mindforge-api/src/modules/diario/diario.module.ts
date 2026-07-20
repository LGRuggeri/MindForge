import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { DiarioController } from './diario.controller';
import { DiarioService } from './diario.service';
import { DiarioRepository } from './diario.repository';

/**
 * Módulo Diário: registro diário de estudo, dificuldades, conquistas e
 * módulos trabalhados. Usa o agente Teacher para gerar recomendações
 * personalizadas de acompanhamento.
 */
@Module({
  imports: [AgentesModule],
  controllers: [DiarioController],
  providers: [DiarioService, DiarioRepository],
  exports: [DiarioService],
})
export class DiarioModule {}
