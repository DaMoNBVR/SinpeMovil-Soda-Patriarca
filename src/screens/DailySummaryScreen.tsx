import React, { useContext, useState } from 'react';
import { View, Text, FlatList, Button, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DataContext } from '../context/DataContext';
import { getSummaryByPerson } from '../utils/summaryHelpers';
import { useTheme } from '../context/ThemeContext';
import { generatePDFReport } from '../utils/pdfGenerator';
import { getLocalDateString } from '../utils/dateUtils'; // ✅ Importa la utilidad

const formatDate = (date: Date) =>
  date.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function DailySummaryScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { purchases, payments, persons } = context;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const dateStr = getLocalDateString(selectedDate); // ✅ Usa la utilidad corregida

  const dayPurchases = purchases.filter((p) => p.date === dateStr);
  const dayPayments = payments.filter((p) => p.date === dateStr);

  const purchaseSummary = getSummaryByPerson(dayPurchases, persons);
  const paymentSummary = getSummaryByPerson(dayPayments, persons);

  const balanceSummary = persons.map((person) => {
    const totalPurchases = purchaseSummary.find(p => p.personId === person.id)?.total || 0;
    const totalPayments = paymentSummary.find(p => p.personId === person.id)?.total || 0;
    return {
      personId: person.id,
      name: person.name,
      balance: totalPayments - totalPurchases,
    };
  }).filter(item => item.balance !== 0);

  const handleDateChange = (event: any, date?: Date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const handleExportPDF = () => {
    const title = `Resumen Diario – ${formatDate(selectedDate)}`;

    const compras = purchaseSummary.length
      ? purchaseSummary.map(item => `<div class="item">${item.name}: ₡${item.total.toFixed(2)}</div>`).join('')
      : '<div>No hay compras este día.</div>';

    const pagos = paymentSummary.length
      ? paymentSummary.map(item => `<div class="item">${item.name}: ₡${item.total.toFixed(2)}</div>`).join('')
      : '<div>No hay pagos este día.</div>';

    const balances = balanceSummary.length
      ? balanceSummary.map(item =>
          `<div class="item" style="color:${item.balance < 0 ? 'red' : 'green'};">
            ${item.name}: ${item.balance < 0 ? 'Deuda' : 'Saldo'} ₡${Math.abs(item.balance).toFixed(2)}
          </div>`
        ).join('')
      : '<div>No hay movimientos que generen balance.</div>';

    const content = `
      <h2>Compras del día</h2>${compras}
      <h2>Pagos del día</h2>${pagos}
      <h2>Balance diario</h2>${balances}
    `;

    generatePDFReport(title, content);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Resumen Diario</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#555' }]}>
        {formatDate(selectedDate)}
      </Text>

      <Button title="Cambiar día" onPress={() => setShowPicker(true)} />
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <View style={{ marginVertical: 10 }}>
        <Button title="Exportar como PDF" onPress={handleExportPDF} />
      </View>

      <Text style={[styles.section, { color: isDark ? '#fff' : '#000' }]}>Compras del día:</Text>
      <FlatList
        data={purchaseSummary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={[styles.item, { color: isDark ? '#fff' : '#000' }]}>
            {item.name}: ₡{item.total.toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text style={{ color: isDark ? '#aaa' : '#333' }}>No hay compras este día.</Text>}
      />

      <Text style={[styles.section, { color: isDark ? '#fff' : '#000' }]}>Pagos del día:</Text>
      <FlatList
        data={paymentSummary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={[styles.paymentItem, { color: 'green' }]}>
            {item.name}: ₡{item.total.toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text style={{ color: isDark ? '#aaa' : '#333' }}>No hay pagos este día.</Text>}
      />

      <Text style={[styles.section, { color: isDark ? '#fff' : '#000' }]}>Balance diario:</Text>
      <FlatList
        data={balanceSummary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text
            style={[
              styles.balanceItem,
              {
                color: item.balance < 0 ? 'red' : 'green',
              },
            ]}
          >
            {item.name}: {item.balance < 0 ? 'Deuda' : 'Saldo'} ₡{Math.abs(item.balance).toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={{ color: isDark ? '#aaa' : '#333' }}>No hay movimientos que generen balance.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 6 },
  item: { fontSize: 16, marginVertical: 4 },
  paymentItem: { fontSize: 16, marginVertical: 4 },
  balanceItem: { fontSize: 16, marginVertical: 4 },
});
