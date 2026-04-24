import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types';
import { CreateLoanDto, CreateLoanPersonDto, UpdateLoanDto, UpdateLoanPersonDto } from './dto/loan.dto';
import { LoansService } from './loans.service';

@UseGuards(JwtAuthGuard)
@Controller('loan')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get('accounts')
  listPeople(@CurrentUser() user: JwtUser) {
    return this.loans.listPeople(user);
  }

  @Post('accounts')
  createPerson(@Body() dto: CreateLoanPersonDto, @CurrentUser() user: JwtUser) {
    return this.loans.createPerson(dto, user);
  }

  @Patch('accounts/:id')
  updatePerson(@Param('id') id: string, @Body() dto: UpdateLoanPersonDto, @CurrentUser() user: JwtUser) {
    return this.loans.updatePerson(id, dto, user);
  }

  @Delete('accounts/:id')
  removePerson(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.loans.removePerson(id, user);
  }

  @Get('loads')
  listLoans(@CurrentUser() user: JwtUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.loans.listLoans(user, from, to);
  }

  @Post('loads')
  createLoan(@Body() dto: CreateLoanDto, @CurrentUser() user: JwtUser) {
    return this.loans.createLoan(dto, user);
  }

  @Patch('loads/:id')
  updateLoan(@Param('id') id: string, @Body() dto: UpdateLoanDto, @CurrentUser() user: JwtUser) {
    return this.loans.updateLoan(id, dto, user);
  }

  @Delete('loads/:id')
  removeLoan(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.loans.removeLoan(id, user);
  }
}
