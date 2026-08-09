import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import type { Service } from "@/generated/prisma";
import type { ServiceInput } from "./schema";

export function listActiveServices(): Promise<Service[]> {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function listAllServices(): Promise<Service[]> {
  return prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function createService(input: ServiceInput): Promise<Service> {
  const last = await prisma.service.findFirst({ orderBy: { sortOrder: "desc" } });
  return prisma.service.create({
    data: {
      name: input.name,
      description: input.description || undefined,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      currency: "EUR",
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export function updateService(id: string, input: ServiceInput): Promise<Service> {
  return prisma.service.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || undefined,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
    },
  });
}

export function setServiceActive(id: string, active: boolean): Promise<Service> {
  // Services are never physically deleted once they have appointment history (§6.1) —
  // deactivation is the only supported removal path, enforced here unconditionally.
  return prisma.service.update({ where: { id }, data: { active } });
}

/** Swaps sortOrder with the adjacent service in the given direction. */
export async function moveService(id: string, direction: "up" | "down"): Promise<void> {
  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= services.length) return;

  const current = services[index];
  const swap = services[swapIndex];

  await prisma.$transaction([
    prisma.service.update({ where: { id: current.id }, data: { sortOrder: swap.sortOrder } }),
    prisma.service.update({ where: { id: swap.id }, data: { sortOrder: current.sortOrder } }),
  ]);
}

export interface BookingLineItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPriceCents: number;
  durationMinutes: number;
  totalPriceCents: number;
}

export interface BookingTotal {
  lineItems: BookingLineItem[];
  totalDurationMinutes: number;
  totalPriceCents: number;
}

/** §11 — duration and price calculation. Only active services may be booked. */
export async function calculateBookingTotal(
  selections: { serviceId: string; quantity: number }[],
): Promise<BookingTotal> {
  const positiveSelections = selections.filter((s) => s.quantity > 0);
  if (positiveSelections.length === 0) {
    throw new Error("Select at least one service");
  }

  const services = await prisma.service.findMany({
    where: { id: { in: positiveSelections.map((s) => s.serviceId) }, active: true },
  });
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const lineItems: BookingLineItem[] = positiveSelections.map(({ serviceId, quantity }) => {
    const service = serviceById.get(serviceId);
    if (!service) throw new Error(`Service ${serviceId} is not available`);
    return {
      serviceId: service.id,
      serviceName: service.name,
      quantity,
      unitPriceCents: service.priceCents,
      durationMinutes: service.durationMinutes,
      totalPriceCents: service.priceCents * quantity,
    };
  });

  return {
    lineItems,
    totalDurationMinutes: lineItems.reduce((sum, li) => sum + li.durationMinutes * li.quantity, 0),
    totalPriceCents: lineItems.reduce((sum, li) => sum + li.totalPriceCents, 0),
  };
}
