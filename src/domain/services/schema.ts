import { z } from "zod";

export const serviceInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().positive("Duration must be positive"),
  priceCents: z.coerce.number().int().nonnegative("Price cannot be negative"),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;
