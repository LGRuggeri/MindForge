import { Module } from '@nestjs/common';
import { AgentesController } from './agentes.controller';
import { AgentesRepository } from './agentes.repository';
import { AgentesService } from './agentes.service';
import { LlmFallbackService } from './llm-fallback.service';
import { LlmService } from './llm.service';

/**
 * Módulo de Agentes de IA. Exporta `AgentesService` (orquestração + logging)
 * e `LlmService` (cliente LLM) para os demais módulos de domínio.
 */
@Module({
  controllers: [AgentesController],
  providers: [AgentesRepository, AgentesService, LlmFallbackService, LlmService],
  exports: [AgentesService, LlmFallbackService, LlmService],
})
export class AgentesModule {}
