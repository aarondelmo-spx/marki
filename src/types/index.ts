export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'worker' | 'admin';
  createdAt: number;
}

export interface PhotoRecord {
  id?: string;
  userId: string;
  userName: string;
  date: string;           // YYYY-MM-DD
  timestamp: number;      // Unix ms
  latitude: number;
  longitude: number;
  locationArea: string;   // e.g. "South Luzon Rizal"
  locationName: string;   // e.g. "Taytay San Juan"
  photoUrl: string;       // Firebase Storage URL
}

export interface DailySummary {
  date: string;
  weekDay: string;
  name: string;
  photoNums: number;
  workHours: string;
  clockIn: string;
  clockOut: string;
  clockInLocation: string;
  clockOutLocation: string;
  status: 'Normal' | 'Absent';
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  PhotoHistory: undefined;
  Admin: undefined;
};
