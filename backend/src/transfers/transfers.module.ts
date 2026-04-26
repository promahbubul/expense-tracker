import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { Transfer, TransferSchema } from './transfer.schema';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Transfer.name, schema: TransferSchema }]), AccountsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
