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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { reverseGeocode } from '../services/geocoding';
import { burnStamp } from '../services/stamp';
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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;

      const timestamp = Date.now();
      let lat = 0, lon = 0;
      if (locationGranted) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }

      const { locationArea, locationName } = await reverseGeocode(lat, lon);
      setRawPhotoUri(photo.uri);
      setPhotoMeta({ timestamp, latitude: lat, longitude: lon, locationArea, locationName });
      setStage('preview');
    } catch (err) {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  }, [locationGranted]);

  const handleConfirm = useCallback(async () => {
    if (!photoMeta || !rawPhotoUri) return;
    setStage('saving');
    try {
      // Burn stamp onto photo using Skia (pure JS, works in Expo Go)
      const stampedUri = await burnStamp(rawPhotoUri, {
        timestamp: photoMeta.timestamp,
        latitude: photoMeta.latitude,
        longitude: photoMeta.longitude,
        locationArea: photoMeta.locationArea,
        locationName: photoMeta.locationName,
        userName: user.name,
        userId: user.uid,
      });

      const d = new Date(photoMeta.timestamp);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  }, [photoMeta, rawPhotoUri, user]);

  const handleRetake = useCallback(() => {
    setStage('camera');
    setRawPhotoUri(null);
    setPhotoMeta(null);
  }, []);

  if (!cameraPermission) return <LoadingView />;
  if (!cameraPermission.granted) {
    return (
      <PermissionView
        message="Camera access is required to take attendance photos."
        onRequest={requestCameraPermission}
      />
    );
  }

  if ((stage === 'preview' || stage === 'saving') && rawPhotoUri && photoMeta) {
    return (
      <View style={styles.container}>
        {/* Preview shows what the stamp will look like */}
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

        <View style={styles.previewActions}>
          {stage === 'saving' ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.savingText}>Stamping & uploading…</Text>
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

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.topBar}>
        <Text style={styles.userName}>{user.name}</Text>
        {todayCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{todayCount} today</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => navigation.navigate('PhotoHistory')}
        >
          <Text style={styles.sideBtnText}>📋</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>

        {user.role === 'admin' ? (
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text style={styles.sideBtnText}>⚙️</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.sideBtn} />
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
      <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24, fontSize: 16 }}>{message}</Text>
      <TouchableOpacity style={styles.confirmBtn} onPress={onRequest}>
        <Text style={styles.confirmBtnText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  userName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  countBadge: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingBottom: 48, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff' },
  sideBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideBtnText: { fontSize: 22 },
  previewActions: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 24, paddingHorizontal: 32, backgroundColor: '#111',
  },
  retakeBtn: {
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, borderWidth: 1, borderColor: '#666',
  },
  retakeBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  confirmBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, backgroundColor: '#22c55e' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  savingText: { color: '#aaa', fontSize: 16 },
});
