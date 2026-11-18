import { IsOptional, IsString } from 'class-validator';

export class QueryInsightsDto {
  @IsOptional()
  @IsString()
  since?: string;

  @IsOptional()
  @IsString()
  until?: string;

  @IsOptional()
  @IsString()
  force?: string; // 'true' ou '1' para forçar recarga ignorando cache respeitando cooldown
}
