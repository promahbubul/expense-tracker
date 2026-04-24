import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LoanDirection } from '../../common/types';

export class CreateLoanPersonDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class UpdateLoanPersonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateLoanDto {
  @IsString()
  personId!: string;

  @IsString()
  accountId!: string;

  @IsEnum(LoanDirection)
  direction!: LoanDirection;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  purpose!: string;

  @IsDateString()
  loanDate!: string;
}

export class UpdateLoanDto {
  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(LoanDirection)
  direction?: LoanDirection;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsDateString()
  loanDate?: string;
}
