import { IsOptional, IsEnum, IsString } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class TaskQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @IsString()
  scope?: 'my' | 'assigned_by_me' | 'all';
}
