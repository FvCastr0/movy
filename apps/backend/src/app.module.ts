import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EvolutionModule } from './evolution/evolution.module';
import { LeadsModule } from './leads/leads.module';
import { AuthModule } from './auth/auth.module';
import { QualificationModule } from './qualification/qualification.module';
import { ClientsModule } from './clients/clients.module';
import { MetaAdsModule } from './meta-ads/meta-ads.module';
import { ReportsModule } from './reports/reports.module';
import { FinanceModule } from './finance/finance.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    EvolutionModule,
    LeadsModule,
    AuthModule,
    QualificationModule,
    ClientsModule,
    MetaAdsModule,
    ReportsModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
