import { RefObject } from 'react';
import { View } from 'react-native';

/**
 * Capture the PhotoStampOverlay view as a JPEG using react-native-view-shot.
 * The view already has the photo + metadata text rendered — we snapshot it.
 *
 * Falls back to rawPhotoUri if view-shot is unavailable in this environment
 * (e.g. an Expo Go build that doesn't include RNViewShot).
 */
export async function burnStamp(
  viewRef: RefObject<View | null>,
  rawPhotoUri: string,
): Promise<string> {
  try {
    // Dynamic require so a missing native module doesn't crash at startup.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
    const uri = await captureRef(viewRef, {
      format: 'jpg',
      quality: 0.9,
      result: 'tmpfile',
    });
    return uri;
  } catch {
    // View-shot not available — upload the original (unstamped) photo.
    console.warn('[burnStamp] react-native-view-shot unavailable, using raw photo');
    return rawPhotoUri;
  }
}
