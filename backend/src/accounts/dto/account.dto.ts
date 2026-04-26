import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  details?: string;
}
