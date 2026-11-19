import { IsOptional, IsBooleanString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 30;
}
