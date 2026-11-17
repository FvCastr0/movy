import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetaAdsModule } from '../meta-ads/meta-ads.module';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
  imports: [PrismaModule, MetaAdsModule, EvolutionModule],
  controllers: [ReportsController],
  providers: [ReportsService, PdfGeneratorService],
  exports: [ReportsService],
})
export class ReportsModule {}
