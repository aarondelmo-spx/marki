const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

interface GeoResult {
  locationArea: string;  // e.g. "South Luzon Rizal"
  locationName: string;  // e.g. "Taytay San Juan"
}

/**
 * Convert lat/long to human-readable location names.
 * Uses Google Maps Geocoding API.
 * Falls back to coordinate string if API fails.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return fallback(lat, lon);
    }

    const components = data.results[0].address_components as Array<{
      long_name: string;
      types: string[];
    }>;

    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name || '';

    // Line 1: Province / Region (administrative_area_level_2 or sublocality_level_1)
    const province = get('administrative_area_level_2') || get('administrative_area_level_1');
    // Line 2: City + Barangay / sublocality
    const city = get('locality') || get('administrative_area_level_3');
    const barangay = get('sublocality_level_1') || get('neighborhood');

    return {
      locationArea: province || 'Unknown Area',
      locationName: [barangay, city].filter(Boolean).join(' ') || 'Unknown Location',
    };
  } catch {
    return fallback(lat, lon);
  }
}

function fallback(lat: number, lon: number): GeoResult {
  return {
    locationArea: 'GPS Only',
    locationName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
  };
}

/**
 * Format decimal degrees to DMS string: 14°32'59.4359"N
 */
export function toDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(4);

  const dir = isLat
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';

  return `${deg}°${min}'${sec}"${dir}`;
}
