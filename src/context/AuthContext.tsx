// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  username: string | null;
  role: 'admin' | 'employee' | null;
  login: (username: string, role: 'admin' | 'employee') => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('loggedInUser');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUsername(parsed.username);
          setRole(parsed.role);
        }
      } catch (e) {
        console.error('Error loading user', e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (user: string, userRole: 'admin' | 'employee') => {
    const data = JSON.stringify({ username: user, role: userRole });
    await AsyncStorage.setItem('loggedInUser', data);
    setUsername(user);
    setRole(userRole);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('loggedInUser');
    setUsername(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ username, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext debe usarse dentro de AuthProvider');
  return ctx;
};
