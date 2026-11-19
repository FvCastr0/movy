import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { MeetingCadenceService } from './meeting-cadence.service';
import { EvolutionModule } from '../evolution/evolution.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [EvolutionModule, NotificationsModule, PrismaModule],
  controllers: [LeadsController],
  providers: [LeadsService, MeetingCadenceService],
  exports: [LeadsService, MeetingCadenceService],
})
export class LeadsModule {}
