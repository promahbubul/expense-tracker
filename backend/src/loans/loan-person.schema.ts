import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Company } from '../companies/company.schema';

export type LoanPersonDocument = HydratedDocument<LoanPerson>;

@Schema({ timestamps: true })
export class LoanPerson {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  details?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Company.name, required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const LoanPersonSchema = SchemaFactory.createForClass(LoanPerson);
