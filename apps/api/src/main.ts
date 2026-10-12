import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import type { ApiEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<ApiEnv, true>>(ConfigService);

  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  if (trustProxy) app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  configureApp(app, { webOrigin: config.get('WEB_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/v1`, 'Bootstrap');
}

void bootstrap();
