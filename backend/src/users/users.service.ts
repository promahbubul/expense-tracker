import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { JwtUser, UserRole } from '../common/types';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { User } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  list(user: JwtUser, companyId?: string) {
    const filter =
      user.role === UserRole.SUPER_ADMIN && companyId ? { companyId } : user.role === UserRole.SUPER_ADMIN ? {} : { companyId: user.companyId };
    return this.users.find(filter).select('-password').sort({ createdAt: -1 }).lean();
  }

  async create(dto: CreateUserDto, currentUser: JwtUser) {
    this.assertCanManageUsers(currentUser);
    const email = dto.email.toLowerCase();
    const exists = await this.users.findOne({ email });
    if (exists) {
      throw new BadRequestException('Email already exists');
    }
    if (dto.role === UserRole.SUPER_ADMIN && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super users can create super users');
    }

    const companyId = currentUser.role === UserRole.SUPER_ADMIN && dto.companyId ? dto.companyId : currentUser.companyId;
    const user = await this.users.create({
      name: dto.name,
      email,
      phone: dto.phone,
      companyId,
      role: dto.role ?? UserRole.HANDLER,
      password: await bcrypt.hash(dto.password, 10),
    });

    const plain = user.toObject();
    delete (plain as Partial<User>).password;
    return plain;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: JwtUser) {
    this.assertCanManageUsers(currentUser);
    const target = await this.users.findById(id);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    this.assertUserAccess(target, currentUser);
    if (dto.role === UserRole.SUPER_ADMIN && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super users can assign super role');
    }

    const update: Record<string, unknown> = { ...dto };
    if (dto.password) {
      update.password = await bcrypt.hash(dto.password, 10);
    }
    const user = await this.users.findByIdAndUpdate(id, update, { new: true }).select('-password').lean();
    return user;
  }

  async remove(id: string, currentUser: JwtUser) {
    this.assertCanManageUsers(currentUser);
    const target = await this.users.findById(id);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    this.assertUserAccess(target, currentUser);
    await this.users.findByIdAndUpdate(id, { isActive: false });
    return { success: true };
  }

  private assertUserAccess(target: User, currentUser: JwtUser) {
    if (currentUser.role !== UserRole.SUPER_ADMIN && target.companyId.toString() !== currentUser.companyId) {
      throw new ForbiddenException('You can manage only users from your company');
    }
  }

  private assertCanManageUsers(currentUser: JwtUser) {
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only company users can manage users');
    }
  }
}
