import { IsEnum } from 'class-validator';
import { OnboardingStage } from '@prisma/client';

export class UpdateOnboardingStageDto {
  @IsEnum(OnboardingStage, { message: 'Etapa de onboarding inválida.' })
  stage: OnboardingStage;
}
