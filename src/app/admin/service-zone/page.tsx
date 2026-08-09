import * as serviceZoneDomain from "@/domain/service-zones/service-zone";
import { ZoneForm } from "./ZoneForm";

export default async function AdminServiceZonePage() {
  const zones = await serviceZoneDomain.listServiceZones();
  const primaryZone = zones[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Service zone</h1>
      <p className="text-sm text-zinc-500">
        Customers inside an active zone can book. Click the map to draw the service area.
      </p>
      <ZoneForm zone={primaryZone} />
    </div>
  );
}
