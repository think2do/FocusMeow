import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authApi';

const AUTH_TOKEN_KEY = '@focusmeow_auth_token';
const AUTH_USER_KEY = '@focusmeow_auth_user';
const CLIENT_ID_KEY = '@focusmeow_client_id';
const AuthContext = createContext(null);
const createLocalId = () => `fm_client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const savedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        let savedClientId = await AsyncStorage.getItem(CLIENT_ID_KEY);
        if (!savedClientId) {
          savedClientId = createLocalId();
          await AsyncStorage.setItem(CLIENT_ID_KEY, savedClientId);
        }
        setClientId(savedClientId);
        if (savedToken && savedUser) { setToken(savedToken); setUser(JSON.parse(savedUser)); }
      } catch (e) { console.warn('restore failed', e); }
      finally { setLoading(false); }
    })();
  }, []);

  const persist = useCallback(async (t, u) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, t);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    if (data.code && data.code !== 200) {
      throw new Error(data.message || 'Login failed');
    }
    const t = data.token || data.access_token || 'local_session_' + Date.now();
    const u = data.user || { email, nickname: email.split('@')[0] };
    setToken(t); setUser(u); await persist(t, u); return u;
  }, [persist]);

  const register = useCallback(async (email, password, nickname, verifiedToken) => {
    const data = await apiRegister(email, password, nickname, verifiedToken);
    if (data.code && data.code !== 200) {
      throw new Error(data.message || 'Register failed');
    }
    if (data.token || data.access_token) {
      const t = data.token || data.access_token;
      const u = data.user || { email, nickname };
      setToken(t); setUser(u); await persist(t, u); return u;
    }
    return data;
  }, [persist]);

  const logout = useCallback(async () => {
    if (token) await apiLogout(token);
    setToken(null); setUser(null);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }, [token]);

  const isLoggedIn = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, clientId, loading, isLoggedIn, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
