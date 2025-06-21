import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { DataContext } from '../context/DataContext';
import { RootStackParamList } from '../navigation/StackNavigator';
import uuid from 'react-native-uuid';
import { Payment } from '../models';

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getISOWeek = (date: Date): number => {
  const tmpDate = new Date(date.getTime());
  tmpDate.setHours(0, 0, 0, 0);
  tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
  const firstThursday = new Date(tmpDate.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((tmpDate.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7
    )
  );
};

const isSameWeek = (d1: Date, d2: Date) =>
  getISOWeek(d1) === getISOWeek(d2) && d1.getFullYear() === d2.getFullYear();

type PersonDetailRouteProp = RouteProp<RootStackParamList, 'PersonDetail'>;

export default function PersonDetailScreen() {
  const { params } = useRoute<PersonDetailRouteProp>();
  const { personId } = params;

  const context = useContext(DataContext);
  if (!context) return <Text>Error: contexto no disponible</Text>;

  const { persons, purchases, addPayment, updatePrepaidAmount } = context;

  const person = persons.find((p) => p.id === personId);
  if (!person) return <Text>Persona no encontrada</Text>;

  const today = new Date();

  const dailyPurchases = purchases.filter(
    (p) => p.personId === personId && isSameDay(new Date(p.date), today)
  );

  const weeklyPurchases = purchases.filter(
    (p) => p.personId === personId && isSameWeek(new Date(p.date), today)
  );

  const totalWeekly = weeklyPurchases.reduce((sum, p) => sum + p.amount, 0);
  const saldo = person.prepaidAmount - totalWeekly;

  const handlePayDebt = () => {
    const debt = -saldo;
    if (debt <= 0) return;

    const newPayment: Payment = {
      id: uuid.v4() as string,
      personId: person.id,
      amount: debt,
      date: new Date().toISOString().split('T')[0],
      type: 'debtPayment',
    };

    addPayment(newPayment);
    updatePrepaidAmount(person.id, debt);
    Alert.alert('Éxito', 'La deuda ha sido pagada');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{person.name}</Text>
      <Text
        style={[
          styles.subtitle,
          { color: saldo < 0 ? 'red' : 'green' },
        ]}
      >
        {saldo < 0 ? 'Deuda: ' : 'Saldo a favor: '}₡{Math.abs(saldo).toFixed(2)}
      </Text>

      {saldo < 0 && (
        <Button title="Pagar deuda" color="#f05454" onPress={handlePayDebt} />
      )}

      <Text style={styles.section}>Compras del día:</Text>
      <FlatList
        data={dailyPurchases}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>₡{item.amount} - {item.description || 'Sin descripción'}</Text>
        )}
        ListEmptyComponent={<Text>No hay compras hoy.</Text>}
      />

      <Text style={styles.section}>Total semanal: ₡{totalWeekly.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, marginBottom: 16 },
  section: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  item: { fontSize: 16, paddingVertical: 4 },
});
