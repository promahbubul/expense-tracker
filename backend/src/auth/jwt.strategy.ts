import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model } from 'mongoose';
import { User } from '../users/user.schema';
import { JwtUser, normalizeUserRole } from '../common/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'change-this-secret',
    });
  }

  async validate(payload: JwtUser) {
    const user = await this.users.findById(payload.sub).lean();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active');
    }
    return {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      companyId: user.companyId.toString(),
      role: normalizeUserRole(user.role),
    };
  }
}
