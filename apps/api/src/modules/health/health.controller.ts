import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@mmm/shared';

@Controller('health')
export class HealthController {
  /** Liveness: the process is up. Never touches the database. */
  @Get()
  live(): HealthResponse {
    return { status: 'ok' };
  }
}
