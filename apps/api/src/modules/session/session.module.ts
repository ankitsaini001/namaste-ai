import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersModule } from '../members/members.module';
import { Session, SessionSchema } from './session.schema';
import { RolesGuard } from './roles.guard';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';
import { WeddingMemberGuard } from './wedding-member.guard';

/** Sessions and the guards every signed-in endpoint uses. */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    MembersModule,
  ],
  providers: [SessionsService, SessionGuard, WeddingMemberGuard, RolesGuard],
  exports: [SessionsService, SessionGuard, WeddingMemberGuard, RolesGuard, MembersModule],
})
export class SessionModule {}
