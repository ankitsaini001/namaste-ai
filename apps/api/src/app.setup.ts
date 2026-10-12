import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { OriginGuard } from './common/origin.guard';
import { requestIdMiddleware } from './common/request-id.middleware';
import { AppValidationPipe } from './common/validation.pipe';

/** HTTP setup shared by main.ts and the tests, so tests exercise the real pipeline. */
export function configureApp(app: INestApplication, options: { webOrigin: string }): void {
  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: options.webOrigin,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalGuards(new OriginGuard(app.get(Reflector), options.webOrigin));
  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
}
