import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/infrastructure/prisma/client";
import { hasCompletedProfile } from "@/domain/customers/customer";
import type { Customer } from "@/generated/prisma";

/**
 * ADMIN_CLERK_USER_IDS bootstraps the first admin before any admin exists in
 * the DB (§2). Once a Customer has role=ADMIN, the DB role is authoritative;
 * this env var stays a fallback so a misconfigured/deleted DB role doesn't
 * lock every admin out.
 */
function envAdminClerkIds(): string[] {
  return (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isAdminCustomer(customer: Customer): boolean {
  return customer.role === "ADMIN" || envAdminClerkIds().includes(customer.clerkUserId);
}

/** Upserts the Customer row from the authenticated Clerk user (§4 sync). */
async function syncCustomerFromClerk(): Promise<Customer | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.customer.upsert({
    where: { clerkUserId: clerkUser.id },
    create: {
      clerkUserId: clerkUser.id,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
      email,
      phone: clerkUser.primaryPhoneNumber?.phoneNumber,
    },
    update: {
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
      email,
      phone: clerkUser.primaryPhoneNumber?.phoneNumber,
    },
  });
}

/** Returns the current Customer record, or null if signed out. Does not redirect. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return syncCustomerFromClerk();
}

/** Server Component / Server Action guard: redirects to sign-in if unauthenticated. */
export async function requireCustomer(): Promise<Customer> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/sign-in");
  return customer;
}

/**
 * Stronger booking-flow guard: signed in AND has completed profile (phone +
 * address, §7) — Clerk sign-up alone doesn't guarantee either.
 */
export async function requireCompleteCustomer(): Promise<Customer> {
  const customer = await requireCustomer();
  if (!(await hasCompletedProfile(customer))) redirect("/onboarding");
  return customer;
}

/** Server Component / Server Action guard: redirects if not an admin (§55). */
export async function requireAdmin(): Promise<Customer> {
  const customer = await requireCustomer();
  if (!isAdminCustomer(customer)) redirect("/");
  return customer;
}

/** Route Handler guard: returns the Customer or null (caller returns 401/403 JSON). */
export async function getAdminOrNull(): Promise<Customer | null> {
  const customer = await getCurrentCustomer();
  if (!customer || !isAdminCustomer(customer)) return null;
  return customer;
}
