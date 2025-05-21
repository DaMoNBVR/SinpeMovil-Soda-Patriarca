import React from 'react';
import { DataProvider } from './src/context/DataContext';
import StackNavigator from './src/navigation/StackNavigator';

export default function App() {
  return (
    <DataProvider>
      <StackNavigator />
    </DataProvider>
  );
}