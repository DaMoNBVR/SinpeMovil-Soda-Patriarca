// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  username: string | null;
  login: (username: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem('loggedInUser');
      if (storedUser) setUsername(storedUser);
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (user: string) => {
    await AsyncStorage.setItem('loggedInUser', user);
    setUsername(user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('loggedInUser');
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ username, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext debe usarse dentro de AuthProvider');
  return ctx;
};
