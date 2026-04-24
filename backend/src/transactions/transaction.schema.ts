import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Account } from '../accounts/account.schema';
import { Category } from '../categories/category.schema';
import { Company } from '../companies/company.schema';
import { TransactionType } from '../common/types';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Category.name, required: true })
  categoryId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Account.name, required: true })
  accountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Date, required: true })
  transactionDate!: Date;

  @Prop({ required: true, enum: TransactionType, index: true })
  type!: TransactionType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Company.name, required: true, index: true })
  companyId!: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ companyId: 1, type: 1, transactionDate: -1 });
