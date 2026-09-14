import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';
import { SandboxRepository } from './sandbox.repository';
import { DockerExecutor } from './docker-executor';
import { DockerProcesso } from './docker-processo';

@Module({
  controllers: [SandboxController],
  providers: [SandboxService, SandboxRepository, DockerExecutor, DockerProcesso],
})
export class SandboxModule {}
