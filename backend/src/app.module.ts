import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LoansModule } from './loans/loans.module';
import { ReportsModule } from './reports/reports.module';
import { TransfersModule } from './transfers/transfers.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    LoansModule,
    TransfersModule,
    DashboardModule,
    ReportsModule,
  ],
})
export class AppModule {}
