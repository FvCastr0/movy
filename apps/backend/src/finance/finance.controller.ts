import { Controller, Get, Put, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('metrics')
  async getMetrics() {
    return this.financeService.getFinanceMetrics();
  }

  @Get('contracts')
  async getContracts(
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('search') search?: string,
  ) {
    return this.financeService.getContracts(paymentStatus, search);
  }

  @Put('clients/:clientId/contract')
  async upsertContract(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.financeService.upsertContract(clientId, dto);
  }

  @Patch('clients/:clientId/payment-status')
  async updatePaymentStatus(
    @Param('clientId') clientId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.financeService.updatePaymentStatus(clientId, dto);
  }
}
