import * as providerDomain from "@/domain/providers/provider";
import { ProviderForm } from "./ProviderForm";

export default async function AdminProviderPage() {
  const provider = await providerDomain.getPrimaryProvider();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Provider</h1>
      <ProviderForm provider={provider} />
    </div>
  );
}
