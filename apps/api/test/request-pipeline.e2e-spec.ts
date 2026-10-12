import { Body, Controller, HttpCode, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { emailCodeRequestSchema, errorResponseSchema } from '@mmm/shared';
import { createZodDto } from 'nestjs-zod';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AllowAnyOrigin } from '../src/common/origin.guard';

const WEB_ORIGIN = 'http://localhost:3000';

class EmailDto extends createZodDto(emailCodeRequestSchema) {}

@Controller('pipeline')
class PipelineController {
  @Post('email')
  @HttpCode(200)
  email(@Body() body: EmailDto) {
    return { data: body };
  }

  @Post('webhook')
  @HttpCode(200)
  @AllowAnyOrigin()
  webhook() {
    return { data: { ok: true } };
  }
}

describe('request pipeline', () => {
  let app: INestApplication;
  const post = (path: string) =>
    request(app.getHttpServer()).post(`/v1/pipeline/${path}`).set('Origin', WEB_ORIGIN);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PipelineController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: WEB_ORIGIN });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('validation', () => {
    it('passes valid, normalised bodies to the handler', async () => {
      const res = await post('email').send({ email: ' Princi@Gmail.com ' }).expect(200);
      expect(res.body).toEqual({ data: { email: 'princi@gmail.com' } });
    });

    it('returns VALIDATION_FAILED with the field and a message for people', async () => {
      const res = await post('email').send({ email: 'nope' }).expect(400);
      expect(errorResponseSchema.parse(res.body).error).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'Enter a valid email address, like you@example.com.',
        field: 'email',
      });
    });

    it('treats malformed JSON as VALIDATION_FAILED', async () => {
      const res = await post('email').set('Content-Type', 'application/json').send('{"email":');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('origin check', () => {
    it.each([
      ['no Origin header', undefined],
      ['another website', 'https://evil.example'],
    ])('blocks changes from %s', async (_label, origin) => {
      const req = request(app.getHttpServer()).post('/v1/pipeline/email');
      if (origin) req.set('Origin', origin);
      const res = await req.send({ email: 'a@b.co' }).expect(403);
      expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
    });

    it('blocks bodies that are not JSON, even from the web app', async () => {
      const res = await post('email')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=a@b.co')
        .expect(403);
      expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
    });

    it('lets endpoints marked @AllowAnyOrigin through', async () => {
      await request(app.getHttpServer()).post('/v1/pipeline/webhook').expect(200);
    });
  });
});
