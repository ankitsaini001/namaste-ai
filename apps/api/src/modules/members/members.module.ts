import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './membership.schema';
import { MembersService } from './members.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Membership.name, schema: MembershipSchema }])],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
