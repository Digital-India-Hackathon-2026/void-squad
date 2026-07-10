import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { userId, name, email }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('decode_token');
    const storedUser = localStorage.getItem('decode_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('decode_token');
        localStorage.removeItem('decode_user');
      }
    }
    setLoading(false);
  }, []);

  function _persist(userObj, jwtToken) {
    setUser(userObj);
    setToken(jwtToken);
    localStorage.setItem('decode_token', jwtToken);
    localStorage.setItem('decode_user', JSON.stringify(userObj));
  }

  // login(email, password) — calls API then persists session
  async function login(email, password) {
    const res = await authAPI.login({ email, password });
    const { userId, name, token } = res.data;
    const userObj = {
      userId,
      name: name || '',
      email,
    };
    _persist(userObj, token);
    return userObj;
  }

  // register(name, email, password)
  async function register(name, email, password) {
    const res = await authAPI.signup({ name, email, password });
    const { userId, token } = res.data;
    const userObj = {
      userId,
      name,
      email,
    };
    _persist(userObj, token);
    return userObj;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('decode_token');
    localStorage.removeItem('decode_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
