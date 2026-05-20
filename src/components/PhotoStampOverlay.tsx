import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { toDMS } from '../services/geocoding';

interface Props {
  photoUri: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  locationArea: string;
  locationName: string;
  userName: string;
  userId: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * A view that renders a photo with the metadata stamp overlay burned in at the bottom.
 * Capture this with react-native-view-shot to produce the stamped image.
 */
const PhotoStampOverlay = forwardRef<View, Props>((props, ref) => {
  const {
    photoUri,
    timestamp,
    latitude,
    longitude,
    locationArea,
    locationName,
    userName,
    userId,
  } = props;

  const date = new Date(timestamp);

  const dateStr = date.toLocaleDateString('en-PH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }); // e.g. "08-March-2026"

  const timeStr = date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }); // e.g. "17:43:57"

  const latDMS = toDMS(latitude, true);
  const lonDMS = toDMS(longitude, false);

  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      <Image
        source={{ uri: photoUri }}
        style={styles.photo}
        resizeMode="cover"
      />
      <View style={styles.stamp}>
        <Text style={styles.stampText}>
          {dateStr.replace(',', '')} {timeStr}
        </Text>
        <Text style={styles.stampText}> </Text>
        <Text style={styles.stampText}>{locationArea}</Text>
        <Text style={styles.stampText}>{locationName}</Text>
        <Text style={styles.stampText}>
          {latDMS}  {lonDMS}
        </Text>
        <Text style={styles.stampText}> </Text>
        <Text style={styles.stampText}>
          {userId}    {userName}
        </Text>
      </View>
    </View>
  );
});

PhotoStampOverlay.displayName = 'PhotoStampOverlay';
export default PhotoStampOverlay;

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    aspectRatio: 3 / 4,
    position: 'relative',
    backgroundColor: '#000',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  stamp: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stampText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
