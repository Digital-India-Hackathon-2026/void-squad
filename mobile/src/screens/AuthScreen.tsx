import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { C } from '../lib/colors';

export default function AuthScreen() {
  const [mode, setMode]         = useState<'login' | 'signup'>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, signup }       = useAuth();
  const router                  = useRouter();

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('Error', 'Email and password are required.'); return; }
    if (mode === 'signup' && !name) { Alert.alert('Error', 'Name is required.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), password);
      }
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>⚗️</Text>
          </View>
          <Text style={styles.logoText}>DeCode.it</Text>
          <Text style={styles.logoSub}>Scan smarter. Eat safer.</Text>
        </View>

        {/* Tab toggle */}
        <View style={styles.toggle}>
          {(['login', 'signup'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.toggleBtn, mode === m && styles.toggleActive]} onPress={() => setMode(m)}>
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.card}>
          {mode === 'signup' && (
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={C.muted}
              value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={C.muted}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={C.muted}
            value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : (
              <Text style={styles.btnText}>{mode === 'login' ? 'Log In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },
  logoWrap: { alignItems: 'center', gap: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary + '22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.primary + '44' },
  logoIcon: { fontSize: 32 },
  logoText: { fontSize: 28, fontWeight: '700', color: C.primary, letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: C.muted },
  toggle: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: C.primary },
  toggleText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  toggleTextActive: { color: '#000' },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: C.border },
  input: { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  btn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
