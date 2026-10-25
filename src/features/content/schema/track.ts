import { z } from "zod";
import { localizedStringSchema, slugSchema } from "./common";

export const trackSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  slug: slugSchema,
  order: z.number().int().positive(),
  published: z.boolean().default(false),
  title: localizedStringSchema,
  description: localizedStringSchema,
  audience: localizedStringSchema.optional(),
});
export type TrackMeta = z.infer<typeof trackSchema>;
