import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Account } from '../accounts/account.schema';
import { Category } from '../categories/category.schema';
import { CategoryType, JwtUser } from '../common/types';
import { User } from '../users/user.schema';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto, SignupDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Account.name) private readonly accounts: Model<Account>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ email });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const user = await this.users.create({
      name: dto.name,
      email,
      phone: dto.phone,
      password: await bcrypt.hash(dto.password, 10),
    });

    await this.bootstrapWorkspace(user._id.toString());

    return this.authPayload(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authPayload(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase(), isActive: true });
    if (!user) {
      throw new NotFoundException('No active account found for this email');
    }

    const resetToken = randomBytes(24).toString('hex');
    const passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.users.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt,
    });

    return {
      success: true,
      resetToken,
      expiresAt: passwordResetExpiresAt,
      message: 'Password reset session created for this device.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.users.findOne({
      email: dto.email.toLowerCase(),
      passwordResetToken: dto.resetToken,
      passwordResetExpiresAt: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return this.authPayload(user);
  }

  me(user: JwtUser) {
    return user;
  }

  private async bootstrapWorkspace(userId: string) {
    await this.accounts.create({
      name: 'Main Wallet',
      details: 'Personal cash balance',
      initialBalance: 0,
      currentBalance: 0,
      userId,
    });

    await this.categories.insertMany([
      { name: 'Salary', type: CategoryType.INCOME, userId },
      { name: 'Freelance', type: CategoryType.INCOME, userId },
      { name: 'Business', type: CategoryType.INCOME, userId },
      { name: 'Food', type: CategoryType.EXPENSE, userId },
      { name: 'Transport', type: CategoryType.EXPENSE, userId },
      { name: 'Bills', type: CategoryType.EXPENSE, userId },
      { name: 'Shopping', type: CategoryType.EXPENSE, userId },
    ]);
  }

  private authPayload(user: User) {
    const payload: JwtUser = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: payload,
    };
  }
}
