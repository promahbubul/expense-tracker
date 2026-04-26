import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CategoryType } from '../common/types';
import { User } from '../users/user.schema';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  _id!: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, enum: CategoryType })
  type!: CategoryType;

  @Prop({ trim: true })
  clientRequestId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
CategorySchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, sparse: true });
