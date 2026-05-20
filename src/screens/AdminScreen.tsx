import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPhotosByDateRange, buildDailySummaries } from '../services/photos';
import { exportToSheets } from '../services/sheets';
import { UserProfile, RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Admin'>;
  user: UserProfile;
};

export default function AdminScreen({ navigation, user }: Props) {
  const today = new Date();
  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [loading, setLoading] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<string[] | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setLastExportUrl(null);
    setPreviewRows(null);

    try {
      const photos = await getPhotosByDateRange(startDate, endDate);
      if (photos.length === 0) {
        Alert.alert('No data', `No photos found between ${startDate} and ${endDate}.`);
        setLoading(false);
        return;
      }

      const summaries = buildDailySummaries(photos);

      // Build preview (first 5 rows)
      const preview = summaries.slice(0, 5).map(
        (s) =>
          `${s.date}  ${s.name.split(' ')[0].padEnd(10)}  ${s.clockIn}→${s.clockOut}  ${s.status}`
      );
      setPreviewRows(preview);

      const dateRange = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
      const url = await exportToSheets(summaries, photos, dateRange);
      setLastExportUrl(url);
    } catch (err: any) {
      Alert.alert('Export failed', err?.message || 'Could not export. Check your Google account connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Export Attendance</Text>
      </View>

      {/* Date range */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Date Range</Text>

        <View style={styles.dateRow}>
          <DateInput label="From" value={startDate} onChange={setStartDate} />
          <Text style={styles.dateSep}>→</Text>
          <DateInput label="To" value={endDate} onChange={setEndDate} />
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, loading && styles.disabled]}
          onPress={handleExport}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.exportBtnText}>Export to Google Sheets</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview */}
      {previewRows && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preview (first 5 rows)</Text>
          {previewRows.map((row, i) => (
            <Text key={i} style={styles.previewRow}>
              {row}
            </Text>
          ))}
        </View>
      )}

      {/* Open sheet link */}
      {lastExportUrl && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Export Complete</Text>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => Linking.openURL(lastExportUrl)}
          >
            <Text style={styles.openBtnText}>Open Google Sheet →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Simple date bumper — tap + / - to change day
  const bump = (days: number) => {
    const d = new Date(value + 'T00:00:00');
    d.setDate(d.getDate() + days);
    onChange(formatDate(d));
  };

  return (
    <View style={styles.dateInput}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateControl}>
        <TouchableOpacity onPress={() => bump(-1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateValue}>{value}</Text>
        <TouchableOpacity onPress={() => bump(1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
    marginBottom: 16,
  },
  back: { marginRight: 16 },
  backText: { color: '#fff', fontSize: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: { color: '#8888aa', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  dateSep: { color: '#555', fontSize: 18 },
  dateInput: { flex: 1, alignItems: 'center' },
  dateLabel: { color: '#666', fontSize: 11, marginBottom: 6 },
  dateControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: { color: '#fff', fontSize: 18, lineHeight: 22 },
  dateValue: { color: '#fff', fontSize: 13, fontWeight: '600', minWidth: 90, textAlign: 'center' },
  exportBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewRow: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    paddingVertical: 4,
  },
  openBtn: {
    backgroundColor: '#2a2a3e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  openBtnText: { color: '#22c55e', fontSize: 15, fontWeight: '600' },
});
