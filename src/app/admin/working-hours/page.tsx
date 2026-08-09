import * as providerDomain from "@/domain/providers/provider";
import * as workingHoursDomain from "@/domain/working-hours/working-hours";
import { DayHoursEditor } from "./DayHoursEditor";
import { ExceptionForm } from "./ExceptionForm";
import { ExceptionsList } from "./ExceptionsList";

export default async function AdminWorkingHoursPage() {
  const provider = await providerDomain.getPrimaryProvider();

  if (!provider) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Working hours</h1>
        <p className="text-sm text-zinc-500">Set up the provider first.</p>
      </div>
    );
  }

  const [workingHours, exceptions] = await Promise.all([
    workingHoursDomain.getWorkingHours(provider.id),
    workingHoursDomain.listUpcomingExceptions(provider.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Weekly working hours</h1>
        <p className="text-sm text-zinc-500">
          Add one or more ranges per day for breaks/split shifts. A day with no ranges is closed.
        </p>
        <div>
          {Array.from({ length: 7 }, (_, d) => (
            <DayHoursEditor
              key={d}
              providerId={provider.id}
              dayOfWeek={d}
              initialRanges={workingHours
                .filter((wh) => wh.dayOfWeek === d)
                .map((wh) => ({ startMinute: wh.startMinute, endMinute: wh.endMinute }))}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Holidays &amp; special hours</h2>
        <ExceptionForm providerId={provider.id} />
        <ExceptionsList exceptions={exceptions} />
      </div>
    </div>
  );
}
