import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useGoogleAuthRequest,
  handleGoogleResponse,
  setAccessToken,
} from '../services/auth';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = useGoogleAuthRequest();

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      const token = response.params?.access_token;
      if (token) setAccessToken(token);

      handleGoogleResponse(response)
        .then((profile) => {
          if (profile) {
            navigation.replace('Main');
          } else {
            Alert.alert('Sign-in failed', 'Could not get user profile. Try again.');
          }
        })
        .catch((err) => {
          Alert.alert('Sign-in failed', err?.message || 'Something went wrong.');
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert('Sign-in failed', response.error?.message || 'Google sign-in error.');
    }
  }, [response]);

  const handleSignIn = async () => {
    if (!request) return;
    setLoading(true);
    try {
      await promptAsync();
    } finally {
      // loading stays true until response useEffect resolves
      if (response?.type !== 'success') setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>📍</Text>
        <Text style={styles.title}>Marki</Text>
        <Text style={styles.subtitle}>Field Documentation</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.googleButton, (loading || !request) && styles.disabled]}
          onPress={handleSignIn}
          disabled={loading || !request}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>Use your company Google account</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#8888aa',
    marginTop: 8,
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  hint: {
    color: '#666688',
    fontSize: 13,
    marginTop: 16,
  },
});
