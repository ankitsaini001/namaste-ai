import type { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';

/** HTTP setup shared by main.ts and the tests, so tests exercise the real pipeline. */
export function configureApp(app: INestApplication, options: { webOrigin: string }): void {
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: options.webOrigin,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
}
