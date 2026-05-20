import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getUserPhotos } from '../services/photos';
import { PhotoRecord, UserProfile, RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhotoHistory'>;
  user: UserProfile;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_SIZE = (SCREEN_WIDTH - 4) / 3;

export default function PhotoHistoryScreen({ navigation, user }: Props) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PhotoRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserPhotos(user.uid);
      setPhotos(data);
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: PhotoRecord }) => (
    <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.8}>
      <Image source={{ uri: item.photoUrl }} style={styles.tile} />
    </TouchableOpacity>
  );

  // Group photos by date for section headers
  const dateGroups: { date: string; count: number }[] = [];
  const seen = new Set<string>();
  for (const p of photos) {
    if (!seen.has(p.date)) {
      seen.add(p.date);
      dateGroups.push({ date: p.date, count: photos.filter((x) => x.date === p.date).length });
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Photos</Text>
        <Text style={styles.count}>{photos.length} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No photos yet.</Text>
          <Text style={styles.emptyHint}>Take a photo to record your attendance.</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id || item.timestamp.toString()}
          renderItem={renderItem}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
        />
      )}

      {/* Full-screen photo modal */}
      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modal}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selected && (
            <>
              <Image
                source={{ uri: selected.photoUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalMeta}>
                <Text style={styles.modalMetaText}>
                  {new Date(selected.timestamp).toLocaleString('en-PH')}
                </Text>
                <Text style={styles.modalMetaText}>
                  {selected.locationArea} — {selected.locationName}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  back: { marginRight: 16 },
  backText: { color: '#fff', fontSize: 24 },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
  count: { color: '#666', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: '#aaa', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#555', fontSize: 14, marginTop: 8, textAlign: 'center' },
  grid: { padding: 2 },
  row: { gap: 2 },
  tile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#222' },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseText: { color: '#fff', fontSize: 18 },
  modalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * (4 / 3) },
  modalMeta: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
  modalMetaText: { color: '#fff', fontSize: 13, lineHeight: 20 },
});
