import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { DataContext } from '../context/DataContext';
import { getSummaryByPerson } from '../utils/summaryHelpers';

const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

export default function DailySummaryScreen() {
  const context = useContext(DataContext);
  if (!context) {
    return <Text>Error: DataContext no disponible</Text>;
  }

  const { purchases, persons } = context;
  const today = new Date();

  const todayPurchases = purchases.filter((purchase) =>
    isSameDay(new Date(purchase.date), today)
  );

  const summary = getSummaryByPerson(todayPurchases, persons);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen Diario</Text>
      <FlatList
        data={summary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.name}: ₡{item.total.toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text>No hay compras hoy.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  item: { fontSize: 18, marginVertical: 6 },
});
