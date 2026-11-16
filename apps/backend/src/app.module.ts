import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EvolutionModule } from './evolution/evolution.module';
import { LeadsModule } from './leads/leads.module';
import { AuthModule } from './auth/auth.module';
import { QualificationModule } from './qualification/qualification.module';
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
