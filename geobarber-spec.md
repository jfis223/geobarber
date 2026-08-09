# Mobile Men's Salon — Product & Technical Specification

## 1. Overview

A mobile men's grooming service where stylists travel to the client's home.

Customers:
1. Enter their address.
2. Verify that the address is inside the service area.
3. Select one or more services and quantities.
4. See total price and duration.
5. Request an available appointment slot.
6. Receive confirmation once the admin approves it.
7. Receive an email reminder on the day of the appointment.

Administrators:
- Manage services and prices.
- Manage the service area.
- Manage working hours and provider home address.
- Receive and manage appointment requests.
- Confirm, decline, or propose alternative slots.
- View the daily schedule.
- See client addresses and public-transport routes between appointments.

The scheduling engine must account for the stylist physically travelling between appointments using Madrid public transport.

The initial implementation supports one stylist/provider, but the data model should support multiple providers in the future.

---

## 2. Technology Stack

### Application
- Next.js 16
- React
- TypeScript
- App Router
- Server Components by default
- Server Actions where appropriate
- Route Handlers for APIs

### Authentication
- Clerk
- Customer authentication
- Admin authentication/authorization
- Clerk user ID stored in the application database

**Bootstrapping the first admin:** the admin role cannot be granted through the admin UI before an admin exists. Resolve this with an `ADMIN_CLERK_USER_IDS` environment variable checked at authorization time (or a one-time seed script that promotes a specific Clerk user ID to admin in the database). Once at least one admin account exists, further admins can be promoted through the admin UI itself and the env var becomes a fallback rather than the primary mechanism.

### Database
- MongoDB
- Prisma ORM

MongoDB is the source of truth for customers, providers, services, appointments, addresses, service zones, working hours, settings, appointment history, and routing cache.

### Public transport routing
- OpenTripPlanner (OTP)
- Madrid CRTM official GTFS data
- OpenStreetMap street/walking data

OTP runs as a separate internal service.

GTFS data goes stale as CRTM publishes schedule changes. The OTP graph must be rebuilt on a recurring schedule (e.g. weekly) against a freshly downloaded GTFS feed, not built once at deploy time and left indefinitely. Track the GTFS feed version/date used to build the current graph so staleness is visible to admins.

```text
Customer/Admin
      |
      v
 Next.js 16
      |
      +-------------> MongoDB / Prisma
      |
      v
Availability Engine
      |
      v
Transit Routing Service
      |
      v
OpenTripPlanner
      |
      +---- Madrid CRTM GTFS
      +---- OpenStreetMap
```

The routing provider must be abstracted behind an internal interface.

### Geocoding

- Self-hosted Nominatim (OpenStreetMap data), not the public Nominatim endpoint.

The public Nominatim instance's usage policy caps requests at roughly one per second and prohibits sustained commercial/bulk use without running your own instance. Since the application depends on avoiding paid routing/geocoding APIs for its core functionality, geocoding must be self-hosted alongside OTP rather than calling the public endpoint directly.

The geocoding provider must be abstracted behind an internal interface, mirroring the transit routing abstraction:

```ts
interface GeocodingService {
  geocode(params: {
    query: string
  }): Promise<GeocodeResult[]>
}
```

```ts
interface GeocodeResult {
  formattedAddress: string
  latitude: number
  longitude: number
  confidence?: number
}
```

Implementation: `NominatimGeocodingService`. The scheduling and booking flow depend on the interface, not Nominatim directly, so the provider can be swapped later without touching business logic.

### Email
- Resend for transactional email
- Email service abstraction so the provider can be replaced later

### Expected initial infrastructure cost

The application should be designed to run at very low or effectively zero infrastructure cost for a small salon using free tiers/open-source infrastructure:
- Next.js hosting: free tier where applicable
- MongoDB Atlas: free tier where applicable
- Clerk: free tier at small scale
- Resend: free tier at small scale
- OpenTripPlanner: self-hosted/open source
- CRTM GTFS: free/open data
- OpenStreetMap: open data subject to its usage/licensing rules
- Nominatim geocoding: self-hosted/open source (not the public Nominatim endpoint, which is not licensed for sustained commercial use)

The application must not depend on paid routing or geocoding APIs for its core functionality.

---

# 3. Core Entities

Primary entities:

- Customer
- Provider
- Service
- Appointment
- AppointmentService
- Address
- ServiceZone
- WorkingHours
- WorkingHoursException
- SystemSettings
- RouteCache
- AppointmentEvent

---

# 4. Customers

Customers authenticate through Clerk.

```text
Customer
├── id
├── clerkUserId
├── firstName
├── lastName
├── email
├── phone
├── createdAt
└── updatedAt
```

Customer identity information should be synchronized from Clerk where appropriate.

Customers can only access their own appointments.

---

# 5. Providers

The application initially supports one stylist but the model must support multiple providers.

```text
Provider
├── id
├── name
├── homeAddress
├── homeLatitude
├── homeLongitude
├── active
├── createdAt
└── updatedAt
```

The provider's home address is used as:
- The origin for the first appointment of a working day.
- The destination after the final appointment of a working day.

Changing the provider's home address affects future availability calculations but does not modify historical appointments.

---

# 6. Services

Administrators can create, edit, activate/deactivate, and reorder services.

```text
Service
├── id
├── name
├── description
├── durationMinutes
├── priceCents
├── currency
├── active
├── sortOrder
├── createdAt
└── updatedAt
```

Currency is always `EUR`.

Prices are stored as integer cents.

Example:

```text
Haircut
Duration: 30 minutes
Price: €25.00
```

Database:

```text
durationMinutes = 30
priceCents = 2500
currency = EUR
```

## 6.1 Service history

Services must not be physically deleted if they have historical appointments.

Instead:

```text
active = false
```

When an appointment is created, the service name, duration, and price are snapshotted into AppointmentService.

Changing a service later must never alter historical appointments.

---

# 7. Customer Booking Flow

The booking process is sequential:

```text
Address
   |
   v
Service-area validation
   |
   v
Service selection
   |
   v
Duration + price calculation
   |
   v
Availability
   |
   v
Slot selection
   |
   v
Appointment request
   |
   v
Admin review
   |
   +---- Confirm ----> CONFIRMED
   |
   +---- Propose ----> PROPOSED ----> Client accepts ----> CONFIRMED
   |
   +---- Decline ----> DECLINED
```

Selecting a slot creates an appointment request. It does not immediately confirm the appointment.

---

# 8. Step 1 — Address

The first screen asks the customer for their service address.

The system:
1. Geocodes the address.
2. Resolves it to coordinates.
3. Normalizes the address.
4. Checks whether it is inside the service zone.

`Address` is a saved, reusable entity belonging to a customer, so a returning customer isn't forced to re-enter and re-geocode an address they've used before:

```text
Address
├── id
├── customerId
├── label
├── originalAddress
├── formattedAddress
├── latitude
├── longitude
├── createdAt
└── updatedAt
```

At booking time, the chosen address is snapshotted onto the `Appointment` itself (`address`, `latitude`, `longitude` fields — see §15), the same way service details are snapshotted onto `AppointmentService`. This keeps historical appointments stable even if the customer later edits or deletes the saved `Address` record, while still letting the booking flow offer "use a previous address" as a shortcut.

The client cannot continue until the address has been successfully geocoded.

---

# 9. Service Area

The salon has a configurable geographic inclusion zone.

Represent it as a GeoJSON polygon.

```text
ServiceZone
├── id
├── name
├── geometry
├── active
├── createdAt
└── updatedAt
```

Check:

```text
customerCoordinates ∈ serviceZone
```

Outside:

> We don't currently provide services at this address.

Inside:

> This address is within our service area.

## 9.1 Admin service-area editor

Admin can:
- View the zone on a map.
- Edit the polygon.
- Save it.
- Enable/disable it.

Changing the service area must not modify existing appointments.

---

# 10. Step 2 — Service Selection

Show all active services.

Example:

```text
Haircut
30 min
€25

[-] 1 [+]
```

Customers can select quantities.

Example:

```text
Haircut       × 2     €50
Beard trim    × 1     €15
-------------------------
Total                  €65

Duration:              75 min
```

The appointment represents one visit to one address.

---

# 11. Appointment Duration and Price

```text
totalDuration =
  Σ(service.durationMinutes × quantity)
```

```text
totalPrice =
  Σ(service.priceCents × quantity)
```

Example:

```text
Haircut × 2 = 60 min
Beard × 1   = 15 min

Total       = 75 minutes
```

The complete duration must be available as one continuous appointment.

---

# 12. Working Hours

Providers have configurable weekly working hours.

Example:

```text
Monday     09:00–18:00
Tuesday    09:00–18:00
Wednesday  09:00–18:00
Thursday   09:00–18:00
Friday     09:00–18:00
Saturday   10:00–15:00
Sunday     Closed
```

Support:
- Working hours
- Multiple intervals per day
- Breaks
- Days off
- Holidays
- Special-day hours

Example:

```text
Monday
09:00–13:00
14:00–18:00
```

---

# 13. Slot Interval

Default appointment start-time interval:

```text
15 minutes
```

Example:

```text
09:00
09:15
09:30
09:45
10:00
...
```

The interval is configurable by admin.

---

# 14. Appointment Lifecycle

Appointment statuses:

```text
REQUESTED
PROPOSED
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
DECLINED
EXPIRED
```

Only statuses representing active bookings should block availability:
- REQUESTED
- PROPOSED
- CONFIRMED

Cancelled, declined, expired, completed, and no-show appointments do not block future availability unless explicitly required by business rules.

## 14.1 Request expiration

Pending requests should have an expiration period, configurable by admin.

Example:

```text
Pending request expiration: 12 hours
```

After expiration:

```text
REQUESTED -> EXPIRED
```

The slot becomes available again.

---

# 15. Appointment Data Model

```text
Appointment
├── id
├── customerId
├── providerId
├── address
├── latitude
├── longitude
├── requestedStartAt
├── requestedEndAt
├── startAt
├── endAt
├── status
├── totalPriceCents
├── currency
├── notes
├── reminderSentAt
├── createdAt
└── updatedAt
```

`requestedStartAt` and `requestedEndAt` preserve the customer's original request when an alternative is proposed.

For a normal confirmation:

```text
requestedStartAt = startAt
requestedEndAt = endAt
```

For an alternative:

```text
requestedStartAt = 14:30
startAt = 15:15
```

---

# 16. Appointment Services

```text
AppointmentService
├── id
├── appointmentId
├── serviceId
├── serviceName
├── quantity
├── durationMinutes
├── unitPriceCents
└── totalPriceCents
```

Service information is snapshotted at booking time.

---

# 17. Appointment History

Maintain an explicit appointment event/history model.

```text
AppointmentEvent
├── id
├── appointmentId
├── type
├── actorId
├── metadata
└── createdAt
```

Possible event types:

```text
REQUESTED
CONFIRMED
PROPOSED
PROPOSAL_ACCEPTED
PROPOSAL_DECLINED
DECLINED
EXPIRED
CANCELLED
COMPLETED
NO_SHOW
```

Example history:

```text
14:00 requested
14:00 declined by admin
15:00 proposed
15:00 accepted by client
```

must remain recoverable.

---

# 18. Public Transport Routing

All stylist travel calculations use public transportation.

Routing stack:

- OpenTripPlanner
- Madrid CRTM official GTFS
- OpenStreetMap

The application should not depend on Google Maps or another paid routing API for core scheduling.

OTP provides:
- Walking routes
- Public transport routes
- Departure times
- Arrival times
- Transit lines
- Transfers
- Travel duration
- Multiple route alternatives

---

# 19. Routing Abstraction

```ts
interface TransitRoutingService {
  getRoutes(params: {
    from: Coordinates
    to: Coordinates
    departureTime: Date
    maxRoutes: number
  }): Promise<TransitRoute[]>
}
```

Implementation:

```text
OpenTripPlannerTransitRoutingService
```

The scheduling engine depends on the interface, not OTP directly.

---

# 20. Transit Route Model

```ts
interface TransitRoute {
  durationMinutes: number
  departureTime: Date
  arrivalTime: Date
  legs: TransitLeg[]
}
```

```ts
interface TransitLeg {
  type: "WALK" | "BUS" | "METRO" | "TRAM" | "TRAIN"

  from: {
    name: string
    coordinates: Coordinates
  }

  to: {
    name: string
    coordinates: Coordinates
  }

  departureTime?: Date
  arrivalTime?: Date

  line?: {
    name: string
    shortName?: string
  }
}
```

---

# 21. Maximum Route Alternatives

Request a maximum of two public-transport route alternatives.

Example:

```text
Route 1
Metro L5 → Bus 27
24 min

Route 2
Bus 10 → Metro L4
31 min
```

The fastest valid route is used for scheduling.

Both alternatives can be shown to admin.

---

# 22. Route Cache

Routing requests should be cached.

```text
RouteCache
├── origin
├── destination
├── departureTimeBucket
├── routes
├── expiresAt
└── createdAt
```

Departure time must be part of the cache key because public-transport schedules are time-dependent.

Departure times may be bucketed into 5–15 minute intervals to improve cache efficiency.

---

# 23. Availability Engine

The availability engine is the core business logic.

```ts
getAvailableSlots({
  providerId,
  date,
  durationMinutes,
  customerLocation,
})
```

Process:

```text
1. Load working hours
2. Load existing appointments
3. Generate candidate slots
4. Cheap feasibility filtering
5. Identify previous/next appointments
6. Calculate public-transport travel
7. Remove impossible slots
8. Rank remaining slots
9. Return ranked slots
```

The engine must be independently testable without the UI.

---

# 24. Two-Stage Availability Calculation

## Stage 1 — Cheap filtering

Eliminate candidates using:
- Working hours
- Appointment overlap
- Appointment duration
- Basic temporal constraints

Do not call OTP for obviously impossible candidates.

## Stage 2 — Transit validation

For remaining candidates, request actual public-transport routes from OTP using the candidate's actual departure time.

Example:

```text
13:00 → 13:30
```

and

```text
13:30 → 14:00
```

may have different routes and must be evaluated separately.

---

# 25. Travel Feasibility

Travel time is always part of availability.

Previous appointment `P` to candidate `C`:

```text
P.end + travel(P.location, C.location) <= C.start
```

Candidate `C` to next appointment `N`:

```text
C.end + travel(C.location, N.location) <= N.start
```

If the required route cannot be determined, the candidate must not be blindly approved.

Use retry/cached data where appropriate; otherwise treat it as unavailable.

---

# 26. First Appointment

For the first appointment of the day:

```text
Provider Home → Customer
```

must be calculated.

The appointment is valid only if:

```text
homeTravel <= timeBeforeAppointment
```

The provider's home is treated as the previous location.

---

# 27. Final Appointment

For the final appointment:

```text
Customer → Provider Home
```

must be calculated.

The provider must be able to return home within the configured working-day boundary.

---

# 28. No Other Appointments

If there are no other bookings that day, all slots satisfying:
- Working hours
- Appointment duration
- Home → customer travel

are available.

No artificial penalty should be applied simply because there are no other bookings.

---

# 29. Nearby Definition

Two appointment locations are considered nearby when the fastest public-transport route is:

```text
<= 30 minutes
```

Default: 30 minutes.

This is configurable by admin.

---

# 30. Slot Ranking

Validity and ranking are separate.

A slot is first determined to be valid. Valid slots are then ranked.

Priorities:
1. Good connection from previous appointment.
2. Good connection to next appointment.
3. Low total travel time.
4. Compact schedule.
5. Minimal unnecessary idle time.

A valid slot must never be rejected merely because another slot ranks better.

Recommended conceptual score:

```text
score =
  previousConnectionScore
  + nextConnectionScore
  + scheduleCompactnessScore
  - travelPenalty
```

Keep the weights isolated in one scheduling module.

Initial preference:

```text
<=30 minute connection > longer connection
shorter travel > longer travel
less idle time > more idle time
```

---

# 31. Admin Appointment Requests

Admin has a dedicated Requests section.

Example:

```text
Appointment Requests

John Smith
Saturday 15 Aug
14:30–15:45

Haircut × 2
Beard × 1

€65
Calle Example 123

[Confirm]
[Propose another time]
[Decline]
```

The admin reviews every request before it becomes confirmed.

---

# 32. Admin Confirmation

When admin confirms:

```text
REQUESTED -> CONFIRMED
```

The customer immediately receives a confirmation email.

The email contains:
- Customer name
- Date
- Time
- Address
- Services
- Quantities
- Total price
- Appointment duration
- Stylist name where applicable

---

# 33. Admin Proposing an Alternative Slot

Admin can select:

```text
Propose another time
```

The admin is shown the same travel-aware availability engine used for customer booking.

Example:

```text
Original request:
14:30

Suggested alternatives:
15:15
15:45
16:30
```

Admin selects a new slot.

The appointment becomes:

```text
PROPOSED
```

Store:
- Original requested time
- Proposed time
- Proposal creation time
- Admin who proposed it

The original requested time must remain in appointment history.

---

# 34. Client Receives Proposed Slot

Send an email:

> Your stylist has suggested a different time for your appointment.

Include:
- Original requested time
- Proposed time
- Date
- Services
- Address
- Price
- Link to review

Actions:

```text
[Accept new time]
[Decline]
```

The client must authenticate before final acceptance.

---

# 35. Client Accepts Proposal

When client accepts:

```text
PROPOSED -> CONFIRMED
```

No further admin action is required.

The appointment's proposed time becomes the confirmed appointment time.

Send confirmation emails to:
- Client
- Admin

The admin dashboard updates immediately.

---

# 36. Client Declines Proposal

If the client declines:

```text
PROPOSED -> DECLINED
```

The proposed slot becomes available again.

The admin is notified.

The appointment history records the decline.

---

# 37. Client Request Confirmation Email

Immediately after the client submits a request:

```text
REQUESTED
```

send:

**Client:**

> We've received your appointment request. We'll confirm it shortly.

Include:
- Requested date/time
- Services
- Price
- Address

**Admin:**

> New appointment request from John Smith.

Include a direct link to the request in the admin dashboard.

---

# 38. Confirmed Appointment Email

When admin confirms:

```text
REQUESTED -> CONFIRMED
```

send a confirmation email to the client.

Include:
- Date
- Time
- Address
- Services
- Quantities
- Price
- Duration
- Stylist name

---

# 39. Proposed Appointment Email

When admin proposes a different time:

```text
REQUESTED -> PROPOSED
```

send the client an email with a link to review and accept/decline the proposal.

---

# 40. Proposal Accepted Email

When client accepts:

```text
PROPOSED -> CONFIRMED
```

send:
- Confirmation to client
- Notification to admin

---

# 41. Day-of Appointment Reminder

Send the client a reminder on the day of the appointment.

The timing should be configurable.

Default:

```text
08:00 Europe/Madrid
```

Preferably support a configurable number of hours before the appointment as well.

Reminder includes:
- Appointment time
- Address
- Services
- Stylist name
- Total price

Track:

```text
reminderSentAt
```

to prevent duplicate reminders.

---

# 42. Email Service

Use a dedicated abstraction:

```ts
interface EmailService {
  sendAppointmentRequested(...)
  sendAppointmentConfirmed(...)
  sendAppointmentProposed(...)
  sendAppointmentProposalAccepted(...)
  sendAppointmentProposalDeclined(...)
  sendAppointmentReminder(...)
  sendAppointmentCancelled(...)
}
```

Resend is the initial implementation.

Email sending must not be tightly coupled to appointment domain logic.

---

# 43. Scheduled Jobs

Reminders and expirations require scheduled jobs.

Conceptually:

```text
Cron
  |
  +--> Find appointments requiring reminders
  |       |
  |       +--> Send reminder
  |       +--> Mark reminder as sent
  |
  +--> Find expired appointment requests
          |
          +--> REQUESTED -> EXPIRED
```

Jobs must be idempotent.

Sending the same reminder twice must be impossible even if a scheduled job runs twice.

---

# 44. Customer Dashboard

Customers can see their appointments.

Example:

```text
Saturday, August 15
14:30–15:45

Haircut × 2
Beard × 1

€65

Calle Example 123
Madrid
```

Actions:
- View details
- Cancel
- Reschedule

Rescheduling uses the same availability engine as new bookings.

---

# 45. Admin Dashboard

The admin dashboard has three main sections.

## Requests

Items requiring admin action:

```text
REQUESTED
```

## Awaiting Client

Items where the admin proposed a new time:

```text
PROPOSED
```

## Today's Schedule

Confirmed appointments:

```text
CONFIRMED
```

Example:

```text
Requests (3)

John — 14:30
Maria — 16:00
Pedro — tomorrow 10:00


Awaiting client (1)

Carlos — proposed 15:30


Today's schedule

09:30 John
11:00 Maria
13:30 Pedro
```

---

# 46. Admin Daily Schedule

The main schedule shows:

- Client name
- Appointment time
- Services
- Quantities
- Duration
- Total price
- Full address
- Travel time from previous appointment
- Recommended public-transport route
- Alternative route
- Travel time to next appointment

Example:

```text
09:00
Home → Client A
22 min

09:30–10:30
John Smith
Calle Example 123

10:30
Metro L5
18 min

11:00–12:00
Michael Brown
Calle Example 456
```

---

# 47. Admin Route Display

For each travel leg, show up to two alternatives.

Example:

```text
Previous appointment
Calle Example 123

Option 1 — 24 min
Walk 4 min
Metro L5
Walk 5 min

Current appointment
Calle Example 456

Option 2 — 31 min
Bus 27
Walk 7 min
```

For the first appointment:

```text
Home → Appointment
```

For the final appointment:

```text
Appointment → Home
```

---

# 48. Admin Service Management

Admin interface:

```text
Services

Haircut       30 min    €25    Active
Beard trim    20 min    €15    Active
Hair + Beard  45 min    €35    Active
```

Actions:
- Create
- Edit
- Activate/deactivate
- Change duration
- Change price
- Reorder

---

# 49. Admin Scheduling Settings

Configurable:
- Slot interval
- Nearby threshold
- Timezone
- Working hours
- Breaks
- Holidays
- Pending-request expiration
- Reminder timing
- Maximum routing alternatives
- Cancellation cutoff window (§61)

Defaults:

```text
Timezone: Europe/Madrid
Slot interval: 15 minutes
Nearby threshold: 30 minutes
Maximum routes: 2
Pending request expiration: 12 hours
Cancellation cutoff: 24 hours
```

---

# 50. Provider Settings

Admin can configure:
- Provider name
- Home address
- Home coordinates

---

# 51. Service Zone Settings

Admin can:
- View zone.
- Edit polygon.
- Save polygon.
- Enable/disable zone.

---

# 52. Address and Routing Architecture

```text
Customer address
       |
       v
Geocoding
       |
       v
Latitude / Longitude
       |
       v
Service-zone validation
       |
       v
Availability Engine
       |
       v
OpenTripPlanner
       |
       v
Transit routes
```

The browser must never communicate directly with OTP.

---

# 53. Application Architecture

Recommended structure:

```text
src/
├── app/
│   ├── (customer)/
│   │   ├── booking/
│   │   ├── appointments/
│   │   └── account/
│   │
│   ├── admin/
│   │   ├── requests/
│   │   ├── schedule/
│   │   ├── services/
│   │   ├── settings/
│   │   └── service-zone/
│   │
│   └── api/
│
├── domain/
│   ├── appointments/
│   ├── availability/
│   ├── services/
│   ├── customers/
│   ├── providers/
│   ├── routing/
│   └── service-zones/
│
├── infrastructure/
│   ├── prisma/
│   ├── clerk/
│   ├── email/
│   └── routing/
│
└── lib/
```

Business logic must not live directly in React components or API route handlers.

---

# 54. API / Server Boundaries

Suggested endpoints/actions:

```text
/api/services
/api/addresses/geocode
/api/availability
/api/appointments
/api/appointments/[id]

/api/admin/services
/api/admin/schedule
/api/admin/settings
/api/admin/service-zone
/api/admin/appointments/[id]/confirm
/api/admin/appointments/[id]/propose
/api/admin/appointments/[id]/decline

/api/appointments/[id]/proposal/accept
/api/appointments/[id]/proposal/decline
```

Server Actions can be used where appropriate instead of REST endpoints.

---

# 55. Security

- All admin actions verify Clerk admin authorization.
- Customers can only access their own appointments.
- Admins can access all appointments and settings.
- Routing credentials/configuration remain server-side.
- Appointment acceptance must be authorized for the specific customer.
- Proposal acceptance must verify that the proposal is still valid and has not expired or been replaced.

---

# 56. Concurrency and Booking Safety

Two customers may attempt to request the same slot.

Example:

```text
Customer A sees 15:00
Customer B sees 15:00
```

If A successfully creates a request first, B must not be allowed to create an overlapping active request.

The server must perform a final conflict check immediately before creating the appointment.

The availability response sent to the browser must never be treated as a reservation by itself.

When admin proposes a different slot, the server must also revalidate that slot before storing the proposal.

When a client accepts a proposal, the server must verify that the proposed slot is still available before changing the appointment to CONFIRMED.

---

# 57. Error Handling

### Address cannot be geocoded

> We couldn't find that address. Please check it and try again.

### Outside service zone

> We don't currently provide services at this address.

### No available slots

> There are no available appointments for this date.

### Slot became unavailable

> That time is no longer available. Please select another time.

### Routing failure

Do not assume zero travel time.

Use:
1. Retry.
2. Valid cached routing data.
3. Otherwise mark the candidate unavailable.

### Proposal expired

> This proposed appointment time is no longer available. Please contact us or request another time.

---

# 58. Testing Requirements

The availability engine requires extensive automated tests.

## Basic availability
- No existing appointments.
- One existing appointment.
- Multiple existing appointments.
- Appointment duration exceeding available gap.

## Travel
- Enough travel time.
- Insufficient travel time.
- Exactly enough travel time.
- First appointment from home.
- Final appointment returning home.
- No appointments on the day.

## Ranking
- Previous appointment nearby.
- Next appointment nearby.
- Both nearby.
- Neither nearby.
- Multiple equally valid slots.
- Shorter route preferred.
- Less idle time preferred.

## Services
- Multiple services.
- Service quantities.
- Changed service price.
- Changed service duration.
- Inactive service.

## Appointment workflow
- Client requests appointment.
- Admin confirms.
- Admin declines.
- Admin proposes alternative.
- Client accepts proposal.
- Client declines proposal.
- Request expiration.
- Cancellation.
- Rescheduling.
- Email events.

## Time
- Europe/Madrid timezone.
- Daylight-saving transitions.
- Working-hour boundaries.
- Holidays.
- Working-hour exceptions.
- Reminder timing.

## Concurrency
- Two customers requesting the same slot.
- Admin proposing a slot that becomes unavailable.
- Client accepting a proposal that becomes unavailable.
- Duplicate scheduled-job execution.

---

# 59. End-to-End Example

Customer enters:

```text
Calle Example 123, Madrid
```

The address is geocoded and falls inside the configured zone.

Customer selects:

```text
Haircut × 2
Beard trim × 1
```

Calculation:

```text
Haircut: 30 × 2 = 60 min
Beard:   15 × 1 = 15 min

Total = 75 minutes
Price = €65
```

Existing Friday schedule:

```text
09:00–10:00 Client A
13:00–14:00 Client B
```

Candidate:

```text
10:30–11:45
```

OTP calculates:

```text
Client A → Customer
25 min

Customer → Client B
32 min
```

Validation:

```text
10:00 + 25 = 10:25
Candidate starts 10:30

VALID

11:45 + 32 = 12:17
Next starts 13:00

VALID
```

The slot ranks highly.

Customer submits the request:

```text
REQUESTED
```

Client receives a request-received email.

Admin sees:

```text
John Smith
10:30–11:45
Haircut × 2
Beard × 1
€65

[Confirm]
[Propose another time]
[Decline]
```

Admin proposes 11:00 instead.

Appointment becomes:

```text
PROPOSED
```

Client receives an email.

Client accepts 11:00.

Appointment becomes:

```text
CONFIRMED
```

Client and admin receive confirmation notifications.

On the appointment day, the client receives the configured reminder.

---

# 60. Implementation Priorities

## Phase 1 — Foundation
- Next.js 16
- TypeScript
- Clerk
- Prisma
- MongoDB
- Customer/admin roles
- Admin bootstrapping (see Authentication in §2)

## Phase 2 — Services
- Service CRUD
- Prices
- Durations
- Activation/deactivation

## Phase 3 — Customer Booking
- Address entry
- Geocoding
- Service-zone validation
- Service selection
- Quantities
- Price/duration calculation

## Phase 4 — Scheduling
- Working hours
- Exceptions
- Provider home
- Appointment model
- Basic availability

## Phase 5 — Routing
- OpenStreetMap
- Madrid CRTM GTFS
- OpenTripPlanner
- Transit routing abstraction
- Route caching

## Phase 6 — Travel-Aware Availability
- Previous appointment routing
- Next appointment routing
- Home routing
- Feasibility validation
- Slot ranking

## Phase 7 — Appointment Workflow
- Appointment requests
- Admin confirmation
- Admin decline
- Alternative proposals
- Client accept/decline
- Appointment history

## Phase 8 — Email
- Resend integration
- Request received email
- Admin notification
- Confirmation email
- Proposal email
- Proposal acceptance notification
- Day-of reminder
- Idempotent scheduled jobs

## Phase 9 — Admin
- Requests dashboard
- Awaiting-client dashboard
- Daily schedule
- Route visualization
- Services
- Settings
- Service zone
- Working hours

## Phase 10 — Cancellation Policy
- Cancellation cutoff enforcement (§61)

## Phase 11 — Compliance and Reliability
- Data retention / anonymization on deletion request (§62)
- Data export
- OTP and geocoder health checks (§63)
- GTFS staleness warning

## Phase 12 — Hardening
- Concurrency protection
- Error handling
- Automated availability tests
- Timezone/DST testing
- Routing failure handling
- Performance optimization

---

# 61. Cancellation Policy

Admin configures a cancellation cutoff window, e.g.:

```text
Cancellation cutoff: 24 hours before appointment start
```

Before the cutoff, the customer can cancel or reschedule freely from their dashboard (§44); the slot becomes immediately available again.

After the cutoff, cancellation is still possible but is treated as late. Since payment is handled in cash outside the app, the system has no way to enforce a late-cancellation fee automatically — it can only flag the appointment (e.g. a `lateCancellation` marker on the `AppointmentEvent`, §17) so the admin is aware and can handle it directly with the customer if needed.

Rescheduling after the cutoff is subject to the same rule as cancelling — treat "reschedule" as "cancel + rebook" for policy purposes, since a customer rescheduling to a time three weeks out with a day's notice is functionally cancelling the near-term slot.

Cancelling an appointment never requires re-validating the rest of that day's schedule: each remaining appointment's feasibility was already validated against its own actual neighbors at the time it was confirmed, and removing an appointment only relaxes travel constraints for its neighbors — it can never invalidate an already-confirmed one. No cascading re-check is needed.

---

# 62. Data Retention and Deletion (GDPR)

The application processes home addresses, phone numbers, and appointment history for individuals in Spain, so GDPR applies. Home addresses are more sensitive than typical contact info since, combined with appointment history, they reveal a pattern of someone's presence at a location.

Guidelines:
- **Retention while active.** Customer records, saved addresses (§8), and appointment history are retained for as long as the account is active.
- **Financial records.** Spanish tax law requires invoicing/accounting records to be retained for several years (confirm the exact period with an accountant — commonly cited as 4–6 years). Price, service, and date data needed for this must survive a deletion request; personal identifiers should not have to.
- **Right to erasure.** On a deletion request, anonymize rather than hard-delete: strip name, address, phone, and email from the customer and historical appointments while retaining the anonymized financial/service records needed for accounting, mirroring the snapshot pattern already used for services (§6.1). Physically delete anything not legally required to be kept.
- **Data export.** Support exporting a customer's own data (profile, saved addresses, appointment history) on request.
- **Minimize admin exposure.** Admins can see client addresses and routes for legitimate scheduling purposes (§45–§47); this access itself doesn't need logging for a single-salon deployment, but should be revisited if the provider model expands to multiple independent stylists.

---

# 63. Service Health Monitoring

OpenTripPlanner and the self-hosted geocoder (§2) are both internal dependencies with no built-in alerting. A silent failure in either would make the booking flow behave strangely (e.g. every candidate slot appearing unavailable) without anyone noticing.

- A periodic health check (e.g. every few minutes) pings OTP and the geocoding service.
- On failure, notify the admin (email) and surface a status indicator in the admin dashboard rather than only failing individual requests.
- Track the GTFS feed version/build date used by the current OTP graph (§2) and surface a warning in the admin dashboard if it exceeds a configurable staleness threshold (e.g. 30 days), so a forgotten graph rebuild is visible rather than silently degrading travel-time accuracy.

---

# 64. Architectural Principle

The core distinction is:

```text
Calendar availability
        ≠
Real availability
```

Real availability is:

```text
Working hours
+ Appointment duration
+ Previous location
+ Next location
+ Public transport schedules
+ Travel time
+ Provider home location
```

OpenTripPlanner provides transport intelligence.

The application's availability engine owns:
- Business rules
- Feasibility
- Ranking
- Appointment workflow
- Conflict prevention

The application therefore does not require Easy!Appointments as a runtime dependency. Its appointment concepts can be used as inspiration, but the actual appointment and scheduling domain belongs to the Next.js/MongoDB application.
