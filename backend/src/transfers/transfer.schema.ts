import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Account } from '../accounts/account.schema';
import { User } from '../users/user.schema';

export type TransferDocument = HydratedDocument<Transfer>;

@Schema({ timestamps: true })
export class Transfer {
  _id!: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Account.name, required: true })
  fromAccountId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Account.name, required: true })
  toAccountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  fee!: number;

  @Prop({ required: true, trim: true })
  note!: string;

  @Prop({ trim: true })
  clientRequestId?: string;

  @Prop({ type: Date, required: true })
  transferDate!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);
TransferSchema.index({ userId: 1, transferDate: -1 });
TransferSchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, sparse: true });
