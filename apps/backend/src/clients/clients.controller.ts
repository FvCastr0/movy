import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ConciergeBridgeService } from './concierge-bridge.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { SyncClientConciergeDto } from './dto/sync-client-concierge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly conciergeBridgeService: ConciergeBridgeService,
  ) {}

  @Get()
  async findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Post('convert-from-lead/:leadId')
  async convertFromLead(@Param('leadId') leadId: string, @Body() dto: ConvertLeadDto) {
    return this.clientsService.convertLeadToClient(leadId, dto);
  }

  @Post(':id/concierge/sync')
  async syncClientConcierge(
    @Param('id') id: string,
    @Body() dto: SyncClientConciergeDto,
  ) {
    return this.conciergeBridgeService.syncClientConcierge(id, dto);
  }

  @Get(':id/concierge/summary')
  async getClientConciergeSummary(
    @Param('id') id: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.conciergeBridgeService.getClientConciergeSummary(
      id,
      periodStart,
      periodEnd,
    );
  }
}
