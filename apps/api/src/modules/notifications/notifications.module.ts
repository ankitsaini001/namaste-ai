import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../../jobs/jobs.module';
import { EmailQuota, EmailQuotaSchema } from './email-quota.schema';
import { Email, EmailSchema } from './email.schema';
import { NotificationsService } from './notifications.service';

export const emailModels = MongooseModule.forFeature([
  { name: Email.name, schema: EmailSchema },
  { name: EmailQuota.name, schema: EmailQuotaSchema },
]);

/** API side: features call NotificationsService to send messages. */
@Module({
  imports: [emailModels, JobsModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
