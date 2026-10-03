import { Controller, Get, HttpStatus, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { errorResponseSchema, healthResponseSchema, readinessResponseSchema } from '@mmm/shared';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AppException } from '../src/common/app.exception';
import { DatabaseHealthIndicator } from '../src/database/database-health.indicator';
import { HealthController } from '../src/modules/health/health.controller';

const WEB_ORIGIN = 'http://localhost:3000';
const REQUEST_ID = /^req_[0-9a-f]{32}$/;

@Controller('test-errors')
class ErrorsController {
  @Get('app')
  appError(): never {
    throw new AppException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'LIMIT_REACHED',
      'Limit reached.',
      null,
      {
        limit: 1000,
      },
    );
  }

  @Get('crash')
  crash(): never {
    throw new Error('internal detail that must not leak');
  }
}

describe('HTTP pipeline', () => {
  let app: INestApplication;
  // A fake database check, so these tests need no MongoDB.
  const database = { isUp: vi.fn<() => Promise<boolean>>() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, ErrorsController],
      providers: [{ provide: DatabaseHealthIndicator, useValue: database }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: WEB_ORIGIN });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health returns ok with a request ID', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(healthResponseSchema.parse(res.body)).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toMatch(REQUEST_ID);
  });

  it('GET /v1/health/ready returns ok when the database is up', async () => {
    database.isUp.mockResolvedValueOnce(true);
    const res = await request(app.getHttpServer()).get('/v1/health/ready').expect(200);
    expect(readinessResponseSchema.parse(res.body)).toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('GET /v1/health/ready returns 503 SERVICE_UNAVAILABLE when the database is down', async () => {
    database.isUp.mockResolvedValueOnce(false);
    const res = await request(app.getHttpServer()).get('/v1/health/ready').expect(503);
    const body = errorResponseSchema.parse(res.body);
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.details).toEqual({ checks: { database: 'down' } });
    expect(body.requestId).toBe(res.headers['x-request-id']);
  });

  it('unknown routes return the NOT_FOUND envelope with the same request ID', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
    const body = errorResponseSchema.parse(res.body);
    expect(body.error).toEqual({
      code: 'NOT_FOUND',
      message: "We couldn't find what you were looking for.",
      field: null,
    });
    expect(body.requestId).toBe(res.headers['x-request-id']);
  });

  it('routes outside /v1 are not served', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('AppException keeps its status, code, message and details', async () => {
    const res = await request(app.getHttpServer()).get('/v1/test-errors/app').expect(422);
    expect(errorResponseSchema.parse(res.body).error).toEqual({
      code: 'LIMIT_REACHED',
      message: 'Limit reached.',
      field: null,
      details: { limit: 1000 },
    });
  });

  it('unexpected errors become INTERNAL_ERROR without leaking details', async () => {
    const res = await request(app.getHttpServer()).get('/v1/test-errors/crash').expect(500);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('internal detail');
  });

  it('CORS allows the web origin with credentials', async () => {
    const res = await request(app.getHttpServer())
      .options('/v1/health')
      .set('Origin', WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('CORS does not allow other origins', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/health')
      .set('Origin', 'https://evil.example');
    // The header always names the web origin, so browsers block every other site.
    expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });
});
