import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

// BORRAMOS EL IMPORT DE LOGIN PORQUE YA NO VA AQUÍ
// import LoginScreen from '../screens/LoginScreen'; 

import PeopleListScreen from '../screens/PeopleListScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterPurchaseScreen from '../screens/RegisterPurchaseScreen';
import RegisterPaymentScreen from '../screens/RegisterPaymentScreen';
import FinancialSummaryScreen from '../screens/FinancialSummaryScreen';
import PersonDetailScreen from '../screens/PersonDetailScreen';
import ManualAdjustmentScreen from '../screens/ManualAdjustmentScreen';
import ManagePeopleScreen from '../screens/ManagePeopleScreen';
import RegisterUserScreen from '../screens/RegisterUserScreen';

export type RootStackParamList = {
  // Login: undefined; // <--- Ya no necesitamos esto en el stack
  Home: undefined;
  RegisterPurchase: undefined;
  RegisterPayment: undefined;
  FinancialSummary: { mode: 'daily' | 'weekly' };
  PeopleList: undefined;
  PersonDetail: { personId: string };
  GeneralBalance: undefined;
  ManualAdjustment: { personId?: string } | undefined;
  ManagePeople: undefined;
  RegisterUser: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Home" // <--- CAMBIO CLAVE: Empezamos en HOME
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
      {/* <Stack.Screen name="Login" ... />  <--- BORRADO: El Login vive fuera del stack ahora */}
      
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Stack.Screen name="PeopleList" component={PeopleListScreen} options={{ title: 'Listado de Personas' }} />
      <Stack.Screen name="RegisterPurchase" component={RegisterPurchaseScreen} options={{ title: 'Nueva Compra' }} />
      <Stack.Screen name="RegisterPayment" component={RegisterPaymentScreen} options={{ title: 'Nuevo Pago' }} />
      <Stack.Screen name="FinancialSummary" component={FinancialSummaryScreen} options={{ title: 'Resumen Financiero' }} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: 'Detalle de Persona' }} />
      <Stack.Screen name="ManagePeople" component={ManagePeopleScreen} options={{ title: 'Gestión de Personas' }} />
      <Stack.Screen name="RegisterUser" component={RegisterUserScreen} options={{ title: 'Crear Usuario' }} />
      <Stack.Screen name="ManualAdjustment" component={ManualAdjustmentScreen} options={{ title: 'Ajuste Manual' }} />
    </Stack.Navigator>
  );
}