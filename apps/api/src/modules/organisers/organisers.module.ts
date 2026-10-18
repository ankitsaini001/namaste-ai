import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { WeddingsModule } from '../weddings/weddings.module';
import { JoinController } from './join.controller';
import { OrganiserInvite, OrganiserInviteSchema } from './organiser-invite.schema';
import { OrganisersController } from './organisers.controller';
import { OrganisersService } from './organisers.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrganiserInvite.name, schema: OrganiserInviteSchema }]),
    AuthModule,
    SessionModule,
    UsersModule,
    WeddingsModule,
    NotificationsModule,
    RateLimitModule,
  ],
  controllers: [OrganisersController, JoinController],
  providers: [OrganisersService],
})
export class OrganisersModule {}
