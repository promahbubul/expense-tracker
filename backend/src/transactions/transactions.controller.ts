import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser, TransactionType } from '../common/types';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get('expenses')
  expenses(@CurrentUser() user: JwtUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.transactions.list(TransactionType.EXPENSE, user, from, to);
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateTransactionDto, @CurrentUser() user: JwtUser) {
    return this.transactions.create(TransactionType.EXPENSE, dto, user);
  }

  @Patch('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @CurrentUser() user: JwtUser) {
    return this.transactions.update(id, TransactionType.EXPENSE, dto, user);
  }

  @Delete('expenses/:id')
  removeExpense(@Param('id') id: string, @Query('expectedUpdatedAt') expectedUpdatedAt: string | undefined, @CurrentUser() user: JwtUser) {
    return this.transactions.remove(id, TransactionType.EXPENSE, user, expectedUpdatedAt);
  }

  @Get('incomes')
  incomes(@CurrentUser() user: JwtUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.transactions.list(TransactionType.INCOME, user, from, to);
  }

  @Post('incomes')
  createIncome(@Body() dto: CreateTransactionDto, @CurrentUser() user: JwtUser) {
    return this.transactions.create(TransactionType.INCOME, dto, user);
  }

  @Patch('incomes/:id')
  updateIncome(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @CurrentUser() user: JwtUser) {
    return this.transactions.update(id, TransactionType.INCOME, dto, user);
  }

  @Delete('incomes/:id')
  removeIncome(@Param('id') id: string, @Query('expectedUpdatedAt') expectedUpdatedAt: string | undefined, @CurrentUser() user: JwtUser) {
    return this.transactions.remove(id, TransactionType.INCOME, user, expectedUpdatedAt);
  }
}
