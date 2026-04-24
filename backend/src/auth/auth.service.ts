import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { Company } from '../companies/company.schema';
import { JwtUser, normalizeUserRole, UserRole } from '../common/types';
import { User } from '../users/user.schema';
import { LoginDto, SignupDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Company.name) private readonly companies: Model<Company>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ email });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const company = await this.companies.create({
      name: dto.companyName || `${dto.name}'s Company`,
      email,
      phone: dto.phone,
    });
    const superEmails = (this.config.get<string>('SUPER_ADMIN_EMAILS') ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const role = superEmails.includes(email) ? UserRole.SUPER_ADMIN : UserRole.ADMIN;

    const user = await this.users.create({
      name: dto.name,
      email,
      phone: dto.phone,
      password: await bcrypt.hash(dto.password, 10),
      role,
      companyId: company._id,
    });
    await this.companies.findByIdAndUpdate(company._id, { ownerId: user._id });

    return this.authPayload(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authPayload(user);
  }

  me(user: JwtUser) {
    return user;
  }

  private authPayload(user: User) {
    const payload: JwtUser = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      companyId: user.companyId.toString(),
      role: normalizeUserRole(user.role),
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: payload,
    };
  }
}
