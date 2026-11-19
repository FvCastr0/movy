import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto, req.user.id, req.user.role);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(query, req.user.id, req.user.role);
  }

  @Get('assignable-users')
  async getAssignableUsers() {
    return this.tasksService.getAssignableUsers();
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.tasksService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.tasksService.delete(id, req.user.id, req.user.role);
  }
}
