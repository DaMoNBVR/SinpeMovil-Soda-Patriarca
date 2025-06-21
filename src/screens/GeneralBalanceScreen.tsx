import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { DataContext } from '../context/DataContext';

export default function GeneralBalanceScreen() {
  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, purchases, payments } = context;

  const balances = persons.map((person) => {
    const totalPayments = payments
      .filter((p) => p.personId === person.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPurchases = purchases
      .filter((p) => p.personId === person.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const balance = totalPayments - totalPurchases;

    return {
      personId: person.id,
      name: person.name,
      balance,
    };
  });

  // Ordenar: primero quienes tienen deuda, luego saldos positivos
  const sorted = balances.sort((a, b) => a.balance - b.balance);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balance General</Text>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text
            style={[
              styles.item,
              { color: item.balance < 0 ? 'red' : 'green' },
            ]}
          >
            {item.name}: {item.balance < 0 ? 'Deuda' : 'Saldo'} ₡{Math.abs(item.balance).toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text>No hay movimientos.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  item: { fontSize: 18, marginVertical: 6 },
});
