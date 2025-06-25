import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import PeopleListScreen from '../screens/PeopleListScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterPurchaseScreen from '../screens/RegisterPurchaseScreen';
import RegisterPaymentScreen from '../screens/RegisterPaymentScreen';
import DailySummaryScreen from '../screens/DailySummaryScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import PersonDetailScreen from '../screens/PersonDetailScreen';
import GeneralBalanceScreen from '../screens/GeneralBalanceScreen';
import ManualAdjustmentScreen from '../screens/ManualAdjustmentScreen';
import ManagePeopleScreen from '../screens/ManagePeopleScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  RegisterPurchase: undefined;
  RegisterPayment: undefined;
  DailySummary: undefined;
  WeeklySummary: undefined;
  PeopleList: undefined;
  PersonDetail: { personId: string };
  GeneralBalance: undefined;
  ManualAdjustment: undefined;
  ManagePeople: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme === 'dark' ? '#121212' : '#f2f2f2',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: theme === 'dark' ? '#ffffff' : '#000000',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Stack.Screen name="PeopleList" component={PeopleListScreen} options={{ title: 'Listado de Personas' }} />
      <Stack.Screen name="RegisterPurchase" component={RegisterPurchaseScreen} options={{ title: 'Nueva Compra' }} />
      <Stack.Screen name="RegisterPayment" component={RegisterPaymentScreen} options={{ title: 'Nuevo Pago' }} />
      <Stack.Screen name="DailySummary" component={DailySummaryScreen} options={{ title: 'Resumen Diario' }} />
      <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} options={{ title: 'Resumen Semanal' }} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: 'Detalle de Persona' }} />
      <Stack.Screen name="GeneralBalance" component={GeneralBalanceScreen} options={{ title: 'Balance General' }} />
      <Stack.Screen name="ManualAdjustment" component={ManualAdjustmentScreen} options={{ title: 'Ajuste Manual' }} />
      <Stack.Screen name="ManagePeople" component={ManagePeopleScreen} options={{ title: 'Gestión de Personas' }} />
    </Stack.Navigator>
  );
}
