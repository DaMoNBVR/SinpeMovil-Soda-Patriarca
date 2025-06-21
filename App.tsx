import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import StackNavigator from './src/navigation/StackNavigator';
import { DataProvider } from './src/context/DataContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function AppNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <StackNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppNavigator />
      </DataProvider>
    </ThemeProvider>
  );
}
