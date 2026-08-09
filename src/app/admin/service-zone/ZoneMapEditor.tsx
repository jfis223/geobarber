"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";

// GeoJSON coordinate order is [lng, lat]; Leaflet uses [lat, lng] everywhere.
// This component works internally in Leaflet order and converts at the edges.
export type LngLat = [number, number];

const MADRID_CENTER: [number, number] = [40.4168, -3.7038];

// Plain div, not L.Icon's default image — sidesteps the classic
// bundler-breaks-Leaflet's-default-marker-asset-path issue entirely.
const vertexIcon = L.divIcon({
  className: "",
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#000;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,.6);cursor:grab;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function ClickCapture({ onAdd }: { onAdd: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function toLeafletPoints(ring: LngLat[] | undefined): [number, number][] {
  if (!ring || ring.length < 3) return [];
  const isClosed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const openRing = isClosed ? ring.slice(0, -1) : ring;
  return openRing.map(([lng, lat]) => [lat, lng]);
}

export function ZoneMapEditor({
  initialRing,
  onChange,
}: {
  initialRing?: LngLat[];
  onChange: (ring: LngLat[]) => void;
}) {
  const [points, setPoints] = useState<[number, number][]>(() => toLeafletPoints(initialRing));

  function commit(next: [number, number][]) {
    setPoints(next);
    if (next.length < 3) {
      onChange([]);
      return;
    }
    const ring: LngLat[] = next.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]); // GeoJSON polygons must be closed rings
    onChange(ring);
  }

  const mapCenter = points[0] ?? MADRID_CENTER;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">
          {points.length} point{points.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => commit(points.slice(0, -1))}
          disabled={points.length === 0}
          className="rounded border border-black/15 px-2 py-1 disabled:opacity-40 dark:border-white/20"
        >
          Undo last point
        </button>
        <button
          type="button"
          onClick={() => commit([])}
          disabled={points.length === 0}
          className="rounded border border-black/15 px-2 py-1 disabled:opacity-40 dark:border-white/20"
        >
          Clear
        </button>
        <span className="text-zinc-500">
          Click the map to add points (minimum 3), drag a point to move it. The polygon closes automatically.
        </span>
      </div>
      <div className="h-96 w-full overflow-hidden rounded border border-black/15 dark:border-white/20">
        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture onAdd={(latlng) => commit([...points, latlng])} />
          {points.map((p, i) => (
            <Marker
              key={i}
              position={p}
              icon={vertexIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  const next = points.slice();
                  next[i] = [lat, lng];
                  commit(next);
                },
              }}
            />
          ))}
          {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: "#2563eb" }} />}
        </MapContainer>
      </div>
    </div>
  );
}
