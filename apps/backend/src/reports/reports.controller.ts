import { Controller, Post, Get, Delete, Param, Body, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { AutoGenerateReportDto } from './dto/auto-generate-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('meta-insights/:clientId')
  async syncMetaInsights(
    @Param('clientId') clientId: string,
    @Query('weekStartDate') weekStartDate?: string,
    @Query('weekEndDate') weekEndDate?: string,
  ) {
    return this.reportsService.syncMetaInsights(clientId, weekStartDate, weekEndDate);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateReport(@Body() dto: CreateReportDto) {
    return this.reportsService.createWeeklyReport(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('clients/:clientId/auto-generate')
  async autoGenerateReport(
    @Param('clientId') clientId: string,
    @Body() dto: AutoGenerateReportDto
  ) {
    return this.reportsService.generateAutomatedReport(clientId, dto);
  }

  @Get(':id/pdf')
  async downloadReportPdf(@Param('id') id: string, @Res() res: Response) {
    const { filePath, report } = await this.reportsService.ensureReportPdfFile(id);
    const safeName = report.client.deliveryNome.replace(/[^a-zA-Z0-9_-]/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Relatorio-Movy-${safeName}.pdf"`);
    return res.sendFile(filePath);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-whatsapp')
  async sendToWhatsApp(@Param('id') id: string) {
    return this.reportsService.sendReportToWhatsApp(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteReport(@Param('id') id: string) {
    return this.reportsService.deleteReport(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('client/:clientId')
  async findByClient(@Param('clientId') clientId: string) {
    return this.reportsService.findByClientId(clientId);
  }
}
