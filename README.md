# Marki — Field Attendance App

A mobile app for field workers to document site visits with geotagged photos. Taking a photo = clocking in. The app stamps each photo with date, time, GPS coordinates, location name, and user identity — then syncs everything to Firebase and exports daily attendance reports to Google Sheets.

Built with Expo (React Native) — runs on Android and iOS.

---

## How it works

1. Worker opens the app and signs in with their Google account
2. Worker takes a photo at the site
3. App automatically stamps the photo with:
   - Date and time
   - Location name (reverse-geocoded from GPS)
   - GPS coordinates (lat/long)
   - Worker's name
4. Photo is uploaded to Firebase Storage; metadata saved to Firestore
5. First photo of the day = **Clock In**, last photo = **Clock Out**
6. Admin exports a Google Sheet with daily attendance for all workers

---

## Tech stack

| Layer | Tech |
|---|---|
| App | Expo SDK 55 (React Native) |
| Auth | Firebase Auth + Google Sign-In (expo-auth-session) |
| Storage | Firebase Storage |
| Database | Firebase Firestore |
| Export | Google Sheets API v4 |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |

---

## Project structure

```
src/
├── screens/
│   ├── LoginScreen.tsx        # Google Sign-In
│   ├── CameraScreen.tsx       # Camera + stamp preview + upload
│   ├── PhotoHistoryScreen.tsx # Photo grid + full-screen view
│   └── AdminScreen.tsx        # Date picker + export to Sheets
├── components/
│   └── PhotoStampOverlay.tsx  # Metadata stamp burned onto photo
├── services/
│   ├── firebase.ts            # Firebase init
│   ├── auth.ts                # Google OAuth + user profile
│   ├── geocoding.ts           # GPS → location name
│   ├── photos.ts              # Save/fetch photos + attendance logic
│   └── sheets.ts              # Google Sheets export
├── hooks/
│   └── useAuth.ts             # Auth state listener
└── types/
    └── index.ts               # Shared TypeScript types
```

---

## Getting started (contributors)

### 1. Clone and install

```bash
git clone https://github.com/aarondelmo-spx/marki.git
cd marki
npm install
```

### 2. Set up Firebase

You'll need your own Firebase project for development:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → Create project
2. Enable **Authentication** → Google provider
3. Enable **Firestore** and **Storage**
4. Go to Project settings → Your apps → Add web app → copy the config

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your Firebase config and Google OAuth Web Client ID (found in Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration).

### 4. Run

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone (Android or iOS).

---

## Contributing

- `master` branch is the stable branch
- Open a PR against `master` for any changes
- TypeScript is enforced — run `npx tsc --noEmit` before submitting
- Keep the photo stamp format consistent with the sample in `/docs` (if added)

### Key things to know

- **Photo stamping** uses `react-native-view-shot` to screenshot a React Native view (the photo + text overlay) as a new image. See `PhotoStampOverlay.tsx` + `CameraScreen.tsx`.
- **Attendance logic** lives entirely in `src/services/photos.ts` → `buildDailySummaries()`. First photo of day = clock-in, last = clock-out.
- **Google Sheets export** uses the user's OAuth access token (from sign-in) to write directly to Sheets. No service account needed.
- **Geocoding** uses OpenStreetMap Nominatim — free, no API key, 1 req/sec rate limit.

---

## Firebase security model

- Workers can only write/read their own photos
- Admins (role: `admin` in Firestore `users` collection) can read all photos and trigger exports
- To make someone an admin: manually set `role: "admin"` on their Firestore user document

---

## Roadmap

- [ ] Offline queue — photos taken without internet upload automatically when connection resumes
- [ ] Admin dashboard — live view of who's present/absent today
- [ ] Absent detection — auto-flag workers with no photos on a workday
- [ ] Push notifications — remind workers to take their first photo
- [ ] Multi-site support — tag photos to a specific named site from a list
