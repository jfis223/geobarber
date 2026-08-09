"use client";

import { useCallback, useRef, useState } from "react";
import { Calendar, luxonLocalizer, type View } from "react-big-calendar";
import { DateTime } from "luxon";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-ios.css";
import {
  getAppointmentsInRangeAction,
  getPendingAppointmentsAction,
  confirmAppointmentAction,
  declineAppointmentAction,
  proposeAlternativeSlotAction,
} from "./actions";
import { AppointmentPanel } from "./AppointmentPanel";
import { PendingList } from "./PendingList";
import { STATUS_COLORS, type ScheduleAppointment } from "./types";

const localizer = luxonLocalizer(DateTime);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduleAppointment;
}

function toEvent(a: ScheduleAppointment): CalendarEvent {
  return {
    id: a.id,
    title: `${a.customerName} · ${a.status}`,
    start: new Date(a.startAt),
    end: new Date(a.endAt),
    resource: a,
  };
}

function rangeToDates(range: Date[] | { start: Date; end: Date }): { start: Date; end: Date } {
  if (Array.isArray(range)) {
    const start = range[0];
    const end = new Date(range[range.length - 1]);
    end.setDate(end.getDate() + 1); // array form gives day boundaries, not full coverage of the last day
    return { start, end };
  }
  return range;
}

function weekWindowAround(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - 3);
  const end = new Date(date);
  end.setDate(end.getDate() + 4);
  return { start, end };
}

export function ScheduleView({
  initialAppointments,
  initialPending,
}: {
  initialAppointments: ScheduleAppointment[];
  initialPending: ScheduleAppointment[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [pending, setPending] = useState(initialPending);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const [selected, setSelected] = useState<ScheduleAppointment | null>(null);
  const lastRange = useRef<{ start: Date; end: Date }>(weekWindowAround(new Date()));

  const refetchRange = useCallback(async (range: Date[] | { start: Date; end: Date }) => {
    const { start, end } = rangeToDates(range);
    lastRange.current = { start, end };
    const results = await getAppointmentsInRangeAction(start.toISOString(), end.toISOString());
    setAppointments(results);
  }, []);

  const refetchPending = useCallback(async () => {
    setPending(await getPendingAppointmentsAction());
  }, []);

  async function refreshAfterAction() {
    await Promise.all([refetchRange(lastRange.current), refetchPending()]);
  }

  function closePanel() {
    setSelected(null);
  }

  function handleSelectPending(appointment: ScheduleAppointment) {
    const start = new Date(appointment.startAt);
    setView("week");
    setDate(start);
    setSelected(appointment);
    void refetchRange(weekWindowAround(start));
  }

  async function handleConfirm(id: string) {
    const result = await confirmAppointmentAction(id);
    if (!result.error) {
      closePanel();
      await refreshAfterAction();
    }
    return result;
  }

  async function handleDecline(id: string) {
    const result = await declineAppointmentAction(id);
    if (!result.error) {
      closePanel();
      await refreshAfterAction();
    }
    return result;
  }

  async function handlePropose(id: string, newStartAtIso: string) {
    const result = await proposeAlternativeSlotAction(id, newStartAtIso);
    if (!result.error) {
      closePanel();
      await refreshAfterAction();
    }
    return result;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <div className="flex-1" style={{ height: 700 }}>
          <Calendar
            localizer={localizer}
            events={appointments.map(toEvent)}
            startAccessor="start"
            endAccessor="end"
            views={["month", "week", "day"]}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onRangeChange={(range) => {
              void refetchRange(range);
            }}
            onSelectEvent={(event) => setSelected(event.resource)}
            eventPropGetter={(event) => ({
              style: { backgroundColor: STATUS_COLORS[event.resource.status] ?? "#8E8E93" },
            })}
          />
        </div>
        {selected && (
          <AppointmentPanel
            appointment={selected}
            onClose={closePanel}
            onConfirm={handleConfirm}
            onDecline={handleDecline}
            onPropose={handlePropose}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pending requests</h2>
        <PendingList pending={pending} onSelect={handleSelectPending} />
      </div>
    </div>
  );
}
