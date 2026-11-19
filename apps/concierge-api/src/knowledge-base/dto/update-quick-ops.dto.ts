import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateQuickOpsDto {
  @IsBoolean()
  @IsOptional()
  aiGlobalEnabled?: boolean;

  @IsInt()
  @Min(10)
  @Max(240)
  @IsOptional()
  estimatedDeliveryMinutes?: number;

  @IsInt()
  @Min(5)
  @Max(180)
  @IsOptional()
  estimatedPickupMinutes?: number;

  @IsString()
  @IsOptional()
  @MaxLength(800)
  customInstructions?: string;
}
