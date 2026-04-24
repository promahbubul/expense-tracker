import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Company } from '../companies/company.schema';

export type AccountDocument = HydratedDocument<Account>;

@Schema({ timestamps: true })
export class Account {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  number?: string;

  @Prop({ trim: true })
  details?: string;

  @Prop({ type: Number, default: 0 })
  initialBalance!: number;

  @Prop({ type: Number, default: 0 })
  currentBalance!: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Company.name, required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
