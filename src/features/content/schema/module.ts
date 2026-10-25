import { z } from "zod";
import {
  accessLevelSchema,
  contentKeySchema,
  localizedStringSchema,
  slugSchema,
} from "./common";

export const moduleSchema = z.object({
  key: contentKeySchema,
  slug: slugSchema,
  order: z.number().int().positive(),
  access: accessLevelSchema.default("ACCOUNT"),
  title: localizedStringSchema,
  summary: localizedStringSchema.optional(),
});
export type ModuleMeta = z.infer<typeof moduleSchema>;
