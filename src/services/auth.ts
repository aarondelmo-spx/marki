import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AuthSessionResult } from 'expo-auth-session';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

WebBrowser.maybeCompleteAuthSession();

// Expo Auth Session request hook — call this in a component
export function useGoogleAuthRequest() {
  return Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // extraParams.prompt is the correct place — it maps directly to the
    // Google OAuth URL param and is NOT overridden by the typed `prompt`
    // field. "select_account" forces the account picker every time.
    // "consent" forces the consent screen so the picker cannot auto-skip.
    extraParams: {
      prompt: 'select_account consent',
      // max_auth_age=0 tells Google the session is "too old" and forces
      // it to re-ask even if the user recently authenticated.
      max_auth_age: '0',
    },
  });
}

/**
 * Exchange the auth session response for a Firebase UserProfile.
 * Call this after the user taps Sign In and response is set.
 */
export async function handleGoogleResponse(
  response: AuthSessionResult | null
): Promise<UserProfile | null> {
  if (response?.type !== 'success') return null;

  const { id_token, access_token } = response.params;
  if (!id_token && !access_token) {
    throw new Error(`No tokens in response. Params: ${JSON.stringify(response.params)}`);
  }
  const credential = GoogleAuthProvider.credential(id_token ?? null, access_token);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    return existing.data() as UserProfile;
  }

  const profile: UserProfile = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Unknown',
    email: user.email || '',
    photoURL: user.photoURL || undefined,
    role: 'worker',
    createdAt: Date.now(),
  };

  await setDoc(userRef, profile);
  return profile;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

// Access token for Sheets API — stored in module scope after sign-in
let _accessToken: string | null = null;
export function setAccessToken(token: string) { _accessToken = token; }
export function getGoogleAccessToken(): string | null { return _accessToken; }
