import { Controller, Post, Body, Get, Patch, Param, NotFoundException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Endpoint PÚBLICO para receber leads da Landing Page
  @Post('capture')
  @HttpCode(HttpStatus.CREATED)
  async captureLead(@Body() dto: CaptureLeadDto) {
    return this.leadsService.captureLead(dto);
  }

  // Endpoints PROTEGIDOS por JWT para SDRs e Administradores
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.leadsService.findAll();
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
