import Link from "next/link";
import { requireCustomer } from "@/lib/auth";
import * as appointmentDomain from "@/domain/appointments/appointment";

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export default async function AppointmentsPage() {
  const customer = await requireCustomer();
  const appointments = await appointmentDomain.listCustomerAppointments(customer.id);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-semibold">My appointments</h1>
      {appointments.length === 0 && <p className="text-sm text-zinc-500">No appointments yet.</p>}
      {appointments.map((appt) => (
        <Link
          key={appt.id}
          href={`/appointments/${appt.id}`}
          className="flex flex-col gap-1 rounded border border-black/10 p-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          <div className="flex justify-between">
            <span className="font-medium">
              {new Date(appt.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span className="text-zinc-500">{appt.status}</span>
          </div>
          <span className="text-zinc-500">{appt.address}</span>
          <span>{formatEuros(appt.totalPriceCents)}</span>
        </Link>
      ))}
    </div>
  );
}
