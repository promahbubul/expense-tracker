import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Account } from '../accounts/account.schema';
import { Company } from '../companies/company.schema';
import { LoanDirection } from '../common/types';
import { LoanPerson } from './loan-person.schema';

export type LoanDocument = HydratedDocument<Loan>;

@Schema({ timestamps: true })
export class Loan {
  _id!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: LoanPerson.name, required: true })
  personId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Account.name, required: true })
  accountId!: Types.ObjectId;

  @Prop({ required: true, enum: LoanDirection })
  direction!: LoanDirection;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, trim: true })
  purpose!: string;

  @Prop({ type: Date, required: true })
  loanDate!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Company.name, required: true, index: true })
  companyId!: Types.ObjectId;
}

export const LoanSchema = SchemaFactory.createForClass(Loan);
LoanSchema.index({ companyId: 1, loanDate: -1 });
