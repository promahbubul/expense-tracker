import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.accounts.list(user);
  }

  @Post()
  create(@Body() dto: CreateAccountDto, @CurrentUser() user: JwtUser) {
    return this.accounts.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto, @CurrentUser() user: JwtUser) {
    return this.accounts.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('expectedUpdatedAt') expectedUpdatedAt: string | undefined, @CurrentUser() user: JwtUser) {
    return this.accounts.remove(id, user, expectedUpdatedAt);
  }
}
