import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { generatePDFReport } from '../utils/pdfGenerator';

export default function GeneralBalanceScreen() {
  const context = useContext(DataContext);
  const { theme } = useTheme();

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

  const sorted = balances.sort((a, b) => a.name.localeCompare(b.name)); // <-- Orden alfabético

  const styles = getStyles(theme);

  const handleExportPDF = async () => {
    const content = `
      <h2>Balance General</h2>
      ${sorted.map((item) => `
        <div style="color: ${item.balance < 0 ? 'red' : 'green'};">
          ${item.name}: ${item.balance < 0 ? 'Deuda' : 'Saldo'} ₡${Math.abs(item.balance).toFixed(2)}
        </div>
      `).join('')}
    `;
    await generatePDFReport('Balance General', content);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balance General</Text>
      <Button title="Exportar PDF" onPress={handleExportPDF} />

      <View style={{ marginVertical: 5 }}></View>
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
        ListEmptyComponent={<Text style={styles.text}>No hay movimientos.</Text>}
      />
    </View>
  );
}

const getStyles = (theme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme === 'dark' ? '#121212' : '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    item: {
      fontSize: 18,
      marginVertical: 6,
    },
    text: {
      color: theme === 'dark' ? '#fff' : '#000',
    },
  });
