import * as serviceDomain from "@/domain/services/service";
import { ServiceRow } from "./ServiceRow";
import { NewServiceButton } from "./NewServiceButton";

export default async function AdminServicesPage() {
  const services = await serviceDomain.listAllServices();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
      </div>
      <NewServiceButton />
      <div>
        {services.length === 0 && <p className="text-sm text-zinc-500">No services yet.</p>}
        {services.map((service, i) => (
          <ServiceRow
            key={service.id}
            service={service}
            isFirst={i === 0}
            isLast={i === services.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
