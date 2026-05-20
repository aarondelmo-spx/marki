import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Capture the PhotoStampOverlay view (which has the photo + text overlay
 * already rendered) and save it to the cache as a JPEG.
 *
 * This replaces the previous Skia-based approach. The view is already
 * rendered on screen, so we just snapshot it — no native canvas needed.
 */
export async function burnStamp(
  viewRef: RefObject<View | null>,
  timestamp: number
): Promise<string> {
  const uri = await captureRef(viewRef, {
    format: 'jpg',
    quality: 0.9,
    result: 'tmpfile',
  });
  return uri;
}
