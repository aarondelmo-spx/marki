import { getGoogleAccessToken } from './auth';
import { DailySummary, PhotoRecord } from '../types';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Create a new Google Sheet and populate it with attendance data.
 * Returns the URL of the created spreadsheet.
 */
export async function exportToSheets(
  summaries: DailySummary[],
  rawPhotos: PhotoRecord[],
  dateRange: string
): Promise<string> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not signed in to Google');

  // 1. Create a new spreadsheet
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: `Marki Attendance ${dateRange}` },
      sheets: [
        { properties: { title: 'Attendance details', index: 0 } },
        { properties: { title: 'photo_log', index: 1 } },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${err}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId: string = spreadsheet.spreadsheetId;

  // 2. Build row data
  const summaryHeader = [
    'Date', 'Week', 'Name', 'AttendanceType',
    'Photo Nums', 'Work Hours', 'Clock In', 'Clock Out',
    'Clock In Location', 'Clock Out Location', 'Status',
  ];

  const summaryRows = summaries.map((s) => [
    s.date,
    s.weekDay,
    s.name,
    'Flexible',
    s.photoNums,
    s.workHours,
    s.clockIn,
    s.clockOut,
    s.clockInLocation,
    s.clockOutLocation,
    s.status,
  ]);

  const rawHeader = [
    'Timestamp', 'Date', 'Name', 'Latitude', 'Longitude',
    'Location Area', 'Location Name', 'Photo URL',
  ];

  const rawRows = rawPhotos.map((p) => [
    new Date(p.timestamp).toLocaleString('en-PH'),
    p.date,
    p.userName,
    p.latitude,
    p.longitude,
    p.locationArea,
    p.locationName,
    p.photoUrl,
  ]);

  // 3. Write both sheets in a single batchUpdate
  const batchRes = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Attendance details!A1',
            values: [summaryHeader, ...summaryRows],
          },
          {
            range: 'photo_log!A1',
            values: [rawHeader, ...rawRows],
          },
        ],
      }),
    }
  );

  if (!batchRes.ok) {
    const err = await batchRes.text();
    throw new Error(`Failed to write data: ${err}`);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
