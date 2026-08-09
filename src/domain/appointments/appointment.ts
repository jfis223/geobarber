import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import * as serviceDomain from "@/domain/services/service";
import type { Appointment } from "@/generated/prisma";

const BLOCKING_STATUSES = ["REQUESTED", "PROPOSED", "CONFIRMED"] as const;

export interface CreateAppointmentRequestInput {
  customerId: string;
  providerId: string;
  address: string;
  latitude: number;
  longitude: number;
  startAt: Date;
  serviceSelections: { serviceId: string; quantity: number }[];
  notes?: string;
}

/**
 * §7 booking flow terminus: creates a REQUESTED appointment. Price and
 * duration are always recomputed from the current active services here
 * (never trusted from the client) and the slot is re-validated for
 * conflicts inside the same transaction — the availability list the
 * browser saw earlier is advisory only (§56).
 */
export async function createAppointmentRequest(
  input: CreateAppointmentRequestInput,
): Promise<Appointment> {
  const total = await serviceDomain.calculateBookingTotal(input.serviceSelections);
  const endAt = new Date(input.startAt.getTime() + total.totalDurationMinutes * 60_000);

  return prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({
      where: {
        providerId: input.providerId,
        status: { in: [...BLOCKING_STATUSES] },
        startAt: { lt: endAt },
        endAt: { gt: input.startAt },
      },
    });
    if (conflict) {
      throw new Error("That time is no longer available. Please select another time.");
    }

    return tx.appointment.create({
      data: {
        customerId: input.customerId,
        providerId: input.providerId,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        requestedStartAt: input.startAt,
        requestedEndAt: endAt,
        startAt: input.startAt,
        endAt,
        status: "REQUESTED",
        totalPriceCents: total.totalPriceCents,
        notes: input.notes,
        services: {
          create: total.lineItems.map((li) => ({
            serviceId: li.serviceId,
            serviceName: li.serviceName,
            quantity: li.quantity,
            durationMinutes: li.durationMinutes,
            unitPriceCents: li.unitPriceCents,
            totalPriceCents: li.totalPriceCents,
          })),
        },
        events: {
          create: { type: "REQUESTED", actorId: input.customerId },
        },
      },
      include: { services: true },
    });
  });
}

export function listCustomerAppointments(customerId: string) {
  return prisma.appointment.findMany({
    where: { customerId },
    orderBy: { startAt: "desc" },
    include: { services: true },
  });
}

export function getCustomerAppointment(customerId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, customerId },
    include: { services: true, events: { orderBy: { createdAt: "asc" } } },
  });
}

/** §31 admin requests queue — every pending request regardless of which calendar range is currently visible. */
export function listPendingAppointments(providerId: string) {
  return prisma.appointment.findMany({
    where: { providerId, status: "REQUESTED" },
    orderBy: { startAt: "asc" },
    include: { services: true, customer: true },
  });
}

/** §46 admin schedule — appointments for a provider whose visit overlaps [rangeStart, rangeEnd). */
export function listAppointmentsInRange(providerId: string, rangeStart: Date, rangeEnd: Date) {
  return prisma.appointment.findMany({
    where: {
      providerId,
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    },
    orderBy: { startAt: "asc" },
    include: { services: true, customer: true },
  });
}

export function getAppointmentForAdmin(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { services: true, customer: true, events: { orderBy: { createdAt: "asc" } } },
  });
}

/** §31/§32 — admin confirms a pending request. */
export async function confirmAppointment(appointmentId: string, adminId: string): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.status !== "REQUESTED") {
      throw new Error("This request can no longer be confirmed.");
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CONFIRMED",
        events: { create: { type: "CONFIRMED", actorId: adminId } },
      },
    });
  });
}

/** §31 — admin declines a pending request; the slot becomes available again (DECLINED isn't a blocking status). */
export async function declineAppointment(appointmentId: string, adminId: string): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.status !== "REQUESTED") {
      throw new Error("This request can no longer be declined.");
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "DECLINED",
        events: { create: { type: "DECLINED", actorId: adminId } },
      },
    });
  });
}

/**
 * §33 — admin proposes an alternative slot. The appointment's startAt/endAt
 * move to the proposed time immediately (§15); requestedStartAt/requestedEndAt
 * keep the customer's original ask untouched, for history. Duration is
 * preserved from the original request — only the start time shifts.
 */
export async function proposeAlternativeSlot(
  appointmentId: string,
  adminId: string,
  newStartAt: Date,
): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.status !== "REQUESTED") {
      throw new Error("This request can no longer be proposed an alternative.");
    }

    const durationMs = appointment.endAt.getTime() - appointment.startAt.getTime();
    const newEndAt = new Date(newStartAt.getTime() + durationMs);

    // §56 — revalidate before storing the proposal, excluding this appointment itself.
    const conflict = await tx.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        providerId: appointment.providerId,
        status: { in: [...BLOCKING_STATUSES] },
        startAt: { lt: newEndAt },
        endAt: { gt: newStartAt },
      },
    });
    if (conflict) {
      throw new Error("That time is no longer available. Please select another time.");
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "PROPOSED",
        startAt: newStartAt,
        endAt: newEndAt,
        proposedAt: new Date(),
        proposedByAdminId: adminId,
        events: {
          create: {
            type: "PROPOSED",
            actorId: adminId,
            metadata: { proposedStartAt: newStartAt.toISOString(), proposedEndAt: newEndAt.toISOString() },
          },
        },
      },
    });
  });
}

/** §35 — client accepts the admin's proposed time. */
export async function acceptProposal(appointmentId: string, customerId: string): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({ where: { id: appointmentId, customerId } });
    if (!appointment || appointment.status !== "PROPOSED") {
      throw new Error("This proposed appointment time is no longer available. Please contact us or request another time.");
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CONFIRMED",
        events: { create: { type: "PROPOSAL_ACCEPTED", actorId: customerId } },
      },
    });
  });
}

/** §36 — client declines the proposal; the slot becomes available again. */
export async function declineProposal(appointmentId: string, customerId: string): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({ where: { id: appointmentId, customerId } });
    if (!appointment || appointment.status !== "PROPOSED") {
      throw new Error("This proposed appointment time is no longer available. Please contact us or request another time.");
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "DECLINED",
        events: { create: { type: "PROPOSAL_DECLINED", actorId: customerId } },
      },
    });
  });
}
