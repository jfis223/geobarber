"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth";
import * as appointmentDomain from "@/domain/appointments/appointment";

export interface ProposalActionState {
  error?: string;
}

export async function acceptProposalAction(appointmentId: string): Promise<ProposalActionState> {
  const customer = await requireCustomer();
  try {
    await appointmentDomain.acceptProposal(appointmentId, customer.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to accept the proposed time" };
  }
  revalidatePath(`/appointments/${appointmentId}`);
  return {};
}

export async function declineProposalAction(appointmentId: string): Promise<ProposalActionState> {
  const customer = await requireCustomer();
  try {
    await appointmentDomain.declineProposal(appointmentId, customer.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to decline the proposed time" };
  }
  revalidatePath(`/appointments/${appointmentId}`);
  return {};
}
