import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import { hasCompletedProfile } from "@/domain/customers/customer";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const customer = await requireCustomer();
  if (await hasCompletedProfile(customer)) redirect("/booking");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-semibold">Complete your profile</h1>
      <p className="text-sm text-zinc-500">
        We need your phone number and address before you can book an appointment.
      </p>
      <OnboardingForm />
    </div>
  );
}
