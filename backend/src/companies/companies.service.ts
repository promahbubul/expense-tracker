import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtUser, UserRole } from '../common/types';
import { UpdateCompanyDto } from './dto/company.dto';
import { Company } from './company.schema';

@Injectable()
export class CompaniesService {
  constructor(@InjectModel(Company.name) private readonly companies: Model<Company>) {}

  list(user: JwtUser) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.companies.find().sort({ createdAt: -1 }).lean();
    }
    return this.companies.find({ _id: user.companyId }).lean();
  }

  async findOne(id: string, user: JwtUser) {
    this.assertCompanyAccess(id, user);
    const company = await this.companies.findById(id).lean();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, user: JwtUser) {
    this.assertCompanyAccess(id, user);
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only company users can update company settings');
    }
    const company = await this.companies.findByIdAndUpdate(id, dto, { new: true }).lean();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  private assertCompanyAccess(companyId: string, user: JwtUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.companyId !== companyId) {
      throw new ForbiddenException('You can manage only your company');
    }
  }
}
