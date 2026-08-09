import * as customerDomain from "@/domain/customers/customer";

export default async function AdminCustomersPage() {
  const customers = await customerDomain.listCustomersWithLatestAddress();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Customers</h1>
      {customers.length === 0 && <p className="text-sm text-zinc-500">No customers yet.</p>}
      <div className="flex flex-col">
        {customers.map((customer) => {
          const address = customer.addresses[0];
          return (
            <div
              key={customer.id}
              className="flex items-center gap-4 border-b border-black/10 py-3 text-sm dark:border-white/10"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-zinc-500">{customer.email}</p>
              </div>
              <span className="w-32 text-zinc-500">{customer.phone ?? "—"}</span>
              <span className="flex-1 text-zinc-500">{address?.formattedAddress ?? "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
