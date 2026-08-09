import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import type { Customer } from "@/generated/prisma";

/** §45 admin customers tab — full name, phone, and most recently used address per customer. */
export function listCustomersWithLatestAddress() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      addresses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/**
 * Clerk doesn't collect a phone number reliably at sign-up and has no
 * concept of a home address at all, so "registered" alone isn't enough to
 * book (§7 needs both). This is the completeness check the booking gate uses.
 */
export async function hasCompletedProfile(customer: Pick<Customer, "id" | "phone">): Promise<boolean> {
  if (!customer.phone) return false;
  const addressCount = await prisma.address.count({ where: { customerId: customer.id } });
  return addressCount > 0;
}

export interface CompleteProfileInput {
  phone: string;
  address: { formattedAddress: string; latitude: number; longitude: number };
}

export async function completeCustomerProfile(customerId: string, input: CompleteProfileInput): Promise<void> {
  await prisma.$transaction([
    prisma.customer.update({ where: { id: customerId }, data: { phone: input.phone } }),
    prisma.address.create({
      data: {
        customerId,
        originalAddress: input.address.formattedAddress,
        formattedAddress: input.address.formattedAddress,
        latitude: input.address.latitude,
        longitude: input.address.longitude,
      },
    }),
  ]);
}
