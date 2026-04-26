import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types';
import { CreateTransferDto, UpdateTransferDto } from './dto/transfer.dto';
import { TransfersService } from './transfers.service';

@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.transfers.list(user, from, to);
  }

  @Post()
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: JwtUser) {
    return this.transfers.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransferDto, @CurrentUser() user: JwtUser) {
    return this.transfers.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.transfers.remove(id, user);
  }
}
