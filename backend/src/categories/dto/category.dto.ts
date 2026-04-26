import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CategoryType } from '../../common/types';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @IsEnum(CategoryType)
  type!: CategoryType;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
