import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Loan, LoanSchema } from '../loans/loan.schema';
import { Transfer, TransferSchema } from '../transfers/transfer.schema';
import { Transaction, TransactionSchema } from '../transactions/transaction.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Loan.name, schema: LoanSchema },
      { name: Transfer.name, schema: TransferSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
