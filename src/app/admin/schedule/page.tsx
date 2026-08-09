import * as providerDomain from "@/domain/providers/provider";
import * as appointmentDomain from "@/domain/appointments/appointment";
import { toScheduleAppointment } from "./dto";
import { ScheduleView } from "./ScheduleView";

export default async function AdminSchedulePage() {
  const provider = await providerDomain.getPrimaryProvider();

  if (!provider) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Schedule</h1>
        <p className="text-sm text-zinc-500">Set up the provider first.</p>
      </div>
    );
  }

  // Generous initial window so the calendar has data before the first
  // onRangeChange fires, regardless of which view (month/week/day) loads first.
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + 60);

  const [appointments, pending] = await Promise.all([
    appointmentDomain.listAppointmentsInRange(provider.id, rangeStart, rangeEnd),
    appointmentDomain.listPendingAppointments(provider.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Schedule</h1>
      <ScheduleView
        initialAppointments={appointments.map(toScheduleAppointment)}
        initialPending={pending.map(toScheduleAppointment)}
      />
    </div>
  );
}
