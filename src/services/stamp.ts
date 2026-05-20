import { Skia, ImageFormat } from '@shopify/react-native-skia';
import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';
import { toDMS } from './geocoding';

interface StampData {
  timestamp: number;
  latitude: number;
  longitude: number;
  locationArea: string;
  locationName: string;
  userName: string;
  userId: string;
}

/**
 * Burn a metadata stamp onto a photo using Skia (built into Expo Go).
 * Reads the source photo, draws it on a Skia canvas, overlays the
 * stamp text at the bottom, then saves as JPEG.
 */
export async function burnStamp(photoUri: string, data: StampData): Promise<string> {
  const date = new Date(data.timestamp);

  const dateStr = date.toLocaleDateString('en-PH', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).replace(',', '');

  const timeStr = date.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  const latDMS = toDMS(data.latitude, true);
  const lonDMS = toDMS(data.longitude, false);
  const shortId = data.userId.slice(0, 12).toUpperCase();

  const lines = [
    `${dateStr} ${timeStr}`,
    '',
    data.locationArea,
    data.locationName,
    `${latDMS}  ${lonDMS}`,
    '',
    `${shortId}    ${data.userName}`,
  ];

  // Read the source photo as base64
  const base64 = await readAsStringAsync(photoUri, {
    encoding: 'base64' as const,
  });

  // Decode into a Skia image
  const skData = Skia.Data.fromBase64(base64);
  const srcImage = Skia.Image.MakeImageFromEncoded(skData);
  if (!srcImage) throw new Error('Failed to decode photo for stamping');

  const W = srcImage.width();
  const H = srcImage.height();

  // Create an off-screen surface at the same size
  const surface = Skia.Surface.Make(W, H);
  if (!surface) throw new Error('Failed to create Skia surface');

  const canvas = surface.getCanvas();

  // Draw source photo
  canvas.drawImage(srcImage, 0, 0);

  // --- Stamp geometry ---
  const fontSize = Math.max(14, Math.round(W / 45));
  const lineH = Math.round(fontSize * 1.5);
  const pad = Math.round(fontSize * 0.8);
  const stampH = lines.length * lineH + pad * 2;
  const stampY = H - stampH;

  // Semi-transparent black background
  const bgPaint = Skia.Paint();
  bgPaint.setColor(Skia.Color('rgba(0, 0, 0, 0.55)'));
  canvas.drawRect(Skia.XYWHRect(0, stampY, W, stampH), bgPaint);

  // White text
  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color('white'));
  const font = Skia.Font(undefined, fontSize);

  lines.forEach((line, i) => {
    if (line === '') return;
    canvas.drawText(line, pad, stampY + pad + i * lineH + fontSize, textPaint, font);
  });

  // Snapshot → encode as JPEG → write to cache
  const snapshot = surface.makeImageSnapshot();
  const jpegBase64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);

  const outputPath = `${cacheDirectory}stamped_${data.timestamp}.jpg`;
  await writeAsStringAsync(outputPath, jpegBase64, {
    encoding: 'base64' as const,
  });

  return outputPath;
}
