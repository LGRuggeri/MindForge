import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SandboxRepository } from './sandbox.repository';
import { DockerExecutor } from './docker-executor';
import { ExecutarCodigoDto } from './dto/executar-codigo.dto';

@Injectable()
export class SandboxService {
  private ativas = 0;
  constructor(
    private readonly repo: SandboxRepository,
    private readonly executor: DockerExecutor,
    private readonly config: ConfigService,
  ) {}

  async executar(id: string, dto: ExecutarCodigoDto) {
    if (this.config.get('SANDBOX_ENABLED', 'false') !== 'true') {
      throw new ServiceUnavailableException(
        'Sandbox desativado. Ative SANDBOX_ENABLED e prepare as imagens Docker conforme a documentação local.',
      );
    }
    if (this.ativas >= 2)
      throw new HttpException('Há duas execuções em andamento. Aguarde e tente novamente.', 429);
    this.ativas++;
    try {
      const exercicio = await this.repo.buscarExercicio(id);
      if (!exercicio) throw new NotFoundException('Exercício não encontrado');
      if (exercicio.perfilId !== dto.perfilId)
        throw new ForbiddenException('Exercício não pertence ao perfil informado');
      if (exercicio.tipo !== 'codigo')
        throw new BadRequestException('Somente exercícios de código podem ser executados');
      return await this.executor.executar(dto);
    } finally {
      this.ativas--;
    }
  }
}
