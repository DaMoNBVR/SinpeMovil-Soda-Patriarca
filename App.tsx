import React, { useEffect } from 'react'; // <--- Agregamos useEffect
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import StackNavigator from './src/navigation/StackNavigator';
import LoginScreen from './src/screens/LoginScreen';

function AppNavigator() {
  const { theme } = useTheme();
  const { username } = useAuth(); 


  return (
    <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
      {username ? <StackNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <AppNavigator />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}