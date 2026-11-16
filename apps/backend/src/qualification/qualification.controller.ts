import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QualificationService } from './qualification.service';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { CreateFollowUpDto } from './dto/create-followup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('leads/:leadId')
export class QualificationController {
  constructor(private readonly qualificationService: QualificationService) {}

  @Get('qualification')
  async getQualification(@Param('leadId') leadId: string) {
    return this.qualificationService.getQualification(leadId);
  }

  @Patch('qualification')
  async updateQualification(
    @Param('leadId') leadId: string,
    @Body() dto: UpdateQualificationDto,
  ) {
    return this.qualificationService.updateQualification(leadId, dto);
  }

  @Get('follow-ups')
  async getFollowUps(@Param('leadId') leadId: string) {
    return this.qualificationService.getFollowUps(leadId);
  }

  @Post('follow-ups')
  async addFollowUp(
    @Param('leadId') leadId: string,
    @Body() dto: CreateFollowUpDto,
    @Request() req: any,
  ) {
    return this.qualificationService.addFollowUp(leadId, req.user.id, dto);
  }
}
