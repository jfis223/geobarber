import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import type { Provider } from "@/generated/prisma";
import type { ProviderInput } from "./schema";

// §5 — the initial implementation supports exactly one active provider;
// the data model supports more, but nothing in this admin flow assumes it yet.
export function getPrimaryProvider(): Promise<Provider | null> {
  return prisma.provider.findFirst({ orderBy: { createdAt: "asc" } });
}

// Geocoding happens client-side via the autocomplete (searchAddressAction) —
// the admin picks a specific candidate, so this just persists what they chose
// rather than re-geocoding free text and risking a different match.
export async function saveProvider(id: string | undefined, input: ProviderInput): Promise<Provider> {
  const data = {
    name: input.name,
    homeAddress: input.formattedAddress,
    homeLatitude: input.latitude,
    homeLongitude: input.longitude,
  };

  if (id) {
    // §5 — changing home address affects future availability only; past appointments already snapshot their own address.
    return prisma.provider.update({ where: { id }, data });
  }
  return prisma.provider.create({ data: { ...data, active: true } });
}
