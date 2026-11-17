import { Controller, Post, Body, Get, Patch, Param, Query, NotFoundException, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateOutboundLeadDto } from './dto/create-outbound-lead.dto';
import { UpdateCrmStageDto } from './dto/update-crm-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadOriginType } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

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
  async getCrmMetrics(@Query('origemTipo') origemTipo?: LeadOriginType) {
    return this.leadsService.getCrmMetrics(origemTipo);
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
  async updateCrmStage(@Param('id') id: string, @Body() dto: UpdateCrmStageDto) {
    return this.leadsService.updateCrmStage(id, dto);
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
}
