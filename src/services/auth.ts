import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

// Configure Google Sign-In once at app start
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    // Get this from Google Cloud Console → Credentials → OAuth 2.0 Client IDs → Web client
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    offlineAccess: true, // needed for Sheets API refresh token
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}

export async function signInWithGoogle(): Promise<UserProfile> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();

  const { idToken } = await GoogleSignin.getTokens();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);

  const user = result.user;

  // Upsert user profile in Firestore
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);

  const profile: UserProfile = existing.exists()
    ? (existing.data() as UserProfile)
    : {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        role: 'worker',
        createdAt: Date.now(),
      };

  if (!existing.exists()) {
    await setDoc(userRef, profile);
  }

  return profile;
}

export async function signOut() {
  await GoogleSignin.signOut();
  await firebaseSignOut(auth);
}

export async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch {
    return null;
  }
}
