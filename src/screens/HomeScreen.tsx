import React from 'react';
import { View, Text, Button } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Inicio</Text>
      <Button title="Registrar Compra" onPress={() => navigation.navigate('RegisterPurchase')} />
      <Button title="Resumen Diario" onPress={() => navigation.navigate('DailySummary')} />
      <Button title="Resumen Semanal" onPress={() => navigation.navigate('WeeklySummary')} />
      <Button title="Ver Personas" onPress={() => navigation.navigate('PeopleList')} />
    </View>
  );
}
