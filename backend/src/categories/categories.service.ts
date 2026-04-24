import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryType, JwtUser } from '../common/types';
import { Category } from './category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private readonly categories: Model<Category>) {}

  list(user: JwtUser, type?: CategoryType) {
    return this.categories
      .find({ companyId: user.companyId, isActive: true, ...(type ? { type } : {}) })
      .sort({ type: 1, name: 1 })
      .lean();
  }

  async create(dto: CreateCategoryDto, user: JwtUser) {
    const exists = await this.categories.findOne({
      companyId: user.companyId,
      type: dto.type,
      name: dto.name,
      isActive: true,
    });
    if (exists) {
      throw new BadRequestException('Category already exists');
    }
    return this.categories.create({ ...dto, companyId: user.companyId });
  }

  async update(id: string, dto: UpdateCategoryDto, user: JwtUser) {
    const category = await this.categories
      .findOneAndUpdate({ _id: id, companyId: user.companyId }, dto, { new: true })
      .lean();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async remove(id: string, user: JwtUser) {
    const category = await this.categories.findOneAndUpdate({ _id: id, companyId: user.companyId }, { isActive: false });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { success: true };
  }
}
