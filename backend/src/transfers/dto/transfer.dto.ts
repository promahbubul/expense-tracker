import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  fromAccountId!: string;

  @IsString()
  toAccountId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsString()
  note!: string;

  @IsDateString()
  transferDate!: string;
}

export class UpdateTransferDto {
  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  transferDate?: string;
}
