import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { WeddingsModule } from '../weddings/weddings.module';
import { AuthController } from './auth.controller';
import { LoginCode, LoginCodeSchema } from './login-code.schema';
import { LoginCodesService } from './login-codes.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LoginCode.name, schema: LoginCodeSchema }]),
    SessionModule,
    UsersModule,
    WeddingsModule,
    NotificationsModule,
    RateLimitModule,
  ],
  controllers: [AuthController, MeController],
  providers: [LoginCodesService, MeService],
  exports: [MeService],
})
export class AuthModule {}
