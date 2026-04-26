import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../users/user.schema';

export type AccountDocument = HydratedDocument<Account>;

@Schema({ timestamps: true })
export class Account {
  _id!: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

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

  @Prop({ trim: true })
  clientRequestId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, sparse: true });
