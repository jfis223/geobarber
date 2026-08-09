import type { Appointment, AppointmentService, Customer } from "@/generated/prisma";
import type { ScheduleAppointment } from "./types";

type AppointmentWithRelations = Appointment & { services: AppointmentService[]; customer: Customer };

export function toScheduleAppointment(a: AppointmentWithRelations): ScheduleAppointment {
  return {
    id: a.id,
    status: a.status,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    requestedStartAt: a.requestedStartAt.toISOString(),
    address: a.address,
    totalPriceCents: a.totalPriceCents,
    customerName: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
    customerPhone: a.customer.phone,
    services: a.services.map((s) => ({ serviceName: s.serviceName, quantity: s.quantity })),
  };
}
