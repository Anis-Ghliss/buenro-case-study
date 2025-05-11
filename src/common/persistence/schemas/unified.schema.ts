import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Unified extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop()
  name?: string;

  @Prop({ required: true, index: true })
  city: string;

  @Prop()
  country?: string;

  @Prop({ required: true, index: true })
  isAvailable: boolean;

  @Prop({ required: true, index: true })
  pricePerNight: number;

  @Prop({ index: true })
  priceSegment?: string;

  @Prop({ type: Object })
  other?: Record<string, any>;

  @Prop({ required: true, index: true })
  source: string;
}

export const UnifiedSchema = SchemaFactory.createForClass(Unified);

UnifiedSchema.index({ city: 1, isAvailable: 1 });
