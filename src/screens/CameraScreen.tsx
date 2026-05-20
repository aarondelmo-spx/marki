import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { reverseGeocode } from '../services/geocoding';
import { savePhoto } from '../services/photos';
import PhotoStampOverlay from '../components/PhotoStampOverlay';
import { UserProfile, RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
  user: UserProfile;
};

type Stage = 'camera' | 'preview' | 'saving';

export default function CameraScreen({ navigation, user }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const stampRef = useRef<ViewShotRef>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationGranted, setLocationGranted] = useState(false);
  const [stage, setStage] = useState<Stage>('camera');
  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{
    timestamp: number;
    latitude: number;
    longitude: number;
    locationArea: string;
    locationName: string;
  } | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    })();
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      // 1. Take photo
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;

      // 2. Get GPS
      const timestamp = Date.now();
      let lat = 0, lon = 0;
      if (locationGranted) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }

      // 3. Reverse geocode
      const { locationArea, locationName } = await reverseGeocode(lat, lon);

      setRawPhotoUri(photo.uri);
      setPhotoMeta({ timestamp, latitude: lat, longitude: lon, locationArea, locationName });
      setStage('preview');
    } catch (err) {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  }, [locationGranted]);

  const handleConfirm = useCallback(async () => {
    if (!stampRef.current || !photoMeta || !rawPhotoUri) return;
    setStage('saving');

    try {
      // 1. Capture the stamped view as an image
      const stampedUri = await stampRef.current.capture!();

      // 2. Compute date string
      const d = new Date(photoMeta.timestamp);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // 3. Upload + save record
      await savePhoto(stampedUri, {
        userId: user.uid,
        userName: user.name,
        date,
        timestamp: photoMeta.timestamp,
        latitude: photoMeta.latitude,
        longitude: photoMeta.longitude,
        locationArea: photoMeta.locationArea,
        locationName: photoMeta.locationName,
      });

      setTodayCount((c) => c + 1);
      setStage('camera');
      setRawPhotoUri(null);
      setPhotoMeta(null);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not save photo. Check your connection.');
      setStage('preview');
    }
  }, [stampRef, photoMeta, rawPhotoUri, user]);

  const handleRetake = useCallback(() => {
    setStage('camera');
    setRawPhotoUri(null);
    setPhotoMeta(null);
  }, []);

  // Permission gates
  if (!cameraPermission) return <LoadingView />;
  if (!cameraPermission.granted) {
    return (
      <PermissionView
        message="Camera access is required to take attendance photos."
        onRequest={requestCameraPermission}
      />
    );
  }

  // Stamp preview + confirm stage
  if ((stage === 'preview' || stage === 'saving') && rawPhotoUri && photoMeta) {
    return (
      <View style={styles.container}>
        <ViewShot
          ref={stampRef}
          options={{ format: 'jpg', quality: 0.9 }}
          style={styles.stampContainer}
        >
          <PhotoStampOverlay
            photoUri={rawPhotoUri}
            timestamp={photoMeta.timestamp}
            latitude={photoMeta.latitude}
            longitude={photoMeta.longitude}
            locationArea={photoMeta.locationArea}
            locationName={photoMeta.locationName}
            userName={user.name}
            userId={user.uid.slice(0, 12).toUpperCase()}
          />
        </ViewShot>

        <View style={styles.previewActions}>
          {stage === 'saving' ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.savingText}>Uploading…</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>✓ Save</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // Camera stage
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.userName}>{user.name}</Text>
        {todayCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{todayCount} today</Text>
          </View>
        )}
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('PhotoHistory')}
        >
          <Text style={styles.historyBtnText}>📋</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>

        {user.role === 'admin' ? (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text style={styles.adminBtnText}>⚙️</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.historyBtn} />
        )}
      </View>
    </View>
  );
}

function LoadingView() {
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

function PermissionView({ message, onRequest }: { message: string; onRequest: () => void }) {
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
      <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24, fontSize: 16 }}>
        {message}
      </Text>
      <TouchableOpacity style={styles.confirmBtn} onPress={onRequest}>
        <Text style={styles.confirmBtnText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  stampContainer: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 48,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  historyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: {
    fontSize: 22,
  },
  adminBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnText: {
    fontSize: 22,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    backgroundColor: '#111',
  },
  retakeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
  },
  retakeBtnText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: '#22c55e',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingText: {
    color: '#aaa',
    fontSize: 16,
  },
});
