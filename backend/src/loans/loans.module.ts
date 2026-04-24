import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { LoanPerson, LoanPersonSchema } from './loan-person.schema';
import { Loan, LoanSchema } from './loan.schema';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [
    AccountsModule,
    MongooseModule.forFeature([
      { name: LoanPerson.name, schema: LoanPersonSchema },
      { name: Loan.name, schema: LoanSchema },
    ]),
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService, MongooseModule],
})
export class LoansModule {}
