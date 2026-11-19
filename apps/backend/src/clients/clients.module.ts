import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ConciergeBridgeService } from './concierge-bridge.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientsController],
  providers: [ClientsService, ConciergeBridgeService],
  exports: [ClientsService, ConciergeBridgeService],
})
export class ClientsModule {}
