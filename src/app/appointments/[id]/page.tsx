import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import * as appointmentDomain from "@/domain/appointments/appointment";
import { ProposalResponse } from "./ProposalResponse";

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await requireCustomer();
  // Ownership is enforced in the query itself (§55) — customers can only ever
  // fetch their own appointments, never another customer's by guessing an id.
  const appointment = await appointmentDomain.getCustomerAppointment(customer.id, id);
  if (!appointment) notFound();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-semibold">Appointment</h1>
      <div className="flex flex-col gap-2 rounded border border-black/10 p-4 text-sm dark:border-white/10">
        <div className="flex justify-between">
          <span className="font-medium">
            {new Date(appointment.startAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
          </span>
          <span className="text-zinc-500">{appointment.status}</span>
        </div>
        <p className="text-zinc-500">{appointment.address}</p>
        <div className="mt-2 flex flex-col gap-1">
          {appointment.services.map((s) => (
            <p key={s.id}>
              {s.serviceName} × {s.quantity}
            </p>
          ))}
        </div>
        <p className="mt-2 font-medium">Total: {formatEuros(appointment.totalPriceCents)}</p>
        {appointment.status === "REQUESTED" && (
          <p className="mt-2 text-zinc-500">We&apos;ve received your request. We&apos;ll confirm it shortly.</p>
        )}
        {appointment.status === "PROPOSED" && (
          <ProposalResponse
            appointmentId={appointment.id}
            requestedStartAt={appointment.requestedStartAt.toISOString()}
            proposedStartAt={appointment.startAt.toISOString()}
          />
        )}
      </div>
    </div>
  );
}
