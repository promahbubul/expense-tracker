import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email!: string;

  @Prop()
  password!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop({ type: Date })
  emailVerificationExpiresAt?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop({ type: Date })
  passwordResetExpiresAt?: Date;

  @Prop()
  googleId?: string;

  @Prop({ default: 'LOCAL' })
  authProvider!: 'LOCAL' | 'GOOGLE';
}

export const UserSchema = SchemaFactory.createForClass(User);
