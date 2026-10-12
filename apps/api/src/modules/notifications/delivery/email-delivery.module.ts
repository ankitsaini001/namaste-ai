import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WorkerEnv } from '../../../config/env';
import { emailModels } from '../notifications.module';
import { EmailQuotaService } from './email-quota.service';
import { EmailRenderer } from './email-renderer';
import { EMAIL_TRANSPORT, type EmailTransport } from './email-transport';
import { ResendTransport } from './resend.transport';
import { SendEmailHandler } from './send-email.handler';
import { SmtpTransport } from './smtp.transport';

/** Worker side: renders and delivers queued emails. */
@Module({
  imports: [emailModels],
  providers: [
    EmailQuotaService,
    EmailRenderer,
    SendEmailHandler,
    {
      provide: EMAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<WorkerEnv, true>): EmailTransport =>
        config.get('EMAIL_TRANSPORT', { infer: true }) === 'resend'
          ? new ResendTransport(config.get('RESEND_API_KEY', { infer: true })!)
          : new SmtpTransport(
              config.get('SMTP_HOST', { infer: true }),
              config.get('SMTP_PORT', { infer: true }),
            ),
    },
  ],
  exports: [EmailQuotaService],
})
export class EmailDeliveryModule {}
