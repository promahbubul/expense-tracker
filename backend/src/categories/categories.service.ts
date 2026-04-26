import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryType, JwtUser } from '../common/types';
import { assertNotStale } from '../common/utils/optimistic-lock';
import { Category } from './category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private readonly categories: Model<Category>) {}

  list(user: JwtUser, type?: CategoryType) {
    return this.categories
      .find({ userId: user.sub, isActive: true, ...(type ? { type } : {}) })
      .sort({ type: 1, name: 1 })
      .lean();
  }

  async create(dto: CreateCategoryDto, user: JwtUser) {
    if (dto.clientRequestId) {
      const existing = await this.categories.findOne({ userId: user.sub, clientRequestId: dto.clientRequestId }).lean();
      if (existing) {
        return existing;
      }
    }

    const exists = await this.categories.findOne({
      userId: user.sub,
      type: dto.type,
      name: dto.name,
      isActive: true,
    });
    if (exists) {
      throw new BadRequestException('Category already exists');
    }
    return this.categories.create({ ...dto, userId: user.sub });
  }

  async update(id: string, dto: UpdateCategoryDto, user: JwtUser) {
    const category = await this.categories.findOne({ _id: id, userId: user.sub });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { expectedUpdatedAt, ...changes } = dto;
    assertNotStale(category.updatedAt, expectedUpdatedAt);
    category.set(changes);
    await category.save();
    return this.categories.findById(category._id).lean();
  }

  async remove(id: string, user: JwtUser, expectedUpdatedAt?: string) {
    const category = await this.categories.findOne({ _id: id, userId: user.sub });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    assertNotStale(category.updatedAt, expectedUpdatedAt);
    category.set({ isActive: false });
    await category.save();
    return { success: true };
  }
}
