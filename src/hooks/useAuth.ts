import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — if Firebase doesn't respond in 8s, show login screen
    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsub = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        clearTimeout(timeout);
        try {
          if (firebaseUser) {
            const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
            setUser(snap.exists() ? (snap.data() as UserProfile) : null);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        // Auth error (e.g. network, bad config) — fall through to login
        console.error('Auth error:', (error as any).code, error.message);
        clearTimeout(timeout);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  return { user, loading };
}
