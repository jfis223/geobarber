import { z } from "zod";

export const providerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  formattedAddress: z.string().trim().min(1, "Select an address from the list"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export type ProviderInput = z.infer<typeof providerInputSchema>;
