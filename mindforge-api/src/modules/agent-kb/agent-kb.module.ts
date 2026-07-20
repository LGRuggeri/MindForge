import { Module } from '@nestjs/common';
import { AgentKbAdrBootstrap } from './agent-kb-adr.bootstrap';
import { AgentKbService } from './agent-kb.service';

/**
 * Integração com o agent_kb.py local.
 * Oferece contexto estruturado (rules, skills, memory, mcp_tools) para
 * os agentes do MindForge, reduzindo alucinações com fatos verificados.
 */
@Module({
  providers: [AgentKbService, AgentKbAdrBootstrap],
  exports: [AgentKbService],
})
export class AgentKbModule {}
