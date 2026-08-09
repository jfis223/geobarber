// §2 — geocoding provider abstraction. Booking/scheduling code depends on
// this interface, never on a concrete provider, so Nominatim can be swapped
// later without touching business logic.

export interface GeocodeResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  confidence?: number;
}

export interface GeocodingService {
  geocode(params: { query: string }): Promise<GeocodeResult[]>;
}
