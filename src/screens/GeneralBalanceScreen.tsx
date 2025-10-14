import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { generatePDFReport } from '../utils/pdfGenerator';
import { commonStyles } from '../Styles/commonStyles';

export default function GeneralBalanceScreen() {
  const context = useContext(DataContext);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const sorted = balances.sort((a, b) => a.name.localeCompare(b.name));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: isDark ? '#121212' : '#fff',
    },
  });

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
      <Text style={[commonStyles.title, { color: isDark ? '#fff' : '#000' }]}>Balance General</Text>
      <Button title="Exportar PDF" onPress={handleExportPDF} />

      <View style={{ marginVertical: 5 }} />
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text
            style={[
              commonStyles.itemText,
              { color: item.balance < 0 ? 'red' : 'green' },
            ]}
          >
            {item.name}: {item.balance < 0 ? 'Deuda' : 'Saldo'} ₡{Math.abs(item.balance).toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={[commonStyles.emptyText, { color: isDark ? '#aaa' : '#333' }]}>
            No hay movimientos.
          </Text>
        }
      />
    </View>
  );
}