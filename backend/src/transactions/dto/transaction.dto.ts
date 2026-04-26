import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @IsString()
  categoryId!: string;

  @IsString()
  accountId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  transactionDate!: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
