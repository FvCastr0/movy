import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LlmProvider } from '@prisma/client';
import { IsSafePublicHttpsUrl } from '../../common/validators/security.validators';

export const ALLOWED_ECONOMICAL_MODELS = [
  'gpt-4o-mini',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
] as const;

export class UpdateKnowledgeBaseDto {
  @IsSafePublicHttpsUrl()
  digitalMenuUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  openingHoursText!: string;

  @IsInt()
  @Min(10)
  @Max(240)
  estimatedDeliveryMinutes!: number;

  @IsInt()
  @Min(5)
  @Max(180)
  estimatedPickupMinutes!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  deliveryFeeRules!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  paymentMethods!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  agentName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  toneOfVoice!: string;

  @IsEnum(LlmProvider)
  llmProvider!: LlmProvider;

  @IsString()
  @IsIn(ALLOWED_ECONOMICAL_MODELS, {
    message: `Modelo deve ser um dos modelos econômicos homologados: ${ALLOWED_ECONOMICAL_MODELS.join(', ')}`,
  })
  llmModel!: string;

  @IsString()
  @IsOptional()
  @MaxLength(800)
  customInstructions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  handoffTriggers?: string;
}
