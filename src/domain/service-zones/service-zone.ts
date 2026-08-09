import "server-only";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

import { prisma } from "@/infrastructure/prisma/client";
import type { ServiceZone } from "@/generated/prisma";
import type { GeoJsonPolygon, ServiceZoneInput } from "./schema";

export function listServiceZones(): Promise<ServiceZone[]> {
  return prisma.serviceZone.findMany({ orderBy: { createdAt: "asc" } });
}

/** §9 — customer is served if their coordinates fall inside any active zone. */
export async function isInsideServiceArea(latitude: number, longitude: number): Promise<boolean> {
  const zones = await prisma.serviceZone.findMany({ where: { active: true } });
  const customerPoint = point([longitude, latitude]);

  return zones.some((zone) => {
    const geometry = zone.geometry as unknown as GeoJsonPolygon;
    try {
      return booleanPointInPolygon(customerPoint, polygon(geometry.coordinates));
    } catch {
      // Malformed stored geometry must never be treated as "inside" (§57 — never assume success on ambiguous input).
      return false;
    }
  });
}

export async function saveServiceZone(id: string | undefined, input: ServiceZoneInput): Promise<ServiceZone> {
  // Changing the zone must not modify existing appointments (§9.1) — it only
  // affects future zone-membership checks, never past bookings, so a plain
  // upsert on the zone row alone is sufficient.
  if (id) {
    return prisma.serviceZone.update({
      where: { id },
      data: { name: input.name, geometry: input.geometry, active: input.active },
    });
  }
  return prisma.serviceZone.create({
    data: { name: input.name, geometry: input.geometry, active: input.active },
  });
}

export function setServiceZoneActive(id: string, active: boolean): Promise<ServiceZone> {
  return prisma.serviceZone.update({ where: { id }, data: { active } });
}
