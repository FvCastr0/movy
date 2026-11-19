import { Controller, Post, Body, Get, Patch, Param, Query, NotFoundException, HttpCode, HttpStatus, UseGuards, Request, Req } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { MeetingCadenceService } from './meeting-cadence.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateOutboundLeadDto } from './dto/create-outbound-lead.dto';
import { UpdateCrmStageDto } from './dto/update-crm-stage.dto';
import { CrmMetricsQueryDto } from './dto/crm-metrics-query.dto';
import { SendMeetingConfirmationDto } from './dto/send-meeting-confirmation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadOriginType } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly meetingCadenceService: MeetingCadenceService,
  ) {}

  // Endpoint PÚBLICO para receber leads da Landing Page
  @Post('capture')
  @HttpCode(HttpStatus.CREATED)
  async captureLead(@Body() dto: CaptureLeadDto) {
    return this.leadsService.captureLead(dto);
  }

  // ==============================================================================
  // ENDPOINTS DO CRM COMERCIAL (PROTEGIDOS POR JWT)
  // ==============================================================================

  @UseGuards(JwtAuthGuard)
  @Post('outbound')
  @HttpCode(HttpStatus.CREATED)
  async createOutboundLead(@Body() dto: CreateOutboundLeadDto, @Request() req: any) {
    const userId = req.user?.id;
    return this.leadsService.createOutboundLead(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('crm-metrics')
  async getCrmMetrics(@Query() query: CrmMetricsQueryDto) {
    return this.leadsService.getCrmMetrics(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('crm')
  async findAllCrm(
    @Query('origemTipo') origemTipo?: LeadOriginType,
    @Query('search') search?: string,
  ) {
    return this.leadsService.findAllCrm(origemTipo, search);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/crm-stage')
  async updateCrmStage(
    @Param('id') id: string,
    @Body() dto: UpdateCrmStageDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.leadsService.updateCrmStage(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/crm-stage/undo')
  @HttpCode(HttpStatus.OK)
  async undoCrmStage(@Param('id') id: string) {
    return this.leadsService.undoLastStage(id);
  }

  // ==============================================================================
  // ENDPOINTS OPERACIONAIS SDR LEGADOS / PADRÃO
  // ==============================================================================

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('includeConverted') includeConverted?: string) {
    return this.leadsService.findAll(includeConverted === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const lead = await this.leadsService.findOne(id);
    if (!lead) {
      throw new NotFoundException(`Lead com ID ${id} não foi encontrado.`);
    }
    return lead;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.updateLead(id, dto);
  }

  // ==============================================================================
  // RÉGUA DE REUNIÕES & CONFIRMAÇÃO SHOW-RATE
  // ==============================================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/meeting-confirmation')
  async sendMeetingConfirmation(
    @Param('id') id: string,
    @Body() dto: SendMeetingConfirmationDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.meetingCadenceService.sendConfirmationToLead(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('meeting-cadence/run-check')
  async runCadenceCheck() {
    return this.meetingCadenceService.evaluateUpcomingMeetings();
  }
}
