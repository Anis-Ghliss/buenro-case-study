import { z } from 'zod';

export const UnifiedSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => String(val)),
  city: z.string(),
  name: z.string().optional(),
  country: z.string().optional(),
  isAvailable: z.boolean(),
  pricePerNight: z.number(),
  priceSegment: z.enum(['low', 'medium', 'high']).optional(),
  other: z.record(z.any()).optional(),
  source: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type UnifiedData = z.infer<typeof UnifiedSchema>; 