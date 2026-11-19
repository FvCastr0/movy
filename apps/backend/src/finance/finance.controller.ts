import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { MonthlyClosingQueryDto } from './dto/monthly-closing-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentStatus, ExpenseCategory, UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('metrics')
  async getMetrics() {
    return this.financeService.getFinanceMetrics();
  }

  @Get('contracts')
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async getContracts(
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('search') search?: string,
  ) {
    return this.financeService.getContracts(paymentStatus, search);
  }

  @Put('clients/:clientId/contract')
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async upsertContract(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.financeService.upsertContract(clientId, dto);
  }

  @Patch('clients/:clientId/payment-status')
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async updatePaymentStatus(
    @Param('clientId') clientId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.financeService.updatePaymentStatus(clientId, dto);
  }

  // ==========================================
  // DESPESAS DA AGÊNCIA (EXPENSES)
  // ==========================================

  @Get('expenses')
  async getExpenses(
    @Query('category') category?: ExpenseCategory,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive === undefined ? true : isActive === 'true';
    return this.financeService.getExpenses(category, activeFilter);
  }

  @Post('expenses')
  async createExpense(@Body() dto: CreateExpenseDto) {
    return this.financeService.createExpense(dto);
  }

  @Patch('expenses/:id')
  async updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.financeService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
  }

  // ==========================================
  // FECHAMENTO MENSAL E DRE (MoM)
  // ==========================================

  @Get('monthly-closings')
  async getMonthlyClosings(@Query() query: MonthlyClosingQueryDto) {
    const months = query.months || 6;
    return this.financeService.getMonthlyClosings(months);
  }
}
