import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../lib/api';

interface User { _id: string; email: string; name?: string; }
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem('decode_token');
      const storedUser  = await AsyncStorage.getItem('decode_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await authAPI.login({ email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('decode_token', t);
    await AsyncStorage.setItem('decode_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function signup(name: string, email: string, password: string) {
    const res = await authAPI.signup({ name, email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('decode_token', t);
    await AsyncStorage.setItem('decode_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function logout() {
    await AsyncStorage.multiRemove(['decode_token', 'decode_user']);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
