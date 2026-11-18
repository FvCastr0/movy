import { Module } from '@nestjs/common';
import { OnboardingOpsService } from './onboarding-ops.service';
import { OnboardingOpsController } from './onboarding-ops.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingOpsController],
  providers: [OnboardingOpsService],
  exports: [OnboardingOpsService],
})
export class OnboardingOpsModule {}
