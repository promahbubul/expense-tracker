import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types';
import { RangePreset } from '../common/utils/date-range';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('statement')
  statement(
    @CurrentUser() user: JwtUser,
    @Query('period') period?: RangePreset,
    @Query('type') type?: 'all' | 'income' | 'expense' | 'loan',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.statement(user, period, type, from, to);
  }
}
