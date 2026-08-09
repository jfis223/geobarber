import { requireCompleteCustomer } from "@/lib/auth";
import * as serviceDomain from "@/domain/services/service";
import { listCustomerAddresses } from "@/domain/addresses/address";
import { BookingWizard } from "./BookingWizard";

export default async function BookingPage() {
  const customer = await requireCompleteCustomer();
  const [services, addresses] = await Promise.all([
    serviceDomain.listActiveServices(),
    listCustomerAddresses(customer.id),
  ]);
  const savedAddress = addresses[0];

  return (
    <BookingWizard
      services={services}
      savedAddress={
        savedAddress
          ? {
              formattedAddress: savedAddress.formattedAddress,
              latitude: savedAddress.latitude,
              longitude: savedAddress.longitude,
            }
          : undefined
      }
    />
  );
}
