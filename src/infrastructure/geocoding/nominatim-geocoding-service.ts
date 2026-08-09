import "server-only";

import type { GeocodeResult, GeocodingService } from "@/domain/geocoding/types";

const PUBLIC_NOMINATIM_HOST = "nominatim.openstreetmap.org";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
}

/**
 * Calls a self-hosted Nominatim instance (NOMINATIM_BASE_URL). The public
 * Nominatim endpoint caps requests at ~1/sec and forbids sustained
 * commercial use (§2), so pointing this at the public host is refused
 * outright rather than silently degrading in production.
 */
export class NominatimGeocodingService implements GeocodingService {
  constructor(private readonly baseUrl: string = process.env.NOMINATIM_BASE_URL ?? "") {
    if (!this.baseUrl) {
      throw new Error("NOMINATIM_BASE_URL is not configured");
    }
    if (this.baseUrl.includes(PUBLIC_NOMINATIM_HOST)) {
      throw new Error(
        "NOMINATIM_BASE_URL must point to a self-hosted instance, not the public Nominatim endpoint",
      );
    }
  }

  async geocode({ query }: { query: string }): Promise<GeocodeResult[]> {
    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");

    const response = await fetch(url, {
      headers: { "User-Agent": "GeoBarber/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[];
    return results.map((result) => ({
      formattedAddress: result.display_name,
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
      confidence: result.importance,
    }));
  }
}
