import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from './src/navigation/StackNavigator';
import { DataProvider } from './src/context/DataContext';

export default function App() {
  return (
    <NavigationContainer>
      <DataProvider>
        <StackNavigator />
      </DataProvider>
    </NavigationContainer>
  );
}
