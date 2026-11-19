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
import { OnboardingOpsModule } from './onboarding-ops/onboarding-ops.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
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
    UsersModule,
    QualificationModule,
    ClientsModule,
    MetaAdsModule,
    ReportsModule,
    FinanceModule,
    OnboardingOpsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
