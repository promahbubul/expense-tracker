import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CategoryType } from '../../common/types';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;
}
