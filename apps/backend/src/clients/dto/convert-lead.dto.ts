import { IsOptional, IsString } from 'class-validator';

export class ConvertLeadDto {
  @IsOptional()
  @IsString()
  metaAdAccountId?: string;

  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;
}
