OpenTripPlanner graph data for the transit routing service (spec §18-19).

## What goes in `data/`

OTP 2.x auto-detects file types by extension when it scans this directory:

- One `.osm.pbf` — street/walking network (OpenStreetMap).
- One or more GTFS `.zip` — Madrid CRTM's official transit feed.
- `build-config.json` / `router-config.json` — already in this folder (`{}`,
  i.e. OTP defaults; static-schedule routing doesn't need anything beyond
  that — only touch these if you later add real-time GTFS-RT updaters).

`docker-compose.yml` mounts this whole directory into the container.

## 1. Get the OSM extract

Same source used for Nominatim — Geofabrik doesn't publish a Madrid-only
extract, so the Spain-wide one works (bigger, but fine):

```bash
curl -L -o infra/otp/data/spain-latest.osm.pbf \
  https://download.geofabrik.de/europe/spain-latest.osm.pbf
```

## 2. Get the GTFS feed

CRTM (Consorcio Regional de Transportes de Madrid) publishes the static GTFS
feed through their open data portal (datos.crtm.es). The exact download path
changes as they publish updates, so look it up there rather than trusting a
hardcoded link — download the current `.zip` and drop it in `data/`:

```bash
# after downloading manually:
mv ~/Downloads/google_transit.zip infra/otp/data/crtm-gtfs.zip
```

Record the feed's publish date somewhere visible (commit message, admin
settings note) — the app is supposed to surface GTFS staleness to admins
(spec §63) once that check is built; it needs to know when this file was
pulled.

## 3. Build the graph

```bash
docker compose --profile build run --rm otp-build
```

Produces `graph.obj` in `data/`. Takes a few minutes for Madrid-sized data.
Needs a few GB of RAM — bump Docker's memory limit if the container gets
OOM-killed.

## 4. Serve it

```bash
docker compose up -d otp
curl http://localhost:8081/otp/actuators/health
```

## Rebuilding on a schedule

Spec §2 requires the graph to be rebuilt periodically against fresh GTFS, not
built once and left stale. Until that's automated (Phase 5/11 — see
`geobarber-spec.md` §63 for the staleness-warning requirement), rebuild
manually: redo steps 2-4 with a freshly downloaded GTFS zip, roughly weekly
or whenever CRTM publishes a schedule change.
