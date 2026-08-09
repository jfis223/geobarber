GeoBarber — mobile men's grooming booking app. See `geobarber-spec.md` for the
full product/technical spec this implements.

## Status

Implements spec Phases 1-4 and 7 (Foundation, Services, Customer Booking, Scheduling,
Appointment Workflow), plus parts of Phase 9 (Admin):

- Next.js 16 App Router, TypeScript, Clerk auth (customer + admin), Prisma + MongoDB.
- Admin: unified schedule calendar (`react-big-calendar`) covering requests/awaiting-client/
  confirmed appointments in one view with Confirm/Decline/Propose-alternative actions,
  customers list, services CRUD, provider/home address (live geocoding autocomplete),
  weekly working hours + holidays/special hours (structured range pickers, no free text),
  service-zone map editor (click-to-draw polygon, draggable points), scheduling settings.
- Customer: registration gate — sign-up alone isn't enough to book; a post-signup
  onboarding step collects phone + address before `/booking` unlocks. Booking flow:
  address autocomplete + service-zone check, service selection with quantities, a real
  calendar (`react-day-picker`) for date/slot picking, appointment requests, appointment
  list/detail with accept/decline for admin-proposed alternative times.
- Availability engine covers **Stage 1 only** (working hours + appointment-overlap
  feasibility, §23-24). Stage 2 (public-transport travel validation via OpenTripPlanner)
  and the email system (Phases 5-6, 8) are not implemented yet — appointment status
  changes happen silently, no transactional emails are sent.

## Requirements

- Node.js **>=20.9** (this repo was scaffolded against v26; `next`/`prisma` will refuse
  to install/run on Node 16 or 18 — check `node --version` before running anything).
- A MongoDB instance that's a **replica set** (Atlas free tier is one by default;
  a local standalone `mongod` is not — Prisma's `$transaction` requires it).
- A self-hosted Nominatim instance for geocoding (the app refuses to talk to the public
  `nominatim.openstreetmap.org` endpoint — see `.env.example`). `docker-compose.yml` at
  the repo root stands one up (`docker compose up -d nominatim`); first-run OSM import
  takes 30min-2hr.
- A Clerk application (free tier).

Not required yet but provisioned for the next phase: `docker-compose.yml` also has an
OpenTripPlanner service (`infra/otp/README.md` for the Madrid CRTM GTFS + OSM setup).
Nothing in the app calls it yet — Stage 2 travel-aware availability isn't built.

## Setup

```bash
cp .env.example .env
# fill in DATABASE_URL, Clerk keys, ADMIN_CLERK_USER_IDS, NOMINATIM_BASE_URL

npm install
npx prisma generate
npx prisma db push   # creates collections from prisma/schema.prisma

npm run dev
```

To become the first admin: sign up once through `/sign-up`, copy your Clerk user id
(Clerk dashboard → Users), and add it to `ADMIN_CLERK_USER_IDS` in `.env`. Restart the
dev server. `/admin` is now reachable; further admins can be promoted via the DB
`Customer.role` field once at least one admin exists (no promotion UI yet — that's
part of the admin dashboard work in Phase 9).

Before booking works end-to-end you also need, via `/admin`:

1. A provider (name + home address) — `/admin/provider`.
2. Weekly working hours — `/admin/working-hours`.
3. At least one active service — `/admin/services`.
4. An active service zone covering the address you're testing with — `/admin/service-zone`.

## Architecture

```text
src/
├── app/            App Router routes, grouped by (customer) pages, admin/, api
├── domain/         Business logic — pure-ish functions, no React/route-handler code
├── infrastructure/ Concrete providers behind domain interfaces (Prisma, Nominatim)
├── components/      Shared client UI (e.g. AddressAutocomplete, used by admin + booking)
├── lib/            Cross-cutting helpers (auth)
└── proxy.ts        Next 16's renamed middleware.ts — Clerk route protection
```

Domain modules depend on abstractions (`GeocodingService`, and later
`TransitRoutingService`/`EmailService`), not concrete providers, per §19/§42 of the spec.

Calendar libraries: `react-big-calendar` (admin schedule) and `react-day-picker` (customer
date picker) were picked over `calendarkit.io`'s package despite its nicer landing page —
that package (`calendarkit-pro` on npm) is a single-maintainer release from Jan 2026 with
no updates since, versus react-big-calendar's decade-long, widely-adopted track record.
Worth re-checking if calendarkit matures.

## Notes for whoever picks this up

- Next.js 16 renamed `middleware.ts` → `proxy.ts` and made `params`/`searchParams`
  Promises everywhere — read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
  before assuming anything from older Next.js docs/training data.
- Prisma 7 doesn't support MongoDB yet (driver-adapter requirement has no Mongo adapter
  as of writing) — this repo is pinned to `prisma@6.19`/`@prisma/client@6.19` on purpose.
  Don't `npm update` past 7.x without checking Prisma's MongoDB support status first.
- Clerk's `SignedIn`/`SignedOut` components don't exist in this `@clerk/nextjs` version —
  use `<Show when="signed-in">`/`<Show when="signed-out">` instead (see `src/app/page.tsx`).
