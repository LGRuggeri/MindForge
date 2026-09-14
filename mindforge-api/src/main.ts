import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

export function configurarAplicacao(app: INestApplication) {
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados no DTO — blindagem de borda
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}

async function criarAplicacao() {
  const { AppModule } = await import('./app.module');
  return NestFactory.create(AppModule, { abortOnError: false });
}

export async function bootstrap(criar: () => Promise<INestApplication> = criarAplicacao) {
  const app = await criar();
  try {
    configurarAplicacao(app);
    const port = app.get(ConfigService).get<number>('PORT', 3000);
    await app.listen(port);
    new Logger('Bootstrap').log(`MindForge API rodando em http://localhost:${port}`);
    return app;
  } catch (erro) {
    await app.close();
    throw erro;
  }
}

if (require.main === module) {
  void bootstrap().catch(() => {
    new Logger('Bootstrap').error(
      'Não foi possível iniciar a API. Verifique a configuração e os serviços locais.',
    );
    process.exitCode = 1;
  });
}
