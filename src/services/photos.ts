import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { db, storage } from './firebase';
import { PhotoRecord, DailySummary } from '../types';

const PHOTOS_COL = 'photos';

/**
 * Upload a stamped photo to Firebase Storage and save metadata to Firestore.
 */
export async function savePhoto(
  photoUri: string,
  record: Omit<PhotoRecord, 'id' | 'photoUrl'>
): Promise<PhotoRecord> {
  // Read file as blob
  const fileInfo = await FileSystem.getInfoAsync(photoUri);
  if (!fileInfo.exists) throw new Error('Photo file not found');

  const response = await fetch(photoUri);
  const blob = await response.blob();

  // Upload to Firebase Storage: photos/{userId}/{timestamp}.jpg
  const filename = `${record.userId}/${record.timestamp}.jpg`;
  const storageRef = ref(storage, `photos/${filename}`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  const photoUrl = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  const full: PhotoRecord = { ...record, photoUrl };
  const docRef = await addDoc(collection(db, PHOTOS_COL), {
    ...full,
    timestamp: Timestamp.fromMillis(record.timestamp),
  });

  return { ...full, id: docRef.id };
}

/**
 * Fetch all photos for a user, newest first.
 */
export async function getUserPhotos(userId: string): Promise<PhotoRecord[]> {
  const q = query(
    collection(db, PHOTOS_COL),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      timestamp: (data.timestamp as Timestamp).toMillis(),
    } as PhotoRecord;
  });
}

/**
 * Fetch all photos across all users for a date range.
 * Used by admin export.
 */
export async function getPhotosByDateRange(
  startDate: string,
  endDate: string
): Promise<PhotoRecord[]> {
  const q = query(
    collection(db, PHOTOS_COL),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
    orderBy('timestamp', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      timestamp: (data.timestamp as Timestamp).toMillis(),
    } as PhotoRecord;
  });
}

/**
 * Build daily attendance summary from raw photo records.
 * Groups by user + date. One row per user per day.
 */
export function buildDailySummaries(photos: PhotoRecord[]): DailySummary[] {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group by "date|userId"
  const grouped = new Map<string, PhotoRecord[]>();
  for (const p of photos) {
    const key = `${p.date}|${p.userId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const summaries: DailySummary[] = [];

  for (const [, records] of grouped) {
    const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const dateObj = new Date(first.date + 'T00:00:00');
    const weekDay = DAYS[dateObj.getDay()];

    const clockInTime = new Date(first.timestamp);
    const clockOutTime = new Date(last.timestamp);

    const clockIn = formatTime(clockInTime);
    const clockOut = sorted.length > 1 ? formatTime(clockOutTime) : '-';

    const diffMs = last.timestamp - first.timestamp;
    const workHours = sorted.length > 1 ? formatDuration(diffMs) : '-';

    summaries.push({
      date: first.date,
      weekDay,
      name: first.userName,
      photoNums: records.length,
      workHours,
      clockIn,
      clockOut,
      clockInLocation: `${first.locationArea} ${first.locationName}`.trim(),
      clockOutLocation:
        sorted.length > 1
          ? `${last.locationArea} ${last.locationName}`.trim()
          : '-',
      status: 'Normal',
    });
  }

  // Sort by date then name
  summaries.sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.name.localeCompare(b.name)
  );

  return summaries;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}Minute`;
  if (m === 0) return `${h}Hour`;
  return `${h}h ${m}min`;
}
