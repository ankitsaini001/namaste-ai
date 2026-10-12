import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { LoginCode, LoginCodeSchema } from './login-code.schema';
import { LoginCodesService } from './login-codes.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { Session, SessionSchema } from './session.schema';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoginCode.name, schema: LoginCodeSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    UsersModule,
    NotificationsModule,
    RateLimitModule,
  ],
  controllers: [AuthController, MeController],
  providers: [LoginCodesService, SessionsService, SessionGuard, MeService],
  exports: [SessionsService, SessionGuard],
})
export class AuthModule {}
