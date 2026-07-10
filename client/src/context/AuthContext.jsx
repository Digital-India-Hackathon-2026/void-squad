import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // { userId, name, email }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('decode_token');
    const storedUser = localStorage.getItem('decode_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  function login(userData, jwtToken) {
    const userObj = {
      userId: userData.userId,
      name: userData.name || '',
      email: userData.email || '',
    };
    setUser(userObj);
    setToken(jwtToken);
    localStorage.setItem('decode_token', jwtToken);
    localStorage.setItem('decode_user', JSON.stringify(userObj));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('decode_token');
    localStorage.removeItem('decode_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
