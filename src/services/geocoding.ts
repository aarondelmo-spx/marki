/**
 * Reverse geocoding using OpenStreetMap Nominatim.
 * Free, no API key required, works globally.
 * Rate limit: 1 request/second (fine for this use case).
 */

interface GeoResult {
  locationArea: string;  // e.g. "Rizal"
  locationName: string;  // e.g. "Taytay"
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;

    const res = await fetch(url, {
      headers: {
        // Required by Nominatim ToS: identify your app
        'User-Agent': 'Marki-Attendance-App/1.0 (internal@spxexpress.com)',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) return fallback(lat, lon);

    const data = await res.json();
    const addr = data.address || {};

    // Line 1 (area): province or state
    const area =
      addr.province ||
      addr.state ||
      addr.county ||
      addr.region ||
      'Unknown Area';

    // Line 2 (name): city/municipality + barangay/suburb
    const city = addr.city || addr.town || addr.municipality || addr.village || '';
    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
    const name = [suburb, city].filter(Boolean).join(' ') || 'Unknown Location';

    return {
      locationArea: area,
      locationName: name,
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
 * Format decimal degrees to DMS: 14°32'59.4359"N
 */
export function toDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(4);
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  return `${deg}°${min}'${sec}"${dir}`;
}
