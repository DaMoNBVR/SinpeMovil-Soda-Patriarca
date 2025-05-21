import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PeopleListScreen from '../screens/PeopleListScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterPurchaseScreen from '../screens/RegisterPurchaseScreen';
import DailySummaryScreen from '../screens/DailySummaryScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';

export type RootStackParamList = {
  Home: undefined;
  RegisterPurchase: undefined;
  DailySummary: undefined;
  WeeklySummary: undefined;
  PeopleList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RegisterPurchase" component={RegisterPurchaseScreen} />
      <Stack.Screen name="DailySummary" component={DailySummaryScreen} />
      <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
      <Stack.Screen name="PeopleList" component={PeopleListScreen} />
    </Stack.Navigator>
  );
}
