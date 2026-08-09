import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import type { Address } from "@/generated/prisma";

export function listCustomerAddresses(customerId: string): Promise<Address[]> {
  return prisma.address.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
}

export function saveCustomerAddress(
  customerId: string,
  input: { label?: string; originalAddress: string; formattedAddress: string; latitude: number; longitude: number },
): Promise<Address> {
  return prisma.address.create({
    data: {
      customerId,
      label: input.label,
      originalAddress: input.originalAddress,
      formattedAddress: input.formattedAddress,
      latitude: input.latitude,
      longitude: input.longitude,
    },
  });
}
