import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { DataContext } from '../context/DataContext';
import { getSummaryByPerson } from '../utils/summaryHelpers';

const isSameWeek = (date1: Date, date2: Date) => {
  const oneJan = new Date(date1.getFullYear(), 0, 1);
  const week1 = Math.ceil(
    (((date1.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7
  );
  const week2 = Math.ceil(
    (((date2.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7
  );
  return week1 === week2 && date1.getFullYear() === date2.getFullYear();
};

export default function WeeklySummaryScreen() {
  const context = useContext(DataContext);
  if (!context) {
    return <Text>Error: DataContext no disponible</Text>;
  }

  const { purchases, persons } = context;
  const today = new Date();

  const weekPurchases = purchases.filter((purchase) =>
    isSameWeek(new Date(purchase.date), today)
  );

  const summary = getSummaryByPerson(weekPurchases, persons);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen Semanal</Text>
      <FlatList
        data={summary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.name}: ₡{item.total.toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text>No hay compras esta semana.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  item: { fontSize: 18, marginVertical: 6 },
});
