import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Clerk flags createRouteMatcher as deprecated in favor of resource-based
// checks (auth enforced in each page/action, since path matching here can
// diverge from actual routing). Keep this as a fast unauthenticated-redirect
// at the edge, but it is not the sole guard — every protected page/action
// also calls requireCustomer()/requireAdmin() directly (see src/lib/auth.ts).
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isCustomerRoute = createRouteMatcher([
  "/booking(.*)",
  "/appointments(.*)",
  "/account(.*)",
  "/onboarding(.*)",
  "/api/appointments(.*)",
  "/api/addresses(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req) || isCustomerRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
