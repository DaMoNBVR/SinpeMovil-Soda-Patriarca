import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

import PeopleListScreen from '../screens/PeopleListScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterPurchaseScreen from '../screens/RegisterPurchaseScreen';
import RegisterPaymentScreen from '../screens/RegisterPaymentScreen';
import DailySummaryScreen from '../screens/DailySummaryScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import PersonDetailScreen from '../screens/PersonDetailScreen';
import GeneralBalanceScreen from '../screens/GeneralBalanceScreen';

export type RootStackParamList = {
  Home: undefined;
  RegisterPurchase: undefined;
  RegisterPayment: undefined;
  DailySummary: undefined;
  WeeklySummary: undefined;
  PeopleList: undefined;
  PersonDetail: { personId: string };
  GeneralBalance: undefined;
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
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PeopleList" component={PeopleListScreen} />
      <Stack.Screen name="RegisterPurchase" component={RegisterPurchaseScreen} />
      <Stack.Screen name="RegisterPayment" component={RegisterPaymentScreen} />
      <Stack.Screen name="DailySummary" component={DailySummaryScreen} />
      <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} />
      <Stack.Screen name="GeneralBalance" component={GeneralBalanceScreen} />
    </Stack.Navigator>
  );
}
