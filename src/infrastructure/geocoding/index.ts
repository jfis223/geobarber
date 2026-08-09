import "server-only";

import type { GeocodingService } from "@/domain/geocoding/types";
import { NominatimGeocodingService } from "./nominatim-geocoding-service";

let instance: GeocodingService | undefined;

export function getGeocodingService(): GeocodingService {
  if (!instance) {
    instance = new NominatimGeocodingService();
  }
  return instance;
}
