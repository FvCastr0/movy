import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateChecklistDto {
  @IsOptional()
  @IsBoolean()
  metaAccessGranted?: boolean;

  @IsOptional()
  @IsBoolean()
  pageAccessGranted?: boolean;

  @IsOptional()
  @IsBoolean()
  instagramAccessGranted?: boolean;

  @IsOptional()
  @IsBoolean()
  pixelCreated?: boolean;

  @IsOptional()
  @IsBoolean()
  videosReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  creativesApproved?: boolean;
}
