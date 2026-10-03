import { Controller, Get, HttpStatus } from '@nestjs/common';
import type { HealthResponse, ReadinessResponse } from '@mmm/shared';
import { AppException } from '../../common/app.exception';
import { DatabaseHealthIndicator } from '../../database/database-health.indicator';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseHealthIndicator) {}

  /** Liveness: the process is up. Never touches the database. */
  @Get()
  live(): HealthResponse {
    return { status: 'ok' };
  }

  /** Readiness: the API can serve requests, which needs MongoDB. */
  @Get('ready')
  async ready(): Promise<ReadinessResponse> {
    if (!(await this.database.isUp())) {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'The service is temporarily unavailable. Please try again shortly.',
        null,
        { checks: { database: 'down' } },
      );
    }
    return { status: 'ok', checks: { database: 'up' } };
  }
}
