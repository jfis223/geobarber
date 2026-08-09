import { z } from "zod";

const ringSchema = z
  .array(z.tuple([z.number(), z.number()]))
  .min(4, "A polygon ring needs at least 4 positions (closed ring)");

export const geoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(ringSchema).min(1),
});

export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonSchema>;

export const serviceZoneInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  geometry: geoJsonPolygonSchema,
  active: z.boolean(),
});

export type ServiceZoneInput = z.infer<typeof serviceZoneInputSchema>;
